export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const in30 = new Date();
  in30.setDate(now.getDate() + 30);

  const [todaySales, monthSales, products, recentSales, expiringWarranties] = await Promise.all([
    prisma.sale.findMany({ where: { createdAt: { gte: startOfDay } }, include: { items: { include: { product: true } } } }),
    prisma.sale.findMany({ where: { createdAt: { gte: startOfMonth } }, include: { items: { include: { product: true } } } }),
    prisma.product.findMany({ where: { active: true }, select: { id: true, name: true, sku: true, stock: true, minStock: true } }),
    prisma.sale.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { customer: true, user: { select: { name: true } } } }),
    prisma.warranty.findMany({
      where: { endDate: { gte: now, lte: in30 } },
      include: { serial: true, product: true, customer: true },
      orderBy: { endDate: 'asc' },
      take: 10,
    }),
  ]);

  const profit = (sales: any[]) =>
    sales.reduce((s, sale) => s + sale.items.reduce((ps: number, it: any) => ps + (Number(it.unitPrice) - Number(it.product.costPrice)) * it.quantity, 0), 0);

  const lowStock = products.filter((p) => p.stock < p.minStock).slice(0, 10);

  const productStats = new Map<number, { name: string; quantity: number; revenue: number }>();
  monthSales.forEach((s) =>
    s.items.forEach((it) => {
      const ex = productStats.get(it.productId) ?? { name: it.product.name, quantity: 0, revenue: 0 };
      productStats.set(it.productId, { name: it.product.name, quantity: ex.quantity + it.quantity, revenue: ex.revenue + Number(it.lineTotal) });
    }),
  );
  const topProducts = Array.from(productStats.entries())
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  return NextResponse.json({
    today: { 
      revenue: todaySales.reduce((s, x) => s + Number(x.total), 0), 
      orders: todaySales.length, 
      profit: profit(todaySales),
      bonus: todaySales.reduce((s, x) => s + Number(x.bonus), 0) // <-- THÊM
    },
    month: { 
      revenue: monthSales.reduce((s, x) => s + Number(x.total), 0), 
      orders: monthSales.length, 
      profit: profit(monthSales),
      bonus: monthSales.reduce((s, x) => s + Number(x.bonus), 0) // <-- THÊM
    },
    lowStockCount: lowStock.length,
    totalProducts: products.length,
    expiringWarrantyCount: expiringWarranties.length,
    expiringWarranties: expiringWarranties.map((w) => ({
      id: w.id,
      serialNumber: w.serial.serialNumber,
      productName: w.product.name,
      customerName: w.customer?.name ?? 'Khách lẻ',
      endDate: w.endDate,
    })),
    lowStock,
    topProducts,
    recentSales: recentSales.map((s) => ({
      id: s.id, code: s.code, total: Number(s.total), paid: Number(s.paid),
      createdAt: s.createdAt, customerName: s.customer?.name ?? 'Khách lẻ',
      userName: s.user.name,
    })),
  });
}
