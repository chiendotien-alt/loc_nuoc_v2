"use client";

import { useState, type ReactNode } from "react";

type TabKey = "info" | "description" | "reviews";

/**
 * Thanh tab "Sản phẩm / Mô tả / Đánh giá thực" đặt bên dưới khối ảnh + giá + mua hàng.
 * Dùng display:none/block (không unmount) để không mất trạng thái đang nhập của OrderForm
 * nếu OrderForm được truyền vào info, và để nội dung vẫn nằm sẵn trong HTML (tốt cho SEO),
 * chỉ ẩn/hiện bằng CSS khi khách chuyển tab.
 */
export default function ProductTabs({
  info,
  description,
  reviews,
  reviewCount
}: {
  info: ReactNode;
  description: ReactNode;
  reviews: ReactNode;
  reviewCount?: number;
}) {
  const [tab, setTab] = useState<TabKey>("info");

  const tabs: { key: TabKey; label: string }[] = [
    { key: "info", label: "Sản phẩm" },
    { key: "description", label: "Mô tả" },
    { key: "reviews", label: reviewCount ? `Đánh giá thực (${reviewCount})` : "Đánh giá thực" }
  ];

  return (
    <div className="ptabs">
      <div className="ptabs-bar" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={"ptabs-btn" + (tab === t.key ? " ptabs-btn-active" : "")}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="ptabs-panel" style={{ display: tab === "info" ? "block" : "none" }}>
        {info}
      </div>
      <div className="ptabs-panel" style={{ display: tab === "description" ? "block" : "none" }}>
        {description}
      </div>
      <div className="ptabs-panel" style={{ display: tab === "reviews" ? "block" : "none" }}>
        {reviews}
      </div>
    </div>
  );
}
