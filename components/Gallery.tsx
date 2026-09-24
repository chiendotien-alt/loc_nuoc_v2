"use client";

import { useEffect, useRef, useState } from "react";

export default function Gallery({ images }: { images: string[] }) {
  const items: { type: "image"; src: string }[] = images.map((src) => ({ type: "image" as const, src }));

  const mainRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        if (el) {
          const idx = Math.round(el.scrollLeft / el.clientWidth);
          setActive(idx);
        }
        ticking = false;
      });
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  function goTo(i: number) {
    slideRefs.current[i]?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }

  if (items.length === 0) {
    return (
      <div className="carousel">
        <div className="slide">
          <img src="https://placehold.co/1092x1092?text=San+pham" alt="" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="carousel" ref={mainRef}>
        {items.map((item, i) => (
          <div className="slide" key={i} ref={(el) => { slideRefs.current[i] = el; }}>
            <img src={item.src} alt={`Ảnh ${i + 1}`} />
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <div className="thumb-strip">
          {items.map((item, i) => (
            <button
              key={i}
              type="button"
              className={`thumb ${active === i ? "thumb-active" : ""}`}
              onClick={() => goTo(i)}
              aria-label={`Xem ảnh ${i + 1}`}
            >
              <img src={item.src} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
