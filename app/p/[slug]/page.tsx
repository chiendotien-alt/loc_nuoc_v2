import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import OrderForm from "@/components/OrderForm";
import ChatWidget from "@/components/ChatWidget";

export const dynamic = "force-dynamic";

function formatPrice(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await prisma.product.findUnique({ where: { slug: params.slug } });
  if (!product || !product.active) notFound();

  const discount =
    product.oldPrice && product.oldPrice > product.price
      ? Math.round(100 - (product.price / product.oldPrice) * 100)
      : null;

  return (
    <div className="wrap">
      <img src={product.images[0] || "https://placehold.co/560x700?text=San+pham"} alt={product.name} />
      <h1>{product.name}</h1>

      <div className="price">
        <span className="new">{formatPrice(product.price)}</span>
        {product.oldPrice && <span className="old">{formatPrice(product.oldPrice)}</span>}
        {discount && <span className="tag">-{discount}%</span>}
      </div>

      <a href="#dathang" className="cta">
        ĐẶT HÀNG NGAY
      </a>

      <ul className="trust">
        <li>Được mở hàng kiểm tra trước khi thanh toán</li>
        <li>Đổi hàng miễn phí trong 7 ngày</li>
        <li>Miễn phí giao hàng toàn quốc</li>
        <li>Thanh toán khi nhận hàng (COD)</li>
      </ul>

      {product.images.length > 1 && (
        <>
          <h2>Hình ảnh thật</h2>
          <div className="gallery">
            {product.images.slice(1).map((src, i) => (
              <img key={i} src={src} alt={`${product.name} ${i + 2}`} />
            ))}
          </div>
        </>
      )}

      <h2>Mô tả sản phẩm</h2>
      <p style={{ whiteSpace: "pre-line" }}>{product.description}</p>

      <h2 id="dathang">Đặt hàng</h2>
      <OrderForm
        productId={product.id}
        productName={product.name}
        colors={product.colors}
        sizes={product.sizes}
      />

      <footer>{process.env.NEXT_PUBLIC_SHOP_NAME || "Đồ Gia Dụng Shop"}</footer>

      <div className="bar">
        <a className="cta" href="#dathang">
          MUA NGAY - {formatPrice(product.price)}
        </a>
      </div>

      <ChatWidget productSlug={product.slug} productName={product.name} />
    </div>
  );
}
