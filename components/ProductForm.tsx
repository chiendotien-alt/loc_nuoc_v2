"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Attribute = { name: string; values: string };
type Combo = { qty: string; price: string };

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
  variants?: { qty: number; price: number }[];
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
      ? product.variants.map((v) => ({ qty: String(v.qty), price: String(v.price) }))
      : []
  );

  function updateAttr(i: number, field: "name" | "values", value: string) {
    setAttrs((prev) => prev.map((a, idx) => (idx === i ? { ...a, [field]: value } : a)));
  }
  function removeAttr(i: number) {
    setAttrs((prev) => prev.filter((_, idx) => idx !== i));
  }
  function updateCombo(i: number, field: "qty" | "price", value: string) {
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
        .map((c) => ({ qty: Number(c.qty), price: Number(c.price) }))
        .filter((c) => c.qty > 0 && c.price > 0)
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
        Giá này chỉ dùng khi sản phẩm KHÔNG có combo (mục bên dưới). Nếu có combo, khách sẽ chọn giá theo combo.
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
      <label style={{ marginTop: 24 }}>Combo (không bắt buộc)</label>
      <p className="note" style={{ textAlign: "left", marginTop: 0 }}>
        Ví dụ: 1 cái giá 599.000đ, 2 cái giá 1.090.000đ... Khách chọn combo thay vì tự nhập số lượng.
      </p>
      {combos.map((c, i) => (
        <div key={i} className="row" style={{ alignItems: "flex-end" }}>
          <div>
            <label>Số lượng (cái)</label>
            <input type="number" min="1" value={c.qty} onChange={(e) => updateCombo(i, "qty", e.target.value)} placeholder="2" />
          </div>
          <div>
            <label>Giá cho combo này</label>
            <input type="number" value={c.price} onChange={(e) => updateCombo(i, "price", e.target.value)} placeholder="1090000" />
          </div>
          <button type="button" onClick={() => removeCombo(i)} className="btn btn-danger" style={{ marginBottom: 14 }}>
            Xóa
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-outline"
        onClick={() => setCombos((prev) => [...prev, { qty: "", price: "" }])}
      >
        + Thêm combo
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
