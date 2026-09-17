export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

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
    if (studentId) where.studentId = studentId;

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
    // data: { studentIds, message, channel, type, feeAssignmentId }
    const results: any[] = [];
    const studentIds = data.studentIds ?? [];

    for (const sid of studentIds) {
      const notif = await prisma.notification.create({
        data: {
          studentId: sid,
          feeAssignmentId: data.feeAssignmentId ?? null,
          type: data.type ?? 'reminder',
          channel: data.channel ?? 'website',
          message: data.message,
        },
      });
      results.push(notif);
    }

    // Send via Zalo/SMS if channel is specified
    if (data.channel === 'zalo' || data.channel === 'sms') {
      // Get student phones
      const students = await prisma.student.findMany({
        where: { id: { in: studentIds } },
        select: { phone: true, zaloPhone: true },
      });

      if (data.channel === 'zalo') {
        const token = await prisma.appSetting.findUnique({ where: { key: 'zalo_oa_access_token' } });
        if (token?.value) {
          for (const s of students) {
            const phone = s.zaloPhone ?? s.phone;
            if (!phone) continue;
            try {
              await fetch('https://business.openapi.zalo.me/message/template', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', access_token: token.value },
                body: JSON.stringify({ phone, template_id: data.templateId ?? '', template_data: { content: data.message } }),
              });
            } catch (e: any) { console.error('Zalo send error:', e?.message); }
          }
        }
      }

      if (data.channel === 'sms') {
        const smsToken = await prisma.appSetting.findUnique({ where: { key: 'speedsms_access_token' } });
        if (smsToken?.value) {
          const phones = students.map((s: any) => s.phone).filter(Boolean);
          if (phones.length > 0) {
            try {
              await fetch('https://api.speedsms.vn/index.php/sms/send', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: 'Basic ' + Buffer.from(smsToken.value + ':x').toString('base64'),
                },
                body: JSON.stringify({ to: phones, content: data.message, sms_type: 4 }),
              });
            } catch (e: any) { console.error('SMS send error:', e?.message); }
          }
        }
      }
    }

    return NextResponse.json({ sent: results.length });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi' }, { status: 500 });
  }
}
