import React from 'react';
import type { Metadata } from 'next';
import LuxuryHomeClient from '@/components/LuxuryHomeClient';
import { getRooms } from '@/lib/rooms';
import { getResortServices } from '@/lib/resortServices';
import { getMenuItems } from '@/lib/menu';
import { getGalleryItems } from '@/lib/gallery';
import { getDefaultTableQrToken } from '@/lib/diningTablesServer';
import { tuleBrand } from '@/lib/tuleBrand';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: {
    absolute: 'Tule Resort Hawassa | Luxury Lakeside Hospitality in Ethiopia',
  },
  description:
    'Experience the premier luxury lakeside resort on Lake Hawassa, Ethiopia. Elegant suites, fine dining, restorative wellness, and authentic Ethiopian hospitality.',
};

export default async function Home() {
  const [rooms, services, menuItems, galleryItems, defaultTableToken] = await Promise.all([
    getRooms(),
    getResortServices(),
    getMenuItems(),
    getGalleryItems(),
    getDefaultTableQrToken(),
  ]);

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://tuleresort.com').replace(/\/+$/, '');
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Resort',
    name: tuleBrand.name,
    description:
      'Luxury lakeside hospitality sanctuary on the shores of Lake Hawassa, Ethiopia.',
    url: siteUrl,
    image: `${siteUrl}/tule-resort-hawassa-hero.jpg`,
    telephone: tuleBrand.phones[0],
    email: tuleBrand.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Lake Hawassa Shore',
      addressLocality: 'Hawassa',
      addressRegion: 'Sidama',
      addressCountry: 'ET',
    },
    priceRange: 'ETB',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <LuxuryHomeClient
        initialRooms={rooms}
        initialServices={services}
        initialMenuItems={menuItems}
        initialGalleryItems={galleryItems}
        defaultTableToken={defaultTableToken}
      />
    </>
  );
}
