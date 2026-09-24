"use client";

import { useRef, useState } from "react";

type Review = { name: string; rating: number; text: string; images?: string[] };

const PER_PAGE = 5;

function Stars({ n }: { n: number }) {
  return (
    <span className="stars">
      {"★★★★★".slice(0, n)}
      <span style={{ color: "var(--line)" }}>{"★★★★★".slice(n)}</span>
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
            <b>{r.name}</b>
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
