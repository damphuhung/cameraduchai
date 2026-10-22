export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Chỉ ADMIN' }, { status: 403 });

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      createdAt: true,
      _count: { select: { sales: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(users);
}

const createSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  name: z.string().min(1, 'Tên không được trống'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  role: z.enum(['ADMIN', 'MANAGER', 'STAFF']).default('STAFF'),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Chỉ ADMIN' }, { status: 403 });

  try {
    const body = createSchema.parse(await req.json());

    const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase().trim() } });
    if (existing) return NextResponse.json({ error: 'Email đã tồn tại' }, { status: 400 });

    const hashed = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        email: body.email.toLowerCase().trim(),
        name: body.name.trim(),
        password: hashed,
        role: body.role,
        active: true,
      },
      select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
    });

    await logAudit({
      userId: session.user.id,
      userName: session.user.name || session.user.email,
      action: 'CREATE',
      entity: 'User',
      entityId: user.id,
      description: `Tạo nhân viên "${user.name}" (${user.email}) - ${user.role}`,
      metadata: { email: user.email, role: user.role },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
