import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

type Row = {
  sku: string;
  name: string;
  category: string;
  brand: string;
  unit: string;
  costPrice: string | number;
  sellPrice: string | number;
  stock: string | number;
  minStock: string | number;
  warrantyMonths: string | number;
  trackSerial: string | boolean;
};

function toBool(v: any): boolean {
  if (typeof v === 'boolean') return v;
  const s = String(v).trim().toLowerCase();
  return ['true', '1', 'yes', 'y', 'có', 'x', '✓'].includes(s);
}

function toNum(v: any, def = 0): number {
  if (v === '' || v === null || v === undefined) return def;
  const n = Number(String(v).replace(/[.,\s]/g, '').replace(/[^\d.-]/g, ''));
  return isNaN(n) ? def : n;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { rows } = await req.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Không có dữ liệu' }, { status: 400 });
    }

    const result = { created: 0, updated: 0, failed: [] as { row: number; sku: string; error: string }[] };

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] as Row;
      const rowNum = i + 2; // Dòng 1 là header

      try {
        const sku = String(r.sku ?? '').trim();
        const name = String(r.name ?? '').trim();
        if (!sku) throw new Error('Thiếu SKU');
        if (!name) throw new Error('Thiếu tên sản phẩm');

        const categoryName = String(r.category ?? '').trim() || 'Chưa phân loại';
        const brandName = String(r.brand ?? '').trim();

        const category = await prisma.category.upsert({
          where: { name: categoryName },
          update: {},
          create: { name: categoryName },
        });

        let brandId: number | null = null;
        if (brandName) {
          const brand = await prisma.brand.upsert({
            where: { name: brandName },
            update: {},
            create: { name: brandName },
          });
          brandId = brand.id;
        }

        const data = {
          sku,
          name,
          categoryId: category.id,
          brandId,
          unit: String(r.unit ?? 'cái').trim() || 'cái',
          costPrice: toNum(r.costPrice),
          sellPrice: toNum(r.sellPrice),
          stock: toNum(r.stock),
          minStock: toNum(r.minStock, 3),
          warrantyMonths: toNum(r.warrantyMonths, 12),
          trackSerial: toBool(r.trackSerial),
        };

        const existing = await prisma.product.findUnique({ where: { sku } });
        if (existing) {
          await prisma.product.update({ where: { id: existing.id }, data });
          result.updated++;
        } else {
          await prisma.product.create({ data });
          result.created++;
        }
      } catch (e: any) {
        result.failed.push({ row: rowNum, sku: String(r.sku ?? ''), error: e.message });
      }
    }

    await logAudit({
      userId: session.user.id,
      userName: session.user.name || session.user.email,
      action: 'IMPORT',
      entity: 'Product',
      description: `Import SP: tạo ${result.created}, cập nhật ${result.updated}, lỗi ${result.failed.length}`,
      metadata: { created: result.created, updated: result.updated, failed: result.failed.length },
    });

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
