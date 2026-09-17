import { LookupClient } from './lookup-client';

export default async function LookupPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return <LookupClient initialQuery={q ?? ''} />;
}
