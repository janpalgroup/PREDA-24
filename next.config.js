/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  webpack: (config, { isServer }) => {
    if (isServer) config.externals = [...(config.externals||[]), 'pdfkit','docx','mammoth','pdf-parse']
    return config
  },
}
module.exports = nextConfig
