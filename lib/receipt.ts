const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function readThree(value: number, full: boolean) {
  const hundred = Math.floor(value / 100), ten = Math.floor((value % 100) / 10), unit = value % 10;
  const words: string[] = [];
  if (hundred || full) words.push(`${digits[hundred]} trăm`);
  if (ten > 1) words.push(`${digits[ten]} mươi`);
  else if (ten === 1) words.push('mười');
  else if (unit && (hundred || full)) words.push('lẻ');
  if (unit) words.push(unit === 1 && ten > 1 ? 'mốt' : unit === 5 && ten > 0 ? 'lăm' : digits[unit]);
  return words.join(' ');
}

export function amountInWords(amount: number) {
  if (!Number.isFinite(amount) || amount < 0) return '';
  if (amount === 0) return 'Không đồng';
  const groups = [Math.floor(amount / 1_000_000_000), Math.floor(amount / 1_000_000) % 1000, Math.floor(amount / 1000) % 1000, Math.floor(amount) % 1000];
  const units = ['tỷ', 'triệu', 'nghìn', ''];
  const parts: string[] = [];
  groups.forEach((group, index) => { if (group) parts.push(readThree(group, parts.length > 0), units[index]); });
  const text = parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  return `${text.charAt(0).toUpperCase()}${text.slice(1)} đồng`;
}
