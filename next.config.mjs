/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export for deployment
  output: 'export',

  // Image optimization settings
  images: {
    unoptimized: true, // Required for static export
    // Add allowed domains for external images
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.in',
      },
    ],
  },

  // Trailing slashes for static hosting compatibility
  trailingSlash: true,

  // Production optimizations
  reactStrictMode: true,

  // Compress output
  compress: true,

  // Remove X-Powered-By header for security
  poweredByHeader: false,

  // Experimental features for better performance
  experimental: {
    // Optimize CSS
    optimizeCss: true,
  },

  // NOTE: For static export, security headers should be configured in your hosting platform:
  // - Vercel: vercel.json
  // - Netlify: _headers file
  // - Apache: .htaccess
  // - Nginx: nginx.conf
  //
  // Recommended headers:
  // X-Content-Type-Options: nosniff
  // X-Frame-Options: DENY
  // Referrer-Policy: strict-origin-when-cross-origin
  // Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';
};

export default nextConfig;
