export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { DEFAULT_PAYMENT_ACCOUNT } from '@/lib/payment-account';

export async function POST(request: Request) {
  try {
    const user = (await auth())?.user as any;
    if (user?.role !== 'admin' || user.adminRole === 'teacher') {
      return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
    }
    const { transactionId, assignmentId } = await request.json();
    const transaction = await prisma.bankTransaction.findUnique({ where: { id: String(transactionId ?? '') } });
    const assignment = await prisma.feeAssignment.findUnique({
      where: { id: String(assignmentId ?? '') },
      include: { student: { include: { class: true } }, feeType: true },
    });

    if (!transaction || transaction.status !== 'unmatched' || transaction.accountNumber !== DEFAULT_PAYMENT_ACCOUNT.bankAccountNumber) {
      return NextResponse.json({ error: 'Giao dịch không còn ở trạng thái chờ xác nhận' }, { status: 400 });
    }
    if (!assignment || !['pending', 'uploaded'].includes(assignment.status)) {
      return NextResponse.json({ error: 'Khoản thu của học sinh không còn chờ xác nhận' }, { status: 400 });
    }
    if (
      assignment.amount !== transaction.transferAmount ||
      assignment.feeType.bankAccountNumber !== DEFAULT_PAYMENT_ACCOUNT.bankAccountNumber ||
      !/BHT/i.test(assignment.feeType.name)
    ) {
      return NextResponse.json({ error: 'Giao dịch không khớp số tiền hoặc khoản BHTT' }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.feeAssignment.update({ where: { id: assignment.id }, data: { status: 'confirmed', paidAt: transaction.transactionDate ?? new Date() } }),
      prisma.bankTransaction.update({ where: { id: transaction.id }, data: { status: 'matched', matchedAssignmentId: assignment.id } }),
      prisma.notification.create({
        data: {
          studentId: assignment.studentId,
          feeAssignmentId: assignment.id,
          type: 'success',
          channel: 'website',
          message: `Khoản thu ${assignment.feeType.name} đã được quản trị viên xác nhận thanh toán thành công.`,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      student: { studentCode: assignment.student.studentCode, fullName: assignment.student.fullName, className: assignment.student.class.name },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Không thể xác nhận giao dịch' }, { status: 500 });
  }
}
