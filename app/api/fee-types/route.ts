export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { DEFAULT_PAYMENT_ACCOUNT } from '@/lib/payment-account';

function isBhtt(name: unknown) {
  return /^BHTT?$/i.test(String(name ?? '').trim());
}

export async function GET() {
  try {
    const session = await auth();
    if ((session?.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    const feeTypes = await prisma.feeType.findMany({ orderBy: [{ isActive: 'desc' }, { name: 'asc' }] });
    return NextResponse.json(feeTypes);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = (await auth())?.user as any;
    if (user?.role !== 'admin' || user.adminRole === 'teacher') return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
    const data = await request.json();
    const amount = Number(data.amount);
    const name = String(data.name ?? '').trim();
    if (!name || !Number.isFinite(amount) || amount < 0) return NextResponse.json({ error: 'Vui lòng nhập tên khoản thu và số tiền hợp lệ' }, { status: 400 });

    const bank = isBhtt(name) ? DEFAULT_PAYMENT_ACCOUNT : {
      bankName: String(data.bankName ?? '').trim(),
      bankAccountNumber: String(data.bankAccountNumber ?? '').replace(/\D/g, ''),
      bankAccountName: String(data.bankAccountName ?? '').trim(),
    };
    if (!bank.bankName || !bank.bankAccountNumber || !bank.bankAccountName) return NextResponse.json({ error: 'Vui lòng nhập đủ thông tin tài khoản nhận' }, { status: 400 });

    const feeType = await prisma.feeType.create({
      data: { name, description: data.description, amount, ...bank, isActive: data.isActive ?? true },
    });
    return NextResponse.json(feeType);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi' }, { status: 500 });
  }
}
