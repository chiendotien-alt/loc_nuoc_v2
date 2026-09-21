import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import ProductForm from "@/components/ProductForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({ where: { id: params.id } });
  if (!product) notFound();

  return (
    <div className="wrap" style={{ paddingTop: 20 }}>
      <Link href="/admin/products" className="note">
        ← Quay lại danh sách
      </Link>
      <h1>Sửa: {product.name}</h1>
      <ProductForm product={product} />
    </div>
  );
}
