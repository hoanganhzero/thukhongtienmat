import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export function generateQrContent(feeTypeName: string, studentCode: string, fullName?: string, className?: string): string {
  return fullName && className
    ? `${fullName} - Lớp ${className} - Thanh toán tiền ${feeTypeName} - ${studentCode}`
    : `TN26 ${studentCode} ${feeTypeName}`;
}

export function buildVietQrUrl(accountNo: string, amount: number, description: string, accountName: string): string {
  return `https://img.vietqr.io/image/agribank-${accountNo}-qr_only.png?amount=${amount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(accountName)}`;
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'Chưa đóng',
    uploaded: 'Đã gửi ảnh',
    confirmed: 'Đã xác nhận',
    rejected: 'Bị từ chối',
    exempt: 'Không phải đóng',
  };
  return map[status] ?? status;
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    uploaded: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    exempt: 'bg-sky-100 text-sky-800',
  };
  return map[status] ?? 'bg-gray-100 text-gray-800';
}
