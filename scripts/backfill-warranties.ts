import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Tìm tất cả serial đã SOLD, có saleId, chưa có Warranty, và SP có warrantyMonths > 0
  const serials = await prisma.productSerial.findMany({
    where: {
      status: 'SOLD',
      saleId: { not: null },
      warranty: null,
    },
    include: { product: true, sale: true },
  });

  console.log(`\n🔍 Tìm thấy ${serials.length} serial đã bán chưa có phiếu BH\n`);

  let created = 0;
  let skipped = 0;

  for (const s of serials) {
    if (!s.sale) { skipped++; continue; }
    if (s.product.warrantyMonths <= 0) {
      console.log(`⏭  ${s.serialNumber} — SP "${s.product.name}" không có BH (warrantyMonths=0)`);
      skipped++;
      continue;
    }

    const soldAt = s.soldAt ?? s.sale.createdAt;
    const endDate = new Date(soldAt);
    endDate.setMonth(endDate.getMonth() + s.product.warrantyMonths);

    try {
      await prisma.warranty.create({
        data: {
          serialId: s.id,
          productId: s.productId,
          customerId: s.sale.customerId,
          saleId: s.saleId,
          startDate: soldAt,
          endDate,
          warrantyMonths: s.product.warrantyMonths,
        },
      });
      created++;
      console.log(`✅ ${s.serialNumber} — BH ${s.product.warrantyMonths} tháng, hết hạn ${endDate.toLocaleDateString('vi-VN')}`);
    } catch (e: any) {
      console.log(`❌ ${s.serialNumber} — Lỗi: ${e.message}`);
    }
  }

  console.log(`\n════════════════════════════════════════`);
  console.log(`✅ Đã tạo: ${created} phiếu BH`);
  console.log(`⏭  Bỏ qua: ${skipped} serial`);
  console.log(`════════════════════════════════════════\n`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
