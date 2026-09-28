import type { MetadataRoute } from 'next';

/**
 * Crawlers may index the public exhibition pages, but never the backoffice,
 * the jury doors, or the API.
 */
export default function robots(): MetadataRoute.Robots {
  const base = (process.env.APP_URL ?? '').replace(/\/$/, '');
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/', '/j/'],
    },
    sitemap: base ? `${base}/sitemap.xml` : undefined,
  };
}
