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
    const rows = Array.isArray(body?.students) ? body.students.slice(0, 1000) : [];
    if (!rows.length) return NextResponse.json({ error: 'Danh sách học sinh trống' }, { status: 400 });

    const classIds = new Set((await prisma.class.findMany({ select: { id: true } })).map((item) => item.id));
    const seen = new Set<string>();
    for (const [index, row] of rows.entries()) {
      const code = String(row?.studentCode ?? '').trim();
      if (!code || !String(row?.fullName ?? '').trim() || !classIds.has(String(row?.classId ?? ''))) {
        return NextResponse.json({ error: `Dữ liệu không hợp lệ tại dòng ${index + 2}` }, { status: 400 });
      }
      if (seen.has(code)) return NextResponse.json({ error: `Trùng mã học sinh ${code} trong tệp` }, { status: 400 });
      if (row?.dateOfBirth && Number.isNaN(new Date(row.dateOfBirth).getTime())) {
        return NextResponse.json({ error: `Ngày sinh không hợp lệ tại dòng ${index + 2}` }, { status: 400 });
      }
      seen.add(code);
    }

    const passwordHashes = await Promise.all(rows.map((row: any) => bcrypt.hash(String(row.studentCode).trim(), 10)));
    await prisma.$transaction(rows.map((row: any, index: number) => {
      const data = {
        fullName: String(row.fullName).trim(),
        classId: String(row.classId),
        phone: String(row.phone ?? '').trim() || null,
        parentPhone: String(row.parentPhone ?? '').trim() || null,
        zaloPhone: String(row.zaloPhone ?? '').trim() || null,
        dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : null,
      };
      return prisma.student.upsert({
        where: { studentCode: String(row.studentCode).trim() },
        update: data,
        create: {
          studentCode: String(row.studentCode).trim(),
          passwordHash: passwordHashes[index],
          ...data,
        },
      });
    }));

    return NextResponse.json({ imported: rows.length });
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
