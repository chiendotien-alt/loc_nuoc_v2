"use client";

import { useEffect, useState } from "react";
import Receipt, { ReceiptData } from "./Receipt";

type Attribute = { name: string; values: string[] };
type Variant = { qty: number; price: number };

function formatPrice(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

const MAX_PER_UNIT = 10;

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

  const unitsCount = hasCombo ? selectedCombo : quantity;
  const perUnitMode = attributes.length > 0 && unitsCount > 1 && unitsCount <= MAX_PER_UNIT;

  const defaultAttrs = () => Object.fromEntries(attributes.map((a) => [a.name, a.values[0] || ""]));

  // Lựa chọn thuộc tính chung (khi không cần chọn riêng từng cái)
  const [sharedAttrs, setSharedAttrs] = useState<Record<string, string>>(defaultAttrs());
  // Lựa chọn thuộc tính riêng cho từng cái (khi mua nhiều, mỗi cái 1 biến thể)
  const [perUnitAttrs, setPerUnitAttrs] = useState<Record<string, string>[]>([]);

  useEffect(() => {
    if (perUnitMode) {
      setPerUnitAttrs((prev) => {
        const next = [...prev];
        while (next.length < unitsCount) next.push(defaultAttrs());
        next.length = unitsCount;
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perUnitMode, unitsCount]);

  const unitPrice = hasCombo ? variants.find((v) => v.qty === selectedCombo)?.price || basePrice : basePrice;
  const total = hasCombo ? unitPrice : unitPrice * quantity;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError("");

    const form = e.currentTarget;
    const fd = Object.fromEntries(new FormData(form)) as Record<string, string>;

    const attributesPerUnit = perUnitMode ? perUnitAttrs : Array(unitsCount || 1).fill(sharedAttrs);

    const payload = {
      productId,
      name: fd.name,
      phone: fd.phone,
      address: fd.address,
      attributes: attributesPerUnit,
      comboQty: hasCombo ? selectedCombo : null,
      quantity: unitsCount,
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
        attributesSelected: attributesPerUnit,
        quantity: unitsCount,
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
    <form onSubmit={handleSubmit} id="order-form">
      {hasCombo && (
        <>
          <label>Chọn combo *</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 4 }}>
            {variants.map((v) => (
              <label
                key={v.qty}
                className={`combo-option ${selectedCombo === v.qty ? "combo-option-active" : ""}`}
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

      {attributes.length > 0 && !perUnitMode && (
        <div className="row" style={{ flexWrap: "wrap" }}>
          {attributes.map((a) => (
            <div key={a.name}>
              <label>{a.name} *</label>
              <select
                value={sharedAttrs[a.name] || ""}
                onChange={(e) => setSharedAttrs((prev) => ({ ...prev, [a.name]: e.target.value }))}
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

      {perUnitMode && (
        <div style={{ marginTop: 10 }}>
          <p className="note" style={{ textAlign: "left", margin: "0 0 8px" }}>
            Bạn mua {unitsCount} cái — chọn riêng từng cái nếu muốn khác biến thể:
          </p>
          {Array.from({ length: unitsCount }).map((_, i) => (
            <div key={i} className="unit-card">
              <b>Sản phẩm {i + 1}</b>
              <div className="row" style={{ flexWrap: "wrap", marginTop: 6 }}>
                {attributes.map((a) => (
                  <div key={a.name}>
                    <label>{a.name}</label>
                    <select
                      value={perUnitAttrs[i]?.[a.name] || a.values[0] || ""}
                      onChange={(e) =>
                        setPerUnitAttrs((prev) => {
                          const next = [...prev];
                          next[i] = { ...next[i], [a.name]: e.target.value };
                          return next;
                        })
                      }
                    >
                      {a.values.map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="total-box">
        <span>Tổng tiền</span>
        <b>{formatPrice(total)}</b>
      </div>

      <button type="submit" className="cta" disabled={sending}>
        {sending ? "Đang gửi..." : "Mua ngay"}
      </button>
      {error && <p className="note" style={{ color: "#c62828" }}>{error}</p>}
      <p className="note">Thanh toán khi nhận hàng · Shop gọi xác nhận trước khi giao.</p>
    </form>
  );
}
