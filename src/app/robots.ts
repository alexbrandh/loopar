import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://regaliz.com.co';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin', '/dashboard', '/sign-in', '/sign-up'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
