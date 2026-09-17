export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { getStudentIdFromLookupToken } from '@/lib/lookup-token';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    if (!data.feeAssignmentId || !data.imageUrl) {
      return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 });
    }

    const session = await auth();
    const sessionUser = session?.user as any;
    const studentId = sessionUser?.role === 'student'
      ? sessionUser.id
      : getStudentIdFromLookupToken(request.headers.get('x-payment-lookup-token'));
    if (!studentId) return NextResponse.json({ error: 'Phiên tra cứu đã hết hạn hoặc chưa đăng nhập' }, { status: 401 });

    const assignment = await prisma.feeAssignment.findUnique({ where: { id: data.feeAssignmentId }, select: { studentId: true, status: true } });
    if (!assignment) return NextResponse.json({ error: 'Không tìm thấy khoản thu' }, { status: 404 });
    if (assignment.studentId !== studentId) return NextResponse.json({ error: 'Không có quyền gửi minh chứng cho khoản thu này' }, { status: 403 });
    if (assignment.status === 'confirmed') return NextResponse.json({ error: 'Khoản thu đã được xác nhận' }, { status: 409 });

    const [proof] = await prisma.$transaction([
      prisma.paymentProof.create({
        data: {
          feeAssignmentId: data.feeAssignmentId,
          imageUrl: data.imageUrl,
          cloudStoragePath: data.cloudStoragePath,
          isPublic: false,
          note: data.note,
        },
      }),
      prisma.feeAssignment.update({ where: { id: data.feeAssignmentId }, data: { status: 'uploaded' } }),
    ]);

    return NextResponse.json(proof);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi' }, { status: 500 });
  }
}
