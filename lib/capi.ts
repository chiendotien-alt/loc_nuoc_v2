import crypto from "crypto";

/**
 * Gửi sự kiện Purchase lên Facebook qua Conversion API (server-side).
 * Bổ sung cho Pixel trình duyệt (lib/pixel.ts) để tăng độ tin cậy dữ liệu:
 * Pixel trình duyệt hay bị mất do trình chặn quảng cáo/Safari ITP, còn CAPI
 * gửi thẳng từ server nên không bị chặn.
 *
 * Cần 2 biến môi trường trên Vercel:
 * - PIXEL_ID (đã có sẵn, dùng chung với Pixel trình duyệt)
 * - FB_CAPI_ACCESS_TOKEN (lấy trong Meta Events Manager, mục "Cài đặt"
 *   > "API Chuyển đổi" > "Thiết lập tích hợp trực tiếp" > "Tạo mã truy cập")
 */
function sha256(value: string) {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export async function sendPurchaseCAPI(params: {
  eventId: string; // PHẢI trùng với eventID đã gửi ở Pixel trình duyệt (dùng mã đơn `code`) để Facebook gộp 2 nguồn lại, tránh đếm trùng 2 lần
  value: number;
  currency: string;
  contentIds: string[];
  contentName: string;
  numItems: number;
  phone?: string; // để thô, hàm tự chuẩn hoá + hash, không log ra ngoài
  clientIp?: string;
  userAgent?: string;
}) {
  const pixelId = process.env.PIXEL_ID || process.env.NEXT_PUBLIC_FB_PIXEL_ID;
  const accessToken = process.env.FB_CAPI_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
    console.warn("Thiếu PIXEL_ID hoặc FB_CAPI_ACCESS_TOKEN, bỏ qua gửi CAPI cho sự kiện", params.eventId);
    return;
  }

  const userData: Record<string, unknown> = {};
  if (params.phone) userData.ph = [sha256(params.phone)];
  if (params.clientIp) userData.client_ip_address = params.clientIp;
  if (params.userAgent) userData.client_user_agent = params.userAgent;

  const body = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: params.eventId,
        action_source: "website",
        user_data: userData,
        custom_data: {
          value: params.value,
          currency: params.currency,
          content_ids: params.contentIds,
          content_name: params.contentName,
          content_type: "product",
          num_items: params.numItems
        }
      }
    ]
  };

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${accessToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error("CAPI gửi Purchase thất bại:", errText);
    }
  } catch (err) {
    console.error("CAPI lỗi kết nối:", err);
  }
}
