export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Chỉ ADMIN' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search')?.trim() ?? '';
  const action = searchParams.get('action');
  const entity = searchParams.get('entity');
  const userId = searchParams.get('userId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const limit = Math.min(Number(searchParams.get('limit') ?? 500), 2000);

  const where: any = {};
  if (action) where.action = action;
  if (entity) where.entity = entity;
  if (userId) where.userId = userId;
  if (from) where.createdAt = { ...where.createdAt, gte: new Date(from + 'T00:00:00') };
  if (to) where.createdAt = { ...where.createdAt, lte: new Date(to + 'T23:59:59') };
  if (search) where.OR = [
    { description: { contains: search, mode: 'insensitive' } },
    { userName: { contains: search, mode: 'insensitive' } },
    { entityId: { contains: search } },
  ];

  const data = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return NextResponse.json(data);
}
