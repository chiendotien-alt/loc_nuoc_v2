"use client";

import { useState } from "react";
import Receipt, { ReceiptData } from "./Receipt";

type Attribute = { name: string; values: string[] };
type Variant = { qty: number; price: number };

function formatPrice(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

export default function OrderForm({
  productId,
  productName,
  basePrice,
  attributes,
  variants,
  shopName
}: {
  productId: string;
  productName: string;
  basePrice: number;
  attributes: Attribute[];
  variants: Variant[];
  shopName: string;
}) {
  const hasCombo = variants.length > 0;

  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const [selectedCombo, setSelectedCombo] = useState<number>(variants[0]?.qty || 0);
  const [quantity, setQuantity] = useState(1);
  const [selectedAttrs, setSelectedAttrs] = useState<Record<string, string>>(
    Object.fromEntries(attributes.map((a) => [a.name, a.values[0] || ""]))
  );

  const unitPrice = hasCombo ? variants.find((v) => v.qty === selectedCombo)?.price || basePrice : basePrice;
  const finalQty = hasCombo ? selectedCombo : quantity;
  const total = hasCombo ? unitPrice : unitPrice * quantity;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError("");

    const form = e.currentTarget;
    const fd = Object.fromEntries(new FormData(form)) as Record<string, string>;

    const payload = {
      productId,
      name: fd.name,
      phone: fd.phone,
      address: fd.address,
      attributes: selectedAttrs,
      comboQty: hasCombo ? selectedCombo : null,
      quantity: finalQty,
      source: typeof window !== "undefined" ? window.location.search || "truc-tiep" : ""
    };

    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("failed");
      const result = await res.json();

      setReceipt({
        code: result.code,
        name: fd.name,
        phone: fd.phone,
        address: fd.address,
        productName,
        attributesSelected: selectedAttrs,
        quantity: finalQty,
        price: result.price,
        total: result.total,
        createdAt: new Date().toLocaleString("vi-VN")
      });

      // @ts-ignore
      if (window.fbq) window.fbq("track", "Purchase", { value: total, currency: "VND" });
    } catch {
      setError("Gửi đơn lỗi, bạn gọi hotline giúp shop nhé.");
    } finally {
      setSending(false);
    }
  }

  if (receipt) {
    return (
      <div>
        <div style={{ background: "#e8f5e9", border: "1px solid #a5d6a7", borderRadius: 8, padding: 14, textAlign: "center", marginBottom: 14 }}>
          <b>Đặt hàng thành công!</b>
          <p style={{ margin: 0 }}>Shop sẽ gọi xác nhận trong hôm nay.</p>
        </div>
        <Receipt data={receipt} shopName={shopName} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {hasCombo && (
        <>
          <label>Chọn combo *</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 4 }}>
            {variants.map((v) => (
              <label
                key={v.qty}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  border: `2px solid ${selectedCombo === v.qty ? "var(--accent)" : "var(--line)"}`,
                  borderRadius: 8,
                  padding: "10px 14px",
                  cursor: "pointer",
                  fontWeight: 400
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="radio"
                    checked={selectedCombo === v.qty}
                    onChange={() => setSelectedCombo(v.qty)}
                    style={{ width: "auto" }}
                  />
                  {v.qty === 1 ? "Mua 1 cái" : `Combo ${v.qty} cái`}
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

      {attributes.length > 0 && (
        <div className="row" style={{ flexWrap: "wrap" }}>
          {attributes.map((a) => (
            <div key={a.name}>
              <label>{a.name} *</label>
              <select
                value={selectedAttrs[a.name] || ""}
                onChange={(e) => setSelectedAttrs((prev) => ({ ...prev, [a.name]: e.target.value }))}
                required
              >
                {a.values.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {!hasCombo && (
        <>
          <label>Số lượng</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              style={{ maxWidth: 100 }}
            />
            {[1, 2, 3].map((n) => (
              <button
                type="button"
                key={n}
                onClick={() => setQuantity(n)}
                className={quantity === n ? "btn" : "btn btn-outline"}
                style={{ padding: "9px 14px" }}
              >
                {n}
              </button>
            ))}
          </div>
        </>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--soft)",
          borderRadius: 8,
          padding: "12px 16px",
          margin: "16px 0"
        }}
      >
        <span>Tổng tiền</span>
        <b style={{ fontSize: 20, color: "var(--accent)" }}>{formatPrice(total)}</b>
      </div>

      <button type="submit" className="cta" disabled={sending}>
        {sending ? "Đang gửi..." : "ĐẶT HÀNG - THANH TOÁN KHI NHẬN"}
      </button>
      {error && <p className="note" style={{ color: "#c62828" }}>{error}</p>}
      <p className="note">Shop gọi xác nhận trước khi giao. Giao 3-5 ngày.</p>
    </form>
  );
}
