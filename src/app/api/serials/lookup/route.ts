export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code')?.trim();
  if (!code) return NextResponse.json({ error: 'Thiếu mã serial' }, { status: 400 });

  const serial = await prisma.productSerial.findUnique({
    where: { serialNumber: code },
    include: { product: { include: { category: true, brand: true } }, purchaseItem: { include: { purchaseOrder: { include: { supplier: true } } } }, sale: { include: { customer: true } } },
  });
  if (!serial) return NextResponse.json({ error: 'Không tìm thấy serial' }, { status: 404 });
  return NextResponse.json(serial);
}
