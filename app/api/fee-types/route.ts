export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();
    if ((session?.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    const feeTypes = await prisma.feeType.findMany({ orderBy: { name: 'asc' } });
    return NextResponse.json(feeTypes);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (user?.role !== 'admin' || user.adminRole === 'teacher') return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
    const data = await request.json();
    const amount = Number(data.amount);
    if (!String(data.name ?? '').trim() || !Number.isFinite(amount) || amount < 0 || !String(data.bankAccountNumber ?? '').trim() || !String(data.bankAccountName ?? '').trim()) return NextResponse.json({ error: 'Vui lòng nhập đủ tên khoản thu, số tiền và tài khoản nhận' }, { status: 400 });
    const ft = await prisma.feeType.create({
      data: {
        name: String(data.name).trim(),
        description: data.description,
        amount,
        bankAccountNumber: data.bankAccountNumber,
        bankAccountName: data.bankAccountName,
        bankName: data.bankName ?? 'Agribank',
        isActive: data.isActive ?? true,
      },
    });
    return NextResponse.json(ft);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi' }, { status: 500 });
  }
}
