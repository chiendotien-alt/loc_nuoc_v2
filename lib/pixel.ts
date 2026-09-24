/**
 * Gửi sự kiện lên Meta Pixel. Chỉ gửi tên sự kiện + giá trị đơn + mã sản phẩm,
 * TUYỆT ĐỐI không gửi tên, số điện thoại, địa chỉ của khách.
 * Chưa cấu hình NEXT_PUBLIC_FB_PIXEL_ID thì mọi hàm ở đây không làm gì.
 */
export const PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID || "";

export function pixelTrack(event: string, params?: Record<string, unknown>, eventId?: string) {
  if (!PIXEL_ID || typeof window === "undefined") return;

  // Mã Pixel tải sau khi trang hiện ra, nên thử lại tối đa ~5 giây nếu chưa sẵn sàng
  let tries = 0;
  const run = () => {
    const fbq = (window as any).fbq;
    if (fbq) {
      if (eventId) fbq("track", event, params || {}, { eventID: eventId });
      else fbq("track", event, params || {});
      return;
    }
    if (++tries < 50) setTimeout(run, 100);
  };
  run();
}
