/** @type {import('next').NextConfig} */
const nextConfig = {
  // GitHub Pages requires basePath if not at root
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',

  // Static export for GitHub Pages
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Important for GitHub Pages routing
  trailingSlash: true,

  // Temporarily disable type checking for static export
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
