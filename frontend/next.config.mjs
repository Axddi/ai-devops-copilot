import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const backendUrl =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  ''

const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    if (!backendUrl) {
      return []
    }

    return [
      {
        source: '/api/backend/:path*',
        destination: `${backendUrl.replace(/\/$/, '')}/:path*`,
      },
    ]
  },
}

export default nextConfig
