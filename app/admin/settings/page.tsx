import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { SettingsClient } from './settings-client';

export default async function SettingsPage() {
  const session = await auth();
  const user = session?.user as any;
  if (user?.role !== 'admin') redirect('/admin/login');
  if (user?.adminRole === 'accountant') redirect('/admin');
  return <SettingsClient />;
}
