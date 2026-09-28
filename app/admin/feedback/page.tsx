import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { FeedbackClient } from './feedback-client';

export default async function FeedbackPage() {
  const session = await auth();
  if ((session?.user as any)?.role !== 'admin') redirect('/admin/login');
  return <FeedbackClient session={JSON.parse(JSON.stringify(session))} />;
}
