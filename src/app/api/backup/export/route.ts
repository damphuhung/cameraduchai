export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Chỉ ADMIN' }, { status: 403 });

  const [
    settings, users, categories, brands, suppliers, customers,
    products, purchaseOrders, purchaseItems, sales, saleItems,
    productSerials, warranties, warrantyClaims, auditLogs,
  ] = await Promise.all([
    prisma.setting.findMany(),
    prisma.user.findMany(),
    prisma.category.findMany(),
    prisma.brand.findMany(),
    prisma.supplier.findMany(),
    prisma.customer.findMany(),
    prisma.product.findMany(),
    prisma.purchaseOrder.findMany(),
    prisma.purchaseItem.findMany(),
    prisma.sale.findMany(),
    prisma.saleItem.findMany(),
    prisma.productSerial.findMany(),
    prisma.warranty.findMany(),
    prisma.warrantyClaim.findMany(),
    prisma.auditLog.findMany({ orderBy: { id: 'asc' } }),
  ]);

  const tables = {
    settings, users, categories, brands, suppliers, customers,
    products, purchaseOrders, purchaseItems, sales, saleItems,
    productSerials, warranties, warrantyClaims, auditLogs,
  };

  const counts: Record<string, number> = {};
  let total = 0;
  for (const [k, v] of Object.entries(tables)) {
    counts[k] = (v as any[]).length;
    total += (v as any[]).length;
  }

  const backup = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    exportedBy: session.user.email,
    counts,
    totalRecords: total,
    tables,
  };

  await logAudit({
    userId: session.user.id,
    userName: session.user.name || session.user.email,
    action: 'EXPORT',
    entity: 'Backup',
    description: `Xuất backup JSON (${total} bản ghi)`,
    metadata: { counts, totalRecords: total },
  });

  return NextResponse.json(backup);
}
