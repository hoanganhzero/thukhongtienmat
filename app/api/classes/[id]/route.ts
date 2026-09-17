export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if ((session?.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    if (((session!.user as any).adminRole) === 'accountant') return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
    const { id } = await params;
    const data = await request.json();
    const cls = await prisma.class.update({ where: { id }, data: { name: data.name, campusId: data.campusId, schoolYear: data.schoolYear, teacherName: data.teacherName } });
    return NextResponse.json(cls);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if ((session?.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    if (((session!.user as any).adminRole) === 'accountant') return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
    const { id } = await params;
    await prisma.class.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi' }, { status: 500 });
  }
}
