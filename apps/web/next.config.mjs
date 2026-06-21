/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@rove-hire/shared'],
  reactStrictMode: true,
};

export default nextConfig;
