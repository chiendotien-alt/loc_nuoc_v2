export type Variant = { qty: number; price: number };
export type OrderLine = { attrs: Record<string, string>; qty: number };
export type PricePart = { qty: number; price: number; count: number };

export const MAX_LINE_QTY = 99;
export const MAX_TOTAL_QTY = 200;

/**
 * Tính giá thấp nhất cho `totalQty` cái, ghép từ các gói combo (variants)
 * và giá lẻ (basePrice) cho phần còn lại.
 * Ví dụ: combo 3 = 250k, lẻ = 99k, mua 4 cái => 1 combo 3 + 1 lẻ.
 */
export function computePricing(
  variants: Variant[],
  basePrice: number,
  totalQty: number
): { total: number; parts: PricePart[] } {
  if (totalQty <= 0) return { total: 0, parts: [] };

  const packs: Variant[] = variants.filter((v) => v.qty > 0 && v.price >= 0);
  if (!packs.some((p) => p.qty === 1)) packs.push({ qty: 1, price: basePrice });

  const cost: number[] = new Array(totalQty + 1).fill(Infinity);
  const pick: number[] = new Array(totalQty + 1).fill(-1);
  cost[0] = 0;

  for (let n = 1; n <= totalQty; n++) {
    packs.forEach((p, idx) => {
      if (p.qty <= n && cost[n - p.qty] + p.price < cost[n]) {
        cost[n] = cost[n - p.qty] + p.price;
        pick[n] = idx;
      }
    });
  }

  const counts = new Map<number, PricePart>();
  let n = totalQty;
  while (n > 0) {
    const p = packs[pick[n]];
    const cur = counts.get(p.qty) || { qty: p.qty, price: p.price, count: 0 };
    cur.count += 1;
    counts.set(p.qty, cur);
    n -= p.qty;
  }

  return {
    total: cost[totalQty],
    parts: Array.from(counts.values()).sort((a, b) => b.qty - a.qty)
  };
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
