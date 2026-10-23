import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const sales = await prisma.sale.findMany({
    where: { paid: { gt: 0 } } // Chỉ lấy đơn có paid > 0
  });

  let fixed = 0;
  for (const s of sales) {
    const total = Number(s.total);
    const paid = Number(s.paid);
    if (paid > total) {
      const bonus = paid - total;
      await prisma.sale.update({
        where: { id: s.id },
        data: { paid: total, bonus: bonus }
      });
      fixed++;
    }
  }
  console.log(`Đã sửa ${fixed} đơn hàng bị lỗi công nợ âm.`);
}
main().finally(() => prisma.$disconnect());