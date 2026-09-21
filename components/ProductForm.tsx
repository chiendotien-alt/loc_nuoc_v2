"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Product = {
  id?: string;
  name?: string;
  category?: string;
  price?: number;
  oldPrice?: number | null;
  description?: string;
  images?: string[];
  colors?: string[];
  sizes?: string[];
  active?: boolean;
};

export default function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const isEdit = Boolean(product?.id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    // @ts-ignore
    data.active = form.active.checked;

    const url = isEdit ? `/api/admin/products/${product!.id}` : "/api/admin/products";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
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
          <label>Giá bán *</label>
          <input name="price" type="number" required defaultValue={product?.price} placeholder="399000" />
        </div>
        <div>
          <label>Giá gốc (để gạch ngang, không bắt buộc)</label>
          <input name="oldPrice" type="number" defaultValue={product?.oldPrice || ""} placeholder="549000" />
        </div>
      </div>

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
        Upload ảnh tại postimages.org (miễn phí, không cần tài khoản) rồi copy link "Direct link" dán vào đây.
      </p>

      <div className="row">
        <div>
          <label>Màu (cách nhau bằng dấu phẩy, để trống nếu không có)</label>
          <input name="colors" defaultValue={product?.colors?.join(", ")} placeholder="Trắng, Đen" />
        </div>
        <div>
          <label>Size (để trống nếu không có)</label>
          <input name="sizes" defaultValue={product?.sizes?.join(", ")} placeholder="S, M, L, XL" />
        </div>
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
