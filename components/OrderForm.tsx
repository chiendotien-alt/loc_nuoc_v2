"use client";

import { useState } from "react";

type Variant = { name: string; price: number };

function formatPrice(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

export default function OrderForm({
  productId,
  colors,
  sizes,
  variants
}: {
  productId: string;
  productName: string;
  colors: string[];
  sizes: string[];
  variants: Variant[];
}) {
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [selectedVariant, setSelectedVariant] = useState(variants[0]?.name || "");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError("");

    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    data.productId = productId;
    data.source = typeof window !== "undefined" ? window.location.search || "truc-tiep" : "";

    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("failed");
      setDone(true);
      // @ts-ignore
      if (window.fbq) window.fbq("track", "Purchase", { value: 0, currency: "VND" });
    } catch {
      setError("Gửi đơn lỗi, bạn gọi hotline giúp shop nhé.");
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div style={{ background: "#e8f5e9", border: "1px solid #a5d6a7", borderRadius: 8, padding: 18, textAlign: "center", marginTop: 14 }}>
        <b>Đặt hàng thành công!</b>
        <p>Shop sẽ gọi xác nhận trong hôm nay. Bạn để ý điện thoại nhé.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {variants.length > 0 && (
        <>
          <label>Chọn combo *</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 4 }}>
            {variants.map((v) => (
              <label
                key={v.name}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  border: `2px solid ${selectedVariant === v.name ? "var(--accent)" : "var(--line)"}`,
                  borderRadius: 8,
                  padding: "10px 14px",
                  cursor: "pointer",
                  fontWeight: 400
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="radio"
                    name="variant"
                    value={v.name}
                    checked={selectedVariant === v.name}
                    onChange={() => setSelectedVariant(v.name)}
                    style={{ width: "auto" }}
                  />
                  {v.name}
                </span>
                <b style={{ color: "var(--accent)" }}>{formatPrice(v.price)}</b>
              </label>
            ))}
          </div>
        </>
      )}

      <label>Họ và tên *</label>
      <input name="name" required placeholder="Nguyễn Thị A" />

      <label>Số điện thoại *</label>
      <input name="phone" type="tel" required pattern="0[0-9]{9}" placeholder="0912345678" />

      <label>Địa chỉ nhận hàng *</label>
      <textarea name="address" rows={2} required placeholder="Số nhà, xã/phường, quận/huyện, tỉnh" />

      {(colors.length > 0 || sizes.length > 0) && (
        <div className="row">
          {colors.length > 0 && (
            <div>
              <label>Màu *</label>
              <select name="color" required defaultValue={colors[0]}>
                {colors.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          )}
          {sizes.length > 0 && (
            <div>
              <label>Size *</label>
              <select name="size" required defaultValue={sizes[0]}>
                {sizes.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {variants.length === 0 && (
        <>
          <label>Số lượng</label>
          <select name="quantity" defaultValue="1">
            <option>1</option>
            <option>2</option>
            <option>3</option>
          </select>
        </>
      )}

      <br />
      <br />
      <button type="submit" className="cta" disabled={sending}>
        {sending ? "Đang gửi..." : `ĐẶT HÀNG - THANH TOÁN KHI NHẬN`}
      </button>
      {error && <p className="note" style={{ color: "#c62828" }}>{error}</p>}
      <p className="note">Shop gọi xác nhận trước khi giao. Giao 3-5 ngày.</p>
    </form>
  );
}
