export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const data = await prisma.sale.findUnique({
    relationLoadStrategy: 'join', // 1 truy vấn thay vì 5
    where: { id: Number(params.id) },
    include: {
      customer: true,
      user: { select: { name: true } },
      items: { include: { product: true, serials: true } },
    },
  });
  if (!data) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const sale = await prisma.sale.findUnique({ where: { id: Number(params.id) } });
  if (!sale) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

  const total = Number(sale.total);
  const paidOld = Number(sale.paid);
  const remaining = Math.max(0, total - paidOld);
  if (remaining <= 0) return NextResponse.json({ error: 'Đã thanh toán đủ' }, { status: 400 });

  let additionalPaid = 0;
  if (body.markAsPaid) additionalPaid = remaining;
  else if (typeof body.additionalPaid === 'number' && body.additionalPaid > 0) additionalPaid = Math.min(body.additionalPaid, remaining);
  else return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 });

  const updated = await prisma.$transaction(async (tx) => {
    const s = await tx.sale.update({ where: { id: sale.id }, data: { paid: { increment: additionalPaid } } });
    if (sale.customerId) {
      const reduce = Math.min(additionalPaid, remaining);
      if (reduce > 0) await tx.customer.update({ where: { id: sale.customerId }, data: { debt: { decrement: reduce } } });
    }
    return s;
  }, { maxWait: 10_000, timeout: 30_000 });

  await logAudit({
    userId: session.user.id,
    userName: session.user.name || session.user.email,
    action: 'MARK_PAID',
    entity: 'Sale',
    entityId: sale.id,
    description: `Thu tiền đơn ${sale.code}: +${additionalPaid.toLocaleString()}đ`,
    metadata: { code: sale.code, additionalPaid, paidBefore: paidOld, paidAfter: Number(updated.paid), total },
  });

  return NextResponse.json(updated);
}
