import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
const inter = Inter({ subsets: ['latin', 'vietnamese'] });
export const metadata: Metadata = {
  title: { default: 'ERP Cửa hàng', template: '%s · ERP' },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'ERP' },
};
export const viewport: Viewport = {
  themeColor: '#0f172a', width: 'device-width',
  initialScale: 1, maximumScale: 1, userScalable: false,
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className={inter.className}><Providers>{children}</Providers></body>
    </html>
  );
}
