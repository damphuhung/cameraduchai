export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { startOfDayVN, startOfMonthVN } from '@/lib/date';

type Row = Record<string, any>;
const num = (v: unknown) => Number(v ?? 0);

// Trước đây: tải TẤT CẢ đơn trong tháng kèm từng dòng hàng và sản phẩm rồi cộng trong JS.
// Bây giờ: để Postgres cộng sẵn, chỉ trả về vài con số. Các truy vấn chạy song song.
export async function GET() {
  const now = new Date();
  const dayStart = startOfDayVN(now);
  const monthStart = startOfMonthVN(now);
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [saleStats, profitStats, topRows, lowStockRows, productCounts, recentSales, expiring] = await Promise.all([
    prisma.$queryRaw<Row[]>(Prisma.sql`
      SELECT
        COALESCE(SUM(total) FILTER (WHERE "createdAt" >= ${dayStart}), 0) AS "todayRevenue",
        COUNT(*) FILTER (WHERE "createdAt" >= ${dayStart})                AS "todayOrders",
        COALESCE(SUM(bonus) FILTER (WHERE "createdAt" >= ${dayStart}), 0) AS "todayBonus",
        COALESCE(SUM(total), 0)                                            AS "monthRevenue",
        COUNT(*)                                                           AS "monthOrders",
        COALESCE(SUM(bonus), 0)                                            AS "monthBonus"
      FROM "Sale"
      WHERE "createdAt" >= ${monthStart}
    `),
    prisma.$queryRaw<Row[]>(Prisma.sql`
      SELECT
        COALESCE(SUM((si."unitPrice" - p."costPrice") * si.quantity) FILTER (WHERE s."createdAt" >= ${dayStart}), 0) AS "todayProfit",
        COALESCE(SUM((si."unitPrice" - p."costPrice") * si.quantity), 0) AS "monthProfit"
      FROM "SaleItem" si
      JOIN "Sale" s    ON s.id = si."saleId"
      JOIN "Product" p ON p.id = si."productId"
      WHERE s."createdAt" >= ${monthStart}
    `),
    prisma.$queryRaw<Row[]>(Prisma.sql`
      SELECT p.id, p.name, SUM(si.quantity) AS quantity, SUM(si."lineTotal") AS revenue
      FROM "SaleItem" si
      JOIN "Sale" s    ON s.id = si."saleId"
      JOIN "Product" p ON p.id = si."productId"
      WHERE s."createdAt" >= ${monthStart}
      GROUP BY p.id, p.name
      ORDER BY SUM(si.quantity) DESC
      LIMIT 5
    `),
    prisma.$queryRaw<Row[]>(Prisma.sql`
      SELECT id, name, sku, stock, "minStock"
      FROM "Product"
      WHERE active = true AND stock < "minStock"
      ORDER BY stock ASC
      LIMIT 10
    `),
    prisma.$queryRaw<Row[]>(Prisma.sql`
      SELECT
        COUNT(*) FILTER (WHERE active = true)                          AS total,
        COUNT(*) FILTER (WHERE active = true AND stock < "minStock")   AS low
      FROM "Product"
    `),
    prisma.sale.findMany({
      relationLoadStrategy: 'join',
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true, code: true, total: true, paid: true, createdAt: true,
        customer: { select: { name: true } },
        user: { select: { name: true } },
      },
    }),
    prisma.warranty.findMany({
      relationLoadStrategy: 'join',
      where: { endDate: { gte: now, lte: in30 } },
      orderBy: { endDate: 'asc' },
      take: 10,
      select: {
        id: true, endDate: true,
        serial: { select: { serialNumber: true } },
        product: { select: { name: true } },
        customer: { select: { name: true } },
      },
    }),
  ]);

  const ss = saleStats[0] ?? {};
  const ps = profitStats[0] ?? {};
  const pc = productCounts[0] ?? {};

  return NextResponse.json({
    today: {
      revenue: num(ss.todayRevenue),
      orders: num(ss.todayOrders),
      profit: num(ps.todayProfit),
      bonus: num(ss.todayBonus),
    },
    month: {
      revenue: num(ss.monthRevenue),
      orders: num(ss.monthOrders),
      profit: num(ps.monthProfit),
      bonus: num(ss.monthBonus),
    },
    lowStockCount: num(pc.low),
    totalProducts: num(pc.total),
    expiringWarrantyCount: expiring.length,
    expiringWarranties: expiring.map((w) => ({
      id: w.id,
      serialNumber: w.serial.serialNumber,
      productName: w.product.name,
      customerName: w.customer?.name ?? 'Khách lẻ',
      endDate: w.endDate,
    })),
    lowStock: lowStockRows.map((p) => ({
      id: num(p.id), name: p.name, sku: p.sku, stock: num(p.stock), minStock: num(p.minStock),
    })),
    topProducts: topRows.map((p) => ({
      id: num(p.id), name: p.name, quantity: num(p.quantity), revenue: num(p.revenue),
    })),
    recentSales: recentSales.map((s) => ({
      id: s.id, code: s.code, total: Number(s.total), paid: Number(s.paid),
      createdAt: s.createdAt, customerName: s.customer?.name ?? 'Khách lẻ',
      userName: s.user.name,
    })),
  });
}
