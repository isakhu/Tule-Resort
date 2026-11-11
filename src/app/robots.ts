import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://tuleresort.com').replace(/\/+$/, '');

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/staff/',
          '/admin/',
          '/guest/my-activity/',
          '/guest/order/',
          '/guest/table/',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

