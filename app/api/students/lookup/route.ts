export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createLookupToken } from '@/lib/lookup-token';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    if (!q) return NextResponse.json({ error: 'Vui lòng nhập mã học sinh hoặc số điện thoại' }, { status: 400 });

    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { studentCode: q },
          { phone: q },
          { parentPhone: q },
        ],
      },
      select: {
        id: true,
        studentCode: true,
        fullName: true,
        class: { select: { name: true, campus: { select: { name: true } } } },
        feeAssignments: {
          select: {
            id: true,
            amount: true,
            academicYear: true,
            dueDate: true,
            qrContent: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            feeType: { select: { name: true, description: true, bankAccountNumber: true, bankAccountName: true, bankName: true } },
            paymentProofs: { select: { id: true, uploadedAt: true, verifiedAt: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!student) return NextResponse.json({ error: 'Không tìm thấy học sinh' }, { status: 404 });

    return NextResponse.json({ ...student, lookupToken: createLookupToken(student.id) });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi' }, { status: 500 });
  }
}
