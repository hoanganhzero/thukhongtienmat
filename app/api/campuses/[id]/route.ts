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
    const campus = await prisma.campus.update({ where: { id }, data: { name: data.name, address: data.address, phone: data.phone } });
    return NextResponse.json(campus);
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
    await prisma.campus.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi' }, { status: 500 });
  }
}
