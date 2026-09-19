import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { ChunkLoadErrorHandler } from '@/components/chunk-load-error-handler';
import { Providers } from './providers';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';


export const metadata: Metadata = {
  title: 'Thu không tiền mặt | Trung tâm GDNN-GDTX Khu vực Tân Ninh',
  description: 'Tra cứu và thanh toán các khoản thu của Trung tâm GDNN-GDTX Khu vực Tân Ninh bằng chuyển khoản QR.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  openGraph: {
    title: 'Thu không tiền mặt | Trung tâm GDNN-GDTX Khu vực Tân Ninh',
    description: 'Tra cứu và thanh toán các khoản thu bằng chuyển khoản QR.',
    images: ['/og-image.png'],
  },
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? 'http://localhost:3000'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
          <Providers>
            {children}
            <Toaster />
            <ChunkLoadErrorHandler />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
