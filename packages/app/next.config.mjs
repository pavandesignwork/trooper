/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@trooper/db', '@trooper/core', '@trooper/adapters'],
}

export default nextConfig
