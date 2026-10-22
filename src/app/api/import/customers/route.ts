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
        const phone = String(r.phone ?? '').trim();
        if (!name) throw new Error('Thiếu tên');
        if (!phone) throw new Error('Thiếu SĐT');

        const existing = await prisma.customer.findUnique({ where: { phone } });
        const data = {
          name,
          phone,
          address: String(r.address ?? '').trim() || null,
          type: String(r.type ?? 'RETAIL').toUpperCase() === 'WHOLESALE' ? 'WHOLESALE' : 'RETAIL',
        };

        if (existing) {
          await prisma.customer.update({ where: { id: existing.id }, data });
          result.updated++;
        } else {
          await prisma.customer.create({ data });
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
      entity: 'Customer',
      description: `Import KH: tạo ${result.created}, cập nhật ${result.updated}, lỗi ${result.failed.length}`,
      metadata: { created: result.created, updated: result.updated, failed: result.failed.length },
    });

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
