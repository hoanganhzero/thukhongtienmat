export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { generatePresignedUploadUrl } from '@/lib/s3';
import { auth } from '@/auth';
import { getStudentIdFromLookupToken } from '@/lib/lookup-token';

export async function POST(request: Request) {
  try {
    const { fileName, contentType } = await request.json();
    if (!fileName || !contentType) {
      return NextResponse.json({ error: 'Thiếu thông tin file' }, { status: 400 });
    }
    const session = await auth();
    const sessionUser = session?.user as any;
    const isAuthorized = sessionUser?.role === 'admin' || sessionUser?.role === 'student' || getStudentIdFromLookupToken(request.headers.get('x-payment-lookup-token'));
    if (!isAuthorized) return NextResponse.json({ error: 'Chưa đăng nhập hoặc phiên tra cứu đã hết hạn' }, { status: 401 });
    const result = await generatePresignedUploadUrl(fileName, contentType, false);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi tạo URL upload' }, { status: 500 });
  }
}
