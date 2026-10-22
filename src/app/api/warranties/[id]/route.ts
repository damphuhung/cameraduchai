export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const data = await prisma.warranty.findUnique({
    where: { id: Number(params.id) },
    include: {
      serial: true,
      product: { include: { category: true, brand: true } },
      customer: true,
      sale: true,
      claims: { orderBy: { issueDate: 'desc' } },
    },
  });
  if (!data) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
  return NextResponse.json(data);
}
