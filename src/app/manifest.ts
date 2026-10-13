import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Tule Resort & Spa — Lake Hawassa',
    short_name: 'Tule Resort',
    description: 'Luxury resort booking, lakeside restaurant dining, and instant QR table ordering at Lake Hawassa, Ethiopia.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F8F5EE',
    theme_color: '#0B3D4A',
    orientation: 'portrait-primary',
    scope: '/',
    icons: [
      {
        src: '/tule-app-icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
