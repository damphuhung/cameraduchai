export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const schema = z.object({
  description: z.string().min(1),
  resolution: z.string().optional(),
  cost: z.coerce.number().min(0).default(0),
  status: z.enum(['PENDING', 'DONE', 'REJECTED']).default('PENDING'),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = schema.parse(await req.json());
    const warrantyId = Number(params.id);

    const warranty = await prisma.warranty.findUnique({ where: { id: warrantyId } });
    if (!warranty) return NextResponse.json({ error: 'Không tìm thấy BH' }, { status: 404 });

    const claim = await prisma.warrantyClaim.create({
      data: { warrantyId, ...data },
    });
    return NextResponse.json(claim, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const claimId = Number(body.claimId);
  if (!claimId) return NextResponse.json({ error: 'Thiếu claimId' }, { status: 400 });

  const claim = await prisma.warrantyClaim.update({
    where: { id: claimId },
    data: {
      status: body.status,
      resolution: body.resolution,
      cost: body.cost !== undefined ? Number(body.cost) : undefined,
    },
  });
  return NextResponse.json(claim);
}
