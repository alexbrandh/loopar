/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Configuración para A-Frame y AR.js
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }

    // Permitir importación de archivos de A-Frame
    config.module.rules.push({
      test: /\.(glb|gltf)$/,
      use: {
        loader: 'file-loader',
        options: {
          publicPath: '/_next/static/models/',
          outputPath: 'static/models/',
        },
      },
    });

    return config;
  },
  headers: async () => {
    return [
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
  rewrites: async () => {
    const enableIconRewrite = process.env.ENABLE_ICON_REWRITE === 'true'
    return {
      beforeFiles: enableIconRewrite
        ? [
            // Optional: serve 192x192 icon instead of 512 path
            { source: '/icons/icon-512.png', destination: '/icon-192.png' },
            { source: '/icon-512.png', destination: '/icon-192.png' },
          ]
        : [],
      afterFiles: [],
      fallback: [],
    }
  },
  images: {
    domains: ['supabase.co', 'qllfquoqrxvfgdudnrrr.supabase.co'],
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
    ],
  },
};

module.exports = nextConfig;