import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headersList = await headers();
  const host = headersList.get('x-forwarded-host') ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  const siteUrl = host.startsWith('http') ? host : `https://${host}`;

  return [
    { url: siteUrl, lastModified: new Date() },
    { url: `${siteUrl}/tra-cuu`, lastModified: new Date() },
    { url: `${siteUrl}/student/login`, lastModified: new Date() },
  ];
}
