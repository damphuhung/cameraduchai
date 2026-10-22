import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const products = await prisma.product.findMany({
    where: { active: true },
    include: { category: true, brand: true },
    orderBy: { stock: 'asc' },
  });

  let totalValue = 0;
  let totalStockUnits = 0;
  const lowStock: any[] = [];

  for (const p of products) {
    const value = Number(p.costPrice) * p.stock;
    totalValue += value;
    totalStockUnits += p.stock;
    if (p.stock < p.minStock) {
      lowStock.push({
        id: p.id, name: p.name, sku: p.sku, stock: p.stock, minStock: p.minStock,
        category: p.category.name, brand: p.brand?.name ?? null,
        value: Number(p.costPrice) * p.stock,
      });
    }
  }

  return NextResponse.json({
    summary: {
      totalProducts: products.length,
      totalStockUnits,
      totalValue,
      lowStockCount: lowStock.length,
    },
    lowStock,
    all: products.map((p) => ({
      id: p.id, name: p.name, sku: p.sku, stock: p.stock, minStock: p.minStock,
      costPrice: Number(p.costPrice), sellPrice: Number(p.sellPrice),
      value: Number(p.costPrice) * p.stock,
      category: p.category.name,
      brand: p.brand?.name ?? null,
    })),
  });
}
