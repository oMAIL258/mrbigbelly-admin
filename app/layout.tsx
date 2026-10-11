import type { Metadata, Viewport } from 'next';
import './globals.css';
import { LangProvider } from '@/lib/i18n';
import { Worker } from '@/components/Worker';

export const metadata: Metadata = {
  title: 'Mr. Big Belly · Admin',
  icons: { icon: '/icon-192.png', apple: '/apple-touch-icon.png' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#F7F1E7' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600&family=Inter:wght@400;500;600&family=Noto+Sans+Thai:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen">
        <Worker />
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
