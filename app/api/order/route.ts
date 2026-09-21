import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const d = await req.json();

    if (!d.productId || !d.name || !d.phone || !d.address) {
      return NextResponse.json({ error: "missing fields" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id: d.productId } });
    if (!product) return NextResponse.json({ error: "product not found" }, { status: 404 });

    const order = await prisma.order.create({
      data: {
        productId: d.productId,
        name: d.name,
        phone: d.phone,
        address: d.address,
        color: d.color || null,
        size: d.size || null,
        quantity: Number(d.quantity) || 1,
        source: d.source || null
      }
    });

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (token && chatId) {
      const text =
        `🛒 ĐƠN HÀNG MỚI\n` +
        `👤 ${d.name}\n` +
        `📞 ${d.phone}\n` +
        `📍 ${d.address}\n` +
        `📦 ${product.name}${d.color ? " | " + d.color : ""}${d.size ? " | Size " + d.size : ""} | SL ${d.quantity || 1}\n` +
        `🔗 ${d.source || ""}`;

      fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text })
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true, id: order.id });
  } catch (err) {
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
