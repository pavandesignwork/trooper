import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@trooper/db', '@trooper/core', '@trooper/adapters'],
}

export default nextConfig
