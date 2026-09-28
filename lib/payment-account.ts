export const DEFAULT_PAYMENT_ACCOUNT = {
  bankName: 'MB Bank',
  bankAccountNumber: '0335127226',
  bankAccountName: 'NGUYEN THI PHUONG THAO',
} as const;

export function normalizeAccountNumber(value: unknown) {
  return String(value ?? '').replace(/\D/g, '');
}
