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
    if (!session?.user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    const data = await request.json();
    const ft = await prisma.feeType.create({
      data: {
        name: data.name,
        description: data.description,
        amount: data.amount ?? 0,
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
