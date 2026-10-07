import type { Metadata, Viewport } from 'next'
import Providers from "@/components/providers";
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI DevOps Copilot - SRE Dashboard',
  description: 'Enterprise-grade platform engineering dashboard for AI-powered DevOps incident management',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
  <body className="font-sans antialiased bg-background text-foreground">
      <Providers>
          {children}
      </Providers>

      {process.env.NODE_ENV === "production" && <Analytics />}
  </body>
    </html>
  )
}
