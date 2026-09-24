export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(request: Request) {
  try {
    const user = (await auth())?.user as any;
    if (user?.role !== 'admin' || user.adminRole === 'teacher') return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });

    const body = await request.json();
    const ids = [...new Set<string>(Array.isArray(body?.ids) ? body.ids.map((id: unknown) => String(id)) : [])].slice(0, 1000);
    if (!ids.length) return NextResponse.json({ error: 'Chưa chọn khoản thu' }, { status: 400 });

    const assignments = await prisma.feeAssignment.findMany({
      where: { id: { in: ids } },
      select: { id: true, status: true },
    });
    const confirmed = assignments.filter((item) => item.status === 'confirmed');
    if (confirmed.length) {
      return NextResponse.json({ error: 'Không thể xóa khoản thu đã xác nhận thanh toán', confirmed: confirmed.length }, { status: 409 });
    }

    const removableIds = assignments.map((item) => item.id);
    await prisma.$transaction([
      prisma.paymentProof.deleteMany({ where: { feeAssignmentId: { in: removableIds } } }),
      prisma.notification.deleteMany({ where: { feeAssignmentId: { in: removableIds } } }),
      prisma.feeAssignment.deleteMany({ where: { id: { in: removableIds } } }),
    ]);
    return NextResponse.json({ deleted: removableIds.length });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Không thể xóa khoản thu' }, { status: 500 });
  }
}
