"use client";

import { useState, useRef, useEffect } from "react";

type MediaItem =
  | { type: "video"; src: string }
  | { type: "image"; src: string };

export default function MediaGallery({
  video,
  images = [],
  productName
}: {
  video?: string | null;
  images?: string[];
  productName: string;
}) {
  const items: MediaItem[] = [];
  if (video) {
    items.push({ type: "video", src: video });
  }
  if (images && images.length > 0) {
    images.forEach((img) => items.push({ type: "image", src: img }));
  }
  if (items.length === 0) {
    items.push({ type: "image", src: "https://placehold.co/560x700?text=San+pham" });
  }

  const [activeIndex, setActiveIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const thumbListRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, []);

  function handleScroll() {
    const el = carouselRef.current;
    if (!el) return;
    const slide = el.querySelector<HTMLElement>(".gallery-slide");
    if (!slide) return;
    const slideWidth = slide.offsetWidth + 10;
    const index = Math.round(el.scrollLeft / slideWidth);
    if (index !== activeIndex && index >= 0 && index < items.length) {
      setActiveIndex(index);
      const thumbs = thumbListRef.current?.children;
      if (thumbs && thumbs[index]) {
        (thumbs[index] as HTMLElement).scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center"
        });
      }
    }
  }

  function scrollToSlide(index: number) {
    const el = carouselRef.current;
    if (!el) return;
    const slide = el.querySelector<HTMLElement>(".gallery-slide");
    if (!slide) return;
    const slideWidth = slide.offsetWidth + 10;
    el.scrollTo({ left: index * slideWidth, behavior: "smooth" });
    setActiveIndex(index);
  }

  return (
    <div className="media-gallery">
      <div className="gallery-container">
        <div
          className="gallery-carousel"
          ref={carouselRef}
          onScroll={handleScroll}
        >
          {items.map((item, idx) => (
            <div className="gallery-slide" key={idx}>
              {item.type === "video" ? (
                <div className="gallery-video-wrapper">
                  <video
                    ref={videoRef}
                    src={item.src}
                    autoPlay
                    muted
                    loop
                    playsInline
                    controls
                    preload="auto"
                  />
                </div>
              ) : (
                <img
                  src={item.src}
                  alt={`${productName} ${idx + 1}`}
                  loading={idx === 0 ? "eager" : "lazy"}
                />
              )}
            </div>
          ))}
        </div>

        {items.length > 1 && (
          <div className="gallery-badge">
            {activeIndex + 1} / {items.length}
          </div>
        )}
      </div>

      {items.length > 1 && (
        <div className="thumb-strip" ref={thumbListRef}>
          {items.map((item, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                type="button"
                key={idx}
                className={`thumb-item ${isActive ? "active" : ""}`}
                onClick={() => scrollToSlide(idx)}
                aria-label={`Xem ảnh ${idx + 1}`}
              >
                {item.type === "video" ? (
                  <div className="thumb-video-placeholder">
                    <span className="play-icon">▶</span>
                    <span>Video</span>
                  </div>
                ) : (
                  <img src={item.src} alt={`Thumbnail ${idx + 1}`} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
