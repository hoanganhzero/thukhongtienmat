export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { generateQrContent } from '@/lib/utils';
import { isSpecialBhytCategory } from '@/lib/bhyt';
import { teacherClassIds } from '@/lib/teacher-scope';

export async function GET(request: Request) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (user?.role !== 'admin') return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const status = searchParams.get('status');
    const feeTypeId = searchParams.get('feeTypeId');
    const campusId = searchParams.get('campusId');
    const classId = searchParams.get('classId');
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '50');

    const where: any = {};
    if (studentId) where.studentId = studentId;
    if (status) where.status = status;
    if (feeTypeId) where.feeTypeId = feeTypeId;
    if (user.adminRole === 'teacher') {
      const classIds = teacherClassIds(user);
      if (!classIds.length) return NextResponse.json({ error: 'Tài khoản chưa được phân công lớp' }, { status: 403 });
      where.student = { classId: { in: classIds } };
    } else if (classId) where.student = { classId };
    if (user.adminRole !== 'teacher' && campusId) where.student = { ...(where.student ?? {}), class: { campusId } };

    const allAssignments = await prisma.feeAssignment.findMany({
      where,
      include: {
        student: { include: { class: { include: { campus: true } } } },
        feeType: true,
        paymentProofs: true,
      },
    });
    const sortText = (value: string) => value.trim().normalize('NFC');
    const givenName = (value: string) => sortText(value).split(/\s+/).at(-1) ?? '';
    const compare = (a: string, b: string) => a.localeCompare(b, 'vi', { sensitivity: 'base', numeric: true });
    allAssignments.sort((a, b) => {
      const classCompare = compare(a.student?.class?.name ?? '', b.student?.class?.name ?? '');
      if (classCompare !== 0) return classCompare;
      const nameCompare = compare(givenName(a.student?.fullName ?? ''), givenName(b.student?.fullName ?? ''));
      if (nameCompare !== 0) return nameCompare;
      const fullNameCompare = compare(sortText(a.student?.fullName ?? ''), sortText(b.student?.fullName ?? ''));
      if (fullNameCompare !== 0) return fullNameCompare;
      return compare(a.student?.studentCode ?? '', b.student?.studentCode ?? '');
    });
    const total = allAssignments.length;
    const assignments = allAssignments.slice((page - 1) * limit, page * limit);

    return NextResponse.json({ assignments, total, page, limit });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (user?.role !== 'admin') return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    if (user.adminRole === 'teacher') return NextResponse.json({ error: 'Giáo viên không có quyền tạo khoản thu' }, { status: 403 });

    const data = await request.json();
    // data can have: studentIds[], feeTypeId, amount (override), academicYear, dueDate
    // OR classId/campusId to assign to all students in class/campus
    const feeType = await prisma.feeType.findUnique({ where: { id: data.feeTypeId } });
    if (!feeType) return NextResponse.json({ error: 'Không tìm thấy khoản thu' }, { status: 404 });

    let studentIds: string[] = data.studentIds ?? [];

    if (data.classId) {
      const students = await prisma.student.findMany({ where: { classId: data.classId }, select: { id: true } });
      studentIds = students.map((s: any) => s.id);
    } else if (data.campusId) {
      const students = await prisma.student.findMany({ where: { class: { campusId: data.campusId } }, select: { id: true } });
      studentIds = students.map((s: any) => s.id);
    }

    if (studentIds.length === 0) return NextResponse.json({ error: 'Không có học sinh nào' }, { status: 400 });

    const amount = data.amount === undefined || data.amount === '' ? feeType.amount : Number(data.amount);
    if (!Number.isFinite(amount) || amount < 0) return NextResponse.json({ error: 'Số tiền khoản thu không hợp lệ' }, { status: 400 });
    const academicYear = data.academicYear ?? '2025-2026';
    const isBhyt = feeType.name.toUpperCase().includes('BHYT');

    const results: any[] = [];
    for (const sid of studentIds) {
      const student = await prisma.student.findUnique({
        where: { id: sid },
        include: { class: true },
      });
      if (!student) continue;

      const duplicateCount = await prisma.student.count({ where: { classId: student.classId, fullName: student.fullName, NOT: { id: sid } } });
      const duplicateNameSuffix = duplicateCount > 0 ? student.studentCode.split('').filter((char) => char >= '0' && char <= '9').join('').slice(-3) : undefined;
      const qrContent = generateQrContent(feeType.name, student.studentCode, student.fullName, student.class.name, feeType.bankName, duplicateNameSuffix);

      const unique = { studentId: sid, feeTypeId: data.feeTypeId, academicYear };
      const existing = await prisma.feeAssignment.findUnique({ where: { studentId_feeTypeId_academicYear: unique } });
      const assignment = existing ? await prisma.feeAssignment.update({
        where: { id: existing.id },
        data: {
          ...(!isBhyt || !isSpecialBhytCategory(existing.bhytCategory) ? {
            amount,
            ...(isBhyt ? {
              bhytCategory: 'student',
              bhytMonths: 12,
              bhytNote: null,
              ...(existing.status === 'exempt' ? { status: 'pending', paidAt: null } : {}),
            } : {}),
          } : {}),
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          qrContent,
        },
      }) : await prisma.feeAssignment.create({
        data: {
          studentId: sid,
          feeTypeId: data.feeTypeId,
          amount,
          academicYear,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          qrContent,
          status: 'pending',
          bhytCategory: isBhyt ? 'student' : null,
          bhytMonths: isBhyt ? 12 : null,
        },
      });
      results.push(assignment);
    }

    return NextResponse.json({ created: results.length, assignments: results });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi' }, { status: 500 });
  }
}
