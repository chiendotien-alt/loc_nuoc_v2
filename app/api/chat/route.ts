import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { productSlug, history } = await req.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ reply: "Shop chưa bật tư vấn AI, bạn liên hệ hotline giúp shop nhé." });
    }

    const product = await prisma.product.findUnique({ where: { slug: productSlug } });
    if (!product) return NextResponse.json({ error: "product not found" }, { status: 404 });

    const systemPrompt = `Bạn là nhân viên tư vấn bán hàng của shop đồ gia dụng, đang trả lời khách ngay trên trang sản phẩm.
Chỉ trả lời về sản phẩm dưới đây, ngắn gọn, thân thiện, tiếng Việt, tối đa 3 câu. Nếu khách hỏi ngoài phạm vi sản phẩm hoặc muốn khiếu nại/đổi trả phức tạp, hướng khách gọi hotline.
Không tự bịa thông tin không có trong dữ liệu dưới đây.

Tên sản phẩm: ${product.name}
Giá: ${product.price.toLocaleString("vi-VN")}đ
Mô tả: ${product.description}
Màu: ${product.colors.join(", ") || "không có tùy chọn màu"}
Size: ${product.sizes.join(", ") || "không có tùy chọn size"}`;

    const messages = Array.isArray(history) && history.length > 0
      ? history.slice(-10)
      : [{ role: "user", content: "Xin chào" }];

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        system: systemPrompt,
        messages
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Anthropic API error:", errText);
      return NextResponse.json({ reply: "Mình đang gặp trục trặc, bạn thử lại sau ít phút nhé." });
    }

    const data = await res.json();
    const reply = data.content?.find((c: any) => c.type === "text")?.text || "Bạn hỏi lại giúp mình nhé.";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ reply: "Có lỗi xảy ra, bạn thử lại nhé." }, { status: 200 });
  }
}
