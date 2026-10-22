export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const before = await prisma.product.findUnique({ where: { id: Number(params.id) } });
    const p = await prisma.product.update({ where: { id: Number(params.id) }, data: body });

    if (session) {
      const changes: any = {};
      if (before) {
        for (const k of Object.keys(body)) {
          if ((before as any)[k] !== body[k] && k !== 'updatedAt') {
            changes[k] = { from: (before as any)[k], to: body[k] };
          }
        }
      }
      await logAudit({
        userId: session.user.id,
        userName: session.user.name || session.user.email,
        action: 'UPDATE',
        entity: 'Product',
        entityId: p.id,
        description: `Cập nhật SP "${p.name}" (${p.sku})`,
        metadata: { changes },
      });
    }

    return NextResponse.json(p);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const before = await prisma.product.findUnique({ where: { id: Number(params.id) } });
  await prisma.product.update({ where: { id: Number(params.id) }, data: { active: false } });

  if (session && before) {
    await logAudit({
      userId: session.user.id,
      userName: session.user.name || session.user.email,
      action: 'DELETE',
      entity: 'Product',
      entityId: before.id,
      description: `Xoá SP "${before.name}" (${before.sku})`,
      metadata: { sku: before.sku, name: before.name, stock: before.stock },
    });
  }
  return NextResponse.json({ ok: true });
}
