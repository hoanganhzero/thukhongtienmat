export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();
    if ((session?.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    const feeTypes = await prisma.feeType.findMany({
      where: { isActive: true, name: { contains: 'BHT', mode: 'insensitive' } },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(feeTypes);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi' }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json(
    { error: 'Hệ thống chỉ sử dụng khoản BHTT với tài khoản MB Bank cố định.' },
    { status: 403 },
  );
}
