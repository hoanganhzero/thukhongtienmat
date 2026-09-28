export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { teacherClassIds } from '@/lib/teacher-scope';

export async function GET() {
  try {
    const user = (await auth())?.user as any;
    if (!user?.id) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    const where: any = {};
    if (user.role === 'student') where.studentId = user.id;
    else if (user.role === 'admin' && user.adminRole === 'teacher') {
      const ids = teacherClassIds(user);
      where.student = { classId: { in: ids } };
    } else if (user.role !== 'admin') return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });

    const feedbacks = await prisma.feedback.findMany({
      where,
      include: {
        student: { select: { studentCode: true, fullName: true, class: { select: { name: true } } } },
        feeAssignment: { select: { amount: true, status: true, feeType: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    return NextResponse.json(feedbacks);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Không thể tải phản hồi' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = (await auth())?.user as any;
    if (!user?.id) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    const data = await request.json();
    const message = String(data.message ?? '').trim();
    if (message.length < 5 || message.length > 2000) return NextResponse.json({ error: 'Nội dung phản hồi phải từ 5 đến 2000 ký tự' }, { status: 400 });

    let studentId = user.role === 'student' ? user.id : String(data.studentId ?? '');
    if (!studentId || user.role !== 'student' && user.role !== 'admin') return NextResponse.json({ error: 'Thiếu học sinh' }, { status: 400 });
    if (user.role === 'admin' && user.adminRole === 'teacher') {
      const student = await prisma.student.findFirst({ where: { id: studentId, classId: { in: teacherClassIds(user) } }, select: { id: true } });
      if (!student) return NextResponse.json({ error: 'Học sinh không thuộc lớp được phân công' }, { status: 403 });
    }
    const feeAssignmentId = data.feeAssignmentId ? String(data.feeAssignmentId) : null;
    if (feeAssignmentId) {
      const assignment = await prisma.feeAssignment.findFirst({ where: { id: feeAssignmentId, studentId }, select: { id: true } });
      if (!assignment) return NextResponse.json({ error: 'Khoản thu không thuộc học sinh' }, { status: 400 });
    }
    const feedback = await prisma.feedback.create({ data: {
      studentId, feeAssignmentId, senderId: user.id,
      senderRole: user.role === 'student' ? 'student' : user.adminRole ?? 'admin',
      message,
    }});
    return NextResponse.json(feedback, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Không thể gửi phản hồi' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = (await auth())?.user as any;
    if (user?.role !== 'admin' || !['super_admin', 'accountant', 'treasurer'].includes(user.adminRole ?? 'super_admin')) {
      return NextResponse.json({ error: 'Chỉ admin, kế toán hoặc thủ quỹ được xử lý phản hồi' }, { status: 403 });
    }
    const data = await request.json();
    const id = String(data.id ?? '');
    const reply = String(data.reply ?? '').trim();
    if (!id || reply.length < 2 || reply.length > 2000) return NextResponse.json({ error: 'Nội dung trả lời không hợp lệ' }, { status: 400 });
    const feedback = await prisma.feedback.update({ where: { id }, data: {
      reply, status: data.status === 'rejected' ? 'rejected' : 'resolved',
      handledBy: user.name ?? user.email ?? user.id, handledAt: new Date(),
    }});
    return NextResponse.json(feedback);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Không thể xử lý phản hồi' }, { status: 500 });
  }
}
