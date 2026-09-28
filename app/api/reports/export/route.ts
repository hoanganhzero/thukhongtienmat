export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import * as XLSX from 'xlsx';
import { teacherClassIds } from '@/lib/teacher-scope';
import { formatDate } from '@/lib/date-format';
import { DEFAULT_PAYMENT_ACCOUNT } from '@/lib/payment-account';

const statusMap: Record<string, string> = {
  pending: 'Chưa đóng',
  uploaded: 'Đã gửi biên lai',
  confirmed: 'Đã xác nhận',
  rejected: 'Bị từ chối',
  exempt: 'Không phải đóng',
};

function appendSheet(workbook: XLSX.WorkBook, name: string, rows: Record<string, unknown>[]) {
  const data = rows.length ? rows : [{ 'Không có dữ liệu': '' }];
  const sheet = XLSX.utils.json_to_sheet(data);
  const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1:A1');
  sheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
  sheet['!freeze'] = { xSplit: 0, ySplit: 1 } as any;
  sheet['!cols'] = Object.keys(data[0]).map((header) => ({ wch: Math.max(14, Math.min(42, header.length + 10)) }));
  XLSX.utils.book_append_sheet(workbook, sheet, name);
}

function reasonFor(transaction: any, amounts: Set<number>) {
  const content = String(transaction.content ?? '').trim();
  if (transaction.accountNumber !== DEFAULT_PAYMENT_ACCOUNT.bankAccountNumber) return 'Không đúng tài khoản MB Bank được cấu hình';
  if (!/^SEVQR\b/i.test(content)) return 'Nội dung không bắt đầu bằng SEVQR';
  if (!/\b(?:10|11|12)[A-ZĐ]\d+(?:[A-Z]\d*)?\b/i.test(content)) return 'Không nhận diện được lớp trong nội dung';
  if (!amounts.has(Number(transaction.transferAmount))) return 'Số tiền không khớp khoản thu BHTT';
  return 'Không tìm thấy đúng học sinh hoặc giao dịch bị trùng';
}

export async function GET(request: Request) {
  try {
    const user = (await auth())?.user as any;
    if (user?.role !== 'admin') return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const params = new URL(request.url).searchParams;
    const where: any = {
      feeType: {
        isActive: true,
        bankAccountNumber: DEFAULT_PAYMENT_ACCOUNT.bankAccountNumber,
        name: { contains: 'BHT', mode: 'insensitive' },
      },
    };
    if (params.get('status')) where.status = params.get('status');
    if (user.adminRole === 'teacher') where.student = { classId: { in: teacherClassIds(user) } };
    else if (params.get('classId')) where.student = { classId: params.get('classId') };
    else if (params.get('campusId')) where.student = { class: { campusId: params.get('campusId') } };

    const assignments = await prisma.feeAssignment.findMany({
      where,
      include: { student: { include: { class: { include: { campus: true } } } }, feeType: true },
      orderBy: [
        { student: { class: { campus: { name: 'asc' } } } },
        { student: { class: { name: 'asc' } } },
        { student: { fullName: 'asc' } },
      ],
    });

    const detailRows = assignments.map((item, index) => ({
      'STT': index + 1,
      'Mã học sinh': item.student.studentCode,
      'Họ và tên': item.student.fullName,
      'Lớp': item.student.class.name,
      'Cơ sở': item.student.class.campus.name,
      'Khoản thu': item.feeType.name,
      'Số tiền phải thu': item.amount,
      'Trạng thái': statusMap[item.status] ?? item.status,
      'Ngày thanh toán': formatDate(item.paidAt),
      'Năm học': item.academicYear,
    }));

    const summarize = (kind: 'campus' | 'class') => {
      const map = new Map<string, any>();
      for (const item of assignments) {
        const campus = item.student.class.campus;
        const classroom = item.student.class;
        const id = kind === 'campus' ? campus.id : classroom.id;
        const row = map.get(id) ?? {
          'Cơ sở': campus.name,
          ...(kind === 'class' ? { 'Lớp': classroom.name } : {}),
          'Tổng học sinh': 0,
          'Đã đóng': 0,
          'Không phải đóng': 0,
          'Chưa hoàn thành': 0,
          'Phải thu': 0,
          'Đã thu': 0,
          'Còn lại': 0,
        };
        row['Tổng học sinh'] += 1;
        row['Phải thu'] += Number(item.amount);
        if (item.status === 'confirmed') {
          row['Đã đóng'] += 1;
          row['Đã thu'] += Number(item.amount);
        } else if (item.status === 'exempt') row['Không phải đóng'] += 1;
        else row['Chưa hoàn thành'] += 1;
        row['Còn lại'] = row['Phải thu'] - row['Đã thu'];
        map.set(id, row);
      }
      return [...map.values()].map((row) => ({
        ...row,
        'Tỷ lệ hoàn thành (%)': row['Tổng học sinh'] ? Math.round((row['Đã đóng'] + row['Không phải đóng']) * 100 / row['Tổng học sinh'] * 100) / 100 : 0,
      }));
    };

    const campusRows = summarize('campus');
    const classRows = summarize('class');
    const requiredAmount = assignments.reduce((sum, item) => sum + Number(item.amount), 0);
    const collectedAmount = assignments.filter((item) => item.status === 'confirmed').reduce((sum, item) => sum + Number(item.amount), 0);
    const overviewRows = [{
      'Phạm vi': params.get('classId') ? 'Lớp đã chọn' : params.get('campusId') ? 'Cơ sở đã chọn' : 'Toàn trung tâm',
      'Tài khoản thu': DEFAULT_PAYMENT_ACCOUNT.bankAccountNumber,
      'Chủ tài khoản': DEFAULT_PAYMENT_ACCOUNT.bankAccountName,
      'Tổng học sinh': assignments.length,
      'Đã đóng': assignments.filter((item) => item.status === 'confirmed').length,
      'Không phải đóng': assignments.filter((item) => item.status === 'exempt').length,
      'Chưa hoàn thành': assignments.filter((item) => !['confirmed', 'exempt'].includes(item.status)).length,
      'Phải thu': requiredAmount,
      'Đã thu': collectedAmount,
      'Còn lại': requiredAmount - collectedAmount,
    }];

    const feeAmounts = new Set(assignments.map((item) => Number(item.amount)));
    const transactions = await prisma.bankTransaction.findMany({
      where: { provider: 'sepay', status: 'unmatched', accountNumber: DEFAULT_PAYMENT_ACCOUNT.bankAccountNumber },
      orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
      take: 5000,
    });
    const sepayRows = transactions.map((item, index) => ({
      'STT': index + 1,
      'Thời gian': item.transactionDate ? item.transactionDate.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '',
      'Ngân hàng': item.gateway ?? 'SePay',
      'Tài khoản nhận': item.accountNumber,
      'Số tiền': item.transferAmount,
      'Nội dung chuyển khoản': item.content,
      'Mã tham chiếu': item.referenceCode ?? item.providerTransactionId,
      'Lý do chưa xác nhận': reasonFor(item, feeAmounts),
    }));

    const workbook = XLSX.utils.book_new();
    appendSheet(workbook, 'Tổng quan', overviewRows);
    appendSheet(workbook, 'Theo cơ sở', campusRows);
    appendSheet(workbook, 'Theo lớp', classRows);
    appendSheet(workbook, 'Chi tiết học sinh', detailRows);
    appendSheet(workbook, 'SePay chưa xác nhận', sepayRows);

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=bao-cao-thu-BHTT-MBBank.xlsx',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Không thể xuất báo cáo' }, { status: 500 });
  }
}
