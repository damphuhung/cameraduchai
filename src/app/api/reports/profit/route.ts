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

  let totalRevenue = 0;
  let totalCost = 0;
  const byProduct = new Map<number, { name: string; sku: string; quantity: number; revenue: number; cost: number }>();
  const byDay = new Map<string, { revenue: number; cost: number }>();

  for (const s of sales) {
    const dayKey = s.createdAt.toISOString().slice(0, 10);
    const dayEntry = byDay.get(dayKey) ?? { revenue: 0, cost: 0 };

    for (const it of s.items) {
      const revenue = Number(it.lineTotal);
      const cost = Number(it.product.costPrice) * it.quantity;
      totalRevenue += revenue;
      totalCost += cost;
      dayEntry.revenue += revenue;
      dayEntry.cost += cost;

      const ex = byProduct.get(it.productId) ?? { name: it.product.name, sku: it.product.sku, quantity: 0, revenue: 0, cost: 0 };
      byProduct.set(it.productId, {
        ...ex,
        quantity: ex.quantity + it.quantity,
        revenue: ex.revenue + revenue,
        cost: ex.cost + cost,
      });
    }
    byDay.set(dayKey, dayEntry);
  }

  const totalProfit = totalRevenue - totalCost;
  const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const productList = Array.from(byProduct.entries())
    .map(([id, v]) => ({ id, ...v, profit: v.revenue - v.cost }))
    .sort((a, b) => b.profit - a.profit);

  const dayList = Array.from(byDay.entries())
    .map(([date, v]) => ({ date, ...v, profit: v.revenue - v.cost }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({
    summary: { totalRevenue, totalCost, totalProfit, margin },
    byProduct: productList,
    byDay: dayList,
  });
}
