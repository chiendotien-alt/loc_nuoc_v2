import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

function formatPrice(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

export default async function HomePage() {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" }
  });

  const shopName = process.env.NEXT_PUBLIC_SHOP_NAME || "Đồ Gia Dụng Shop";

  return (
    <div className="wrap-wide">
      <h1 style={{ marginTop: 16 }}>{shopName}</h1>
      <p style={{ color: "var(--muted)" }}>Đồ gia dụng chính hãng, giá tốt, giao toàn quốc</p>

      {products.length === 0 && (
        <p className="note" style={{ marginTop: 30 }}>
          Chưa có sản phẩm nào. Vào /admin để thêm sản phẩm đầu tiên.
        </p>
      )}

      <div className="grid">
        {products.map((p) => (
          <Link key={p.id} href={`/p/${p.slug}`} className="card">
            <img src={p.images[0] || "https://placehold.co/300x400?text=San+pham"} alt={p.name} />
            <div className="info">
              <div className="name">{p.name}</div>
              <div className="p">{formatPrice(p.price)}</div>
            </div>
          </Link>
        ))}
      </div>

      <footer>
        {shopName} · <a href="/admin">Quản trị</a>
      </footer>
    </div>
  );
}
