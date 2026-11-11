import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Resort Photo Gallery',
  description:
    'Explore lakeside views, suites, dining terraces, gardens, and aquatic spaces across Tule Resort in Hawassa, Ethiopia.',
};

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return children;
}

