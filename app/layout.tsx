import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.GITHUB_PAGES === 'true' ? 'https://hova88.github.io' : 'https://bevfusion-algorithm-lab.hova-y.chatgpt.site'),
  title: 'BEVFusion — Field Guide',
  description: 'Dissect one real nuScenes frame through camera lifting, BEV pooling, sparse LiDAR encoding, metric co-registration, fusion, and decoding.',
  openGraph: {
    title: 'BEVFusion — Field Guide',
    description: 'One real nuScenes frame. Every coordinate change exposed.',
    images: [{ url: (process.env.NEXT_PUBLIC_BASE_PATH || '')+'/og.png', width: 1536, height: 1024, alt: 'BEVFusion frame debugger' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BEVFusion — Field Guide',
    description: 'One real nuScenes frame. Every coordinate change exposed.',
    images: [(process.env.NEXT_PUBLIC_BASE_PATH || '')+'/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
