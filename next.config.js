const basePath = process.env.BASE_PATH || ''

/** @type {import('next').NextConfig} */
module.exports = {
  output: 'export',
  outputFileTracingRoot: __dirname,
  trailingSlash: true,
  reactStrictMode: true,
  basePath,
  assetPrefix: basePath || undefined,
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
}
