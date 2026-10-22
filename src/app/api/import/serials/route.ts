import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { productId, serials } = await req.json();
    if (!productId) return NextResponse.json({ error: 'Thiếu productId' }, { status: 400 });
    if (!Array.isArray(serials) || serials.length === 0) {
      return NextResponse.json({ error: 'Không có serial nào' }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id: Number(productId) } });
    if (!product) return NextResponse.json({ error: 'Sản phẩm không tồn tại' }, { status: 404 });
    if (!product.trackSerial) {
      return NextResponse.json({ error: `SP "${product.name}" không bật quản lý S/N` }, { status: 400 });
    }

    // Chuẩn hoá: trim, bỏ rỗng, unique trong list
    const cleaned = Array.from(
      new Set(serials.map((s: any) => String(s).trim()).filter(Boolean)),
    );

    if (cleaned.length === 0) {
      return NextResponse.json({ error: 'Không có serial hợp lệ' }, { status: 400 });
    }

    // Serial đã tồn tại
    const existing = await prisma.productSerial.findMany({
      where: { serialNumber: { in: cleaned } },
      select: { serialNumber: true },
    });
    const existingSet = new Set(existing.map((e) => e.serialNumber));

    const toInsert = cleaned.filter((s) => !existingSet.has(s));

    if (toInsert.length === 0) {
      return NextResponse.json({
        created: 0,
        duplicated: existing.length,
        failed: cleaned.map((s) => ({ serial: s, error: 'Serial đã tồn tại' })),
      });
    }

    // Tạo + tăng tồn kho
    await prisma.$transaction(async (tx) => {
      await tx.productSerial.createMany({
        data: toInsert.map((s) => ({
          serialNumber: s,
          productId: Number(productId),
          status: 'IN_STOCK',
          importPrice: product.costPrice,
          importedAt: new Date(),
        })),
      });
      await tx.product.update({
        where: { id: Number(productId) },
        data: { stock: { increment: toInsert.length } },
      });
    });

    await logAudit({
      userId: session.user.id,
      userName: session.user.name || session.user.email,
      action: 'IMPORT',
      entity: 'ProductSerial',
      entityId: product.id,
      description: `Import ${toInsert.length} serial cho "${product.name}"`,
      metadata: { productId: product.id, productName: product.name, created: toInsert.length, duplicated: existing.length },
    });

    return NextResponse.json({
      created: toInsert.length,
      duplicated: existing.length,
      failed: existing.map((e) => ({ serial: e.serialNumber, error: 'Serial đã tồn tại' })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
