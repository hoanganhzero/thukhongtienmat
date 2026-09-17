export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import * as XLSX from 'xlsx';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const campusId = searchParams.get('campusId');
    const classId = searchParams.get('classId');
    const feeTypeId = searchParams.get('feeTypeId');
    const status = searchParams.get('status');

    const where: any = {};
    if (feeTypeId) where.feeTypeId = feeTypeId;
    if (status) where.status = status;
    if (classId) where.student = { classId };
    if (campusId) where.student = { ...(where.student ?? {}), class: { campusId } };

    const assignments = await prisma.feeAssignment.findMany({
      where,
      include: {
        student: { include: { class: { include: { campus: true } } } },
        feeType: true,
      },
      orderBy: [{ student: { class: { campus: { name: 'asc' } } } }, { student: { studentCode: 'asc' } }],
    });

    const statusMap: Record<string, string> = {
      pending: 'Chưa đóng',
      uploaded: 'Đã gửi ảnh',
      confirmed: 'Đã xác nhận',
      rejected: 'Bị từ chối',
    };

    const rows = assignments.map((a: any) => ({
      'Mã HS': a.student?.studentCode ?? '',
      'Họ tên': a.student?.fullName ?? '',
      'Lớp': a.student?.class?.name ?? '',
      'Cơ sở': a.student?.class?.campus?.name ?? '',
      'Khoản thu': a.feeType?.name ?? '',
      'Số tiền': a.amount ?? 0,
      'Trạng thái': statusMap[a.status] ?? a.status,
      'Năm học': a.academicYear ?? '',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Báo cáo');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=bao-cao-hoc-phi.xlsx',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi' }, { status: 500 });
  }
}
