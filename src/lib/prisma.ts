import { PrismaClient } from '@prisma/client';

// Ghép/ghi đè tham số kết nối. Số kết nối mỗi function lấy từ DB_POOL_SIZE (mặc định 5)
// để các truy vấn Promise.all chạy song song được (trước đây cứng connection_limit=1).
function buildDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  let url: string = raw;
  const setParam = (key: string, value: string) => {
    const re = new RegExp(`([?&])${key}=[^&]*`);
    if (re.test(url)) url = url.replace(re, `$1${key}=${value}`);
    else url += (url.includes('?') ? '&' : '?') + `${key}=${value}`;
  };
  setParam('connection_limit', process.env.DB_POOL_SIZE ?? '5');
  setParam('pool_timeout', '20');
  setParam('connect_timeout', '10');
  return url;
}

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: buildDatabaseUrl() } },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

// Luôn giữ client trong global để tái sử dụng khi function còn "ấm"
globalForPrisma.prisma = prisma;
