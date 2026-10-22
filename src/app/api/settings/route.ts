export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let s = await prisma.setting.findUnique({ where: { id: 1 } });
  if (!s) s = await prisma.setting.create({ data: { id: 1 } });
  return NextResponse.json(s);
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Chỉ ADMIN được sửa cấu hình' }, { status: 403 });

  const body = await req.json();
  const data = {
    shopName: String(body.shopName ?? '').trim() || 'CỬA HÀNG THIẾT BỊ ĐIỆN TỬ',
    address: String(body.address ?? '').trim(),
    phone: String(body.phone ?? '').trim(),
    taxCode: String(body.taxCode ?? '').trim(),
    bankId: String(body.bankId ?? 'MB').trim(),
    bankAccount: String(body.bankAccount ?? '').trim(),
    bankOwner: String(body.bankOwner ?? '').trim(),
  };
  const before = await prisma.setting.findUnique({ where: { id: 1 } });
  const s = await prisma.setting.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });

  const changes: any = {};
  if (before) {
    for (const k of Object.keys(data)) {
      if ((before as any)[k] !== (data as any)[k]) changes[k] = { from: (before as any)[k], to: (data as any)[k] };
    }
  }

  await logAudit({
    userId: session.user.id,
    userName: session.user.name || session.user.email,
    action: 'UPDATE',
    entity: 'Setting',
    entityId: 1,
    description: 'Cập nhật cấu hình cửa hàng',
    metadata: { changes },
  });

  return NextResponse.json(s);
}
