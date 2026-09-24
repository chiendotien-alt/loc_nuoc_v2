import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import OrderForm from "@/components/OrderForm";
import ChatWidget from "@/components/ChatWidget";
import Gallery from "@/components/Gallery";
import Reviews from "@/components/Reviews";
import PriceHero from "@/components/PriceHero";
import { normalizeTiers, getUnit, type Variant } from "@/lib/pricing";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Attribute = { name: string; values: string[] };
type Review = { name: string; rating: number; text: string; images?: string[] };

function formatPrice(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await prisma.product.findUnique({ where: { slug: params.slug } });
  if (!product) return {};

  const shopName = process.env.NEXT_PUBLIC_SHOP_NAME || "Đồ Gia Dụng Shop";
  const image = product.images[0] || "https://placehold.co/1092x1092?text=San+pham";
  const description = `${formatPrice(product.price)} · ${product.description.slice(0, 120)}`;

  return {
    title: `${product.name} - ${shopName}`,
    description,
    openGraph: {
      title: product.name,
      description,
      images: [{ url: image, width: 1092, height: 1092 }],
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images: [image]
    }
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await prisma.product.findUnique({ where: { slug: params.slug } });
  if (!product || !product.active) notFound();

  const attributes = (product.attributes as unknown as Attribute[]) || [];
  const variants = (product.variants as unknown as Variant[]) || [];
  const reviews = (product.reviews as unknown as Review[]) || [];
  const tiers = normalizeTiers(variants, product.price);
  const unit = getUnit(variants);
  const retailPrice = tiers[0].unitPrice;
  const bestTier = tiers.reduce((b, t) => (t.unitPrice < b.unitPrice ? t : b), tiers[0]);

  const shopName = process.env.NEXT_PUBLIC_SHOP_NAME || "Đồ Gia Dụng Shop";

  return (
    <div className="wrap">
      <Gallery images={product.images} video={product.video} />

      <h1>{product.name}</h1>

      <PriceHero
        productId={product.id}
        bestPrice={bestTier.unitPrice}
        retailPrice={retailPrice}
        oldPrice={product.oldPrice}
        bestQty={bestTier.qty}
        unit={unit}
      />

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

      <Reviews reviews={reviews} />

      <h2 id="dathang">Đặt hàng</h2>
      <OrderForm
        productId={product.id}
        productName={product.name}
        basePrice={product.price}
        attributes={attributes}
        variants={variants}
        shopName={shopName}
      />

      <footer>{shopName}</footer>

      <div className="bar">
        <button type="submit" form="order-form" className="cta">
          Mua ngay
        </button>
      </div>

      <ChatWidget productSlug={product.slug} productName={product.name} />
    </div>
  );
}
