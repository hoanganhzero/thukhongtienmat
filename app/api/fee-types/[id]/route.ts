export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (user?.role !== 'admin' || user.adminRole === 'teacher') return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
    const { id } = await params;
    const data = await request.json();
    const amount = Number(data.amount);
    if (!String(data.name ?? '').trim() || !Number.isFinite(amount) || amount < 0 || !String(data.bankAccountNumber ?? '').trim() || !String(data.bankAccountName ?? '').trim()) return NextResponse.json({ error: 'Thông tin khoản thu chưa hợp lệ' }, { status: 400 });
    const ft = await prisma.feeType.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        amount,
        bankAccountNumber: data.bankAccountNumber,
        bankAccountName: data.bankAccountName,
        bankName: data.bankName,
        isActive: data.isActive,
      },
    });
    return NextResponse.json(ft);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (user?.role !== 'admin' || user.adminRole === 'teacher') return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
    const { id } = await params;
    if (await prisma.feeAssignment.count({ where: { feeTypeId: id } })) return NextResponse.json({ error: 'Khoản thu đã phát sinh dữ liệu; hãy chuyển sang trạng thái ngưng hoạt động thay vì xóa' }, { status: 409 });
    await prisma.feeType.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi' }, { status: 500 });
  }
}
