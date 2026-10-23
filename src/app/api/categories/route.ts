import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  return NextResponse.json(await prisma.category.findMany({ orderBy: { name: 'asc' } }));
}

export async function POST(req: Request) {
  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: 'Thiếu tên' }, { status: 400 });
  const c = await prisma.category.create({ data: { name } });
  return NextResponse.json(c);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Thiếu ID' }, { status: 400 });
  try {
    await prisma.category.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Không thể xoá danh mục đang có sản phẩm' }, { status: 400 });
  }
}