import type { MetadataRoute } from 'next';
import { getRooms } from '@/lib/rooms';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://tuleresort.com').replace(/\/+$/, '');
  const lastModified = new Date();

  const staticPaths: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }> = [
    { path: '/', priority: 1.0, changeFrequency: 'weekly' },
    { path: '/guest', priority: 0.9, changeFrequency: 'weekly' },
    { path: '/guest/rooms', priority: 0.9, changeFrequency: 'daily' },
    { path: '/guest/services', priority: 0.85, changeFrequency: 'weekly' },
    { path: '/guest/restaurant', priority: 0.85, changeFrequency: 'daily' },
    { path: '/guest/cafeteria', priority: 0.8, changeFrequency: 'daily' },
    { path: '/guest/tule-aqua', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/guest/gallery', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/guest/booking', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/guest/resort-menu', priority: 0.75, changeFrequency: 'weekly' },
  ];

  const entries: MetadataRoute.Sitemap = staticPaths.map((item) => ({
    url: `${siteUrl}${item.path === '/' ? '' : item.path}`,
    lastModified,
    changeFrequency: item.changeFrequency,
    priority: item.priority,
  }));

  try {
    const rooms = await getRooms();
    const seenSlugs = new Set<string>();
    for (const room of rooms) {
      const slug = (room.slug || room.id || '').trim();
      if (!slug || seenSlugs.has(slug)) continue;
      seenSlugs.add(slug);
      entries.push({
        url: `${siteUrl}/guest/rooms/${encodeURIComponent(slug)}`,
        lastModified,
        changeFrequency: 'daily',
        priority: 0.8,
      });
    }
  } catch {
    // Keep static sitemap entries intact if dynamic room lookup fails.
  }

  return entries;
}

