export const dynamic = 'force-dynamic';
import { formatDate } from '@/lib/date-format';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import * as XLSX from 'xlsx';

const statusMap: Record<string, string> = { pending: 'Chưa đóng', uploaded: 'Đã gửi biên lai', confirmed: 'Đã xác nhận', rejected: 'Bị từ chối', exempt: 'Không phải đóng' };
const bhytMap: Record<string, string> = { student: 'Đóng BHYT tại trường', household: 'Đã mua BHYT hộ gia đình', near_poor: 'Hộ cận nghèo đã được cấp', poor: 'Hộ nghèo đã được cấp', commune_free: 'Xã/phường cấp miễn phí', other: 'Diện khác đã có BHYT' };

function appendSheet(workbook: XLSX.WorkBook, name: string, rows: Record<string, unknown>[]) {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1:A1');
  sheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
  sheet['!freeze'] = { xSplit: 0, ySplit: 1 } as any;
  sheet['!cols'] = Object.keys(rows[0] ?? { 'Không có dữ liệu': '' }).map((header) => ({ wch: Math.max(12, Math.min(35, header.length + 8)) }));
  XLSX.utils.book_append_sheet(workbook, sheet, name);
}

export async function GET(request: Request) {
  try {
    const user = (await auth())?.user as any;
    if (user?.role !== 'admin') return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    const params = new URL(request.url).searchParams;
    const where: any = {};
    if (params.get('feeTypeId')) where.feeTypeId = params.get('feeTypeId');
    if (params.get('status')) where.status = params.get('status');
    if (user.adminRole === 'teacher') where.student = { classId: user.classId || '__none__' };
    else if (params.get('classId')) where.student = { classId: params.get('classId') };
    else if (params.get('campusId')) where.student = { class: { campusId: params.get('campusId') } };

    const assignments = await prisma.feeAssignment.findMany({ where, include: { student: { include: { class: { include: { campus: true } } } }, feeType: true }, orderBy: [{ student: { class: { campus: { name: 'asc' } } } }, { student: { class: { name: 'asc' } } }, { student: { fullName: 'asc' } }] });
    const detailRows = assignments.map((item) => ({
      'Mã học sinh': item.student.studentCode, 'Họ và tên': item.student.fullName, 'Lớp': item.student.class.name, 'Điểm trường/Phân hiệu': item.student.class.campus.name,
      'Khoản thu': item.feeType.name, 'Số tiền phải thu': item.amount, 'Trạng thái': statusMap[item.status] ?? item.status,
      'Ngày thanh toán': formatDate(item.paidAt), 'Năm học': item.academicYear,
      'Diện BHYT': bhytMap[item.bhytCategory ?? ''] ?? '', 'Số tháng BHYT': item.bhytMonths ?? '', 'Ghi chú BHYT': item.bhytNote ?? '',
    }));
    const summarize = (key: 'class' | 'campus' | 'fee') => {
      const map = new Map<string, any>();
      for (const item of assignments) {
        const name = key === 'class' ? item.student.class.name : key === 'campus' ? item.student.class.campus.name : item.feeType.name;
        const row = map.get(name) ?? { 'Đơn vị': name, 'Tổng lượt': 0, 'Đã đóng': 0, 'Không phải đóng': 0, 'Chưa hoàn thành': 0, 'Phải thu': 0, 'Đã thu': 0 };
        row['Tổng lượt']++; row['Phải thu'] += item.amount;
        if (item.status === 'confirmed') { row['Đã đóng']++; row['Đã thu'] += item.amount; }
        else if (item.status === 'exempt') row['Không phải đóng']++;
        else row['Chưa hoàn thành']++;
        map.set(name, row);
      }
      return [...map.values()].map((row) => ({ ...row, 'Tỷ lệ hoàn thành (%)': row['Tổng lượt'] ? Math.round((row['Đã đóng'] + row['Không phải đóng']) * 100 / row['Tổng lượt']) : 0 }));
    };
    const bhytRows = detailRows.filter((row) => String(row['Khoản thu']).toUpperCase().includes('BHYT'));
    const workbook = XLSX.utils.book_new();
    appendSheet(workbook, 'Chi tiết', detailRows);
    appendSheet(workbook, 'Theo lớp', summarize('class'));
    appendSheet(workbook, 'Theo điểm trường', summarize('campus'));
    appendSheet(workbook, 'Theo khoản thu', summarize('fee'));
    appendSheet(workbook, 'BHYT', bhytRows);
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(buffer, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename=bao-cao-khoan-thu.xlsx' } });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Không thể xuất báo cáo' }, { status: 500 });
  }
}
