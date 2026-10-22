export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search')?.trim() ?? '';
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const paymentMethod = searchParams.get('paymentMethod');
  const paymentStatus = searchParams.get('paymentStatus'); // paid | partial | unpaid
  const customerId = searchParams.get('customerId');
  const userId = searchParams.get('userId');
  const limit = Number(searchParams.get('limit') ?? 1000);

  const where: any = {};
  if (from) where.createdAt = { ...where.createdAt, gte: new Date(from + 'T00:00:00') };
  if (to) where.createdAt = { ...where.createdAt, lte: new Date(to + 'T23:59:59') };
  if (paymentMethod) where.paymentMethod = paymentMethod;
  if (customerId) where.customerId = Number(customerId);
  if (userId) where.userId = userId;
  if (search) where.OR = [
    { code: { contains: search, mode: 'insensitive' } },
    { customer: { name: { contains: search, mode: 'insensitive' } } },
    { customer: { phone: { contains: search } } },
  ];

  let data = await prisma.sale.findMany({
    where,
    include: { customer: true, user: { select: { id: true, name: true } }, items: { include: { product: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  if (paymentStatus) {
    data = data.filter((s) => {
      const paid = Number(s.paid);
      const total = Number(s.total);
      if (paymentStatus === 'paid') return paid >= total;
      if (paymentStatus === 'partial') return paid > 0 && paid < total;
      if (paymentStatus === 'unpaid') return paid === 0;
      return true;
    });
  }

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

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = schema.parse(await req.json());

    const productIds = body.items.map((i) => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const allSerialIds: number[] = [];
    for (const it of body.items) {
      const p = productMap.get(it.productId);
      if (!p) throw new Error(`Sản phẩm ID ${it.productId} không tồn tại`);
      if (p.stock < it.quantity) throw new Error(`"${p.name}": không đủ hàng (còn ${p.stock})`);
      if (p.trackSerial) {
        if (!it.serialIds || it.serialIds.length !== it.quantity) throw new Error(`"${p.name}": cần đúng ${it.quantity} serial`);
        allSerialIds.push(...it.serialIds);
      }
    }

    if (allSerialIds.length > 0) {
      const serials = await prisma.productSerial.findMany({
        where: { id: { in: allSerialIds } },
        select: { id: true, status: true, serialNumber: true },
      });
      if (serials.length !== allSerialIds.length) throw new Error('Có serial không tồn tại');
      for (const s of serials) {
        if (s.status !== 'IN_STOCK') throw new Error(`Serial ${s.serialNumber} không còn trong kho`);
      }
    }

    const subtotal = body.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const total = Math.max(0, subtotal - body.discount);

    let code = body.code?.trim();
    if (!code) {
      code = `HD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    } else {
      const exists = await prisma.sale.findUnique({ where: { code } });
      if (exists) code = `${code}-${Math.random().toString(36).slice(2, 4).toUpperCase()}`;
    }

    const sale = await prisma.$transaction(async (tx) => {
      const s = await tx.sale.create({
        data: {
          code, customerId: body.customerId ?? null, userId: session.user.id,
          subtotal, discount: body.discount, total,
          paid: body.paid, paymentMethod: body.paymentMethod, note: body.note,
          items: { create: body.items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice, lineTotal: i.unitPrice * i.quantity })) },
        },
        include: { items: true },
      });

      const soldAt = new Date();
      for (let idx = 0; idx < body.items.length; idx++) {
        const it = body.items[idx];
        const saleItem = s.items[idx];
        const p = productMap.get(it.productId)!;

        await tx.product.update({ where: { id: it.productId }, data: { stock: { decrement: it.quantity } } });

        if (p.trackSerial && it.serialIds && it.serialIds.length > 0) {
          await tx.productSerial.updateMany({
            where: { id: { in: it.serialIds }, status: 'IN_STOCK' },
            data: { status: 'SOLD', soldAt, saleItemId: saleItem.id, saleId: s.id },
          });
          if (p.warrantyMonths > 0) {
            for (const serialId of it.serialIds) {
              await tx.warranty.create({
                data: {
                  serialId, productId: it.productId, customerId: body.customerId ?? null,
                  saleId: s.id, startDate: soldAt, endDate: addMonths(soldAt, p.warrantyMonths),
                  warrantyMonths: p.warrantyMonths,
                },
              });
            }
          }
        }
      }

      if (body.customerId && total > body.paid) {
        await tx.customer.update({ where: { id: body.customerId }, data: { debt: { increment: total - body.paid } } });
      }
      return s;
    });

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
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
