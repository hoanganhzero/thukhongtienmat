export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { generateQrContent } from '@/lib/utils';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if ((session?.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
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
    if (classId) where.student = { classId };
    if (campusId) where.student = { ...(where.student ?? {}), class: { campusId } };

    const [assignments, total] = await Promise.all([
      prisma.feeAssignment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: { include: { class: { include: { campus: true } } } },
          feeType: true,
          paymentProofs: true,
        },
      }),
      prisma.feeAssignment.count({ where }),
    ]);

    return NextResponse.json({ assignments, total, page, limit });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if ((session?.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

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

    const amount = data.amount ?? feeType.amount;
    const academicYear = data.academicYear ?? '2025-2026';

    const results: any[] = [];
    for (const sid of studentIds) {
      const student = await prisma.student.findUnique({
        where: { id: sid },
        include: { class: true },
      });
      if (!student) continue;

      const qrContent = generateQrContent(feeType.name, student.studentCode, student.fullName, student.class.name);

      const assignment = await prisma.feeAssignment.upsert({
        where: {
          studentId_feeTypeId_academicYear: {
            studentId: sid,
            feeTypeId: data.feeTypeId,
            academicYear,
          },
        },
        update: { amount, dueDate: data.dueDate ? new Date(data.dueDate) : null, qrContent },
        create: {
          studentId: sid,
          feeTypeId: data.feeTypeId,
          amount,
          academicYear,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          qrContent,
          status: 'pending',
        },
      });
      results.push(assignment);
    }

    return NextResponse.json({ created: results.length, assignments: results });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi' }, { status: 500 });
  }
}
