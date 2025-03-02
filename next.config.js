/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['lh3.googleusercontent.com'], // For Google OAuth profile pictures
  },
  experimental: {
    serverActions: true,
  },
  // Configure server to listen on port 5000
  server: {
    port: 5000,
    host: '0.0.0.0',
  },
}

export default nextConfig