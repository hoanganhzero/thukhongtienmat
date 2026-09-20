export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { summarizeAssignments } from '@/lib/dashboard-stats';
import { teacherClassIds } from '@/lib/teacher-scope';

export async function GET(request: Request) {
  try {
    const user = (await auth())?.user as any;
    if (user?.role !== 'admin') return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    const params = new URL(request.url).searchParams;
    const campusId = params.get('campusId');
    const classId = params.get('classId');
    const feeTypeId = params.get('feeTypeId');
    const studentWhere: any = {};
    if (user.adminRole === 'teacher') {
      const classIds = teacherClassIds(user);
      if (!classIds.length) return NextResponse.json({ error: 'Tài khoản chưa được phân công lớp' }, { status: 403 });
      studentWhere.classId = { in: classIds };
    } else if (classId) studentWhere.classId = classId;
    else if (campusId) studentWhere.class = { campusId };

    const assignmentWhere: any = { student: studentWhere };
    if (feeTypeId) assignmentWhere.feeTypeId = feeTypeId;
    const [assignments, totalStudents, recentUploaded] = await Promise.all([
      prisma.feeAssignment.findMany({ where: assignmentWhere, include: { student: { include: { class: { include: { campus: true } } } }, feeType: true } }),
      prisma.student.count({ where: studentWhere }),
      prisma.feeAssignment.findMany({ where: { ...assignmentWhere, status: 'uploaded' }, take: 8, orderBy: { updatedAt: 'desc' }, include: { student: { include: { class: true } }, feeType: true } }),
    ]);
    const summary = summarizeAssignments(assignments);
    return NextResponse.json({ totalStudents, totalAssignments: assignments.length, ...summary, recentUploaded });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Không thể tải thống kê' }, { status: 500 });
  }
}
