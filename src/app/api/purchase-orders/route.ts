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
  const supplierId = searchParams.get('supplierId');
  const paymentStatus = searchParams.get('paymentStatus');

  const where: any = {};
  if (from) where.createdAt = { ...where.createdAt, gte: new Date(from + 'T00:00:00') };
  if (to) where.createdAt = { ...where.createdAt, lte: new Date(to + 'T23:59:59') };
  if (supplierId) where.supplierId = Number(supplierId);
  if (search) where.OR = [
    { code: { contains: search, mode: 'insensitive' } },
    { supplier: { name: { contains: search, mode: 'insensitive' } } },
  ];

  let data = await prisma.purchaseOrder.findMany({
    where,
    include: { supplier: true, items: { include: { product: true, serials: true } } },
    orderBy: { createdAt: 'desc' },
    take: 1000,
  });

  if (paymentStatus) {
    data = data.filter((po) => {
      const paid = Number(po.paid);
      const total = Number(po.total);
      if (paymentStatus === 'paid') return paid >= total;
      if (paymentStatus === 'partial') return paid > 0 && paid < total;
      if (paymentStatus === 'unpaid') return paid === 0;
      return true;
    });
  }

  return NextResponse.json(data);
}

const schema = z.object({
  supplierId: z.coerce.number(),
  note: z.string().optional(),
  paid: z.coerce.number().min(0).default(0),
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
    const productIds = body.items.map((i) => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
    const productMap = new Map(products.map((p) => [p.id, p]));

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
      const existing = await prisma.productSerial.findMany({ where: { serialNumber: { in: allSerials } }, select: { serialNumber: true } });
      if (existing.length > 0) throw new Error(`Serial đã tồn tại: ${existing.map((e) => e.serialNumber).join(', ')}`);
    }

    const total = body.items.reduce((s, i) => s + i.unitCost * i.quantity, 0);
    const code = `PN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;

    const po = await prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.create({
        data: { code, supplierId: body.supplierId, total, paid: body.paid, note: body.note, items: { create: body.items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitCost: i.unitCost })) } },
        include: { items: true },
      });

      for (let idx = 0; idx < body.items.length; idx++) {
        const it = body.items[idx];
        const item = order.items[idx];
        const p = productMap.get(it.productId)!;

        await tx.product.update({ where: { id: it.productId }, data: { stock: { increment: it.quantity } } });

        if (p.trackSerial && it.serials) {
          await tx.productSerial.createMany({
            data: it.serials.map((s) => ({ serialNumber: s.trim(), productId: it.productId, purchaseItemId: item.id, importPrice: it.unitCost, importedAt: new Date(), status: 'IN_STOCK' as const })),
          });
        }
      }

      if (total > body.paid) await tx.supplier.update({ where: { id: body.supplierId }, data: { debt: { increment: total - body.paid } } });
      return order;
    });

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
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
