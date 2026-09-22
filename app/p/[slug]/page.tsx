import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import OrderForm from "@/components/OrderForm";
import ChatWidget from "@/components/ChatWidget";

export const dynamic = "force-dynamic";

type Variant = { name: string; price: number };

function formatPrice(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await prisma.product.findUnique({ where: { slug: params.slug } });
  if (!product || !product.active) notFound();

  const variants = (product.variants as unknown as Variant[]) || [];
  const hasVariants = variants.length > 0;
  const minPrice = hasVariants ? Math.min(...variants.map((v) => v.price)) : product.price;

  const discount =
    !hasVariants && product.oldPrice && product.oldPrice > product.price
      ? Math.round(100 - (product.price / product.oldPrice) * 100)
      : null;

  return (
    <div className="wrap">
      {/* Gallery vuốt ngang: video (nếu có) đứng đầu, sau đó tới ảnh */}
      <div className="carousel">
        {product.video && (
          <div className="slide">
            <video src={product.video} controls playsInline preload="metadata" />
          </div>
        )}
        {product.images.length > 0 ? (
          product.images.map((src, i) => (
            <div className="slide" key={i}>
              <img src={src} alt={`${product.name} ${i + 1}`} />
            </div>
          ))
        ) : (
          <div className="slide">
            <img src="https://placehold.co/560x700?text=San+pham" alt={product.name} />
          </div>
        )}
      </div>

      <h1>{product.name}</h1>

      <div className="price">
        {hasVariants ? (
          <span className="new">Từ {formatPrice(minPrice)}</span>
        ) : (
          <>
            <span className="new">{formatPrice(product.price)}</span>
            {product.oldPrice && <span className="old">{formatPrice(product.oldPrice)}</span>}
            {discount && <span className="tag">-{discount}%</span>}
          </>
        )}
      </div>

      <a href="#dathang" className="cta">
        ĐẶT HÀNG NGAY
      </a>

      <ul className="trust">
        <li>Được xem hàng trước khi thanh toán</li>
        <li>Đổi hàng miễn phí nếu lỗi trong 7 ngày</li>
        <li>Miễn phí giao hàng toàn quốc</li>
        <li>Hoàn tiền nếu hàng không giống mô tả</li>
      </ul>

      <div className="policy-grid">
        <div className="policy-card">
          <div className="policy-icon">🔄</div>
          <b>Hỗ trợ đổi hàng</b>
          <span>Đổi hàng nếu lỗi trong vòng 7 ngày</span>
        </div>
        <div className="policy-card">
          <div className="policy-icon">✅</div>
          <b>Hàng chính hãng</b>
          <span>Cam kết chất lượng sản phẩm</span>
        </div>
        <div className="policy-card">
          <div className="policy-icon">🚚</div>
          <b>Freeship toàn quốc</b>
          <span>Kiểm tra hàng trước khi thanh toán</span>
        </div>
      </div>

      <h2>Mô tả sản phẩm</h2>
      <p style={{ whiteSpace: "pre-line" }}>{product.description}</p>

      <h2 id="dathang">Đặt hàng</h2>
      <OrderForm
        productId={product.id}
        productName={product.name}
        colors={product.colors}
        sizes={product.sizes}
        variants={variants}
      />

      <footer>{process.env.NEXT_PUBLIC_SHOP_NAME || "Đồ Gia Dụng Shop"}</footer>

      <div className="bar">
        <a className="cta" href="#dathang">
          {hasVariants ? `MUA NGAY - TỪ ${formatPrice(minPrice)}` : `MUA NGAY - ${formatPrice(product.price)}`}
        </a>
      </div>

      <ChatWidget productSlug={product.slug} productName={product.name} />
    </div>
  );
}
