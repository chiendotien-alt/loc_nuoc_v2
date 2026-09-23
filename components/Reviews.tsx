type Review = { name: string; rating: number; text: string; images?: string[] };

function Stars({ n }: { n: number }) {
  return (
    <span className="stars">
      {"★★★★★".slice(0, n)}
      <span style={{ color: "var(--line)" }}>{"★★★★★".slice(n)}</span>
    </span>
  );
}

export default function Reviews({ reviews }: { reviews: Review[] }) {
  if (!reviews || reviews.length === 0) return null;

  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

  return (
    <div>
      <h2>Khách hàng đánh giá</h2>
      <div className="review-summary">
        <b>{avg.toFixed(1)}</b>
        <Stars n={Math.round(avg)} />
        <span className="note" style={{ margin: 0 }}>({reviews.length} đánh giá)</span>
      </div>
      {reviews.map((r, i) => (
        <div className="review-card" key={i}>
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
    </div>
  );
}
