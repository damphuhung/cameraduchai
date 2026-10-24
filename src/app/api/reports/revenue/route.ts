export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { dayKeyVN, parseVNDate, startOfMonthVN } from '@/lib/date';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const now = new Date();

  const from = parseVNDate(searchParams.get('from'), 'start') ?? startOfMonthVN(now);
  const to = parseVNDate(searchParams.get('to'), 'end') ?? now;

  // Chỉ lấy các trường cần dùng và gộp thành 1 truy vấn
  const sales = await prisma.sale.findMany({
    relationLoadStrategy: 'join',
    where: { createdAt: { gte: from, lte: to } },
    select: {
      createdAt: true, total: true, paid: true, bonus: true,
      items: {
        select: {
          productId: true, quantity: true, lineTotal: true,
          product: { select: { name: true, sku: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const totalRevenue = sales.reduce((s, x) => s + Number(x.total), 0);
  const totalPaid = sales.reduce((s, x) => s + Number(x.paid), 0);
  const totalBonus = sales.reduce((s, x) => s + Number(x.bonus), 0);
  // Đảm bảo công nợ không bao giờ âm
  const totalDebt = sales.reduce((s, x) => s + Math.max(0, Number(x.total) - Number(x.paid)), 0);
  const totalOrders = sales.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Group by day (theo giờ Việt Nam)
  const byDayMap = new Map<string, { revenue: number; orders: number }>();
  for (const s of sales) {
    const key = dayKeyVN(s.createdAt);
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
    summary: { totalRevenue, totalOrders, avgOrderValue, totalPaid, totalDebt, totalBonus },
    byDay,
    topProducts,
    range: { from: dayKeyVN(from), to: dayKeyVN(to) },
  });
}
