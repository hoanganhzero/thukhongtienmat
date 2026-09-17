export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getFileUrl } from '@/lib/s3';
import { auth } from '@/auth';
import { getStudentIdFromLookupToken } from '@/lib/lookup-token';

export async function POST(request: Request) {
  try {
    const { cloudStoragePath, contentType } = await request.json();
    if (!cloudStoragePath) {
      return NextResponse.json({ error: 'Thiếu đường dẫn' }, { status: 400 });
    }
    const session = await auth();
    const sessionUser = session?.user as any;
    const isAuthorized = sessionUser?.role === 'admin' || sessionUser?.role === 'student' || getStudentIdFromLookupToken(request.headers.get('x-payment-lookup-token'));
    if (!isAuthorized) return NextResponse.json({ error: 'Chưa đăng nhập hoặc phiên tra cứu đã hết hạn' }, { status: 401 });
    const url = await getFileUrl(cloudStoragePath, contentType ?? 'image/jpeg', false);
    return NextResponse.json({ url });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi' }, { status: 500 });
  }
}
