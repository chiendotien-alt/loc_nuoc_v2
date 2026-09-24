"use client";

import { useRef, useState } from "react";

type Review = { name: string; rating: number; text: string; images?: string[]; avatar?: string };

const PER_PAGE = 5;

function Stars({ n }: { n: number }) {
  return (
    <span className="stars">
      {"★★★★★".slice(0, n)}
      <span style={{ color: "var(--line)" }}>{"★★★★★".slice(n)}</span>
    </span>
  );
}

const AVATAR_COLORS = ["#b4342f", "#d9822b", "#2e9143", "#2a7ab8", "#7b4fb0", "#c2477a", "#3f8f8f", "#8a6d3b"];

/** Chữ cái đầu của TÊN (từ cuối), vd "Chị Lan" -> "L", "Hùng Dũng" -> "D". */
function initialOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const last = words[words.length - 1] || "?";
  return Array.from(last)[0]?.toLocaleUpperCase("vi") || "?";
}

function colorOf(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function Avatar({ name, src }: { name: string; src?: string }) {
  const [broken, setBroken] = useState(false);
  if (src && !broken) {
    return <img className="avatar" src={src} alt="" onError={() => setBroken(true)} />;
  }
  return (
    <span className="avatar avatar-letter" style={{ background: colorOf(name) }} aria-hidden="true">
      {initialOf(name)}
    </span>
  );
}

export default function Reviews({ reviews }: { reviews: Review[] }) {
  const [page, setPage] = useState(1);
  const topRef = useRef<HTMLDivElement>(null);

  if (!reviews || reviews.length === 0) return null;

  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  const totalPages = Math.ceil(reviews.length / PER_PAGE);
  const current = Math.min(page, totalPages);
  const start = (current - 1) * PER_PAGE;
  const visible = reviews.slice(start, start + PER_PAGE);

  function goTo(p: number) {
    setPage(Math.min(Math.max(1, p), totalPages));
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div ref={topRef} style={{ scrollMarginTop: 12 }}>
      <h2>Khách hàng đánh giá</h2>
      <div className="review-summary">
        <b>{avg.toFixed(1)}</b>
        <Stars n={Math.round(avg)} />
      </div>

      {visible.map((r, i) => (
        <div className="review-card" key={start + i}>
          <div className="review-head">
            <span className="review-user">
              <Avatar name={r.name} src={r.avatar} />
              <b>{r.name}</b>
            </span>
            <Stars n={r.rating} />
          </div>
          <p>{r.text}</p>
          {r.images && r.images.length > 0 && (
            <div className="review-images">
              {r.images.map((src, j) => (
                <img key={j} src={src} alt="" />
              ))}
            </div>
          )}
        </div>
      ))}

      {totalPages > 1 && (
        <nav className="pager" aria-label="Phân trang đánh giá">
          <button type="button" onClick={() => goTo(current - 1)} disabled={current === 1} aria-label="Trang trước">
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              className={p === current ? "pager-active" : ""}
              onClick={() => goTo(p)}
              aria-label={`Trang ${p}`}
              aria-current={p === current ? "page" : undefined}
            >
              {p}
            </button>
          ))}
          <button type="button" onClick={() => goTo(current + 1)} disabled={current === totalPages} aria-label="Trang sau">
            ›
          </button>
        </nav>
      )}
    </div>
  );
}
