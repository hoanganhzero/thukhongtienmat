import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { AccountsClient } from './accounts-client';

export default async function AccountsPage() {
  const session = await auth();
  if ((session?.user as any)?.adminRole !== 'super_admin') redirect('/admin');
  return <AccountsClient />;
}
