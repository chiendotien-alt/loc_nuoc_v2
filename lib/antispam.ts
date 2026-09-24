/**
 * Bộ lọc đơn ảo / đơn trùng. Chỉ chứa hàm thuần (không phụ thuộc DB) để dễ test.
 */

export type LineLike = { attrs: Record<string, string>; qty: number };

/** Đưa số điện thoại về dạng 0xxxxxxxxx (bỏ dấu cách, chấm, gạch; đổi +84 / 84 thành 0). */
export function normalizePhone(raw: unknown): string {
  let p = String(raw ?? "").replace(/[\s.\-()]/g, "");
  if (p.startsWith("+84")) p = "0" + p.slice(3);
  else if (p.startsWith("84") && p.length === 11) p = "0" + p.slice(2);
  return p;
}

const VN_MOBILE = /^0[35789]\d{8}$/;

/** Số di động Việt Nam hợp lệ và không phải kiểu số bấm bừa (0999999999, 0912345678...). */
export function isPlausiblePhone(phone: string): boolean {
  if (!VN_MOBILE.test(phone)) return false;
  if (/(\d)\1{7,}/.test(phone)) return false; // 8 chữ số giống nhau liên tiếp
  if (/12345678|23456789|87654321|98765432/.test(phone)) return false; // dãy số tăng/giảm dần
  return true;
}

export type CustomerCheck =
  | { ok: true; name: string; phone: string; address: string }
  | { ok: false; message: string };

const HAS_LETTER = /\p{L}/u;

export function validateCustomer(input: { name?: unknown; phone?: unknown; address?: unknown }): CustomerCheck {
  const name = String(input.name ?? "").replace(/\s+/g, " ").trim();
  const address = String(input.address ?? "").replace(/\s+/g, " ").trim();
  const phone = normalizePhone(input.phone);

  if (name.length < 2 || name.length > 60 || !HAS_LETTER.test(name)) {
    return { ok: false, message: "Bạn kiểm tra lại họ tên giúp shop nhé." };
  }
  if (!isPlausiblePhone(phone)) {
    return { ok: false, message: "Số điện thoại chưa đúng. Bạn nhập 10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09 nhé." };
  }
  if (address.length < 10 || address.length > 300 || !HAS_LETTER.test(address)) {
    return { ok: false, message: "Địa chỉ chưa đầy đủ. Bạn ghi rõ số nhà, xã/phường, quận/huyện, tỉnh giúp shop nhé." };
  }
  return { ok: true, name, phone, address };
}

/** Chuỗi chuẩn hoá của các dòng đặt hàng, không phụ thuộc thứ tự dòng hay thứ tự khoá (jsonb của Postgres đổi thứ tự khoá). */
export function canonLines(lines: LineLike[] | null | undefined): string {
  return (lines || [])
    .map((l) => JSON.stringify([Number(l?.qty), Object.entries(l?.attrs || {}).sort(([a], [b]) => a.localeCompare(b))]))
    .sort()
    .join("|");
}

/** Giới hạn số lần theo khoá (vd IP) trong một khoảng thời gian. Trả về true nếu còn được phép. */
export function createRateLimiter(max: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return function allow(key: string, now: number = Date.now()): boolean {
    const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (recent.length >= max) {
      hits.set(key, recent);
      return false;
    }
    recent.push(now);
    hits.set(key, recent);

    if (hits.size > 5000) {
      for (const [k, arr] of hits) {
        if (arr.every((t) => now - t >= windowMs)) hits.delete(k);
      }
    }
    return true;
  };
}
