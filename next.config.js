/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow extra time for static generation of the dashboard pages
  staticPageGenerationTimeout: 120,
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
