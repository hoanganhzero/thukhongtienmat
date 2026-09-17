export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    const user = session?.user as any;
    if (user?.role !== 'admin' && !(user?.role === 'student' && user.id === id)) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
    const student = await prisma.student.findUnique({
      where: { id },
      select: {
        id: true,
        studentCode: true,
        fullName: true,
        phone: true,
        parentPhone: true,
        dateOfBirth: true,
        zaloPhone: true,
        class: { select: { name: true, campus: { select: { name: true } } } },
        feeAssignments: {
          include: { feeType: true, paymentProofs: { select: { id: true, uploadedAt: true, verifiedAt: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!student) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    return NextResponse.json(student);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if ((session?.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    const { id } = await params;
    const data = await request.json();
    const student = await prisma.student.update({
      where: { id },
      data: {
        fullName: data.fullName,
        classId: data.classId,
        phone: data.phone,
        parentPhone: data.parentPhone,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        zaloPhone: data.zaloPhone,
      },
    });
    return NextResponse.json(student);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if ((session?.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    const { id } = await params;
    await prisma.student.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi' }, { status: 500 });
  }
}
