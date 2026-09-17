export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if ((session?.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const campusId = searchParams.get('campusId');
    const where = campusId ? { campusId } : {};
    const classes = await prisma.class.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { campus: true, _count: { select: { students: true } } },
    });
    return NextResponse.json(classes);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    if (((session!.user as any).adminRole) === 'accountant') return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
    const data = await request.json();
    const cls = await prisma.class.create({
      data: { name: data.name, campusId: data.campusId, schoolYear: data.schoolYear ?? '2025-2026', teacherName: data.teacherName },
    });
    return NextResponse.json(cls);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi' }, { status: 500 });
  }
}
