/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize for Vercel's function limit
  experimental: {
    // Enable static generation where possible
    staticPageGenerationTimeout: 120,
  },
  // Reduce serverless functions by using static generation
  output: 'standalone',
  // Optimize images
  images: {
    unoptimized: true,
  },
  // ESLint configuration - ignore during builds to prevent deployment failures
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
