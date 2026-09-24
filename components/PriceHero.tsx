"use client";

import { useEffect, useState } from "react";

const DURATION_MS = 24 * 60 * 60 * 1000;

function formatPrice(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function PriceHero({
  productId,
  bestPrice,
  retailPrice,
  oldPrice,
  bestQty,
  unit
}: {
  productId: string;
  /** Đơn giá thấp nhất (mốc giảm sâu nhất) */
  bestPrice: number;
  /** Giá lẻ khi mua 1 */
  retailPrice: number;
  oldPrice: number | null;
  /** Số lượng tối thiểu để được giá thấp nhất (1 = không có mốc giảm) */
  bestQty: number;
  unit: string;
}) {
  // null = chưa mount (tránh lệch giữa server và client)
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const key = `promo_end_${productId}`;

    // Mỗi khách có mốc kết thúc riêng, lưu lại để tải lại trang không bị đếm lại từ đầu.
    // Hết giờ thì tự bắt đầu chu kỳ 24h mới.
    function newEnd(): number {
      let end = 0;
      try {
        end = Number(localStorage.getItem(key)) || 0;
      } catch {}
      const now = Date.now();
      if (!end || end <= now) {
        end = now + DURATION_MS;
        try {
          localStorage.setItem(key, String(end));
        } catch {}
      }
      return end;
    }

    let end = newEnd();
    const tick = () => {
      let r = end - Date.now();
      if (r <= 0) {
        end = newEnd();
        r = end - Date.now();
      }
      setLeft(r);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [productId]);

  const discount = oldPrice && oldPrice > bestPrice ? Math.round(100 - (bestPrice / oldPrice) * 100) : null;

  const total = left === null ? 0 : Math.floor(left / 1000);
  const hh = pad(Math.floor(total / 3600));
  const mm = pad(Math.floor((total % 3600) / 60));
  const ss = pad(total % 60);

  return (
    <div className="price-hero">
      <div className="price" style={{ margin: 0 }}>
        <span className="new">{formatPrice(bestPrice)}</span>
        {oldPrice && oldPrice > bestPrice && <span className="old">{formatPrice(oldPrice)}</span>}
        {discount && <span className="tag">-{discount}%</span>}
      </div>

      {bestQty > 1 && (
        <p className="price-hero-note">
          Giá trên khi mua từ <b>{bestQty} {unit}</b> · Mua lẻ {formatPrice(retailPrice)}/{unit}
        </p>
      )}

      <div className="promo-timer">
        <span className="promo-label">⏰ Thời gian khuyến mãi còn</span>
        <span className="promo-digits" suppressHydrationWarning>
          <b>{left === null ? "--" : hh}</b>:<b>{left === null ? "--" : mm}</b>:<b>{left === null ? "--" : ss}</b>
        </span>
      </div>
    </div>
  );
}
