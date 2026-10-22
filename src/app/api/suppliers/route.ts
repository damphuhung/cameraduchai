import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export async function GET() {
  const data = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json(data);
}

const schema = z.object({ name: z.string().min(1), phone: z.string().optional().nullable(), address: z.string().optional().nullable() });

export async function POST(req: Request) {
  try {
    const data = schema.parse(await req.json());
    return NextResponse.json(await prisma.supplier.create({ data }), { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
