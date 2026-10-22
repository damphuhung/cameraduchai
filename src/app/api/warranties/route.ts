import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get('filter') ?? 'all';
  const search = searchParams.get('search')?.trim() ?? '';
  const now = new Date();
  const in30Days = new Date();
  in30Days.setDate(now.getDate() + 30);

  let where: any = {};

  if (filter === 'active') {
    where.endDate = { gte: now };
  } else if (filter === 'expiring') {
    where.endDate = { gte: now, lte: in30Days };
  } else if (filter === 'expired') {
    where.endDate = { lt: now };
  }

  if (search) {
    where.OR = [
      { serial: { serialNumber: { contains: search, mode: 'insensitive' } } },
      { product: { name: { contains: search, mode: 'insensitive' } } },
      { customer: { name: { contains: search, mode: 'insensitive' } } },
      { customer: { phone: { contains: search } } },
    ];
  }

  const data = await prisma.warranty.findMany({
    where,
    include: {
      serial: true,
      product: true,
      customer: true,
      sale: true,
      claims: { orderBy: { issueDate: 'desc' } },
    },
    orderBy: { endDate: 'asc' },
    take: 200,
  });

  return NextResponse.json(data);
}
