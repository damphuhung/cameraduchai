import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'STAFF']).optional(),
  active: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Chỉ ADMIN' }, { status: 403 });

  const targetId = params.id;
  const body = updateSchema.parse(await req.json());

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) return NextResponse.json({ error: 'Không tìm thấy nhân viên' }, { status: 404 });

  // Bảo vệ chính mình
  if (targetId === session.user.id) {
    if (body.role && body.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Không thể tự hạ quyền chính mình' }, { status: 400 });
    }
    if (body.active === false) {
      return NextResponse.json({ error: 'Không thể tự khoá chính mình' }, { status: 400 });
    }
  }

  // Không cho hạ cấp / khoá ADMIN cuối cùng
  if ((body.role && body.role !== 'ADMIN') || body.active === false) {
    if (target.role === 'ADMIN') {
      const activeAdmins = await prisma.user.count({ where: { role: 'ADMIN', active: true, NOT: { id: targetId } } });
      if (activeAdmins === 0) {
        return NextResponse.json({ error: 'Phải giữ ít nhất 1 ADMIN đang hoạt động' }, { status: 400 });
      }
    }
  }

  const data: any = {};
  if (body.name !== undefined) data.name = body.name.trim();
  if (body.role !== undefined) data.role = body.role;
  if (body.active !== undefined) data.active = body.active;
  if (body.password) data.password = await bcrypt.hash(body.password, 10);

  const updated = await prisma.user.update({
    where: { id: targetId },
    data,
    select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
  });

  // Build description
  const changes: string[] = [];
  if (body.name && body.name !== target.name) changes.push(`tên → "${body.name}"`);
  if (body.role && body.role !== target.role) changes.push(`quyền ${target.role} → ${body.role}`);
  if (body.active !== undefined && body.active !== target.active) changes.push(body.active ? 'mở khoá' : 'khoá');
  if (body.password) changes.push('đổi mật khẩu');

  await logAudit({
    userId: session.user.id,
    userName: session.user.name || session.user.email,
    action: 'UPDATE',
    entity: 'User',
    entityId: targetId,
    description: `Sửa NV "${target.name}": ${changes.join(', ') || 'không đổi'}`,
    metadata: { changes, targetEmail: target.email },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Chỉ ADMIN' }, { status: 403 });

  const targetId = params.id;
  if (targetId === session.user.id) {
    return NextResponse.json({ error: 'Không thể tự xoá chính mình' }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    include: { _count: { select: { sales: true } } },
  });
  if (!target) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

  if (target._count.sales > 0) {
    return NextResponse.json({
      error: `Nhân viên đã bán ${target._count.sales} đơn — không xoá được. Hãy dùng chức năng Khoá.`,
    }, { status: 400 });
  }

  if (target.role === 'ADMIN') {
    const activeAdmins = await prisma.user.count({ where: { role: 'ADMIN', active: true, NOT: { id: targetId } } });
    if (activeAdmins === 0) return NextResponse.json({ error: 'Phải giữ ít nhất 1 ADMIN' }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: targetId } });

  await logAudit({
    userId: session.user.id,
    userName: session.user.name || session.user.email,
    action: 'DELETE',
    entity: 'User',
    entityId: targetId,
    description: `Xoá nhân viên "${target.name}" (${target.email})`,
    metadata: { email: target.email, role: target.role },
  });

  return NextResponse.json({ ok: true });
}
