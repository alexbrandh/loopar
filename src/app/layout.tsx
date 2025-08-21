import type { Metadata } from "next"
import { DM_Sans } from "next/font/google"
import {
  ClerkProvider
} from '@clerk/nextjs'
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const dmSans = DM_Sans({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Loopar - Crea Experiencias AR Interactivas",
  description: "Sube imágenes y videos para crear postales AR inmersivas que cobran vida cuando las ves a través de tu cámara.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Loopar"
  },
  formatDetection: {
    telephone: false
  },
  openGraph: {
    type: "website",
    siteName: "Loopar",
    title: "Loopar - Crea Experiencias AR Interactivas",
    description: "Sube imágenes y videos para crear postales AR inmersivas que cobran vida cuando las ves a través de tu cámara."
  },
  twitter: {
    card: "summary",
    title: "Loopar - Crea Experiencias AR Interactivas",
    description: "Sube imágenes y videos para crear postales AR inmersivas que cobran vida cuando las ves a través de tu cámara."
  }
}

export function generateViewport() {
  return {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: '#667eea'
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    >
      <html lang="es">
        <head>
          <link rel="icon" href="/favicon.svg" />
          <link rel="apple-touch-icon" href="/icon-192.png" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="apple-mobile-web-app-title" content="Loopar" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="msapplication-TileColor" content="#667eea" />
          <meta name="msapplication-tap-highlight" content="no" />
        </head>
        <body className={dmSans.className}>
          {children}
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  )
}