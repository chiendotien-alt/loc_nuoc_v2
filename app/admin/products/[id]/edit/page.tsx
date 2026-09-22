import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import ProductForm from "@/components/ProductForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Attribute = { name: string; values: string[] };
type Variant = { qty: number; price: number };

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({ where: { id: params.id } });
  if (!product) notFound();

  const productForForm = {
    ...product,
    attributes: (product.attributes as unknown as Attribute[]) || [],
    variants: (product.variants as unknown as Variant[]) || []
  };

  return (
    <div className="wrap" style={{ paddingTop: 20 }}>
      <Link href="/admin/products" className="note">
        ← Quay lại danh sách
      </Link>
      <h1>Sửa: {product.name}</h1>
      <ProductForm product={productForForm} />
    </div>
  );
}
