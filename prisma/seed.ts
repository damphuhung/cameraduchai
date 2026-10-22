import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
async function main() {
  await prisma.user.upsert({
    where: { email: 'admin@erp.local' }, update: {},
    create: { email: 'admin@erp.local', password: await bcrypt.hash('admin123', 10), name: 'Quản trị viên', role: Role.ADMIN },
  });
  await prisma.user.upsert({
    where: { email: 'staff@erp.local' }, update: {},
    create: { email: 'staff@erp.local', password: await bcrypt.hash('staff123', 10), name: 'Nhân viên', role: Role.STAFF },
  });
  for (const name of ['Camera', 'Đầu thu', 'Ổ cứng', 'Đèn năng lượng mặt trời', 'Phụ kiện'])
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  for (const name of ['Hikvision', 'Dahua', 'KBVision', 'Seagate', 'WD', 'Khác'])
    await prisma.brand.upsert({ where: { name }, update: {}, create: { name } });
  console.log('✅ Seed xong: admin@erp.local/admin123 | staff@erp.local/staff123');
}
main().finally(() => prisma.$disconnect());
