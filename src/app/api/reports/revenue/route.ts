export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const now = new Date();
  const fromStr = searchParams.get('from');
  const toStr = searchParams.get('to');

  const from = fromStr ? new Date(fromStr + 'T00:00:00') : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = toStr ? new Date(toStr + 'T23:59:59') : now;

  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: from, lte: to } },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: 'asc' },
  });

  const totalRevenue = sales.reduce((s, x) => s + Number(x.total), 0);
  const totalPaid = sales.reduce((s, x) => s + Number(x.paid), 0);
  const totalDebt = sales.reduce((s, x) => s + (Number(x.total) - Number(x.paid)), 0);
  const totalOrders = sales.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Group by day
  const byDayMap = new Map<string, { revenue: number; orders: number }>();
  for (const s of sales) {
    const key = s.createdAt.toISOString().slice(0, 10);
    const ex = byDayMap.get(key) ?? { revenue: 0, orders: 0 };
    byDayMap.set(key, { revenue: ex.revenue + Number(s.total), orders: ex.orders + 1 });
  }
  const byDay = Array.from(byDayMap.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Top products
  const productStats = new Map<number, { name: string; sku: string; quantity: number; revenue: number }>();
  for (const s of sales) {
    for (const it of s.items) {
      const ex = productStats.get(it.productId) ?? { name: it.product.name, sku: it.product.sku, quantity: 0, revenue: 0 };
      productStats.set(it.productId, {
        ...ex,
        quantity: ex.quantity + it.quantity,
        revenue: ex.revenue + Number(it.lineTotal),
      });
    }
  }
  const topProducts = Array.from(productStats.entries())
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  return NextResponse.json({
    summary: { totalRevenue, totalOrders, avgOrderValue, totalPaid, totalDebt },
    byDay,
    topProducts,
    range: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) },
  });
}
