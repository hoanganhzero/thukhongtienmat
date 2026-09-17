import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { FeeTypesClient } from './fee-types-client';

export default async function FeeTypesPage() {
  const session = await auth();
  if ((session?.user as any)?.role !== 'admin') redirect('/admin/login');
  return <FeeTypesClient />;
}
