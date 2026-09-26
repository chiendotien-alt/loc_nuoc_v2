/**
 * Mốc giá theo số lượng: từ `qty` cái trở lên, MỖI cái tính `unitPrice`.
 * (`price` chỉ còn để đọc dữ liệu cũ dạng "giá cả gói combo".)
 */
export type Variant = { qty: number; unitPrice?: number; price?: number; unit?: string; mode?: string };
export type DisplayMode = "stepper" | "combo";
export type Tier = { qty: number; unitPrice: number };
export type OrderLine = { attrs: Record<string, string>; qty: number };
export type PricingResult = {
  total: number;
  /** Đơn giá đang áp dụng cho mỗi cái */
  unitPrice: number;
  /** Số lượng tối thiểu của mốc đang áp dụng (1 = giá lẻ) */
  tierQty: number;
  /** Mốc rẻ hơn kế tiếp và cần mua thêm bao nhiêu cái, null nếu đã ở mốc thấp nhất */
  nextTier: { qty: number; unitPrice: number; needMore: number } | null;
  /** Số tiền tiết kiệm so với mua giá lẻ (mốc 1 cái) */
  savings: number;
};

export const DEFAULT_UNIT = "cái";
export const MAX_LINE_QTY = 99;
export const MAX_TOTAL_QTY = 200;

/**
 * Tên đơn vị (cái, bộ, hộp...) do admin đặt. Lưu chung trong mảng `variants` dưới dạng
 * một phần tử đặc biệt `{ qty: 0, unit: "bộ" }` để không cần đổi database.
 * `normalizeTiers` bỏ qua phần tử này vì qty < 1.
 */
export function getUnit(variants: Variant[] | null | undefined): string {
  const found = (variants || []).find((v) => Number(v?.qty) === 0 && typeof v?.unit === "string" && v.unit.trim());
  return found ? found.unit!.trim() : DEFAULT_UNIT;
}

/**
 * Kiểu hiển thị lựa chọn mua hàng, do admin chọn cho từng sản phẩm. Lưu chung trong mảng
 * `variants` dưới dạng phần tử đặc biệt `{ qty: -1, mode: "combo" }` để không cần đổi database
 * (giống cách lưu tên đơn vị ở trên). Không có phần tử này = mặc định "stepper" (kiểu cũ).
 * - "stepper": dải mốc giá tham khảo + nút tăng/giảm số lượng (kiểu cũ).
 * - "combo": danh sách ô "Mua 1 / Mua 2 / Mua 3..." bấm chọn thẳng, không cần bấm +/-.
 */
export function getDisplayMode(variants: Variant[] | null | undefined): DisplayMode {
  const found = (variants || []).find((v) => Number(v?.qty) === -1 && v?.mode === "combo");
  return found ? "combo" : "stepper";
}

/**
 * Chuẩn hoá danh sách mốc: bỏ mốc lỗi, luôn có mốc 1 cái (= basePrice nếu chưa khai báo),
 * sắp xếp tăng dần theo số lượng. Dữ liệu cũ (chỉ có `price` của cả gói) được đổi
 * sang đơn giá = price / qty để không bị hỏng.
 */
export function normalizeTiers(variants: Variant[] | null | undefined, basePrice: number): Tier[] {
  const map = new Map<number, number>();
  for (const v of variants || []) {
    const qty = Math.floor(Number(v?.qty));
    if (!Number.isFinite(qty) || qty < 1) continue;
    const unit = v.unitPrice != null ? Number(v.unitPrice) : Math.round(Number(v.price) / qty);
    if (!Number.isFinite(unit) || unit < 0) continue;
    map.set(qty, unit);
  }
  if (!map.has(1)) map.set(1, basePrice);
  return Array.from(map, ([qty, unitPrice]) => ({ qty, unitPrice })).sort((a, b) => a.qty - b.qty);
}

/**
 * Tính tiền theo bậc: tìm mốc rẻ nhất mà tổng số lượng đã đạt,
 * rồi lấy đơn giá của mốc đó × TOÀN BỘ số lượng.
 * Ví dụ: 1 cái 55k, từ 2 cái 38k, từ 3 cái 33k → mua 3 cái = 3 × 33k = 99k.
 */
export function computePricing(
  variants: Variant[] | null | undefined,
  basePrice: number,
  totalQty: number
): PricingResult {
  const tiers = normalizeTiers(variants, basePrice);
  if (!(totalQty > 0)) {
    return { total: 0, unitPrice: tiers[0].unitPrice, tierQty: 1, nextTier: null, savings: 0 };
  }

  let best = tiers[0];
  for (const t of tiers) {
    if (t.qty > totalQty) continue;
    if (t.unitPrice < best.unitPrice || (t.unitPrice === best.unitPrice && t.qty > best.qty)) best = t;
  }

  const next = tiers.find((t) => t.qty > totalQty && t.unitPrice < best.unitPrice);
  const total = best.unitPrice * totalQty;

  return {
    total,
    unitPrice: best.unitPrice,
    tierQty: best.qty,
    nextTier: next ? { qty: next.qty, unitPrice: next.unitPrice, needMore: next.qty - totalQty } : null,
    savings: Math.max(0, tiers[0].unitPrice * totalQty - total)
  };
}

/** Nhãn khoảng số lượng của mốc thứ i: "1 cái", "2 – 4 cái", "5+ cái" (đơn vị do admin đặt). */
export function tierRangeLabel(tiers: Tier[], i: number, unit: string = DEFAULT_UNIT): string {
  const cur = tiers[i];
  const next = tiers[i + 1];
  if (!next) return i === 0 ? `${cur.qty} ${unit}` : `${cur.qty}+ ${unit}`;
  const to = next.qty - 1;
  return to > cur.qty ? `${cur.qty} – ${to} ${unit}` : `${cur.qty} ${unit}`;
}

/** Gộp các dòng có cùng thuộc tính thành 1 dòng (cộng dồn số lượng). */
export function mergeLines(lines: OrderLine[]): OrderLine[] {
  const map = new Map<string, OrderLine>();
  for (const l of lines) {
    const key = JSON.stringify(Object.entries(l.attrs || {}).sort(([a], [b]) => a.localeCompare(b)));
    const cur = map.get(key);
    if (cur) cur.qty += l.qty;
    else map.set(key, { attrs: { ...l.attrs }, qty: l.qty });
  }
  return Array.from(map.values());
}

/** "Đỏ, L ×2 | Xanh, L ×1" — dùng cho Telegram / Google Sheet. */
export function linesToText(lines: OrderLine[]): string {
  return lines
    .map((l) => {
      const vals = Object.values(l.attrs || {}).filter(Boolean);
      return vals.length ? `${vals.join(", ")} ×${l.qty}` : `×${l.qty}`;
    })
    .join(" | ");
}
