export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx-js-style';

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').trim().toLowerCase();
}
function compareStudents(a: { fullName: string }, b: { fullName: string }) {
  const given = (name: string) => name.trim().split(/\s+/).at(-1) ?? '';
  return given(a.fullName).localeCompare(given(b.fullName), 'vi', { sensitivity: 'base' }) ||
    a.fullName.localeCompare(b.fullName, 'vi', { sensitivity: 'base' });
}
const statusName: Record<string, string> = {
  confirmed: 'Đã đóng', uploaded: 'Chờ xác nhận', pending: 'Chưa đóng', rejected: 'Cần kiểm tra',
};

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const id = params.get('classId') ?? '';
    const query = normalize(params.get('q') ?? '');
    const classroom = await prisma.class.findUnique({
      where: { id }, include: {
        campus: { select: { name: true } },
        students: {
          where: { deletedAt: null },
          select: { studentCode: true, fullName: true, feeAssignments: {
            select: { amount: true, status: true, feeType: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
          } },
        },
      },
    });
    if (!classroom || !query || (normalize(classroom.name) !== query && normalize(classroom.teacherName ?? '') !== query)) {
      return NextResponse.json({ error: 'Lớp tra cứu không hợp lệ' }, { status: 403 });
    }
    classroom.students.sort(compareStudents);
    const rows: (string | number)[][] = [
      ['TRUNG TÂM GDNN-GDTX KHU VỰC TÂN NINH'],
      ['DANH SÁCH TRA CỨU KHOẢN THU LỚP ' + classroom.name],
      ['Cơ sở: ' + classroom.campus.name, 'Năm học: ' + classroom.schoolYear],
      ['GVCN: ' + (classroom.teacherName ?? 'Chưa cập nhật')],
      [],
      ['STT', 'Mã học sinh', 'Họ và tên', 'Lớp', 'Khoản thu', 'Số tiền (đ)', 'Trạng thái'],
    ];
    let total = 0;
    classroom.students.forEach((student, index) => {
      if (!student.feeAssignments.length) rows.push([index + 1, student.studentCode, student.fullName, classroom.name, 'Chưa gán', 0, 'Chưa gán']);
      student.feeAssignments.forEach((fee, feeIndex) => {
        if (fee.status === 'confirmed') total += fee.amount;
        rows.push([feeIndex ? '' : index + 1, student.studentCode, student.fullName, classroom.name,
          fee.feeType.name, fee.amount, statusName[fee.status] ?? fee.status]);
      });
    });
    rows.push(['TỔNG ĐÃ THU', '', '', '', '', total, '']);
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 6 } },
      { s: { r: rows.length - 1, c: 0 }, e: { r: rows.length - 1, c: 4 } },
    ];
    worksheet['!cols'] = [{ wch: 7 }, { wch: 18 }, { wch: 32 }, { wch: 12 }, { wch: 25 }, { wch: 18 }, { wch: 20 }];
    worksheet['!freeze'] = { xSplit: 0, ySplit: 6 } as any;
    worksheet['!autofilter'] = { ref: 'A6:G' + Math.max(6, rows.length - 1) };
    worksheet['!print'] = { orientation: 'landscape', fitToWidth: 1, fitToHeight: 0 } as any;
    const edge = { style: 'thin', color: { rgb: 'D2E4DB' } };
    for (let r = 0; r < rows.length; r++) {
      for (let col = 0; col < 7; col++) {
        const addr = XLSX.utils.encode_cell({ r, c: col });
        if (!worksheet[addr]) worksheet[addr] = { t: 's', v: '' };
        worksheet[addr].s = {
          font: { name: 'Arial', sz: r < 2 ? 14 : 11, bold: r < 2 || r === 5 || r === rows.length - 1 },
          alignment: { vertical: 'center', horizontal: col === 5 ? 'right' : 'left', wrapText: true },
          fill: r === 5 ? { fgColor: { rgb: 'DCEFE5' } } : undefined,
          border: r >= 5 ? { top: edge, bottom: edge, left: edge, right: edge } : undefined,
        };
      }
    }
    for (let r = 6; r < rows.length; r++) worksheet['F' + (r + 1)].z = '#,##0 "đ"';
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Lop ' + classroom.name.slice(0, 25));
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', cellStyles: true });
    return new NextResponse(buffer, { headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="tra-cuu-lop-' + classroom.name.replace(/[^a-zA-Z0-9_-]/g, '-') + '.xlsx"',
      'Cache-Control': 'no-store',
    } });
  } catch {
    return NextResponse.json({ error: 'Không thể xuất Excel lớp' }, { status: 500 });
  }
}
