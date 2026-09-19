export const vietQrBanks = [
  ['Agribank', '970405'], ['VietinBank', '970415'], ['Vietcombank', '970436'], ['BIDV', '970418'],
  ['MBBank', '970422'], ['Techcombank', '970407'], ['ACB', '970416'], ['VPBank', '970432'],
  ['TPBank', '970423'], ['Sacombank', '970403'], ['HDBank', '970437'], ['VIB', '970441'],
  ['OCB', '970448'], ['MSB', '970426'], ['SHB', '970443'], ['Eximbank', '970431'],
  ['SeABank', '970440'], ['PVcomBank', '970412'], ['LPBank', '970449'], ['BacABank', '970409'],
  ['NamABank', '970428'], ['VietABank', '970427'], ['KienlongBank', '970452'], ['NCB', '970419'],
  ['ABBANK', '970425'], ['BaoVietBank', '970438'], ['SCB', '970429'], ['SaigonBank', '970400'],
  ['VietBank', '970433'], ['PGBank', '970430'], ['Cake', '546034'], ['Timo', '963388'],
  ['Woori', '970457'], ['CIMB', '422589'],
] as const;

const aliases: Record<string, string> = {
  AGRIBANK: 'Agribank', VBA: 'Agribank',
  VIETINBANK: 'VietinBank', ICB: 'VietinBank',
  VIETCOMBANK: 'Vietcombank', VCB: 'Vietcombank',
  BIDV: 'BIDV', MB: 'MBBank', MBBANK: 'MBBank',
  TECHCOMBANK: 'Techcombank', TCB: 'Techcombank',
  ACB: 'ACB', VPBANK: 'VPBank', VPB: 'VPBank',
  TPBANK: 'TPBank', TPB: 'TPBank', SACOMBANK: 'Sacombank', STB: 'Sacombank',
  HDBANK: 'HDBank', HDB: 'HDBank', VIB: 'VIB', OCB: 'OCB', MSB: 'MSB', SHB: 'SHB',
  EXIMBANK: 'Eximbank', EIB: 'Eximbank', SEABANK: 'SeABank', SEAB: 'SeABank',
  PVCOMBANK: 'PVcomBank', PVCB: 'PVcomBank', LPBANK: 'LPBank', LPB: 'LPBank',
  BACABANK: 'BacABank', BAB: 'BacABank', NAMABANK: 'NamABank', NAB: 'NamABank',
  VIETABANK: 'VietABank', VAB: 'VietABank', KLB: 'KienlongBank', KienlongBank: 'KienlongBank',
  NCB: 'NCB', ABBANK: 'ABBANK', ABB: 'ABBANK', BAOVIETBANK: 'BaoVietBank', BVB: 'BaoVietBank',
  SCB: 'SCB', SAIGONBANK: 'SaigonBank', SGICB: 'SaigonBank', VIETBANK: 'VietBank',
  PGBANK: 'PGBank', PGB: 'PGBank', CAKE: 'Cake', TIMO: 'Timo', WOORI: 'Woori', CIMB: 'CIMB',
};

export function getVietQrBankBin(bankName?: string | null) {
  const normalized = (bankName ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const canonical = aliases[normalized] ?? bankName;
  return vietQrBanks.find(([name]) => name.toUpperCase() === String(canonical).toUpperCase())?.[1] ?? '970405';
}
