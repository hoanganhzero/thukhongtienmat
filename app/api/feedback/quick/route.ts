export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStudentIdFromLookupToken } from '@/lib/lookup-token';

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').trim().toLowerCase();
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const message = String(data.message ?? '').trim();
    if (message.length < 5 || message.length > 2000) {
      return NextResponse.json({ error: 'Nội dung phản hồi phải từ 5 đến 2000 ký tự' }, { status: 400 });
    }

    let studentId: string;
    let senderId: string;
    let senderRole: string;
    if (data.kind === 'student') {
      const verifiedId = getStudentIdFromLookupToken(String(data.lookupToken ?? ''));
      if (!verifiedId || verifiedId !== data.studentId) {
        return NextResponse.json({ error: 'Phiên tra cứu đã hết hạn. Vui lòng tra cứu lại.' }, { status: 403 });
      }
      studentId = verifiedId;
      senderId = 'quick-student:' + studentId;
      senderRole = 'student_lookup';
    } else if (data.kind === 'teacher') {
      const classId = String(data.classId ?? '');
      const query = normalize(String(data.query ?? ''));
      const classroom = await prisma.class.findUnique({
        where: { id: classId }, select: { name: true, teacherName: true },
      });
      if (!classroom || !query || (normalize(classroom.name) !== query && normalize(classroom.teacherName ?? '') !== query)) {
        return NextResponse.json({ error: 'Lớp tra cứu không hợp lệ' }, { status: 403 });
      }
      const student = await prisma.student.findFirst({
        where: { id: String(data.studentId ?? ''), classId, deletedAt: null }, select: { id: true },
      });
      if (!student) return NextResponse.json({ error: 'Học sinh không thuộc lớp này' }, { status: 400 });
      studentId = student.id;
      senderId = 'quick-teacher:' + classId;
      senderRole = 'teacher_lookup_unverified';
    } else {
      return NextResponse.json({ error: 'Loại phản hồi không hợp lệ' }, { status: 400 });
    }

    const recent = await prisma.feedback.count({
      where: { senderId, createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } },
    });
    if (recent >= 5) return NextResponse.json({ error: 'Bạn đã gửi nhiều phản hồi. Vui lòng thử lại sau 10 phút.' }, { status: 429 });
    const assignmentId = data.feeAssignmentId ? String(data.feeAssignmentId) : null;
    if (assignmentId) {
      const assignment = await prisma.feeAssignment.findFirst({
        where: { id: assignmentId, studentId }, select: { id: true },
      });
      if (!assignment) return NextResponse.json({ error: 'Khoản thu không thuộc học sinh' }, { status: 400 });
    }

    const feedback = await prisma.feedback.create({
      data: { studentId, feeAssignmentId: assignmentId, senderId, senderRole, message },
    });
    return NextResponse.json({ id: feedback.id, status: feedback.status }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Không thể gửi phản hồi' }, { status: 500 });
  }
}
