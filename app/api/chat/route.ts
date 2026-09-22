import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const MODEL = "gemini-3.1-flash-lite";

export async function POST(req: NextRequest) {
  try {
    const { productSlug, history } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
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

    const rawHistory: { role: string; content: string }[] =
      Array.isArray(history) && history.length > 0 ? history.slice(-10) : [{ role: "user", content: "Xin chào" }];

    // Gemini dùng role "user" / "model" thay vì "user" / "assistant"
    const contents = rawHistory.map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }]
    }));

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { maxOutputTokens: 300 }
        })
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("Gemini API error:", errText);
      return NextResponse.json({ reply: "Mình đang gặp trục trặc, bạn thử lại sau ít phút nhé." });
    }

    const data = await res.json();
    const reply =
      data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ||
      "Bạn hỏi lại giúp mình nhé.";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ reply: "Có lỗi xảy ra, bạn thử lại nhé." }, { status: 200 });
  }
}
