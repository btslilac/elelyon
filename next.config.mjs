import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'rvgibgrftzcpjvkbagti.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],

    // IMPORTANT FIX
    unoptimized: true,
  },
  
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },

};

export default withSentryConfig(
  nextConfig,
  {
    silent: true,
    org: 'jsm-x9',
    project: 'javascript-nextjs',
  },
  {
    widenClientFileUpload: true,
    transpileClientSDK: true,
    hideSourceMaps: true,
    disableLogger: true,
    automaticVercelMonitors: true,
  }
);