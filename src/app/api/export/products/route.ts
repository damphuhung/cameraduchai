export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const products = await prisma.product.findMany({
    where: { active: true },
    include: { category: true, brand: true },
    orderBy: { sku: 'asc' },
  });

  const rows = products.map((p) => ({
    sku: p.sku,
    name: p.name,
    category: p.category.name,
    brand: p.brand?.name ?? '',
    unit: p.unit,
    costPrice: Number(p.costPrice),
    sellPrice: Number(p.sellPrice),
    stock: p.stock,
    minStock: p.minStock,
    warrantyMonths: p.warrantyMonths,
    trackSerial: p.trackSerial ? 'Có' : 'Không',
  }));

  return NextResponse.json(rows);
}
