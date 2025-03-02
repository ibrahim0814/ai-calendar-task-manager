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
}

export default nextConfig