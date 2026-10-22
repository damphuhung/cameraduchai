export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') ?? '';
  const data = await prisma.customer.findMany({
    where: search
      ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }] }
      : undefined,
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return NextResponse.json(data);
}

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  address: z.string().optional().nullable(),
  type: z.enum(['RETAIL', 'WHOLESALE']).default('RETAIL'),
});

export async function POST(req: Request) {
  try {
    const data = schema.parse(await req.json());
    const c = await prisma.customer.create({ data });
    return NextResponse.json(c, { status: 201 });
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ error: 'Số điện thoại đã tồn tại' }, { status: 400 });
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
