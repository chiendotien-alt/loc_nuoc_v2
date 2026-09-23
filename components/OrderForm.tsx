"use client";

import { useMemo, useState } from "react";
import Receipt, { ReceiptData } from "./Receipt";
import {
  computePricing,
  mergeLines,
  MAX_LINE_QTY,
  MAX_TOTAL_QTY,
  type OrderLine,
  type Variant
} from "@/lib/pricing";

type Attribute = { name: string; values: string[] };

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
  const hasAttrs = attributes.length > 0;
  const hasCombo = variants.length > 0;

  const defaultAttrs = () => Object.fromEntries(attributes.map((a) => [a.name, a.values[0] || ""]));

  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [lines, setLines] = useState<OrderLine[]>([{ attrs: defaultAttrs(), qty: 1 }]);

  const totalQty = lines.reduce((s, l) => s + l.qty, 0);
  const pricing = useMemo(() => computePricing(variants, basePrice, totalQty), [variants, basePrice, totalQty]);
  const comboParts = pricing.parts.filter((p) => p.qty > 1);
  const sortedVariants = useMemo(() => [...variants].sort((a, b) => a.qty - b.qty), [variants]);

  function updateLine(i: number, patch: Partial<OrderLine>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function setLineAttr(i: number, name: string, value: string) {
    setLines((prev) =>
      prev.map((l, idx) => (idx === i ? { ...l, attrs: { ...l.attrs, [name]: value } } : l))
    );
  }

  function setLineQty(i: number, raw: number) {
    setLines((prev) => {
      const others = prev.reduce((s, l, idx) => (idx === i ? s : s + l.qty), 0);
      const max = Math.min(MAX_LINE_QTY, MAX_TOTAL_QTY - others);
      const qty = Math.min(Math.max(1, Math.floor(raw) || 1), Math.max(1, max));
      return prev.map((l, idx) => (idx === i ? { ...l, qty } : l));
    });
  }

  function addLine() {
    setLines((prev) => [...prev, { attrs: defaultAttrs(), qty: 1 }]);
  }

  function removeLine(i: number) {
    setLines((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError("");

    const form = e.currentTarget;
    const fd = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const merged = mergeLines(lines);

    const payload = {
      productId,
      name: fd.name,
      phone: fd.phone,
      address: fd.address,
      lines: merged,
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
        lines: merged,
        quantity: result.quantity,
        total: result.total,
        pricingNote: (result.parts as { qty: number; count: number }[] | undefined)
          ?.filter((p) => p.qty > 1)
          .map((p) => `${p.count} × combo ${p.qty} cái`)
          .join(" + "),
        createdAt: new Date().toLocaleString("vi-VN")
      });

      // @ts-ignore
      if (window.fbq) window.fbq("track", "Purchase", { value: result.total, currency: "VND" });
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
      <label>Họ và tên *</label>
      <input name="name" required placeholder="Nguyễn Thị A" />

      <label>Số điện thoại *</label>
      <input name="phone" type="tel" required pattern="0[0-9]{9}" placeholder="0912345678" />

      <label>Địa chỉ nhận hàng *</label>
      <textarea name="address" rows={2} required placeholder="Số nhà, xã/phường, quận/huyện, tỉnh" />

      <label style={{ marginTop: 14 }}>{hasAttrs ? "Chọn loại & số lượng *" : "Số lượng *"}</label>

      {hasCombo && (
        <p className="note" style={{ textAlign: "left", margin: "0 0 8px" }}>
          Mua nhiều giá rẻ hơn:{" "}
          {sortedVariants.map((v, i) => (
            <span key={v.qty}>
              {i > 0 && " · "}
              <b>{v.qty === 1 ? "1 cái" : `Combo ${v.qty}`}</b> {formatPrice(v.price)}
            </span>
          ))}
        </p>
      )}

      {lines.map((line, i) => (
        <div key={i} className="unit-card">
          {(hasAttrs || lines.length > 1) && (
            <div className="line-head">
              <b>{hasAttrs ? `Loại ${i + 1}` : "Số lượng"}</b>
              {lines.length > 1 && (
                <button type="button" className="line-remove" onClick={() => removeLine(i)} aria-label={`Xoá loại ${i + 1}`}>
                  Xoá
                </button>
              )}
            </div>
          )}

          {hasAttrs && (
            <div className="row" style={{ flexWrap: "wrap" }}>
              {attributes.map((a) => (
                <div key={a.name}>
                  <label>{a.name}</label>
                  <select value={line.attrs[a.name] || ""} onChange={(e) => setLineAttr(i, a.name, e.target.value)} required>
                    {a.values.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}

          <div className="qty-row">
            <span>Số lượng</span>
            <div className="qty-stepper">
              <button type="button" onClick={() => setLineQty(i, line.qty - 1)} disabled={line.qty <= 1} aria-label="Giảm">
                −
              </button>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_LINE_QTY}
                value={line.qty}
                onChange={(e) => setLineQty(i, Number(e.target.value))}
                aria-label="Số lượng"
              />
              <button type="button" onClick={() => setLineQty(i, line.qty + 1)} disabled={totalQty >= MAX_TOTAL_QTY || line.qty >= MAX_LINE_QTY} aria-label="Tăng">
                +
              </button>
            </div>
          </div>
        </div>
      ))}

      {hasAttrs && (
        <button type="button" className="btn btn-outline add-line" onClick={addLine} disabled={totalQty >= MAX_TOTAL_QTY}>
          + Thêm loại khác
        </button>
      )}

      <div className="total-box">
        <span>
          Tổng tiền ({totalQty} cái)
          {comboParts.length > 0 && (
            <small style={{ display: "block", marginTop: 2 }}>
              Áp dụng {comboParts.map((p) => `${p.count} × combo ${p.qty}`).join(" + ")}
            </small>
          )}
        </span>
        <b>{formatPrice(pricing.total)}</b>
      </div>

      <button type="submit" className="cta" disabled={sending}>
        {sending ? "Đang gửi..." : "Mua ngay"}
      </button>
      {error && <p className="note" style={{ color: "#c62828" }}>{error}</p>}
      <p className="note">Thanh toán khi nhận hàng · Shop gọi xác nhận trước khi giao.</p>
    </form>
  );
}
