"use client";

import { useRef, useState } from "react";

export type ReceiptData = {
  code: string;
  name: string;
  phone: string;
  address: string;
  productName: string;
  lines: { attrs: Record<string, string>; qty: number }[];
  quantity: number;
  total: number;
  pricingNote?: string;
  createdAt: string;
};

function formatPrice(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

export default function Receipt({ data, shopName }: { data: ReceiptData; shopName: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  // Ảnh phiếu đã tạo — hiện lên để khách nhấn giữ và lưu (tải file tự động hay bị chặn trên điện thoại)
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  async function handleShowImage() {
    if (!ref.current) return;
    setDownloading(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(ref.current, { backgroundColor: "#ffffff", pixelRatio: 2 });
      setImgUrl(dataUrl);
    } catch {
      alert("Không tạo được ảnh, bạn chụp màn hình phiếu này thay thế nhé.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div style={{ marginTop: 14 }}>
      <div ref={ref} className="receipt">
        <div className="receipt-head">
          <b>{shopName}</b>
          <span>Phiếu xác nhận đặt hàng</span>
        </div>
        <div className="receipt-code">Mã đơn: {data.code}</div>
        <div className="receipt-row">
          <span>Khách hàng</span>
          <b>{data.name}</b>
        </div>
        <div className="receipt-row">
          <span>Điện thoại</span>
          <b>{data.phone}</b>
        </div>
        <div className="receipt-row">
          <span>Địa chỉ</span>
          <b style={{ textAlign: "right", maxWidth: "65%" }}>{data.address}</b>
        </div>
        <hr />
        <div className="receipt-row">
          <span>Sản phẩm</span>
          <b>{data.productName}</b>
        </div>
        {data.lines.map((l, i) => {
          const vals = Object.values(l.attrs || {}).filter(Boolean);
          return (
            <div className="receipt-row" key={i}>
              <span>{vals.length ? vals.join(" · ") : `Loại ${i + 1}`}</span>
              <b>× {l.qty}</b>
            </div>
          );
        })}
        <div className="receipt-row">
          <span>Tổng số lượng</span>
          <b>{data.quantity}</b>
        </div>
        {data.pricingNote && (
          <div className="receipt-row">
            <span>Giá áp dụng</span>
            <b>{data.pricingNote}</b>
          </div>
        )}
        <hr />
        <div className="receipt-row receipt-total">
          <span>Tổng tiền</span>
          <b>{formatPrice(data.total)}</b>
        </div>
        <div className="receipt-note">Thanh toán khi nhận hàng (COD) · {data.createdAt}</div>
      </div>

      <button type="button" className="cta" onClick={handleShowImage} disabled={downloading} style={{ marginTop: 10 }}>
        {downloading ? "Đang tạo ảnh..." : "Hóa đơn"}
      </button>

      {imgUrl && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0,0,0,.85)",
            overflowY: "auto",
            padding: "16px 16px 32px"
          }}
        >
          <div style={{ maxWidth: 440, margin: "0 auto" }}>
            <p style={{ color: "#fff", textAlign: "center", fontWeight: 700, margin: "4px 0 12px" }}>
              Nhấn giữ vào ảnh → chọn “Lưu hình ảnh”
            </p>
            <img
              src={imgUrl}
              alt={`Hóa đơn ${data.code}`}
              style={{ width: "100%", height: "auto", borderRadius: 10, background: "#fff", display: "block" }}
            />
            <button
              type="button"
              className="cta"
              onClick={() => setImgUrl(null)}
              style={{ marginTop: 14 }}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
