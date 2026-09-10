import type { NextConfig } from 'next';

const nextConfig: NextConfig = process.env.GITHUB_PAGES === 'true' ? {
  output: 'export',
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '/bevfusion-explained',
  trailingSlash: true,
  images: { unoptimized: true },
} : {};

export default nextConfig;
