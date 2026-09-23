import { prisma } from "@/lib/db";
import Link from "next/link";
import DeleteButton from "./DeleteButton";

export const dynamic = "force-dynamic";

function formatPrice(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="wrap-wide" style={{ paddingTop: 20 }}>
      <div className="admin-header">
        <h1 style={{ margin: 0 }}>Sản phẩm ({products.length})</h1>
        <Link href="/admin/products/new" className="btn">
          + Thêm sản phẩm
        </Link>
      </div>

      <div className="admin-list">
        {products.length === 0 && (
          <div className="admin-row">Chưa có sản phẩm nào.</div>
        )}
        {products.map((p) => (
          <div className="admin-row" key={p.id}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <img
                src={p.images[0] || "https://placehold.co/60x60"}
                alt=""
                style={{ width: 56, height: 56, objectFit: "contain", background: "#fff", borderRadius: 4 }}
              />
              <div>
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>
                  {formatPrice(p.price)} · {p.category}
                  {!p.active && <span className="badge" style={{ marginLeft: 6 }}>Ẩn</span>}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <a href={`/p/${p.slug}`} target="_blank" className="btn btn-outline">
                Xem
              </a>
              <Link href={`/admin/products/${p.id}/edit`} className="btn btn-outline">
                Sửa
              </Link>
              <DeleteButton id={p.id} name={p.name} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
