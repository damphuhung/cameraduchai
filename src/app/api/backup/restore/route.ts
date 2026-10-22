export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

function datesToObj(rows: any[] | undefined, fields: string[]) {
  if (!rows || rows.length === 0) return [];
  return rows.map((r) => {
    const out = { ...r };
    for (const f of fields) {
      if (out[f] != null && typeof out[f] === 'string') out[f] = new Date(out[f]);
    }
    return out;
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Chỉ ADMIN' }, { status: 403 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'File JSON không hợp lệ' }, { status: 400 });
  }

  const { backup, mode } = body as { backup: any; mode: 'merge' | 'replace' };
  if (!backup || !backup.tables || typeof backup.tables !== 'object') {
    return NextResponse.json({ error: 'Cấu trúc backup không hợp lệ' }, { status: 400 });
  }
  if (mode !== 'merge' && mode !== 'replace') {
    return NextResponse.json({ error: 'Mode phải là "merge" hoặc "replace"' }, { status: 400 });
  }

  const t = backup.tables;
  let lastStep = 'init';

  try {
    const result = await prisma.$transaction(async (tx) => {
      // ---- 1. Xoá theo thứ tự nghịch FK ----
      if (mode === 'replace') {
        lastStep = 'wipe:auditLog';
        await tx.auditLog.deleteMany();
        lastStep = 'wipe:warrantyClaim';
        await tx.warrantyClaim.deleteMany();
        lastStep = 'wipe:warranty';
        await tx.warranty.deleteMany();
        lastStep = 'wipe:productSerial';
        await tx.productSerial.deleteMany();
        lastStep = 'wipe:saleItem';
        await tx.saleItem.deleteMany();
        lastStep = 'wipe:sale';
        await tx.sale.deleteMany();
        lastStep = 'wipe:purchaseItem';
        await tx.purchaseItem.deleteMany();
        lastStep = 'wipe:purchaseOrder';
        await tx.purchaseOrder.deleteMany();
        lastStep = 'wipe:product';
        await tx.product.deleteMany();
        lastStep = 'wipe:customer';
        await tx.customer.deleteMany();
        lastStep = 'wipe:supplier';
        await tx.supplier.deleteMany();
        lastStep = 'wipe:category';
        await tx.category.deleteMany();
        lastStep = 'wipe:brand';
        await tx.brand.deleteMany();
        lastStep = 'wipe:user';
        await tx.user.deleteMany();
        lastStep = 'wipe:setting';
        await tx.setting.deleteMany();
      }

      const skip = mode === 'merge';
      const inserted: Record<string, number> = {};

      // ---- 2. Insert theo thứ tự FK ----
      lastStep = 'insert:setting';
      if (t.settings?.length) {
        const data = datesToObj(t.settings, ['updatedAt']);
        const r = await tx.setting.createMany({ data, skipDuplicates: skip });
        inserted.settings = r.count;
      }

      lastStep = 'insert:user';
      if (t.users?.length) {
        const data = datesToObj(t.users, ['createdAt']);
        const r = await tx.user.createMany({ data, skipDuplicates: skip });
        inserted.users = r.count;
      }

      lastStep = 'insert:category';
      if (t.categories?.length) {
        const r = await tx.category.createMany({ data: t.categories, skipDuplicates: skip });
        inserted.categories = r.count;
      }

      lastStep = 'insert:brand';
      if (t.brands?.length) {
        const r = await tx.brand.createMany({ data: t.brands, skipDuplicates: skip });
        inserted.brands = r.count;
      }

      lastStep = 'insert:supplier';
      if (t.suppliers?.length) {
        const r = await tx.supplier.createMany({ data: t.suppliers, skipDuplicates: skip });
        inserted.suppliers = r.count;
      }

      lastStep = 'insert:customer';
      if (t.customers?.length) {
        const data = datesToObj(t.customers, ['createdAt']);
        const r = await tx.customer.createMany({ data, skipDuplicates: skip });
        inserted.customers = r.count;
      }

      lastStep = 'insert:product';
      if (t.products?.length) {
        const data = datesToObj(t.products, ['createdAt', 'updatedAt']);
        const r = await tx.product.createMany({ data, skipDuplicates: skip });
        inserted.products = r.count;
      }

      lastStep = 'insert:purchaseOrder';
      if (t.purchaseOrders?.length) {
        const data = datesToObj(t.purchaseOrders, ['createdAt']);
        const r = await tx.purchaseOrder.createMany({ data, skipDuplicates: skip });
        inserted.purchaseOrders = r.count;
      }

      lastStep = 'insert:purchaseItem';
      if (t.purchaseItems?.length) {
        const r = await tx.purchaseItem.createMany({ data: t.purchaseItems, skipDuplicates: skip });
        inserted.purchaseItems = r.count;
      }

      lastStep = 'insert:sale';
      if (t.sales?.length) {
        const data = datesToObj(t.sales, ['createdAt']);
        const r = await tx.sale.createMany({ data, skipDuplicates: skip });
        inserted.sales = r.count;
      }

      lastStep = 'insert:saleItem';
      if (t.saleItems?.length) {
        const r = await tx.saleItem.createMany({ data: t.saleItems, skipDuplicates: skip });
        inserted.saleItems = r.count;
      }

      lastStep = 'insert:productSerial';
      if (t.productSerials?.length) {
        const data = datesToObj(t.productSerials, ['importedAt', 'soldAt', 'createdAt']);
        const r = await tx.productSerial.createMany({ data, skipDuplicates: skip });
        inserted.productSerials = r.count;
      }

      lastStep = 'insert:warranty';
      if (t.warranties?.length) {
        const data = datesToObj(t.warranties, ['startDate', 'endDate', 'createdAt']);
        const r = await tx.warranty.createMany({ data, skipDuplicates: skip });
        inserted.warranties = r.count;
      }

      lastStep = 'insert:warrantyClaim';
      if (t.warrantyClaims?.length) {
        const data = datesToObj(t.warrantyClaims, ['issueDate', 'createdAt']);
        const r = await tx.warrantyClaim.createMany({ data, skipDuplicates: skip });
        inserted.warrantyClaims = r.count;
      }

      lastStep = 'insert:auditLog';
      if (t.auditLogs?.length) {
        const data = datesToObj(t.auditLogs, ['createdAt']);
        const r = await tx.auditLog.createMany({ data, skipDuplicates: skip });
        inserted.auditLogs = r.count;
      }

      // ---- 3. Reset sequences (chỉ những bảng có autoincrement int id) ----
      lastStep = 'reset-sequences';
      const seqTables = [
        'Category', 'Brand', 'Supplier', 'Customer', 'Product',
        'PurchaseOrder', 'PurchaseItem', 'Sale', 'SaleItem',
        'ProductSerial', 'Warranty', 'WarrantyClaim', 'AuditLog',
      ];
      for (const tbl of seqTables) {
        try {
          await tx.$executeRawUnsafe(
            `SELECT setval(pg_get_serial_sequence('"${tbl}"', 'id'), COALESCE((SELECT MAX(id) FROM "${tbl}"), 0) + 1, false)`,
          );
        } catch (e) {
          console.warn(`Không reset được sequence cho ${tbl}:`, e);
        }
      }

      return inserted;
    }, { timeout: 120000, maxWait: 10000 });

    // Audit log sau khi commit
    await logAudit({
      userId: session.user.id,
      userName: session.user.name || session.user.email,
      action: 'IMPORT',
      entity: 'Backup',
      description: `Restore backup (${mode}) — ${Object.values(result).reduce((a, b) => a + b, 0)} bản ghi`,
      metadata: { mode, inserted: result, source: { version: backup.version, exportedAt: backup.exportedAt, exportedBy: backup.exportedBy } },
    });

    return NextResponse.json({ ok: true, mode, inserted: result });
  } catch (e: any) {
    console.error('Restore failed at', lastStep, e);
    return NextResponse.json(
      { error: `Restore thất bại ở bước "${lastStep}": ${e.message}` },
      { status: 400 },
    );
  }
}
