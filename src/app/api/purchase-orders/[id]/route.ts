export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const data = await prisma.purchaseOrder.findUnique({ where: { id: Number(params.id) }, include: { supplier: true, items: { include: { product: true, serials: true } } } });
  if (!data) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
  return NextResponse.json(data);
}
