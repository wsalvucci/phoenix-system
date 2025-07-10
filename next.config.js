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
};

module.exports = nextConfig;
