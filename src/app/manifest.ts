import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tule Resort & Spa — Lake Hawassa',
    short_name: 'Tule Resort',
    description: 'Luxury resort booking, lakeside restaurant dining, and instant QR table ordering at Lake Hawassa, Ethiopia.',
    start_url: '/',
    display: 'standalone',
    background_color: '#163D32',
    theme_color: '#163D32',
    orientation: 'portrait-primary',
    scope: '/',
    icons: [
      {
        src: '/tule-resort-logo.png',
        sizes: 'any',
        type: 'image/png',
      },
      {
        src: '/tule-resort-mark.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
