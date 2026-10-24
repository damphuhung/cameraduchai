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

// Hàm parse số an toàn hơn (hỗ trợ cả định dạng 1.000.000 và 1,000,000)
function parseNumber(v: any, def = 0): number {
  if (v === '' || v === null || v === undefined) return def;
  let str = String(v).trim().replace(/[^\d.,-]/g, '');
  
  // Xử lý dấu chấm/phẩy trong chuỗi
  if (str.includes(',') && str.includes('.')) {
    // Nếu có cả 2, mặc định dấu chấm là phân cách nghìn, phẩy là thập phân (chuẩn VN)
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    const parts = str.split(',');
    // Nếu phần sau dấu phẩy có đúng 3 số -> phân cách nghìn
    if (parts[parts.length - 1].length === 3 && parts.length > 1) {
      str = str.replace(/,/g, '');
    } else {
      str = str.replace(',', '.');
    }
  } else if (str.includes('.')) {
    const parts = str.split('.');
    if (parts[parts.length - 1].length === 3 && parts.length > 1) {
      str = str.replace(/\./g, '');
    }
  }
  
  const n = Number(str);
  return isNaN(n) ? def : n;
}

// Hàm kiểm tra giới hạn giá trị
function validatePrice(val: number, fieldName: string): number {
  const MAX_VAL = 9999999999999.99; // Giới hạn của Decimal(15,2)
  if (Math.abs(val) > MAX_VAL) {
    throw new Error(`${fieldName} quá lớn (${val}). Vui lòng kiểm tra lại định dạng số trong Excel.`);
  }
  return val;
}

function toBool(v: any): boolean {
  if (typeof v === 'boolean') return v;
  const s = String(v).trim().toLowerCase();
  return ['true', '1', 'yes', 'y', 'có', 'x', '✓'].includes(s);
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
      const rowNum = i + 2;

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

        // Parse và kiểm tra giá trị
        const costPrice = validatePrice(parseNumber(r.costPrice), 'Giá nhập');
        const sellPrice = validatePrice(parseNumber(r.sellPrice), 'Giá bán');
        const stock = parseNumber(r.stock);
        const minStock = parseNumber(r.minStock, 3);
        const warrantyMonths = parseNumber(r.warrantyMonths, 12);

        const data = {
          sku, name,
          categoryId: category.id,
          brandId,
          unit: String(r.unit ?? 'cái').trim() || 'cái',
          costPrice,
          sellPrice,
          stock,
          minStock,
          warrantyMonths,
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