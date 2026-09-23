import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { appendOrderToSheet } from "@/lib/sheets";
import {
  computePricing,
  linesToText,
  mergeLines,
  MAX_LINE_QTY,
  MAX_TOTAL_QTY,
  type OrderLine,
  type Variant
} from "@/lib/pricing";

type Attribute = { name: string; values: string[] };

function generateOrderCode() {
  const now = new Date();
  const datePart = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate()
  ).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `DH${datePart}${rand}`;
}

/** Kiểm tra & chuẩn hoá các dòng khách chọn; trả về null nếu dữ liệu không hợp lệ. */
function sanitizeLines(raw: unknown, attrDefs: Attribute[]): OrderLine[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 50) return null;

  const lines: OrderLine[] = [];
  for (const item of raw) {
    const qty = Math.floor(Number(item?.qty));
    if (!Number.isFinite(qty) || qty < 1 || qty > MAX_LINE_QTY) return null;

    const attrs: Record<string, string> = {};
    for (const def of attrDefs) {
      const value = String(item?.attrs?.[def.name] ?? def.values[0] ?? "");
      if (def.values.length > 0 && !def.values.includes(value)) return null;
      attrs[def.name] = value;
    }
    lines.push({ attrs, qty });
  }

  const merged = mergeLines(lines);
  const totalQty = merged.reduce((s, l) => s + l.qty, 0);
  if (totalQty > MAX_TOTAL_QTY) return null;
  return merged;
}

export async function POST(req: NextRequest) {
  try {
    const d = await req.json();

    if (!d.productId || !d.name || !d.phone || !d.address) {
      return NextResponse.json({ error: "missing fields" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id: d.productId } });
    if (!product) return NextResponse.json({ error: "product not found" }, { status: 404 });

    const attrDefs = (product.attributes as unknown as Attribute[]) || [];
    const variants = (product.variants as unknown as Variant[]) || [];

    const lines = sanitizeLines(d.lines, attrDefs);
    if (!lines) return NextResponse.json({ error: "invalid lines" }, { status: 400 });

    // Giá do server tự tính, không tin số tiền từ phía khách
    const quantity = lines.reduce((s, l) => s + l.qty, 0);
    const { total, unitPrice, tierQty } = computePricing(variants, product.price, quantity);

    const baseData = {
      productId: d.productId,
      name: d.name,
      phone: d.phone,
      address: d.address,
      attributes: lines as unknown as object,
      comboQty: tierQty > 1 ? tierQty : null,
      price: total,
      quantity,
      source: d.source || null
    };

    let code = generateOrderCode();
    let order;
    try {
      order = await prisma.order.create({ data: { ...baseData, code } });
    } catch {
      // Trùng mã đơn (rất hiếm) — thử lại 1 lần với mã khác
      code = generateOrderCode();
      order = await prisma.order.create({ data: { ...baseData, code } });
    }

    const attrLine = linesToText(lines);
    const comboNote =
      tierQty > 1 ? `${unitPrice.toLocaleString("vi-VN")}đ/cái, mốc từ ${tierQty} cái` : "";

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (token && chatId) {
      const text =
        `🛒 ĐƠN HÀNG MỚI - ${code}\n` +
        `👤 ${d.name}\n` +
        `📞 ${d.phone}\n` +
        `📍 ${d.address}\n` +
        `📦 ${product.name}\n` +
        lines
          .map((l, i) => {
            const vals = Object.values(l.attrs).filter(Boolean).join(", ");
            return `   ${i + 1}. ${vals ? vals + " — " : ""}SL ${l.qty}`;
          })
          .join("\n") +
        `\n🔢 Tổng SL: ${quantity}${comboNote ? " (" + comboNote + ")" : ""}\n` +
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

    return NextResponse.json({ ok: true, code, quantity, total, unitPrice, tierQty, orderId: order.id });
  } catch (err) {
    console.error("Lỗi tạo đơn hàng:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
