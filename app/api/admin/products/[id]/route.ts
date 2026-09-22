import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function toList(v: string | undefined) {
  if (!v) return [];
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const d = await req.json();

  const product = await prisma.product.update({
    where: { id: params.id },
    data: {
      name: d.name,
      category: d.category,
      price: Number(d.price),
      oldPrice: d.oldPrice ? Number(d.oldPrice) : null,
      description: d.description || "",
      images: toList(d.images),
      video: d.video || null,
      attributes: Array.isArray(d.attributes) ? d.attributes : [],
      variants: Array.isArray(d.variants) ? d.variants : [],
      active: d.active !== false
    }
  });

  return NextResponse.json(product);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.order.deleteMany({ where: { productId: params.id } });
  await prisma.product.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
