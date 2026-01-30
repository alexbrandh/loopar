/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignorar errores de TypeScript durante build
  typescript: {
    ignoreBuildErrors: true,
  },
  // Optimizaciones de rendimiento
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  
  // Configuración experimental para mejorar el rendimiento
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  
  // Turbopack config (Next.js 16+)
  turbopack: {},
  headers: async () => {
    return [
      {
        // Headers globales para prevenir errores ORB
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none', // Permite recursos cross-origin
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'cross-origin',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'qllfquoqrxvfgdudnrrr.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'qllfquoqrxvfgdudnrrr.supabase.co',
        port: '',
        pathname: '/storage/v1/object/sign/**',
      },
      // ✅ Agregando soporte para URLs firmadas con parámetros
      {
        protocol: 'https',
        hostname: 'qllfquoqrxvfgdudnrrr.supabase.co',
        port: '',
        pathname: '/storage/**',
      },
      {
        protocol: 'https',
        hostname: 'trae-api-us.mchost.guru',
        port: '',
        pathname: '/api/ide/v1/**',
      },
    ],
  },
};

module.exports = nextConfig;