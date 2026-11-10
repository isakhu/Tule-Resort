import React from 'react';
import type { Metadata } from 'next';
import LuxuryHomeClient from '@/components/LuxuryHomeClient';
import { getRooms } from '@/lib/rooms';
import { getResortServices } from '@/lib/resortServices';
import { getMenuItems } from '@/lib/menu';
import { getGalleryItems } from '@/lib/gallery';

export const metadata: Metadata = {
  title: 'Tule Resort Hawassa | Luxury Lakeside Hospitality in Ethiopia',
  description:
    'Experience the premier luxury lakeside resort on Lake Hawassa, Ethiopia. Elegant suites, fine dining, restorative wellness, and authentic Ethiopian hospitality.',
};

export default async function Home() {
  const [rooms, services, menuItems, galleryItems] = await Promise.all([
    getRooms(),
    getResortServices(),
    getMenuItems(),
    getGalleryItems(),
  ]);

  return (
    <LuxuryHomeClient
      initialRooms={rooms}
      initialServices={services}
      initialMenuItems={menuItems}
      initialGalleryItems={galleryItems}
    />
  );
}
