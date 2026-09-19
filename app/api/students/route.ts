export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import bcrypt from 'bcryptjs';

export async function GET(request: Request) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (user?.role !== 'admin') return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const campusId = searchParams.get('campusId');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '50');

    const where: any = {};
    if (user.adminRole === 'teacher') {
      if (!user.classId) return NextResponse.json({ error: 'Tài khoản chưa được phân công lớp' }, { status: 403 });
      where.classId = user.classId;
    } else if (classId) where.classId = classId;
    if (user.adminRole !== 'teacher' && campusId) where.class = { campusId };
    if (search) {
      where.OR = [
        { studentCode: { contains: search } },
        { fullName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { studentCode: 'asc' },
        include: { class: { include: { campus: true } } },
      }),
      prisma.student.count({ where }),
    ]);

    return NextResponse.json({ students, total, page, limit });
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
    const cccd = String(data.cccd ?? '').trim() || null;
    const hash = await bcrypt.hash(data.studentCode, 10);
    const student = await prisma.student.create({
      data: {
        studentCode: data.studentCode,
        cccd,
        fullName: data.fullName,
        classId: data.classId,
        phone: data.phone,
        parentPhone: data.parentPhone,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        passwordHash: hash,
        passwordIsDefault: true,
        zaloPhone: data.zaloPhone,
      },
    });
    return NextResponse.json(student);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi' }, { status: 500 });
  }
}
