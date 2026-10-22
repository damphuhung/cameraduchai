import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? 'IN_STOCK';
  const data = await prisma.productSerial.findMany({
    where: { productId: Number(params.id), status: status as any },
    orderBy: { importedAt: 'asc' },
  });
  return NextResponse.json(data);
}
