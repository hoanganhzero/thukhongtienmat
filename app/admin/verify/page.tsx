import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { VerifyClient } from './verify-client';

export default async function VerifyPage() {
  const session = await auth();
  if ((session?.user as any)?.role !== 'admin') redirect('/admin/login');
  return <VerifyClient />;
}
