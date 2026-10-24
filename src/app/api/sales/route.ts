export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { Prisma, type PaymentMethod } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { dayKeyVN, parseVNDate } from '@/lib/date';

const PAYMENT_METHODS = ['CASH', 'TRANSFER', 'CARD', 'DEBT'];

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search')?.trim() ?? '';
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const paymentMethod = searchParams.get('paymentMethod');
  const paymentStatus = searchParams.get('paymentStatus'); // paid | partial | unpaid
  const customerId = searchParams.get('customerId');
  const userId = searchParams.get('userId');
  // Mặc định 100 đơn mới nhất. Trang xuất Excel gửi limit=10000 nên vẫn cho phép tới 10000.
  const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 100, 1), 10000);

  const where: Prisma.SaleWhereInput = {};

  const range: Prisma.DateTimeFilter = {};
  const fromDate = parseVNDate(from, 'start');
  const toDate = parseVNDate(to, 'end');
  if (fromDate) range.gte = fromDate;
  if (toDate) range.lte = toDate;
  if (range.gte || range.lte) where.createdAt = range;

  if (paymentMethod && PAYMENT_METHODS.includes(paymentMethod)) where.paymentMethod = paymentMethod as PaymentMethod;
  if (customerId && !Number.isNaN(Number(customerId))) where.customerId = Number(customerId);
  if (userId) where.userId = userId;
  if (search) {
    where.OR = [
      { code: { contains: search, mode: 'insensitive' } },
      { customer: { name: { contains: search, mode: 'insensitive' } } },
      { customer: { phone: { contains: search } } },
    ];
  }

  // Lọc trạng thái thanh toán ngay trong database (trước đây lọc sau khi đã lấy dữ liệu về
  // nên danh sách bị thiếu và tốn băng thông). Prisma không so sánh 2 cột nên dùng SQL thô để lấy id.
  if (paymentStatus === 'paid' || paymentStatus === 'partial' || paymentStatus === 'unpaid') {
    const cond =
      paymentStatus === 'paid' ? Prisma.sql`paid >= total`
      : paymentStatus === 'partial' ? Prisma.sql`paid > 0 AND paid < total`
      : Prisma.sql`paid = 0`;
    const rows = await prisma.$queryRaw<{ id: number }[]>(
      Prisma.sql`SELECT id FROM "Sale" WHERE ${cond} ORDER BY "createdAt" DESC LIMIT 10000`,
    );
    where.id = { in: rows.map((r) => r.id) };
  }

  const data = await prisma.sale.findMany({
    relationLoadStrategy: 'join', // gộp thành 1 truy vấn thay vì nhiều truy vấn nối tiếp
    where,
    select: {
      id: true, code: true, customerId: true, userId: true,
      subtotal: true, discount: true, total: true, paid: true, bonus: true,
      paymentMethod: true, note: true, createdAt: true,
      customer: { select: { id: true, name: true, phone: true } },
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return NextResponse.json(data);
}

const schema = z.object({
  code: z.string().optional(),
  customerId: z.coerce.number().nullable().optional(),
  items: z.array(z.object({
    productId: z.coerce.number(),
    quantity: z.coerce.number().int().positive(),
    unitPrice: z.coerce.number().min(0),
    serialIds: z.array(z.coerce.number()).optional(),
  })).min(1),
  discount: z.coerce.number().min(0).default(0),
  paid: z.coerce.number().min(0),
  paymentMethod: z.enum(['CASH', 'TRANSFER', 'CARD', 'DEBT']).default('CASH'),
  note: z.string().optional(),
});

function addMonths(d: Date, m: number) {
  const r = new Date(d);
  r.setMonth(r.getMonth() + m);
  return r;
}

function randomSuffix(len: number) {
  return Math.random().toString(36).slice(2, 2 + len).toUpperCase();
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = schema.parse(await req.json());

    const productIds = Array.from(new Set(body.items.map((i) => i.productId)));
    const providedSerialIds = body.items.flatMap((i) => i.serialIds ?? []);
    const requestedCode = body.code?.trim() || '';

    // ===== 1) Đọc mọi thứ cần kiểm tra trong 1 lượt song song (trước đây là 3 lượt nối tiếp) =====
    const [products, serials, existingCode] = await Promise.all([
      prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, stock: true, trackSerial: true, warrantyMonths: true },
      }),
      providedSerialIds.length > 0
        ? prisma.productSerial.findMany({
            where: { id: { in: providedSerialIds } },
            select: { id: true, status: true, serialNumber: true, productId: true },
          })
        : Promise.resolve([]),
      requestedCode
        ? prisma.sale.findUnique({ where: { code: requestedCode }, select: { id: true } })
        : Promise.resolve(null),
    ]);

    const productMap = new Map(products.map((p) => [p.id, p]));
    const serialMap = new Map(serials.map((s) => [s.id, s]));

    // Tổng số lượng theo từng sản phẩm (phòng trường hợp cùng 1 sản phẩm nằm ở nhiều dòng)
    const qtyByProduct = new Map<number, number>();
    for (const it of body.items) {
      qtyByProduct.set(it.productId, (qtyByProduct.get(it.productId) ?? 0) + it.quantity);
    }

    for (const [productId, qty] of Array.from(qtyByProduct)) {
      const p = productMap.get(productId);
      if (!p) throw new Error(`Sản phẩm ID ${productId} không tồn tại`);
      if (p.stock < qty) throw new Error(`"${p.name}": không đủ hàng (còn ${p.stock})`);
    }

    for (const it of body.items) {
      const p = productMap.get(it.productId)!;
      if (!p.trackSerial) continue;
      if (!it.serialIds || it.serialIds.length !== it.quantity) throw new Error(`"${p.name}": cần đúng ${it.quantity} serial`);
      for (const sid of it.serialIds) {
        const s = serialMap.get(sid);
        if (!s) throw new Error('Có serial không tồn tại');
        if (s.productId !== it.productId) throw new Error(`Serial ${s.serialNumber} không thuộc sản phẩm "${p.name}"`);
        if (s.status !== 'IN_STOCK') throw new Error(`Serial ${s.serialNumber} không còn trong kho`);
      }
    }

    const subtotal = body.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const total = Math.max(0, subtotal - body.discount);
    // Tính toán bonus và paid thực tế
    const actualPaid = Math.min(body.paid, total);
    const bonus = Math.max(0, body.paid - total);

    let code = requestedCode;
    if (!code) code = `HD-${dayKeyVN(new Date()).replace(/-/g, '')}-${randomSuffix(4)}`;
    else if (existingCode) code = `${code}-${randomSuffix(2)}`;

    // ===== 2) Ghi dữ liệu trong 1 transaction, giảm tối đa số câu lệnh =====
    const sale = await prisma.$transaction(
      async (tx) => {
        const s = await tx.sale.create({
          data: {
            code, customerId: body.customerId ?? null, userId: session.user.id,
            subtotal, discount: body.discount, total,
            paid: actualPaid, bonus, paymentMethod: body.paymentMethod, note: body.note,
            items: {
              create: body.items.map((i) => ({
                productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice, lineTotal: i.unitPrice * i.quantity,
              })),
            },
          },
          include: { items: { orderBy: { id: 'asc' } } },
        });

        const soldAt = new Date();

        // Trừ kho có điều kiện (stock >= số lượng) để 2 người bán cùng lúc không bán vượt tồn
        for (const [productId, qty] of Array.from(qtyByProduct)) {
          const r = await tx.product.updateMany({
            where: { id: productId, stock: { gte: qty } },
            data: { stock: { decrement: qty } },
          });
          if (r.count === 0) throw new Error(`"${productMap.get(productId)!.name}": không đủ hàng`);
        }

        const warrantyRows: Prisma.WarrantyCreateManyInput[] = [];
        for (let idx = 0; idx < body.items.length; idx++) {
          const it = body.items[idx];
          const saleItem = s.items[idx];
          const p = productMap.get(it.productId)!;
          if (!p.trackSerial || !it.serialIds || it.serialIds.length === 0) continue;

          const u = await tx.productSerial.updateMany({
            where: { id: { in: it.serialIds }, status: 'IN_STOCK' },
            data: { status: 'SOLD', soldAt, saleItemId: saleItem.id, saleId: s.id },
          });
          if (u.count !== it.serialIds.length) throw new Error(`"${p.name}": có serial vừa được bán, vui lòng tải lại trang`);

          if (p.warrantyMonths > 0) {
            for (const serialId of it.serialIds) {
              warrantyRows.push({
                serialId, productId: it.productId, customerId: body.customerId ?? null,
                saleId: s.id, startDate: soldAt, endDate: addMonths(soldAt, p.warrantyMonths),
                warrantyMonths: p.warrantyMonths,
              });
            }
          }
        }
        // 1 câu lệnh duy nhất cho toàn bộ bảo hành (trước đây mỗi serial 1 câu)
        if (warrantyRows.length > 0) await tx.warranty.createMany({ data: warrantyRows });

        if (body.customerId && total > body.paid) {
          await tx.customer.update({ where: { id: body.customerId }, data: { debt: { increment: total - body.paid } } });
        }
        return s;
      },
      // Mặc định Prisma chỉ cho transaction 5 giây; DB ở xa nên nới ra để không bị lỗi "Transaction already closed"
      { maxWait: 10_000, timeout: 30_000 },
    );

    await logAudit({
      userId: session.user.id,
      userName: session.user.name || session.user.email,
      action: 'CREATE',
      entity: 'Sale',
      entityId: sale.id,
      description: `Tạo đơn ${sale.code} - ${Number(sale.total).toLocaleString()}đ`,
      metadata: {
        code: sale.code,
        total: Number(sale.total),
        paid: Number(sale.paid),
        paymentMethod: sale.paymentMethod,
        customerId: sale.customerId,
        itemsCount: body.items.length,
      },
    });

    return NextResponse.json(sale, { status: 201 });
  } catch (e: any) {
    if (e?.code === 'P2002') return NextResponse.json({ error: 'Mã đơn bị trùng, vui lòng thử lại' }, { status: 409 });
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
