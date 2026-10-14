/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow extra time for static generation of the dashboard pages
  staticPageGenerationTimeout: 120,
  // /student/compare was retired (DATA_DISCLOSURE.md §10.1); send old bookmarks home.
  async redirects() {
    return [
      { source: "/student/compare", destination: "/student", permanent: false },
    ];
  },
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
