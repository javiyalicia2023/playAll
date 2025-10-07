import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PlayAll',
  description: 'Synchronized YouTube listening rooms'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <div style={{ minHeight: '100vh' }}>{children}</div>
      </body>
    </html>
  );
}
