export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { DEFAULT_PAYMENT_ACCOUNT } from '@/lib/payment-account';

function isBhtt(name: unknown) {
  return /^BHTT?$/i.test(String(name ?? '').trim());
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = (await auth())?.user as any;
    if (user?.role !== 'admin' || user.adminRole === 'teacher') return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
    const { id } = await params;
    const data = await request.json();
    const existing = await prisma.feeType.findUnique({ where: { id }, select: { name: true } });
    const amount = Number(data.amount);
    const name = isBhtt(existing?.name) ? 'BHTT' : String(data.name ?? '').trim();
    if (!name || !Number.isFinite(amount) || amount < 0) return NextResponse.json({ error: 'Thông tin khoản thu chưa hợp lệ' }, { status: 400 });

    const bank = isBhtt(existing?.name) || isBhtt(name) ? DEFAULT_PAYMENT_ACCOUNT : {
      bankName: String(data.bankName ?? '').trim(),
      bankAccountNumber: String(data.bankAccountNumber ?? '').replace(/\D/g, ''),
      bankAccountName: String(data.bankAccountName ?? '').trim(),
    };
    if (!bank.bankName || !bank.bankAccountNumber || !bank.bankAccountName) return NextResponse.json({ error: 'Vui lòng nhập đủ thông tin tài khoản nhận' }, { status: 400 });

    const feeType = await prisma.feeType.update({
      where: { id },
      data: { name, description: data.description, amount, ...bank, isActive: data.isActive },
    });
    return NextResponse.json(feeType);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = (await auth())?.user as any;
    if (user?.role !== 'admin' || user.adminRole === 'teacher') return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
    const { id } = await params;
    const feeType = await prisma.feeType.findUnique({ where: { id }, select: { name: true } });
    if (isBhtt(feeType?.name)) return NextResponse.json({ error: 'Khoản BHTT cố định không thể xóa; có thể chỉnh sửa số tiền và mô tả' }, { status: 409 });
    if (await prisma.feeAssignment.count({ where: { feeTypeId: id } })) return NextResponse.json({ error: 'Khoản thu đã phát sinh dữ liệu; hãy chuyển sang trạng thái ngưng hoạt động thay vì xóa' }, { status: 409 });
    await prisma.feeType.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi' }, { status: 500 });
  }
}
