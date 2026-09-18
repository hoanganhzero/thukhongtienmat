export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { bhytCategories } from '@/lib/bhyt';

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
    const user = session?.user as any;
    if (user?.role !== 'admin') return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    if (user.adminRole === 'teacher') return NextResponse.json({ error: 'Giáo viên không có quyền chỉnh sửa khoản thu' }, { status: 403 });
    const { id } = await params;
    const data = await request.json();
    const current = await prisma.feeAssignment.findUnique({ where: { id }, include: { feeType: true } });
    if (!current) return NextResponse.json({ error: 'Không tìm thấy khoản thu đã gán' }, { status: 404 });

    const updateData: any = {};
    if (data.status) updateData.status = data.status;
    if (data.amount !== undefined) {
      const amount = Number(data.amount);
      if (!Number.isFinite(amount) || amount < 0) return NextResponse.json({ error: 'Số tiền không hợp lệ' }, { status: 400 });
      updateData.amount = amount;
    }
    if (data.bhytCategory !== undefined) {
      if (!bhytCategories.includes(data.bhytCategory)) return NextResponse.json({ error: 'Diện BHYT không hợp lệ' }, { status: 400 });
      updateData.bhytCategory = data.bhytCategory;
      updateData.bhytNote = String(data.bhytNote ?? '').trim() || null;
      if (data.bhytCategory === 'student') {
        updateData.amount = current.feeType.amount;
        updateData.bhytMonths = 12;
        updateData.bhytNote = null;
        if (data.status === undefined) updateData.status = 'pending';
      } else if (data.bhytCategory === 'student_custom') {
        const months = Number(data.bhytMonths);
        const amount = Number(data.amount);
        if (!Number.isInteger(months) || months < 1 || months > 12) return NextResponse.json({ error: 'Số tháng BHYT phải từ 1 đến 12' }, { status: 400 });
        if (!Number.isFinite(amount) || amount < 0) return NextResponse.json({ error: 'Số tiền BHYT không hợp lệ' }, { status: 400 });
        updateData.bhytMonths = months;
        updateData.amount = amount;
        if (data.status === undefined) updateData.status = 'pending';
      } else {
        updateData.bhytMonths = null;
        updateData.status = 'exempt';
        updateData.amount = 0;
      }
    }
    if (updateData.status === 'confirmed') updateData.paidAt = new Date();
    if (updateData.status && updateData.status !== 'confirmed') updateData.paidAt = null;

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
