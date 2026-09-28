export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { DEFAULT_PAYMENT_ACCOUNT } from '@/lib/payment-account';
import * as XLSX from 'xlsx';

function reasonFor(item: any, amounts: Set<number>) {
  const content = String(item.content ?? '').trim();
  if (!/^SEVQR\b/i.test(content)) return 'Nội dung không bắt đầu bằng SEVQR';
  if (!/\b(?:10|11|12)[A-ZĐ]+\d+(?:[A-Z]\d*)?\b/i.test(content)) return 'Không nhận diện được lớp';
  if (!amounts.has(Number(item.transferAmount))) return 'Số tiền không khớp khoản thu BHTT';
  return 'Không tìm thấy duy nhất một học sinh hoặc giao dịch bị trùng';
}

export async function GET() {
  try {
    const user = (await auth())?.user as any;
    if (user?.role !== 'admin') return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const [transactions, feeTypes] = await Promise.all([
      prisma.bankTransaction.findMany({
        where: { provider: { in: ['sepay', 'sepay-excel'] }, status: 'unmatched', accountNumber: DEFAULT_PAYMENT_ACCOUNT.bankAccountNumber },
        orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
        take: 10000,
      }),
      prisma.feeType.findMany({
        where: { isActive: true, bankAccountNumber: DEFAULT_PAYMENT_ACCOUNT.bankAccountNumber, name: { contains: 'BHT', mode: 'insensitive' } },
        select: { amount: true },
      }),
    ]);
    const amounts = new Set(feeTypes.map(item => Number(item.amount)));
    const rows = transactions.map((item, index) => ({
      'STT': index + 1,
      'Thời gian': item.transactionDate ? item.transactionDate.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '',
      'Ngân hàng': item.gateway ?? 'SePay',
      'Tài khoản nhận': item.accountNumber,
      'Số tiền': item.transferAmount,
      'Nội dung chuyển khoản': item.content,
      'Mã tham chiếu': item.referenceCode ?? item.providerTransactionId,
      'Lý do cần xem xét': reasonFor(item, amounts),
      'Họ tên học sinh xác nhận': '',
      'Lớp': '',
      'Mã học sinh': '',
      'Xác nhận thủ công (Có/Không)': '',
      'Ghi chú kiểm tra': '',
    }));
    const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ 'Thông báo': 'Không có giao dịch cần xem xét' }]);
    sheet['!freeze'] = { xSplit: 0, ySplit: 1 } as any;
    sheet['!autofilter'] = { ref: sheet['!ref'] ?? 'A1:A1' };
    sheet['!cols'] = [6,20,15,18,15,48,24,42,30,14,18,25,35].map(wch => ({ wch }));
    for (let row = 2; row <= rows.length + 1; row++) {
      if (sheet['E' + row]) sheet['E' + row].z = '#,##0 "đ"';
    }
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Cần xác nhận thủ công');
    const guide = XLSX.utils.aoa_to_sheet([
      ['HƯỚNG DẪN KIỂM TRA'],
      ['1. Đối chiếu nội dung chuyển khoản, họ tên, lớp và số tiền.'],
      ['2. Điền học sinh đúng vào các cột Họ tên, Lớp, Mã học sinh.'],
      ['3. Chỉ ghi Có tại cột xác nhận thủ công khi đã kiểm tra chắc chắn.'],
      ['Tài khoản cố định', DEFAULT_PAYMENT_ACCOUNT.bankAccountNumber],
      ['Chủ tài khoản', DEFAULT_PAYMENT_ACCOUNT.bankAccountName],
    ]);
    guide['!cols'] = [{ wch: 30 }, { wch: 70 }];
    XLSX.utils.book_append_sheet(workbook, guide, 'Hướng dẫn');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(buffer, { headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=giao-dich-can-xac-nhan-thu-cong.xlsx',
    }});
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Không thể xuất tệp' }, { status: 500 });
  }
}
