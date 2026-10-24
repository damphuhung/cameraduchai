import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const data = await prisma.purchaseOrder.findUnique({
    where: { id: Number(params.id) },
    include: {
      supplier: true,
      items: { include: { product: true, serials: true } },
      payments: { orderBy: { createdAt: 'desc' } } // Lấy lịch sử thanh toán
    },
  });
  if (!data) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const po = await prisma.purchaseOrder.findUnique({ where: { id: Number(params.id) } });
  if (!po) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

  const total = Number(po.total);
  const paidOld = Number(po.paid);
  const remaining = Math.max(0, total - paidOld);

  let additionalPaid = 0;
  if (body.markAsPaid) additionalPaid = remaining;
  else if (body.additionalPaid > 0) additionalPaid = Math.min(body.additionalPaid, remaining);
  else return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 });

  const updated = await prisma.$transaction(async (tx) => {
    // 1. Cập nhật số tiền đã trả
    const p = await tx.purchaseOrder.update({
      where: { id: po.id },
      data: { paid: { increment: additionalPaid } },
    });

    // 2. Ghi log lịch sử thanh toán
    await tx.purchasePayment.create({
      data: {
        purchaseOrderId: po.id,
        amount: additionalPaid,
        note: body.markAsPaid ? 'Thanh toán đủ' : 'Thanh toán một phần',
      }
    });

    // 3. Giảm công nợ nhà cung cấp
    if (additionalPaid > 0) {
      await tx.supplier.update({
        where: { id: po.supplierId },
        data: { debt: { decrement: additionalPaid } },
      });
    }
    return p;
  });

  await logAudit({
    userId: session.user.id,
    userName: session.user.name || session.user.email,
    action: 'MARK_PAID',
    entity: 'PurchaseOrder',
    entityId: po.id,
    description: `Thanh toán phiếu nhập ${po.code}: +${additionalPaid.toLocaleString()}đ`,
    metadata: { code: po.code, additionalPaid, paidBefore: paidOld, paidAfter: Number(updated.paid) },
  });

  return NextResponse.json(updated);
}