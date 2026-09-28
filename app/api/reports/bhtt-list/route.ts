export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { DEFAULT_PAYMENT_ACCOUNT } from '@/lib/payment-account';
import { teacherClassIds } from '@/lib/teacher-scope';
import * as XLSX from 'xlsx';

const compare = (a: string, b: string) => a.localeCompare(b, 'vi', { sensitivity: 'base', numeric: true });
const givenName = (name: string) => name.trim().split(/\s+/).at(-1) ?? '';

function formatDate(value: Date | null) {
  return value ? value.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '';
}

function safeSheetName(value: string) {
  return value.replace(/[\\/?*\[\]:]/g, '-').slice(0, 31) || 'BHTT';
}

function makeSheet(items: any[], title: string, academicYear: string) {
  const rows: any[][] = [
    ['SỞ GD&ĐT TÂY NINH', '', '', 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', '', '', ''],
    ['TRUNG TÂM GDNN-GDTX\nKHU VỰC TÂN NINH\n***', '', '', 'Độc lập - Tự do - Hạnh phúc', '', '', ''],
    [],
    ['DANH SÁCH HỌC SINH THAM GIA BHTT', '', '', '', '', '', ''],
    [title + ' — NĂM HỌC: ' + academicYear, '', '', '', '', '', ''],
    [],
    ['STT', 'Họ và Tên', 'Lớp', 'Ngày sinh', 'Giới tính', 'Số tiền', 'Ghi chú'],
  ];
  items.forEach((item, index) => rows.push([
    index + 1,
    item.student.fullName,
    item.student.class.name,
    formatDate(item.student.dateOfBirth),
    item.student.gender ?? '',
    Number(item.amount),
    item.paidAt ? 'Đã đóng ngày ' + formatDate(item.paidAt) : 'Đã xác nhận',
  ]));
  const firstData = 8;
  const lastData = Math.max(firstData, rows.length);
  rows.push(['', 'TỔNG CỘNG', '', '', '', { f: `SUM(F${firstData}:F${lastData})` }, '']);
  rows.push(['', 'Bằng chữ:', '', '', '', '', '']);
  rows.push([]);
  rows.push(['', 'Người lập bảng', '', '', 'Tân Ninh, ngày ..... tháng ..... năm ........', '', '']);
  rows.push(['', '', '', '', 'P. GIÁM ĐỐC', '', '']);
  rows.push([]);
  rows.push(['', 'Nguyễn Thị Phương Thảo', '', '', '', '', '']);

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }, { s: { r: 0, c: 3 }, e: { r: 0, c: 6 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } }, { s: { r: 1, c: 3 }, e: { r: 1, c: 6 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 6 } }, { s: { r: 4, c: 0 }, e: { r: 4, c: 6 } },
  ];
  sheet['!cols'] = [{ wch: 7 }, { wch: 32 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 28 }];
  sheet['!rows'] = [{ hpt: 22 }, { hpt: 48 }, { hpt: 8 }, { hpt: 26 }, { hpt: 22 }];
  sheet['!freeze'] = { xSplit: 0, ySplit: 7 } as any;
  sheet['!autofilter'] = { ref: `A7:G${lastData}` };
  sheet['!margins'] = { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 };
  sheet['!print'] = { orientation: 'landscape', fitToWidth: 1, fitToHeight: 0 } as any;
  for (let row = firstData; row <= lastData + 1; row++) if (sheet['F' + row]) sheet['F' + row].z = '#,##0 "đ"';
  return sheet;
}

export async function GET(request: Request) {
  try {
    const user = (await auth())?.user as any;
    if (user?.role !== 'admin') return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    const params = new URL(request.url).searchParams;
    const where: any = {
      status: 'confirmed',
      feeType: { isActive: true, bankAccountNumber: DEFAULT_PAYMENT_ACCOUNT.bankAccountNumber, name: { contains: 'BHT', mode: 'insensitive' } },
      student: { deletedAt: null },
    };
    if (user.adminRole === 'teacher') where.student.classId = { in: teacherClassIds(user) };
    else if (params.get('classId')) where.student.classId = params.get('classId');
    else {
      if (params.get('campusId')) where.student.class = { campusId: params.get('campusId') };
      if (params.get('grade')) where.student.class = { ...(where.student.class ?? {}), name: { startsWith: params.get('grade'), mode: 'insensitive' } };
    }
    const assignments = await prisma.feeAssignment.findMany({
      where,
      include: { student: { include: { class: { include: { campus: true } } } }, feeType: true },
    });
    assignments.sort((a, b) =>
      compare(a.student.class.campus.name, b.student.class.campus.name) ||
      compare(a.student.class.name, b.student.class.name) ||
      compare(givenName(a.student.fullName), givenName(b.student.fullName)) ||
      compare(a.student.fullName, b.student.fullName)
    );
    const workbook = XLSX.utils.book_new();
    const grouped = new Map<string, any[]>();
    for (const item of assignments) {
      const list = grouped.get(item.student.class.id) ?? [];
      list.push(item);
      grouped.set(item.student.class.id, list);
    }
    if (!assignments.length) {
      XLSX.utils.book_append_sheet(workbook, makeSheet([], 'KHÔNG CÓ HỌC SINH ĐÃ ĐÓNG TRONG PHẠM VI ĐÃ CHỌN', '2026-2027'), 'BHTT');
    } else {
      for (const items of grouped.values()) {
        const classroom = items[0].student.class;
        const title = 'LỚP ' + classroom.name + ' — ' + classroom.campus.name;
        XLSX.utils.book_append_sheet(workbook, makeSheet(items, title, items[0].academicYear), safeSheetName(classroom.name));
      }
    }
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const scope = params.get('classId') ? 'lop' : params.get('grade') ? 'khoi-' + params.get('grade') : params.get('campusId') ? 'co-so' : 'toan-trung-tam';
    return new NextResponse(buffer, { headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=danh-sach-hoc-sinh-nop-BHTT-${scope}.xlsx`,
    }});
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Không thể xuất danh sách BHTT' }, { status: 500 });
  }
}
