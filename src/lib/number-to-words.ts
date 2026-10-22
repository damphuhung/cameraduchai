const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function readTriple(n: number): string {
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const u = n % 10;
  let r = '';
  if (h > 0) {
    r += digits[h] + ' trăm ';
    if (t === 0 && u > 0) r += 'lẻ ';
  }
  if (t > 0) {
    if (t === 1) r += 'mười ';
    else r += digits[t] + ' mươi ';
  }
  if (u > 0) {
    if (t > 1 && u === 1) r += 'mốt';
    else if (t > 0 && u === 5) r += 'lăm';
    else r += digits[u];
  }
  return r.trim();
}

export function numberToWords(num: number): string {
  if (!num || num <= 0) return 'Không đồng';
  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  let result = '';
  let i = 0;
  let n = Math.floor(num);
  while (n > 0) {
    const triple = n % 1000;
    if (triple > 0) {
      const read = readTriple(triple);
      result = read + ' ' + units[i] + ' ' + result;
    }
    n = Math.floor(n / 1000);
    i++;
  }
  result = result.trim() + ' đồng';
  return result.charAt(0).toUpperCase() + result.slice(1);
}
