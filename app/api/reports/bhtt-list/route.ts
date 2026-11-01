export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { teacherClassIds } from '@/lib/teacher-scope';
import * as XLSX from 'xlsx-js-style';

const compare = (a: string, b: string) => a.localeCompare(b, 'vi', { sensitivity: 'base', numeric: true });
const givenName = (name: string) => name.trim().split(/\s+/).at(-1) ?? '';

function moneyInWords(value: number) {
  const digit = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const group = (number: number, full: boolean) => {
    const hundred = Math.floor(number / 100), ten = Math.floor((number % 100) / 10), unit = number % 10;
    const words: string[] = [];
    if (hundred || full) words.push(digit[hundred], 'trăm');
    if (ten > 1) words.push(digit[ten], 'mươi');
    else if (ten === 1) words.push('mười');
    else if (unit && (hundred || full)) words.push('lẻ');
    if (unit) words.push(unit === 1 && ten > 1 ? 'mốt' : unit === 5 && ten > 0 ? 'lăm' : digit[unit]);
    return words.join(' ');
  };
  if (!value) return 'Không đồng';
  const millions = Math.floor(value / 1_000_000);
  const thousands = Math.floor((value % 1_000_000) / 1_000);
  const remainder = value % 1_000;
  const words = [
    millions ? `${group(millions, false)} triệu` : '',
    thousands ? `${group(thousands, Boolean(millions))} nghìn` : '',
    remainder ? group(remainder, Boolean(millions || thousands)) : '',
  ].filter(Boolean).join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1) + ' đồng';
}

function safeSheetName(value: string) {
  return value.replace(/[\\/?*\[\]:]/g, '-').slice(0, 31) || 'BHTT';
}

function makeSheet(items: any[], title: string, academicYear: string) {
  const total = items.reduce((sum, item) => sum + Number(item.amount), 0);
  const rows: any[][] = [
    ['SỞ GD& ĐT TÂY NINH', '', '', 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', '', '', ''],
    ['TRUNG TÂM GDNN-GDTX KHU VỰC TÂN NINH', '', '', 'Độc Lập - Tự Do - Hạnh Phúc', '', '', ''],
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
    item.student.dateOfBirth ?? '',
    item.student.gender ?? '',
    Number(item.amount),
    '',
  ]));
  const firstData = 8;
  const lastData = rows.length;
  const totalRow = rows.length + 1;
  rows.push(['TỔNG CỘNG', '', '', '', '', items.length ? { f: `SUM(F${firstData}:F${lastData})` } : 0, '']);
  rows.push([`Bằng chữ: ${moneyInWords(total)}`, '', '', '', '', '', '']);
  rows.push([]);
  rows.push(['', 'Người lập bảng', '', 'P. Giám đốc', '', '', '']);
  rows.push([]);
  rows.push([]);
  rows.push([]);
  rows.push([]);
  rows.push(['', 'Nguyễn Thị Phương Thảo', '', '', '', '', '']);

  const sheet = XLSX.utils.aoa_to_sheet(rows, { cellDates: true });
  sheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }, { s: { r: 0, c: 3 }, e: { r: 0, c: 6 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } }, { s: { r: 1, c: 3 }, e: { r: 1, c: 6 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 6 } }, { s: { r: 4, c: 0 }, e: { r: 4, c: 6 } },
    { s: { r: totalRow - 1, c: 0 }, e: { r: totalRow - 1, c: 4 } },
    { s: { r: totalRow, c: 0 }, e: { r: totalRow, c: 6 } },
    { s: { r: totalRow + 2, c: 3 }, e: { r: totalRow + 2, c: 6 } },
  ];
  sheet['!cols'] = [{ wch: 7.8 }, { wch: 28.8 }, { wch: 9 }, { wch: 14.1 }, { wch: 13.8 }, { wch: 10.8 }, { wch: 12.7 }];
  sheet['!rows'] = [{}, {}, { hpt: 8 }, { hpt: 26 }, { hpt: 22 }, { hpt: 8 }, { hpt: 32 }];
  sheet['!margins'] = { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 };
  sheet['!print'] = { orientation: 'portrait', paperSize: 9, fitToWidth: 1, fitToHeight: 0 } as any;
  const border = { style: 'thin', color: { rgb: '000000' } };
  const base = { font: { name: 'Arial', sz: 11 }, alignment: { vertical: 'center' } };
  for (let row = 1; row <= rows.length; row++) for (let col = 0; col < 7; col++) {
    const address = XLSX.utils.encode_cell({ r: row - 1, c: col });
    if (!sheet[address]) sheet[address] = { t: 's', v: '' };
    sheet[address].s = base;
  }
  for (const address of ['A1', 'D1']) sheet[address].s = { ...base, font: { name: 'Arial', sz: 11, bold: address === 'D1' }, alignment: { horizontal: 'center', vertical: 'center' } };
  for (const address of ['A2', 'D2']) sheet[address].s = { ...base, font: { name: 'Arial', sz: 11, bold: true }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } };
  for (const address of ['A4', 'A5']) sheet[address].s = { ...base, font: { name: 'Arial', sz: address === 'A4' ? 14 : 12, bold: true }, alignment: { horizontal: 'center', vertical: 'center' } };
  for (let row = 7; row <= totalRow; row++) for (let col = 0; col < 7; col++) {
    const address = XLSX.utils.encode_cell({ r: row - 1, c: col });
    sheet[address].s = { ...base, border: { top: border, bottom: border, left: border, right: border }, alignment: { horizontal: col === 1 ? 'left' : col === 5 ? 'right' : 'center', vertical: 'center', wrapText: true }, font: { name: 'Arial', sz: 11, bold: row === 7 || row === totalRow } };
  }
  for (let row = firstData; row <= lastData; row++) {
    if (sheet['D' + row]) sheet['D' + row].z = 'dd/mm/yyyy';
    if (sheet['F' + row]) sheet['F' + row].z = '#,##0 "đ"';
  }
  sheet['F' + totalRow].z = '#,##0 "đ"';
  sheet['A' + (totalRow + 1)].s = { ...base, font: { name: 'Arial', sz: 11, bold: true }, alignment: { horizontal: 'center', vertical: 'center' }, border: { top: border, bottom: border, left: border, right: border } };
  for (const address of ['B' + (totalRow + 3), 'D' + (totalRow + 3)]) sheet[address].s = { ...base, font: { name: 'Arial', sz: 11, bold: true }, alignment: { horizontal: 'center' } };
  sheet['B' + (totalRow + 8)].s = { ...base, font: { name: 'Arial', sz: 11, bold: true }, alignment: { horizontal: 'center' } };
  return sheet;
}

export async function GET(request: Request) {
  try {
    const user = (await auth())?.user as any;
    if (user?.role !== 'admin') return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    const params = new URL(request.url).searchParams;
    const where: any = {
      status: 'confirmed',
      feeType: { name: { contains: 'BHTT', mode: 'insensitive' } },
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
        XLSX.utils.book_append_sheet(workbook, makeSheet(items, title, '2026-2027'), safeSheetName(classroom.name));
      }
    }
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', cellStyles: true, cellDates: true });
    const scope = params.get('classId') ? 'lop' : params.get('grade') ? 'khoi-' + params.get('grade') : params.get('campusId') ? 'co-so' : 'toan-trung-tam';
    return new NextResponse(buffer, { headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=danh-sach-hoc-sinh-nop-BHTT-${scope}.xlsx`,
    }});
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Không thể xuất danh sách BHTT' }, { status: 500 });
  }
}
