"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Receipt, { ReceiptData } from "./Receipt";
import { pixelTrack } from "@/lib/pixel";
import {
  computePricing,
  normalizeTiers,
  tierRangeLabel,
  getUnit,
  mergeLines,
  MAX_LINE_QTY,
  MAX_TOTAL_QTY,
  type OrderLine,
  type Variant
} from "@/lib/pricing";

type Attribute = { name: string; values: string[]; images?: Record<string, string> };

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

  const defaultAttrs = () => Object.fromEntries(attributes.map((a) => [a.name, a.values[0] || ""]));

  const [sending, setSending] = useState(false);
  // Khoá chống bấm đúp: setState chưa kịp cập nhật giữa hai lần bấm sát nhau, ref thì có hiệu lực ngay
  const submittingRef = useRef(false);
  // Chỉ báo InitiateCheckout một lần cho mỗi lần xem trang
  const checkoutSentRef = useRef(false);
  // Thời điểm form hiện ra, gửi kèm để server phát hiện bot điền form quá nhanh
  const mountedAt = useRef(0);
  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  // false = chỉ hiện phần chọn loại/số lượng; true = đã bấm "Đặt hàng ngay", hiện ô điền thông tin
  const [showInfo, setShowInfo] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  // Phiếu xác nhận hiện lên thì cuộn tới để khách thấy ngay
  useEffect(() => {
    if (receipt) receiptRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [receipt]);

  function trackCheckoutOnce() {
    if (checkoutSentRef.current) return;
    checkoutSentRef.current = true;
    pixelTrack("InitiateCheckout", {
      value: pricing.total,
      currency: "VND",
      content_ids: [productId],
      content_type: "product",
      num_items: totalQty
    });
  }

  function revealInfo() {
    setShowInfo(true);
    trackCheckoutOnce();
    // đợi ô thông tin hiện ra rồi cuộn tới
    setTimeout(() => infoRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
  }

  // Thanh "Mua ngay" cố định: chưa hiện thông tin thì mở ra, đã hiện rồi thì gửi đơn
  function handleBarClick() {
    if (!showInfo) revealInfo();
    else formRef.current?.requestSubmit();
  }
  const [lines, setLines] = useState<OrderLine[]>([{ attrs: defaultAttrs(), qty: 1 }]);

  const totalQty = lines.reduce((s, l) => s + l.qty, 0);
  const pricing = useMemo(() => computePricing(variants, basePrice, totalQty), [variants, basePrice, totalQty]);
  const tiers = useMemo(() => normalizeTiers(variants, basePrice), [variants, basePrice]);
  const unit = getUnit(variants);
  const hasTiers = tiers.length > 1;
  const retailPrice = tiers[0].unitPrice;

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
    // Bấm Enter khi chưa hiện ô thông tin: mở ô thông tin thay vì gửi
    if (!showInfo) {
      revealInfo();
      return;
    }
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSending(true);
    setError("");

    const form = e.currentTarget;
    const fd = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const merged = mergeLines(lines);

    const payload = {
      productId,
      name: (fd.name || "").trim(),
      phone: (fd.phone || "").trim(),
      address: (fd.address || "").trim(),
      lines: merged,
      hp: fd.hp_check || "",
      elapsed: mountedAt.current ? Date.now() - mountedAt.current : undefined,
      source: typeof window !== "undefined" ? window.location.search || "truc-tiep" : ""
    };

    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        // Server trả lý do bằng tiếng Việt (SĐT sai, địa chỉ thiếu, đặt quá nhiều...) thì hiện cho khách
        const info = await res.json().catch(() => null);
        throw new Error(info?.message || "failed");
      }
      const result = await res.json();

      setReceipt({
        code: result.code,
        name: payload.name,
        phone: payload.phone,
        address: payload.address,
        productName,
        lines: merged,
        quantity: result.quantity,
        total: result.total,
        pricingNote:
          result.tierQty > 1
            ? `${formatPrice(result.unitPrice)}/${unit} (mua từ ${result.tierQty} ${unit})`
            : undefined,
        createdAt: new Date().toLocaleString("vi-VN")
      });

      // Đơn trùng (bấm hai lần) chỉ hiện lại phiếu cũ, không tính thêm một lần mua.
      // Chỉ gửi giá trị đơn và mã sản phẩm, không gửi thông tin cá nhân của khách.
      if (!result.duplicate) {
        pixelTrack(
          "Purchase",
          {
            value: result.total,
            currency: "VND",
            content_ids: [productId],
            content_name: productName,
            content_type: "product",
            num_items: result.quantity
          },
          result.code
        );
      }
    } catch (e) {
      const msg = e instanceof Error && e.message !== "failed" && e.message !== "Failed to fetch" ? e.message : "";
      setError(msg || "Gửi đơn lỗi, bạn gọi hotline giúp shop nhé.");
    } finally {
      submittingRef.current = false;
      setSending(false);
    }
  }

  if (receipt) {
    return (
      <div ref={receiptRef} style={{ scrollMarginTop: 12 }}>
        <div style={{ background: "#e8f5e9", border: "1px solid #a5d6a7", borderRadius: 8, padding: 14, textAlign: "center", marginBottom: 14 }}>
          <b>Đặt hàng thành công!</b>
          <p style={{ margin: 0 }}>Shop sẽ gọi xác nhận trong hôm nay.</p>
        </div>
        <Receipt data={receipt} shopName={shopName} />
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} id="dathang" style={{ scrollMarginTop: 12 }}>
      <label style={{ marginTop: 0 }}>{hasAttrs ? "Chọn loại & số lượng *" : "Số lượng *"}</label>

      {hasTiers && (
        <div className="tier-box">
          <div className="tier-title">Mua càng nhiều, giá mỗi {unit} càng rẻ</div>
          <div className="tier-strip">
            {tiers.map((t, i) => {
              const active = totalQty > 0 && t.qty === pricing.tierQty;
              const off = Math.round((1 - t.unitPrice / retailPrice) * 100);
              return (
                <div key={t.qty} className={"tier-item" + (active ? " tier-active" : "")}>
                  <span className="tier-range">{tierRangeLabel(tiers, i, unit)}</span>
                  <b className="tier-price">{formatPrice(t.unitPrice)}</b>
                  <span className="tier-unit">/{unit}</span>
                  {off > 0 && <span className="tier-off">Giảm {off}%</span>}
                </div>
              );
            })}
          </div>
          {pricing.nextTier ? (
            <p className="tier-hint">
              Mua thêm <b>{pricing.nextTier.needMore} {unit}</b> để giảm còn{" "}
              <b>{formatPrice(pricing.nextTier.unitPrice)}/{unit}</b>
            </p>
          ) : (
            <p className="tier-hint tier-hint-ok">Bạn đang được giá tốt nhất</p>
          )}
        </div>
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
              {attributes.map((a) => {
                const hasImages = a.values.some((v) => a.images?.[v]);
                const current = line.attrs[a.name] || "";
                return (
                  <div key={a.name} style={hasImages ? { flex: "1 1 100%" } : undefined}>
                    <label>{a.name}</label>
                    {hasImages ? (
                      <div className="swatch-list" role="radiogroup" aria-label={a.name}>
                        {a.values.map((v) => (
                          <button
                            key={v}
                            type="button"
                            role="radio"
                            aria-checked={current === v}
                            className={"swatch" + (current === v ? " swatch-on" : "")}
                            onClick={() => setLineAttr(i, a.name, v)}
                          >
                            {a.images?.[v] && <img src={a.images[v]} alt="" />}
                            <span>{v}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <select value={current} onChange={(e) => setLineAttr(i, a.name, e.target.value)} required>
                        {a.values.map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
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
          Tổng tiền ({totalQty} {unit})
          {hasTiers && (
            <small style={{ display: "block", marginTop: 2 }}>
              {formatPrice(pricing.unitPrice)}/{unit}
              {pricing.savings > 0 && ` · tiết kiệm ${formatPrice(pricing.savings)}`}
            </small>
          )}
        </span>
        <b>{formatPrice(pricing.total)}</b>
      </div>

      {!showInfo && (
        <button type="button" className="cta" onClick={revealInfo} style={{ marginTop: 14 }}>
          ĐẶT HÀNG NGAY
        </button>
      )}

      {showInfo && (
        <div ref={infoRef} style={{ scrollMarginTop: 12 }}>
          <label style={{ marginTop: 14, fontSize: 15 }}>Thông tin nhận hàng</label>
          <label style={{ marginTop: 8 }}>Họ và tên *</label>
          <input name="name" required maxLength={60} autoComplete="name" placeholder="Nguyễn Thị A" />

          <label>Số điện thoại *</label>
          <input
            name="phone"
            type="tel"
            required
            maxLength={10}
            inputMode="numeric"
            autoComplete="tel"
            pattern="0[35789][0-9]{8}"
            title="Nhập 10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09"
            placeholder="0912345678"
          />

          <label>Địa chỉ nhận hàng *</label>
          <textarea
            name="address"
            rows={2}
            required
            minLength={10}
            maxLength={300}
            autoComplete="street-address"
            placeholder="Số nhà, xã/phường, quận/huyện, tỉnh"
          />

          {/* Ô bẫy bot: người thật không thấy và không điền */}
          <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
            <label>
              Để trống
              <input name="hp_check" tabIndex={-1} autoComplete="off" />
            </label>
          </div>

          <button type="submit" className="cta" disabled={sending} style={{ marginTop: 14 }}>
            {sending ? "Đang gửi..." : "XÁC NHẬN ĐẶT HÀNG"}
          </button>
          {error && <p className="note" style={{ color: "#c62828" }}>{error}</p>}
          <p className="note">Thanh toán khi nhận hàng · Shop gọi xác nhận trước khi giao.</p>
        </div>
      )}

      {/* Thanh cố định phía dưới màn hình */}
      <div className="bar">
        <button type="button" className="cta" onClick={handleBarClick} disabled={sending}>
          {sending ? "Đang gửi..." : "Mua ngay"}
        </button>
      </div>
    </form>
  );
}
