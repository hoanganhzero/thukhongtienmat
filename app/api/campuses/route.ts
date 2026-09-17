export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();
    if ((session?.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    const campuses = await prisma.campus.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { classes: true } } },
    });
    return NextResponse.json(campuses);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    if (((session.user as any).adminRole) === 'accountant') return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });

    const data = await request.json();
    const campus = await prisma.campus.create({ data: { name: data.name, address: data.address, phone: data.phone } });
    return NextResponse.json(campus);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi' }, { status: 500 });
  }
}
