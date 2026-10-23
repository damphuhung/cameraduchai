import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  let roles = await prisma.role.findMany({ orderBy: { id: 'asc' } });
  if (roles.length === 0) {
    // Tự động tạo 3 quyền mặc định nếu chưa có
    await prisma.role.createMany({
      data: [
        { name: 'ADMIN', description: 'Quản trị viên' },
        { name: 'MANAGER', description: 'Quản lý' },
        { name: 'STAFF', description: 'Nhân viên' },
      ]
    });
    roles = await prisma.role.findMany({ orderBy: { id: 'asc' } });
  }
  return NextResponse.json(roles);
}

export async function POST(req: Request) {
  const { name, description } = await req.json();
  if (!name) return NextResponse.json({ error: 'Thiếu tên quyền' }, { status: 400 });
  const r = await prisma.role.create({ data: { name: name.toUpperCase(), description } });
  return NextResponse.json(r);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Thiếu ID' }, { status: 400 });
  
  try {
    const role = await prisma.role.findUnique({ where: { id: Number(id) } });
    if (role?.name === 'ADMIN' || role?.name === 'STAFF') {
      return NextResponse.json({ error: 'Không được xoá quyền mặc định' }, { status: 400 });
    }
    const usersCount = await prisma.user.count({ where: { role: role?.name } });
    if (usersCount > 0) return NextResponse.json({ error: 'Đang có nhân viên dùng quyền này' }, { status: 400 });
    
    await prisma.role.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}