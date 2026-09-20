export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

async function isAdmin() {
  return ((await auth())?.user as any)?.role === 'admin';
}

export async function POST(request: Request) {
  try {
    if (!(await isAdmin())) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    const body = await request.json();
    const rows = Array.isArray(body?.students) ? body.students.slice(0, 5000) : [];
    if (!rows.length) return NextResponse.json({ error: 'Danh sách học sinh trống' }, { status: 400 });

    const classIds = new Set((await prisma.class.findMany({ select: { id: true } })).map((item) => item.id));
    const seen = new Set<string>();
    const seenCccd = new Set<string>();
    for (const [index, row] of rows.entries()) {
      const code = String(row?.studentCode ?? '').trim();
      const cccd = String(row?.cccd ?? '').trim();
      if (!code || !String(row?.fullName ?? '').trim() || !classIds.has(String(row?.classId ?? ''))) {
        return NextResponse.json({ error: `Dữ liệu không hợp lệ tại dòng ${index + 2}` }, { status: 400 });
      }
      if (seen.has(code)) return NextResponse.json({ error: `Trùng mã học sinh ${code} trong tệp` }, { status: 400 });
      if (cccd && seenCccd.has(cccd)) return NextResponse.json({ error: `Trùng CCCD ${cccd} trong tệp` }, { status: 400 });
      if (row?.dateOfBirth && Number.isNaN(new Date(row.dateOfBirth).getTime())) {
        return NextResponse.json({ error: `Ngày sinh không hợp lệ tại dòng ${index + 2}` }, { status: 400 });
      }
      seen.add(code);
      if (cccd) seenCccd.add(cccd);
    }

    const codes = rows.map((row: any) => String(row.studentCode).trim());
    const cccds = rows.map((row: any) => String(row.cccd ?? '').trim()).filter(Boolean);
    const existing = await prisma.student.findMany({
      where: {
        OR: [
          { studentCode: { in: codes } },
          ...(cccds.length ? [{ cccd: { in: cccds } }] : []),
        ],
      },
      select: { studentCode: true, cccd: true, classId: true },
    });
    const existingByCode = new Map(existing.map((student) => [student.studentCode, student]));
    const existingByCccd = new Map(existing.filter((student) => student.cccd).map((student) => [student.cccd as string, student]));
    const rowsToImport: any[] = [];
    const conflicts: string[] = [];
    let skipped = 0;

    for (const row of rows) {
      const code = String(row.studentCode).trim();
      const cccd = String(row.cccd ?? '').trim();
      const byCode = existingByCode.get(code);
      const byCccd = cccd ? existingByCccd.get(cccd) : undefined;
      const found = byCode ?? byCccd;
      if (found) {
        if (found.classId !== String(row.classId)) {
          conflicts.push(code);
        } else {
          skipped += 1;
        }
        continue;
      }
      rowsToImport.push(row);
    }

    if (conflicts.length) {
      return NextResponse.json({
        error: `Một số học sinh đã tồn tại ở lớp khác: ${conflicts.slice(0, 20).join(', ')}${conflicts.length > 20 ? '…' : ''}`,
        conflicts,
      }, { status: 409 });
    }

    const passwordHashes = await Promise.all(rowsToImport.map((row: any) => bcrypt.hash(String(row.studentCode).trim(), 10)));
    await prisma.$transaction(rowsToImport.map((row: any, index: number) => {
      const data = {
        fullName: String(row.fullName).trim(),
        cccd: String(row.cccd ?? '').trim() || null,
        classId: String(row.classId),
        phone: String(row.phone ?? '').trim() || null,
        parentPhone: String(row.parentPhone ?? '').trim() || null,
        zaloPhone: String(row.zaloPhone ?? '').trim() || null,
        dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : null,
      };
      return prisma.student.upsert({
        where: { studentCode: String(row.studentCode).trim() },
        update: { ...data, passwordHash: passwordHashes[index], passwordIsDefault: true },
        create: {
          studentCode: String(row.studentCode).trim(),
          passwordHash: passwordHashes[index],
          passwordIsDefault: true,
          ...data,
        },
      });
    }));

    return NextResponse.json({ imported: rowsToImport.length, skipped });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Không thể nhập học sinh' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await isAdmin())) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    const body = await request.json();
    const ids: string[] = [...new Set<string>(Array.isArray(body?.ids) ? body.ids.map((id: unknown) => String(id)) : [])].slice(0, 1000);
    if (!ids.length) return NextResponse.json({ error: 'Chưa chọn học sinh' }, { status: 400 });

    const assignments = await prisma.feeAssignment.findMany({
      where: { studentId: { in: ids } },
      select: { id: true },
    });
    const assignmentIds = assignments.map((item) => item.id);
    await prisma.$transaction([
      prisma.paymentProof.deleteMany({ where: { feeAssignmentId: { in: assignmentIds } } }),
      prisma.notification.deleteMany({ where: { studentId: { in: ids } } }),
      prisma.feeAssignment.deleteMany({ where: { studentId: { in: ids } } }),
      prisma.student.deleteMany({ where: { id: { in: ids } } }),
    ]);

    return NextResponse.json({ deleted: ids.length });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Không thể xóa học sinh' }, { status: 500 });
  }
}
