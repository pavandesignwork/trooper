/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@trooper/db', '@trooper/core', '@trooper/adapters'],
  webpack: (config) => {
    // TypeScript source files use .js extensions in imports (NodeNext resolution).
    // Webpack needs to know to try .ts/.tsx when it sees .js/.jsx.
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.js'],
      '.jsx': ['.tsx', '.jsx'],
    }
    return config
  },
}

export default nextConfig
