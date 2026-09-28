export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { groupPendingFees } from '@/lib/payment-qr';
import { buildVietQrUrl } from '@/lib/utils';
import { teacherClassIds } from '@/lib/teacher-scope';

async function getGroups(request: Request, user: any) {
  const { searchParams } = new URL(request.url);
  const where: any = { status: 'pending' };
  if (searchParams.get('feeTypeId')) where.feeTypeId = searchParams.get('feeTypeId');
  if (user.adminRole === 'teacher') {
    const classIds = teacherClassIds(user);
    if (!classIds.length) throw new Error('Tài khoản chưa được phân công lớp');
    where.student = { classId: { in: classIds } };
  } else {
    const studentFilter: any = {};
    if (searchParams.get('classId')) studentFilter.classId = searchParams.get('classId');
    if (user.adminRole !== 'teacher' && searchParams.get('campusId')) studentFilter.class = { campusId: searchParams.get('campusId') };
    if (Object.keys(studentFilter).length) where.student = studentFilter;
  }

  const assignments = await prisma.feeAssignment.findMany({
    where,
    include: { student: { include: { class: true } }, feeType: true },
    orderBy: [{ student: { class: { name: 'asc' } } }, { student: { fullName: 'asc' } }],
  });
  return groupPendingFees(assignments);
}

export async function GET(request: Request) {
  const user = (await auth())?.user as any;
  if (user?.role !== 'admin') return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  const groups = await getGroups(request, user);
  const rows = groups.map((group) => ({
    ...group,
    qrUrl: buildVietQrUrl(group.accountNo, group.amount, group.description, group.accountName, group.bankName),
  }));
  const { searchParams } = new URL(request.url);
  const studentWhere: any = { deletedAt: null };
  if (user.adminRole === 'teacher') studentWhere.classId = { in: teacherClassIds(user) };
  else if (searchParams.get('classId')) studentWhere.classId = searchParams.get('classId');
  else if (searchParams.get('campusId')) studentWhere.class = { campusId: searchParams.get('campusId') };

  const students = await prisma.student.findMany({
    where: studentWhere,
    select: { id: true, class: { select: { id: true, name: true } } },
  });
  const assignmentWhere: any = { student: studentWhere };
  if (searchParams.get('feeTypeId')) assignmentWhere.feeTypeId = searchParams.get('feeTypeId');
  const scopedAssignments = await prisma.feeAssignment.findMany({
    where: assignmentWhere,
    select: { studentId: true, status: true },
  });
  const confirmed = new Set(scopedAssignments.filter((item) => item.status === 'confirmed').map((item) => item.studentId));
  const qrStudents = new Set(rows.map((item) => item.studentId));
  const classes = new Map<string, { className: string; studentIds: string[] }>();
  for (const student of students) {
    const item = classes.get(student.class.id) ?? { className: student.class.name, studentIds: [] };
    item.studentIds.push(student.id);
    classes.set(student.class.id, item);
  }

  return NextResponse.json({
    groups: rows,
    summary: {
      total: students.length,
      qr: students.filter((item) => qrStudents.has(item.id)).length,
      classes: [...classes.values()].map((item) => {
        const qr = item.studentIds.filter((id) => qrStudents.has(id)).length;
        const paid = item.studentIds.filter((id) => confirmed.has(id)).length;
        return { className: item.className, total: item.studentIds.length, qr, paid, review: Math.max(0, item.studentIds.length - qr - paid) };
      }),
    },
  });
}

export async function POST(request: Request) {
  const user = (await auth())?.user as any;
  if (user?.role !== 'admin') return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  const body = await request.json();
  const url = new URL(request.url);
  for (const key of ['feeTypeId', 'classId', 'campusId']) if (body?.[key]) url.searchParams.set(key, body[key]);
  const groups = await getGroups(new Request(url), user);
  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? new URL(request.url).origin;

  await prisma.notification.createMany({
    data: groups.map((group) => ({
      studentId: group.studentId,
      type: 'reminder',
      channel: 'website',
      message: `Mời thanh toán ${group.feeNames.join(', ')}: ${group.amount.toLocaleString('vi-VN')}đ. Xem và quét QR tại ${baseUrl}/tra-cuu?q=${encodeURIComponent(group.studentCode)}`,
    })),
  });
  return NextResponse.json({ sent: groups.length });
}
