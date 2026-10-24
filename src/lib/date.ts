// Server Netlify chạy múi giờ UTC, còn cửa hàng ở Việt Nam (UTC+7).
// Các hàm dưới đây tính mốc "hôm nay", "đầu tháng"... theo giờ Việt Nam.
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

export function startOfDayVN(d: Date = new Date()): Date {
  const t = new Date(d.getTime() + VN_OFFSET_MS);
  t.setUTCHours(0, 0, 0, 0);
  return new Date(t.getTime() - VN_OFFSET_MS);
}

export function startOfMonthVN(d: Date = new Date()): Date {
  const t = new Date(d.getTime() + VN_OFFSET_MS);
  t.setUTCDate(1);
  t.setUTCHours(0, 0, 0, 0);
  return new Date(t.getTime() - VN_OFFSET_MS);
}

// 'YYYY-MM-DD' theo giờ Việt Nam
export function dayKeyVN(d: Date): string {
  return new Date(d.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
}

// Chuỗi 'YYYY-MM-DD' (từ ô chọn ngày) -> mốc đầu/cuối ngày theo giờ Việt Nam
export function parseVNDate(s: string | null | undefined, edge: 'start' | 'end'): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T${edge === 'start' ? '00:00:00.000' : '23:59:59.999'}+07:00`);
  return isNaN(d.getTime()) ? null : d;
}
