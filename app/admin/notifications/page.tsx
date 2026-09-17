import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { NotificationsClient } from './notifications-client';

export default async function NotificationsPage() {
  const session = await auth();
  if ((session?.user as any)?.role !== 'admin') redirect('/admin/login');
  return <NotificationsClient />;
}
