import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function toList(v: string | undefined) {
  if (!v) return [];
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

function parseVariants(v: string | undefined) {
  if (!v) return [];
  return v
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, priceStr] = line.split("|").map((s) => s.trim());
      const price = Number(priceStr);
      return name && !isNaN(price) ? { name, price } : null;
    })
    .filter(Boolean);
}

export async function GET() {
  const products = await prisma.product.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const d = await req.json();

  if (!d.name || !d.price) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  let slug = d.slug ? slugify(d.slug) : slugify(d.name);
  const exists = await prisma.product.findUnique({ where: { slug } });
  if (exists) slug = `${slug}-${Date.now().toString().slice(-4)}`;

  const product = await prisma.product.create({
    data: {
      slug,
      name: d.name,
      category: d.category || "Đồ gia dụng",
      price: Number(d.price),
      oldPrice: d.oldPrice ? Number(d.oldPrice) : null,
      description: d.description || "",
      images: toList(d.images),
      video: d.video || null,
      colors: toList(d.colors),
      sizes: toList(d.sizes),
      variants: parseVariants(d.variants),
      active: d.active !== false
    }
  });

  return NextResponse.json(product);
}
