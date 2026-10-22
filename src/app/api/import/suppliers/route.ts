export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { rows } = await req.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Không có dữ liệu' }, { status: 400 });
    }

    const result = { created: 0, updated: 0, failed: [] as any[] };

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowNum = i + 2;
      try {
        const name = String(r.name ?? '').trim();
        if (!name) throw new Error('Thiếu tên');
        const phone = String(r.phone ?? '').trim() || null;

        // Supplier không có unique trên name → check thủ công
        const existing = await prisma.supplier.findFirst({ where: { name } });
        const data = {
          name,
          phone,
          address: String(r.address ?? '').trim() || null,
        };

        if (existing) {
          await prisma.supplier.update({ where: { id: existing.id }, data });
          result.updated++;
        } else {
          await prisma.supplier.create({ data });
          result.created++;
        }
      } catch (e: any) {
        result.failed.push({ row: rowNum, name: String(r.name ?? ''), error: e.message });
      }
    }

    await logAudit({
      userId: session.user.id,
      userName: session.user.name || session.user.email,
      action: 'IMPORT',
      entity: 'Supplier',
      description: `Import NCC: tạo ${result.created}, cập nhật ${result.updated}, lỗi ${result.failed.length}`,
      metadata: { created: result.created, updated: result.updated, failed: result.failed.length },
    });

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
