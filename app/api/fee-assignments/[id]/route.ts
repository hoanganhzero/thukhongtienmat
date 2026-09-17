export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    const user = session?.user as any;
    if (user?.role !== 'admin') return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    const fa = await prisma.feeAssignment.findUnique({
      where: { id },
      include: {
        student: { include: { class: { include: { campus: true } } } },
        feeType: true,
        paymentProofs: true,
      },
    });
    if (!fa) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    return NextResponse.json(fa);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if ((session?.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    const { id } = await params;
    const data = await request.json();

    const updateData: any = {};
    if (data.status) updateData.status = data.status;
    if (data.amount !== undefined) updateData.amount = data.amount;

    const fa = await prisma.feeAssignment.update({ where: { id }, data: updateData });

    // If confirming, create notification
    if (data.status === 'confirmed') {
      const full = await prisma.feeAssignment.findUnique({
        where: { id },
        include: { feeType: true, student: true },
      });
      if (full) {
        await prisma.notification.create({
          data: {
            studentId: full.studentId,
            feeAssignmentId: id,
            type: 'success',
            channel: 'website',
            message: `Khoản thu ${full.feeType?.name} đã được xác nhận thanh toán thành công.`,
          },
        });
      }
    }

    if (data.status === 'rejected') {
      const full = await prisma.feeAssignment.findUnique({
        where: { id },
        include: { feeType: true },
      });
      if (full) {
        await prisma.notification.create({
          data: {
            studentId: full.studentId,
            feeAssignmentId: id,
            type: 'info',
            channel: 'website',
            message: `Ảnh xác nhận khoản thu ${full.feeType?.name} bị từ chối. Lý do: ${data.rejectReason ?? 'Không rõ ràng'}`,
          },
        });
      }
    }

    return NextResponse.json(fa);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi' }, { status: 500 });
  }
}
