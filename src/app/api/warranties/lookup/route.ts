import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code')?.trim();
  if (!code) return NextResponse.json({ error: 'Thiếu số serial' }, { status: 400 });

  let serial = await prisma.productSerial.findUnique({
    where: { serialNumber: code },
    include: {
      product: { include: { category: true, brand: true } },
      warranty: {
        include: {
          customer: true,
          sale: true,
          claims: { orderBy: { issueDate: 'desc' } },
        },
      },
      sale: { include: { customer: true } },
    },
  });

  if (!serial) return NextResponse.json({ error: 'Không tìm thấy serial' }, { status: 404 });

  // 🔧 AUTO-HEAL: Nếu serial đã SOLD nhưng chưa có warranty → tự tạo
  if (!serial.warranty && serial.status === 'SOLD' && serial.saleId && serial.product.warrantyMonths > 0) {
    try {
      const soldAt = serial.soldAt ?? new Date();
      const endDate = new Date(soldAt);
      endDate.setMonth(endDate.getMonth() + serial.product.warrantyMonths);

      await prisma.warranty.create({
        data: {
          serialId: serial.id,
          productId: serial.productId,
          customerId: serial.sale?.customerId ?? null,
          saleId: serial.saleId,
          startDate: soldAt,
          endDate,
          warrantyMonths: serial.product.warrantyMonths,
        },
      });

      // Refetch để trả về data mới
      serial = await prisma.productSerial.findUnique({
        where: { id: serial.id },
        include: {
          product: { include: { category: true, brand: true } },
          warranty: {
            include: {
              customer: true,
              sale: true,
              claims: { orderBy: { issueDate: 'desc' } },
            },
          },
          sale: { include: { customer: true } },
        },
      });
    } catch (e) {
      // Không chặn response — vẫn trả về serial để user thấy lỗi
      console.error('Auto-heal warranty failed:', e);
    }
  }

  return NextResponse.json(serial);
}
