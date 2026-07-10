/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  images: {
    remotePatterns: [{ hostname: 'localhost' }],
  },
  turbopack: {
    resolveAlias: {
      '@': __dirname,
    },
  },
}

module.exports = nextConfig
