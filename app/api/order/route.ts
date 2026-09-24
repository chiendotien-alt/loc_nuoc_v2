import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { appendOrderToSheet } from "@/lib/sheets";
import { canonLines, createRateLimiter, normalizePhone, validateCustomer } from "@/lib/antispam";
import {
  computePricing,
  getUnit,
  linesToText,
  mergeLines,
  MAX_LINE_QTY,
  MAX_TOTAL_QTY,
  type OrderLine,
  type Variant
} from "@/lib/pricing";

type Attribute = { name: string; values: string[]; images?: Record<string, string> };

// Chặn theo IP, nới rộng vì nhiều khách dùng chung một IP của nhà mạng (lưu trong bộ nhớ của server; trên Vercel mỗi instance đếm riêng nên chỉ là lớp lọc phụ,
// lớp chắc chắn là kiểm tra theo số điện thoại trong database bên dưới)
const ipLimiter = createRateLimiter(20, 10 * 60 * 1000);

const DUPLICATE_WINDOW_MS = 10 * 60 * 1000; // cùng SĐT + cùng sản phẩm + cùng nội dung trong 10 phút = đơn trùng
const MAX_PER_HOUR = 3; // mỗi SĐT tối đa 3 đơn / giờ
const MAX_PER_DAY = 6; // và 6 đơn / 24 giờ
const MIN_FILL_MS = 3000; // điền form nhanh hơn 3 giây là bất thường

function err(status: number, error: string, message: string) {
  return NextResponse.json({ error, message }, { status });
}

function blockedPhones(): Set<string> {
  return new Set(
    (process.env.BLOCKED_PHONES || "")
      .split(",")
      .map((s) => normalizePhone(s))
      .filter(Boolean)
  );
}

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
    const d = await req.json().catch(() => null);
    if (!d || typeof d !== "object") return err(400, "bad_request", "Dữ liệu gửi lên không hợp lệ.");

    // Ô ẩn (honeypot): người thật không nhìn thấy nên không điền, bot tự động thì điền.
    // Trả về "thành công" giả để bot không biết mà đổi cách, và không lưu gì cả.
    if (typeof d.hp === "string" && d.hp.trim()) {
      return NextResponse.json({ ok: true, code: "DH000000", quantity: 1, total: 0, unitPrice: 0, tierQty: 1 });
    }

    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
    if (!ipLimiter(ip)) {
      return err(429, "too_many", "Bạn thao tác hơi nhiều lần, vui lòng thử lại sau ít phút hoặc gọi hotline giúp shop nhé.");
    }

    // Thời gian từ lúc mở form đến lúc bấm gửi (do trình duyệt báo lên). Thiếu thì bỏ qua để không lỗi với bản cũ.
    if (typeof d.elapsed === "number" && d.elapsed < MIN_FILL_MS) {
      return err(400, "too_fast", "Bạn thao tác hơi nhanh, vui lòng kiểm tra lại thông tin rồi bấm gửi lại nhé.");
    }

    if (!d.productId) return err(400, "missing_fields", "Thiếu thông tin đơn hàng.");

    const customer = validateCustomer({ name: d.name, phone: d.phone, address: d.address });
    if (!customer.ok) return err(400, "invalid_customer", customer.message);
    const { name, phone, address } = customer;

    if (blockedPhones().has(phone)) {
      return err(403, "blocked", "Số điện thoại này hiện chưa đặt được online, bạn vui lòng liên hệ hotline của shop nhé.");
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

    // Lịch sử đơn của cùng số điện thoại trong 24 giờ qua
    const now = Date.now();
    const recent = await prisma.order.findMany({
      where: { phone, createdAt: { gte: new Date(now - 24 * 60 * 60 * 1000) } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, code: true, productId: true, price: true, quantity: true, attributes: true, createdAt: true }
    });

    // Đơn trùng: khách bấm hai lần hoặc gửi lại. Không tạo đơn mới, trả lại đơn cũ như đã đặt thành công.
    const newCanon = canonLines(lines);
    const dup = recent.find(
      (o) =>
        o.productId === product.id &&
        now - o.createdAt.getTime() < DUPLICATE_WINDOW_MS &&
        canonLines(o.attributes as unknown as OrderLine[]) === newCanon
    );
    if (dup) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        code: dup.code,
        quantity: dup.quantity,
        total: dup.price ?? total,
        unitPrice,
        tierQty,
        orderId: dup.id
      });
    }

    const lastHour = recent.filter((o) => now - o.createdAt.getTime() < 60 * 60 * 1000).length;
    if (lastHour >= MAX_PER_HOUR || recent.length >= MAX_PER_DAY) {
      return err(
        429,
        "too_many_orders",
        "Số điện thoại này đã đặt khá nhiều đơn gần đây. Bạn vui lòng gọi hotline để shop hỗ trợ nhé."
      );
    }

    const baseData = {
      productId: d.productId,
      name,
      phone,
      address,
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
      tierQty > 1
        ? `${unitPrice.toLocaleString("vi-VN")}đ/${getUnit(variants)}, mốc từ ${tierQty} ${getUnit(variants)}`
        : "";

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (token && chatId) {
      const text =
        `🛒 ĐƠN HÀNG MỚI - ${code}\n` +
        (recent.length > 0 ? `⚠️ SĐT này đã có ${recent.length} đơn khác trong 24h qua\n` : "") +
        `👤 ${name}\n` +
        `📞 ${phone}\n` +
        `📍 ${address}\n` +
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
        // Server chạy giờ UTC nên phải chỉ rõ múi giờ Việt Nam, nếu không giờ ghi vào Sheet sẽ chậm 7 tiếng
        new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
        code,
        name,
        phone,
        address,
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
