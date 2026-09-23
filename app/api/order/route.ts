import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { appendOrderToSheet } from "@/lib/sheets";

type Variant = { qty: number; price: number };

function generateOrderCode() {
  const now = new Date();
  const datePart = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate()
  ).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `DH${datePart}${rand}`;
}

export async function POST(req: NextRequest) {
  try {
    const d = await req.json();

    if (!d.productId || !d.name || !d.phone || !d.address) {
      return NextResponse.json({ error: "missing fields" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id: d.productId } });
    if (!product) return NextResponse.json({ error: "product not found" }, { status: 404 });

    const variants = (product.variants as unknown as Variant[]) || [];
    const chosenVariant = d.comboQty ? variants.find((v) => v.qty === Number(d.comboQty)) : null;

    const unitPrice = chosenVariant ? chosenVariant.price : product.price;
    const quantity = Number(d.quantity) || 1;
    const total = chosenVariant ? unitPrice : unitPrice * quantity;

    let code = generateOrderCode();
    let order;
    try {
      order = await prisma.order.create({
        data: {
          code,
          productId: d.productId,
          name: d.name,
          phone: d.phone,
          address: d.address,
          attributes: Array.isArray(d.attributes) ? d.attributes : d.attributes ? [d.attributes] : [],
          comboQty: chosenVariant ? Number(d.comboQty) : null,
          price: total,
          quantity,
          source: d.source || null
        }
      });
    } catch {
      // Trùng mã đơn (rất hiếm) — thử lại 1 lần với mã khác
      code = generateOrderCode();
      order = await prisma.order.create({
        data: {
          code,
          productId: d.productId,
          name: d.name,
          phone: d.phone,
          address: d.address,
          attributes: Array.isArray(d.attributes) ? d.attributes : d.attributes ? [d.attributes] : [],
          comboQty: chosenVariant ? Number(d.comboQty) : null,
          price: total,
          quantity,
          source: d.source || null
        }
      });
    }

    const attrUnits: Record<string, string>[] = Array.isArray(d.attributes) ? d.attributes : d.attributes ? [d.attributes] : [];
    const attrLine = attrUnits
      .map((u, i) => {
        const entries = Object.entries(u || {}).filter(([, v]) => v);
        if (entries.length === 0) return "";
        const text = entries.map(([k, v]) => `${k}: ${v}`).join(", ");
        return attrUnits.length > 1 ? `[${i + 1}] ${text}` : text;
      })
      .filter(Boolean)
      .join(" | ");

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (token && chatId) {
      const text =
        `🛒 ĐƠN HÀNG MỚI - ${code}\n` +
        `👤 ${d.name}\n` +
        `📞 ${d.phone}\n` +
        `📍 ${d.address}\n` +
        `📦 ${product.name}${attrLine ? " | " + attrLine : ""} | SL ${quantity}\n` +
        `💰 ${total.toLocaleString("vi-VN")}đ\n` +
        `🔗 ${d.source || ""}`;

      try {
        const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text })
        });
        if (!tgRes.ok) {
          const errBody = await tgRes.text();
          console.error("Telegram gửi thất bại:", errBody);
        }
      } catch (err) {
        console.error("Telegram lỗi kết nối:", err);
      }
    } else {
      console.warn("Thiếu TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID, bỏ qua thông báo Telegram.");
    }

    try {
      await appendOrderToSheet([
        new Date().toLocaleString("vi-VN"),
        code,
        d.name,
        d.phone,
        d.address,
        product.name,
        attrLine,
        quantity,
        total,
        d.source || ""
      ]);
    } catch (err) {
      console.error("Ghi Google Sheet lỗi:", err);
    }

    return NextResponse.json({ ok: true, code, price: unitPrice, total });
  } catch (err) {
    console.error("Lỗi tạo đơn hàng:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
