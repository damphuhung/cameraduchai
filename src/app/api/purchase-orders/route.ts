export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { dayKeyVN, parseVNDate } from '@/lib/date';

// Hàm GET: Lấy danh sách phiếu nhập (có bộ lọc)
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search')?.trim() ?? '';
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const supplierId = searchParams.get('supplierId');
  const paymentStatus = searchParams.get('paymentStatus');
  const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 200, 1), 1000);

  const where: Prisma.PurchaseOrderWhereInput = {};

  const range: Prisma.DateTimeFilter = {};
  const fromDate = parseVNDate(from, 'start');
  const toDate = parseVNDate(to, 'end');
  if (fromDate) range.gte = fromDate;
  if (toDate) range.lte = toDate;
  if (range.gte || range.lte) where.createdAt = range;

  if (supplierId && !Number.isNaN(Number(supplierId))) where.supplierId = Number(supplierId);
  if (search) {
    where.OR = [
      { code: { contains: search, mode: 'insensitive' } },
      { supplier: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  // Lọc trạng thái thanh toán ngay trong database (Prisma không so sánh được 2 cột với nhau)
  if (paymentStatus === 'paid' || paymentStatus === 'partial' || paymentStatus === 'unpaid') {
    const cond =
      paymentStatus === 'paid' ? Prisma.sql`paid >= total`
      : paymentStatus === 'partial' ? Prisma.sql`paid > 0 AND paid < total`
      : Prisma.sql`paid = 0`;
    const rows = await prisma.$queryRaw<{ id: number }[]>(
      Prisma.sql`SELECT id FROM "PurchaseOrder" WHERE ${cond} ORDER BY "createdAt" DESC LIMIT 5000`,
    );
    where.id = { in: rows.map((r) => r.id) };
  }

  // Trước đây lấy kèm toàn bộ sản phẩm và TẤT CẢ serial của từng phiếu (rất nặng).
  // Trang danh sách chỉ cần: mã, ngày, nhà cung cấp, tổng số lượng, tổng tiền, đã trả.
  const data = await prisma.purchaseOrder.findMany({
    relationLoadStrategy: 'join',
    where,
    select: {
      id: true, code: true, supplierId: true, total: true, paid: true, note: true, createdAt: true,
      supplier: { select: { id: true, name: true } },
      items: { select: { quantity: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return NextResponse.json(data);
}

// Hàm POST: Tạo phiếu nhập mới
const schema = z.object({
  supplierId: z.coerce.number(),
  note: z.string().optional(),
  paid: z.coerce.number().min(0).default(0),
  proofImages: z.array(z.string()).optional(), // Nhận mảng link ảnh
  items: z.array(z.object({
    productId: z.coerce.number(),
    quantity: z.coerce.number().int().positive(),
    unitCost: z.coerce.number().min(0),
    serials: z.array(z.string()).optional(),
  })).min(1),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = schema.parse(await req.json());
    const productIds = Array.from(new Set(body.items.map((i) => i.productId)));

    // Gom mọi serial được gửi lên để kiểm tra trùng cùng lúc với việc đọc sản phẩm (1 lượt thay vì 2)
    const submittedSerials = Array.from(new Set(
      body.items.flatMap((i) => (i.serials ?? []).map((s) => s.trim()).filter(Boolean)),
    ));

    const [products, existingRows] = await Promise.all([
      prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, trackSerial: true },
      }),
      submittedSerials.length > 0
        ? prisma.productSerial.findMany({
            where: { serialNumber: { in: submittedSerials } },
            select: { serialNumber: true },
          })
        : Promise.resolve([]),
    ]);
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Kiểm tra serial
    const allSerials: string[] = [];
    for (const it of body.items) {
      const p = productMap.get(it.productId);
      if (!p) throw new Error(`Sản phẩm ID ${it.productId} không tồn tại`);
      if (p.trackSerial) {
        if (!it.serials || it.serials.length !== it.quantity) throw new Error(`"${p.name}": cần đúng ${it.quantity} serial`);
        const cleaned = it.serials.map((s) => s.trim()).filter(Boolean);
        if (cleaned.length !== it.quantity) throw new Error(`"${p.name}": serial không hợp lệ`);
        if (new Set(cleaned).size !== cleaned.length) throw new Error(`"${p.name}": serial bị trùng trong phiếu`);
        allSerials.push(...cleaned);
      }
    }

    if (allSerials.length > 0) {
      const tracked = new Set(allSerials);
      const existing = existingRows.filter((e) => tracked.has(e.serialNumber));
      if (existing.length > 0) throw new Error(`Serial đã tồn tại: ${existing.map((e) => e.serialNumber).join(', ')}`);
    }

    const total = body.items.reduce((s, i) => s + i.unitCost * i.quantity, 0);
    const code = `PN-${dayKeyVN(new Date()).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const qtyByProduct = new Map<number, number>();
    for (const it of body.items) {
      qtyByProduct.set(it.productId, (qtyByProduct.get(it.productId) ?? 0) + it.quantity);
    }

    const po = await prisma.$transaction(
      async (tx) => {
        // TẠO PHIẾU NHẬP (CÓ LƯU ẢNH)
        const order = await tx.purchaseOrder.create({
          data: {
            code,
            supplierId: body.supplierId,
            total,
            paid: body.paid,
            note: body.note,
            proofImages: body.proofImages || [], // Lưu mảng ảnh vào đây
            items: {
              create: body.items.map((i) => ({
                productId: i.productId,
                quantity: i.quantity,
                unitCost: i.unitCost,
              })),
            },
          },
          include: { items: { orderBy: { id: 'asc' } } },
        });

        // Cập nhật tồn kho: mỗi sản phẩm 1 câu lệnh (gộp nếu cùng sản phẩm nằm ở nhiều dòng)
        for (const [productId, qty] of Array.from(qtyByProduct)) {
          await tx.product.update({ where: { id: productId }, data: { stock: { increment: qty } } });
        }

        // Tạo toàn bộ serial của phiếu bằng 1 câu lệnh duy nhất
        const importedAt = new Date();
        const serialRows: Prisma.ProductSerialCreateManyInput[] = [];
        body.items.forEach((it, idx) => {
          const p = productMap.get(it.productId)!;
          if (!p.trackSerial || !it.serials) return;
          for (const s of it.serials) {
            serialRows.push({
              serialNumber: s.trim(),
              productId: it.productId,
              purchaseItemId: order.items[idx].id,
              importPrice: it.unitCost,
              importedAt,
              status: 'IN_STOCK' as const,
            });
          }
        });
        if (serialRows.length > 0) await tx.productSerial.createMany({ data: serialRows });

        // Cập nhật công nợ NCC
        if (total > body.paid) {
          await tx.supplier.update({
            where: { id: body.supplierId },
            data: { debt: { increment: total - body.paid } },
          });
        }

        // Ghi log thanh toán đợt đầu (nếu có trả trước)
        if (body.paid > 0) {
          await tx.purchasePayment.create({
            data: {
              purchaseOrderId: order.id,
              amount: body.paid,
              note: 'Thanh toán khi tạo phiếu',
            },
          });
        }

        return order;
      },
      // Mặc định Prisma chỉ cho transaction 5 giây; DB ở xa nên nới ra để không bị lỗi "Transaction already closed"
      { maxWait: 10_000, timeout: 30_000 },
    );

    await logAudit({
      userId: session.user.id,
      userName: session.user.name || session.user.email,
      action: 'CREATE',
      entity: 'PurchaseOrder',
      entityId: po.id,
      description: `Tạo phiếu nhập ${po.code} - ${total.toLocaleString()}đ`,
      metadata: { code: po.code, total, paid: body.paid, supplierId: body.supplierId, itemsCount: body.items.length },
    });

    return NextResponse.json(po, { status: 201 });
  } catch (e: any) {
    if (e?.code === 'P2002') return NextResponse.json({ error: 'Mã phiếu hoặc serial bị trùng, vui lòng thử lại' }, { status: 409 });
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
