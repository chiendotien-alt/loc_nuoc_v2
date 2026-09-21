import ProductForm from "@/components/ProductForm";
import Link from "next/link";

export default function NewProductPage() {
  return (
    <div className="wrap" style={{ paddingTop: 20 }}>
      <Link href="/admin/products" className="note">
        ← Quay lại danh sách
      </Link>
      <h1>Thêm sản phẩm</h1>
      <ProductForm />
    </div>
  );
}
