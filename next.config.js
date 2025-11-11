/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/avif','image/webp'],
  },
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
  },
};
module.exports = nextConfig;

