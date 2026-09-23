"use client";

import { useRef, useState } from "react";

export type ReceiptData = {
  code: string;
  name: string;
  phone: string;
  address: string;
  productName: string;
  attributesSelected: Record<string, string>[];
  quantity: number;
  price: number;
  total: number;
  createdAt: string;
};

function formatPrice(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

export default function Receipt({ data, shopName }: { data: ReceiptData; shopName: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (!ref.current) return;
    setDownloading(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(ref.current, { backgroundColor: "#ffffff", pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `phieu-${data.code}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      alert("Không tải được ảnh, bạn chụp màn hình phiếu này thay thế nhé.");
    } finally {
      setDownloading(false);
    }
  }

  const units = data.attributesSelected || [];
  const showPerUnit = units.length > 1 && units.some((u) => Object.keys(u || {}).length > 0);
  const sharedEntries = !showPerUnit ? Object.entries(units[0] || {}).filter(([, v]) => v) : [];

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
        {sharedEntries.map(([k, v]) => (
          <div className="receipt-row" key={k}>
            <span>{k}</span>
            <b>{v}</b>
          </div>
        ))}
        {showPerUnit &&
          units.map((u, i) => {
            const entries = Object.entries(u || {}).filter(([, v]) => v);
            if (entries.length === 0) return null;
            return (
              <div className="receipt-row" key={i}>
                <span>Cái {i + 1}</span>
                <b>{entries.map(([, v]) => v).join(" · ")}</b>
              </div>
            );
          })}
        <div className="receipt-row">
          <span>Số lượng</span>
          <b>{data.quantity}</b>
        </div>
        <div className="receipt-row">
          <span>Đơn giá</span>
          <b>{formatPrice(data.price)}</b>
        </div>
        <hr />
        <div className="receipt-row receipt-total">
          <span>Tổng tiền</span>
          <b>{formatPrice(data.total)}</b>
        </div>
        <div className="receipt-note">Thanh toán khi nhận hàng (COD) · {data.createdAt}</div>
      </div>

      <button type="button" className="cta" onClick={handleDownload} disabled={downloading} style={{ marginTop: 10 }}>
        {downloading ? "Đang tạo ảnh..." : "Tải phiếu (ảnh)"}
      </button>
    </div>
  );
}
