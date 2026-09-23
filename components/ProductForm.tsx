"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Attribute = { name: string; values: string };
type Combo = { qty: string; unitPrice: string };
type Review = { name: string; rating: string; text: string; images: string };

type Product = {
  id?: string;
  name?: string;
  category?: string;
  price?: number;
  oldPrice?: number | null;
  description?: string;
  images?: string[];
  video?: string | null;
  attributes?: { name: string; values: string[] }[];
  variants?: { qty: number; unitPrice?: number; price?: number }[];
  reviews?: { name: string; rating: number; text: string; images?: string[] }[];
  active?: boolean;
};

export default function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const isEdit = Boolean(product?.id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [attrs, setAttrs] = useState<Attribute[]>(
    product?.attributes?.length
      ? product.attributes.map((a) => ({ name: a.name, values: a.values.join(", ") }))
      : []
  );
  const [combos, setCombos] = useState<Combo[]>(
    product?.variants?.length
      ? product.variants.map((v) => ({
          qty: String(v.qty),
          unitPrice: String(v.unitPrice ?? Math.round(Number(v.price) / v.qty))
        }))
      : []
  );
  const [reviews, setReviews] = useState<Review[]>(
    product?.reviews?.length
      ? product.reviews.map((r) => ({ name: r.name, rating: String(r.rating), text: r.text, images: (r.images || []).join(", ") }))
      : []
  );

  function updateReview(i: number, field: keyof Review, value: string) {
    setReviews((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }
  function removeReview(i: number) {
    setReviews((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateAttr(i: number, field: "name" | "values", value: string) {
    setAttrs((prev) => prev.map((a, idx) => (idx === i ? { ...a, [field]: value } : a)));
  }
  function removeAttr(i: number) {
    setAttrs((prev) => prev.filter((_, idx) => idx !== i));
  }
  function updateCombo(i: number, field: "qty" | "unitPrice", value: string) {
    setCombos((prev) => prev.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));
  }
  function removeCombo(i: number) {
    setCombos((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const form = e.currentTarget;
    const fd = Object.fromEntries(new FormData(form)) as Record<string, string>;

    const payload = {
      name: fd.name,
      slug: fd.slug,
      category: fd.category,
      price: fd.price,
      oldPrice: fd.oldPrice,
      description: fd.description,
      images: fd.images,
      video: fd.video,
      // @ts-ignore
      active: form.active.checked,
      attributes: attrs
        .map((a) => ({ name: a.name.trim(), values: a.values.split(",").map((v) => v.trim()).filter(Boolean) }))
        .filter((a) => a.name && a.values.length > 0),
      variants: combos
        .map((c) => ({ qty: Math.floor(Number(c.qty)), unitPrice: Number(c.unitPrice) }))
        .filter((c) => c.qty > 1 && c.unitPrice > 0)
        .sort((a, b) => a.qty - b.qty),
      reviews: reviews
        .map((r) => ({
          name: r.name.trim(),
          rating: Math.min(5, Math.max(1, Number(r.rating) || 5)),
          text: r.text.trim(),
          images: r.images.split(",").map((v) => v.trim()).filter(Boolean)
        }))
        .filter((r) => r.name && r.text)
    };

    const url = isEdit ? `/api/admin/products/${product!.id}` : "/api/admin/products";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    setSaving(false);

    if (res.ok) {
      router.push("/admin/products");
      router.refresh();
    } else {
      setError("Lưu thất bại, kiểm tra lại thông tin.");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>Tên sản phẩm *</label>
      <input name="name" required defaultValue={product?.name} placeholder="Nồi chiên không dầu 5L" />

      {!isEdit && (
        <>
          <label>Đường dẫn (slug) — để trống sẽ tự tạo</label>
          <input name="slug" placeholder="noi-chien-khong-dau-5l" />
        </>
      )}

      <label>Danh mục</label>
      <input name="category" defaultValue={product?.category || "Đồ gia dụng"} />

      <div className="row">
        <div>
          <label>Giá bán mặc định *</label>
          <input name="price" type="number" required defaultValue={product?.price} placeholder="399000" />
        </div>
        <div>
          <label>Giá gốc (để gạch ngang, không bắt buộc)</label>
          <input name="oldPrice" type="number" defaultValue={product?.oldPrice || ""} placeholder="549000" />
        </div>
      </div>
      <p className="note" style={{ textAlign: "left" }}>
        Đây là giá lẻ khi khách mua 1 cái. Muốn giảm giá khi mua nhiều, thêm mốc giá ở mục bên dưới.
      </p>

      <label>Mô tả sản phẩm</label>
      <textarea name="description" rows={5} defaultValue={product?.description} placeholder="Chất liệu, công dụng, thông số..." />

      <label>Link ảnh (cách nhau bằng dấu phẩy, ảnh đầu tiên là ảnh đại diện)</label>
      <textarea
        name="images"
        rows={3}
        defaultValue={product?.images?.join(", ")}
        placeholder="https://i.postimg.cc/anh1.jpg, https://i.postimg.cc/anh2.jpg"
      />
      <p className="note" style={{ textAlign: "left" }}>
        Upload ảnh tại postimages.org rồi copy link "Direct link" dán vào đây. Khách vuốt qua lại giữa các ảnh.
      </p>

      <label>Link video ngắn (không bắt buộc)</label>
      <input name="video" defaultValue={product?.video || ""} placeholder="https://.../video.mp4" />

      {/* Thuộc tính tự đặt tên */}
      <label>Thuộc tính (không bắt buộc)</label>
      <p className="note" style={{ textAlign: "left", marginTop: 0 }}>
        Tự đặt tên thuộc tính (Màu, Kích thước, Loại vải...), khách sẽ chọn 1 giá trị mỗi thuộc tính khi đặt hàng.
      </p>
      {attrs.map((a, i) => (
        <div key={i} className="row" style={{ alignItems: "flex-end" }}>
          <div>
            <label>Tên thuộc tính</label>
            <input value={a.name} onChange={(e) => updateAttr(i, "name", e.target.value)} placeholder="Màu sắc" />
          </div>
          <div>
            <label>Giá trị (cách nhau bằng dấu phẩy)</label>
            <input value={a.values} onChange={(e) => updateAttr(i, "values", e.target.value)} placeholder="Đen, Trắng, Xanh" />
          </div>
          <button type="button" onClick={() => removeAttr(i)} className="btn btn-danger" style={{ marginBottom: 14 }}>
            Xóa
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-outline"
        onClick={() => setAttrs((prev) => [...prev, { name: "", values: "" }])}
      >
        + Thêm thuộc tính
      </button>

      {/* Combo: số lượng + giá */}
      <label style={{ marginTop: 24 }}>Mốc giá theo số lượng (không bắt buộc)</label>
      <p className="note" style={{ textAlign: "left", marginTop: 0 }}>
        Ví dụ: từ 2 cái giá 38.000đ/cái, từ 3 cái giá 33.000đ/cái. Khi khách mua đủ số lượng, TOÀN BỘ đơn được tính theo đơn giá mới (số lượng cộng dồn tất cả các loại). Mốc 1 cái dùng "Giá bán mặc định" ở trên.
      </p>
      {combos.map((c, i) => (
        <div key={i} className="row" style={{ alignItems: "flex-end" }}>
          <div>
            <label>Từ số lượng (cái)</label>
            <input type="number" min="1" value={c.qty} onChange={(e) => updateCombo(i, "qty", e.target.value)} placeholder="2" />
          </div>
          <div>
            <label>Đơn giá mỗi cái (đ)</label>
            <input type="number" value={c.unitPrice} onChange={(e) => updateCombo(i, "unitPrice", e.target.value)} placeholder="38000" />
          </div>
          <button type="button" onClick={() => removeCombo(i)} className="btn btn-danger" style={{ marginBottom: 14 }}>
            Xóa
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-outline"
        onClick={() => setCombos((prev) => [...prev, { qty: "", unitPrice: "" }])}
      >
        + Thêm mốc giá
      </button>

      {/* Đánh giá thật */}
      <label style={{ marginTop: 24 }}>Đánh giá khách hàng (không bắt buộc)</label>
      <p className="note" style={{ textAlign: "left", marginTop: 0 }}>
        Chỉ nhập đánh giá THẬT từ khách đã mua (copy từ tin nhắn Zalo/SMS khách gửi). Không tự bịa — vi phạm luật quảng cáo.
      </p>
      {reviews.map((r, i) => (
        <div key={i} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 12, marginBottom: 10 }}>
          <div className="row">
            <div>
              <label>Tên khách</label>
              <input value={r.name} onChange={(e) => updateReview(i, "name", e.target.value)} placeholder="Chị Lan" />
            </div>
            <div>
              <label>Số sao (1-5)</label>
              <input
                type="number"
                min="1"
                max="5"
                value={r.rating}
                onChange={(e) => updateReview(i, "rating", e.target.value)}
                placeholder="5"
              />
            </div>
          </div>
          <label>Nội dung đánh giá</label>
          <textarea rows={2} value={r.text} onChange={(e) => updateReview(i, "text", e.target.value)} placeholder="Hàng đúng mô tả, giao nhanh..." />
          <label>Ảnh khách gửi (không bắt buộc, cách nhau bằng dấu phẩy)</label>
          <input
            value={r.images}
            onChange={(e) => updateReview(i, "images", e.target.value)}
            placeholder="https://i.postimg.cc/anh-khach-1.jpg, https://i.postimg.cc/anh-khach-2.jpg"
          />
          <button type="button" onClick={() => removeReview(i)} className="btn btn-danger" style={{ marginTop: 6 }}>
            Xóa đánh giá này
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-outline"
        onClick={() => setReviews((prev) => [...prev, { name: "", rating: "5", text: "", images: "" }])}
      >
        + Thêm đánh giá thật
      </button>

      <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 24 }}>
        <input
          type="checkbox"
          name="active"
          defaultChecked={product?.active !== false}
          style={{ width: "auto" }}
        />
        Hiển thị sản phẩm này trên web
      </label>

      <br />
      <button type="submit" className="cta" disabled={saving}>
        {saving ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Tạo sản phẩm"}
      </button>
      {error && <p className="note" style={{ color: "#c62828" }}>{error}</p>}
    </form>
  );
}
