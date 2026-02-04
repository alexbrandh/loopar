import type { Metadata } from "next"
import { Outfit, Alegreya_SC, Chivo_Mono } from "next/font/google"
import {
  ClerkProvider
} from '@clerk/nextjs'
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const outfit = Outfit({ 
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
})

const alegreyaSC = Alegreya_SC({ 
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap"
})

const chivoMono = Chivo_Mono({ 
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap"
})

export const metadata: Metadata = {
  title: "Regaliz - Dulce Felicidad en AR",
  description: "Crea experiencias AR mágicas que cobran vida. Transforma tus recuerdos en momentos memorables con realidad aumentada.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Regaliz"
  },
  formatDetection: {
    telephone: false
  },
  openGraph: {
    type: "website",
    siteName: "Regaliz",
    title: "Regaliz - Dulce Felicidad en AR",
    description: "Crea experiencias AR mágicas que cobran vida. Transforma tus recuerdos en momentos memorables."
  },
  twitter: {
    card: "summary",
    title: "Regaliz - Dulce Felicidad en AR",
    description: "Crea experiencias AR mágicas que cobran vida. Transforma tus recuerdos en momentos memorables con realidad aumentada."
  }
}

export function generateViewport() {
  return {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: '#F47B6B'
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
      appearance={{
        variables: {
          colorPrimary: '#F47B6B',
          colorBackground: '#FAF8F5',
          colorText: '#1a1a1a',
          borderRadius: '12px',
        },
        elements: {
          card: 'shadow-xl border-0',
          headerTitle: 'text-foreground',
          headerSubtitle: 'text-muted-foreground',
          socialButtonsBlockButton: 'border border-border hover:bg-muted',
          formButtonPrimary: 'bg-primary hover:bg-primary/90',
          footerActionLink: 'text-primary hover:text-primary/80',
        },
        layout: {
          socialButtonsPlacement: 'top',
          socialButtonsVariant: 'blockButton',
        },
      }}
      localization={{
        signIn: {
          start: {
            title: 'Iniciar sesión en Regaliz',
            subtitle: '¡Bienvenido! Por favor inicia sesión para continuar',
          },
        },
        signUp: {
          start: {
            title: 'Crear cuenta en Regaliz',
            subtitle: 'Crea tu cuenta para empezar',
          },
        },
      }}
    >
      <html lang="es" suppressHydrationWarning>
        <head>
          <link rel="icon" href="/favicon.svg" />
          <link rel="apple-touch-icon" href="/icon-192.png" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="apple-mobile-web-app-title" content="Regaliz" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="msapplication-TileColor" content="#F47B6B" />
          <meta name="msapplication-tap-highlight" content="no" />
        </head>
        <body className={`${outfit.variable} ${alegreyaSC.variable} ${chivoMono.variable} font-sans antialiased`}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}