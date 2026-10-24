export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
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

// Các cột số nguyên (Int) trong database
function validateInt(val: number, fieldName: string): number {
  if (!Number.isInteger(val) || Math.abs(val) > 2147483647) {
    throw new Error(`${fieldName} phải là số nguyên hợp lệ (đang là ${val})`);
  }
  return val;
}

function toBool(v: any): boolean {
  if (typeof v === 'boolean') return v;
  const s = String(v).trim().toLowerCase();
  return ['true', '1', 'yes', 'y', 'có', 'x', '✓'].includes(s);
}

// Lấy dòng cuối của thông báo lỗi Prisma (các dòng trước là chi tiết kỹ thuật dài)
function shortError(e: any): string {
  const lines = String(e?.message ?? e).split('\n').map((l) => l.trim()).filter(Boolean);
  return lines[lines.length - 1] || 'Lỗi không xác định';
}

type Parsed = {
  rowNum: number;
  sku: string;
  categoryName: string;
  brandName: string;
  base: {
    sku: string; name: string; unit: string;
    costPrice: number; sellPrice: number;
    stock: number; minStock: number; warrantyMonths: number;
    trackSerial: boolean;
  };
};

// Trước đây mỗi dòng Excel tốn ~5 truy vấn nối tiếp (upsert danh mục, upsert hãng, tìm, ghi),
// nên import vài chục dòng đã dễ quá thời gian cho phép của Netlify.
// Bây giờ: đọc danh mục/hãng/sản phẩm hiện có trong 1 lượt, tạo mới hàng loạt, cập nhật theo lô song song.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { rows } = await req.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Không có dữ liệu' }, { status: 400 });
    }

    const result = { created: 0, updated: 0, failed: [] as { row: number; sku: string; error: string }[] };

    // ===== 1) Đọc và kiểm tra từng dòng (chưa đụng tới database) =====
    const bySku = new Map<string, Parsed>(); // trùng SKU trong file: dòng sau ghi đè dòng trước
    let duplicatesInFile = 0;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] as Row;
      const rowNum = i + 2;
      try {
        const sku = String(r.sku ?? '').trim();
        const name = String(r.name ?? '').trim();
        if (!sku) throw new Error('Thiếu SKU');
        if (!name) throw new Error('Thiếu tên sản phẩm');

        const parsed: Parsed = {
          rowNum,
          sku,
          categoryName: String(r.category ?? '').trim() || 'Chưa phân loại',
          brandName: String(r.brand ?? '').trim(),
          base: {
            sku, name,
            unit: String(r.unit ?? 'cái').trim() || 'cái',
            costPrice: validatePrice(parseNumber(r.costPrice), 'Giá nhập'),
            sellPrice: validatePrice(parseNumber(r.sellPrice), 'Giá bán'),
            stock: validateInt(parseNumber(r.stock), 'Tồn kho'),
            minStock: validateInt(parseNumber(r.minStock, 3), 'Tồn tối thiểu'),
            warrantyMonths: validateInt(parseNumber(r.warrantyMonths, 12), 'Bảo hành (tháng)'),
            trackSerial: toBool(r.trackSerial),
          },
        };
        if (bySku.has(sku)) duplicatesInFile++;
        bySku.set(sku, parsed);
      } catch (e: any) {
        result.failed.push({ row: rowNum, sku: String(r.sku ?? ''), error: e.message });
      }
    }

    const items = Array.from(bySku.values());

    if (items.length > 0) {
      // ===== 2) Đọc danh mục, hãng, sản phẩm hiện có trong 1 lượt song song =====
      const catNames = Array.from(new Set(items.map((i) => i.categoryName)));
      const brandNames = Array.from(new Set(items.map((i) => i.brandName).filter(Boolean)));

      const [cats, brands, existing] = await Promise.all([
        prisma.category.findMany({ where: { name: { in: catNames } }, select: { id: true, name: true } }),
        brandNames.length > 0
          ? prisma.brand.findMany({ where: { name: { in: brandNames } }, select: { id: true, name: true } })
          : Promise.resolve([]),
        prisma.product.findMany({ where: { sku: { in: items.map((i) => i.sku) } }, select: { id: true, sku: true } }),
      ]);

      const catMap = new Map(cats.map((c) => [c.name, c.id]));
      const brandMap = new Map(brands.map((b) => [b.name, b.id]));
      const existingMap = new Map(existing.map((p) => [p.sku, p.id]));

      // ===== 3) Tạo các danh mục/hãng còn thiếu (mỗi loại 1 câu lệnh) =====
      const missingCats = catNames.filter((n) => !catMap.has(n));
      const missingBrands = brandNames.filter((n) => !brandMap.has(n));
      if (missingCats.length > 0 || missingBrands.length > 0) {
        await Promise.all([
          missingCats.length > 0
            ? prisma.category.createMany({ data: missingCats.map((name) => ({ name })), skipDuplicates: true })
            : null,
          missingBrands.length > 0
            ? prisma.brand.createMany({ data: missingBrands.map((name) => ({ name })), skipDuplicates: true })
            : null,
        ]);
        const [newCats, newBrands] = await Promise.all([
          missingCats.length > 0
            ? prisma.category.findMany({ where: { name: { in: missingCats } }, select: { id: true, name: true } })
            : Promise.resolve([]),
          missingBrands.length > 0
            ? prisma.brand.findMany({ where: { name: { in: missingBrands } }, select: { id: true, name: true } })
            : Promise.resolve([]),
        ]);
        newCats.forEach((c) => catMap.set(c.name, c.id));
        newBrands.forEach((b) => brandMap.set(b.name, b.id));
      }

      // ===== 4) Tách sản phẩm cần tạo mới và cần cập nhật =====
      const toCreate: { item: Parsed; data: Prisma.ProductCreateManyInput }[] = [];
      const toUpdate: { item: Parsed; id: number; data: Prisma.ProductUncheckedUpdateInput }[] = [];

      for (const item of items) {
        const categoryId = catMap.get(item.categoryName);
        if (!categoryId) {
          result.failed.push({ row: item.rowNum, sku: item.sku, error: `Không tạo được danh mục "${item.categoryName}"` });
          continue;
        }
        const brandId = item.brandName ? brandMap.get(item.brandName) ?? null : null;
        const data = { ...item.base, categoryId, brandId };
        const id = existingMap.get(item.sku);
        if (id) toUpdate.push({ item, id, data });
        else toCreate.push({ item, data });
      }

      // ===== 5) Tạo mới hàng loạt: 1 câu lệnh =====
      if (toCreate.length > 0) {
        try {
          const r = await prisma.product.createMany({ data: toCreate.map((c) => c.data), skipDuplicates: true });
          result.created += r.count;
          const skipped = toCreate.length - r.count;
          if (skipped > 0) result.updated += 0; // SKU vừa được người khác tạo cùng lúc: bỏ qua
        } catch (e: any) {
          for (const c of toCreate) {
            result.failed.push({ row: c.item.rowNum, sku: c.item.sku, error: shortError(e) });
          }
        }
      }

      // ===== 6) Cập nhật theo lô song song (mỗi lô 10 sản phẩm) =====
      const CHUNK = 10;
      for (let i = 0; i < toUpdate.length; i += CHUNK) {
        const slice = toUpdate.slice(i, i + CHUNK);
        const settled = await Promise.allSettled(
          slice.map((u) => prisma.product.update({ where: { id: u.id }, data: u.data })),
        );
        settled.forEach((s, j) => {
          if (s.status === 'fulfilled') result.updated++;
          else result.failed.push({ row: slice[j].item.rowNum, sku: slice[j].item.sku, error: shortError(s.reason) });
        });
      }

      // Các dòng trùng SKU trong cùng file được tính là cập nhật
      result.updated += duplicatesInFile;
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
