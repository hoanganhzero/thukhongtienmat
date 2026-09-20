export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { teacherClassIds } from '@/lib/teacher-scope';

export async function GET(request: Request) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    if (user.role === 'student' && studentId !== user.id) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
    if (user.role !== 'admin' && user.role !== 'student') return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
    const where: any = {};
    if (user.adminRole === 'teacher') {
      const classIds = teacherClassIds(user);
      if (!classIds.length) return NextResponse.json({ error: 'Tài khoản chưa được phân công lớp' }, { status: 403 });
      where.student = { classId: { in: classIds } };
    } else if (studentId) where.studentId = studentId;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      take: 50,
      include: { feeAssignment: { include: { feeType: true } } },
    });
    return NextResponse.json(notifications);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if ((session?.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const data = await request.json();
    const user = session!.user as any;
    const channel = ['website', 'zalo', 'sms'].includes(String(data.channel)) ? String(data.channel) : 'website';
    // data: { studentIds, message, channel, type, feeAssignmentId }
    const results: any[] = [];
    let studentIds: string[] = Array.isArray(data.studentIds) ? data.studentIds.map(String) : [];
    if (user.adminRole === 'teacher') {
      const classIds = teacherClassIds(user);
      if (!classIds.length) return NextResponse.json({ error: 'Tài khoản chưa được phân công lớp' }, { status: 403 });
      const allowed = await prisma.student.findMany({ where: { id: { in: studentIds }, classId: { in: classIds } }, select: { id: true } });
      studentIds = allowed.map((item) => item.id);
    }
    if (!studentIds.length) return NextResponse.json({ error: 'Không có học sinh phù hợp' }, { status: 400 });

    const [zaloToken, zaloTemplate, smsToken] = await Promise.all([
      prisma.appSetting.findUnique({ where: { key: 'zalo_oa_access_token' } }),
      prisma.appSetting.findUnique({ where: { key: 'zalo_zns_template_id' } }),
      prisma.appSetting.findUnique({ where: { key: 'speedsms_access_token' } }),
    ]);
    if (channel === 'zalo' && (!zaloToken?.value || !zaloTemplate?.value)) {
      return NextResponse.json({ error: 'Chưa cấu hình Zalo OA Access Token và ZNS Template ID' }, { status: 400 });
    }
    if (channel === 'sms' && !smsToken?.value) {
      return NextResponse.json({ error: 'Chưa cấu hình SpeedSMS Access Token' }, { status: 400 });
    }

    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, phone: true, zaloPhone: true },
    });

    for (const sid of studentIds) {
      const notif = await prisma.notification.create({
        data: {
          studentId: sid,
          feeAssignmentId: data.feeAssignmentId ?? null,
          type: data.type ?? 'reminder',
          channel,
          message: data.message,
        },
      });
      results.push(notif);
    }

    let delivered = channel === 'website' ? results.length : 0;
    let skipped = 0;
    if (channel === 'zalo') {
      for (const student of students) {
        const phone = student.zaloPhone ?? student.phone;
        if (!phone) { skipped += 1; continue; }
        const response = await fetch('https://business.openapi.zalo.me/message/template', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', access_token: zaloToken!.value },
          body: JSON.stringify({ phone, template_id: zaloTemplate!.value, template_data: { content: data.message } }),
        });
        if (response.ok) delivered += 1;
        else skipped += 1;
      }
    }
    if (channel === 'sms') {
      const phones = students.map((student) => student.phone).filter(Boolean);
      skipped = studentIds.length - phones.length;
      if (phones.length) {
        const response = await fetch('https://api.speedsms.vn/index.php/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + Buffer.from(smsToken!.value + ':x').toString('base64') },
          body: JSON.stringify({ to: phones, content: data.message, sms_type: 4 }),
        });
        if (response.ok) delivered = phones.length;
        else skipped = studentIds.length;
      }
    }

    return NextResponse.json({ sent: delivered, skipped, channel });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi' }, { status: 500 });
  }
}
