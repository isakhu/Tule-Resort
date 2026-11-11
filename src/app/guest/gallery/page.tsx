'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, Camera, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { isOptimizableImageSrc } from '@/lib/imageSrc';

type GalleryItem = {
  id: string;
  title: string;
  caption: string | null;
  category: string;
  image_url: string;
  is_featured: boolean;
  display_order: number;
};

const fallbackPhotos: GalleryItem[] = [
  ['Resort Overview', 'Resort exterior', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=85'],
  ['Rooms', 'Lake Luxury rooms', 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=85'],
  ['Tule Aqua', 'Pool experience', 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1200&q=85'],
  ['Restaurant & Food', 'Luxury dining', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=85'],
  ['Events & Conferences', 'Meetings & celebrations', 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1200&q=85'],
  ['Spa & Wellness', 'Relaxation', 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=85'],
  ['Nature / Lake / Hawassa', 'Lakeside atmosphere', 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1200&q=85'],
  ['Family', 'Family moments', 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1200&q=85'],
].map((p, index) => ({ id: `fallback-${index}`, title: p[1], caption: null, category: p[0], image_url: p[2], is_featured: false, display_order: index }));

export default function GalleryPage() {
  const [photos, setPhotos] = useState<GalleryItem[]>(fallbackPhotos);
  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState<number | null>(null);
  const lightboxTitleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('gallery')
        .select('id,title,caption,category,image_url,is_featured,display_order')
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('display_order', { ascending: true });
      if (!error && data && data.length > 0) setPhotos(data as GalleryItem[]);
    }
    void load();
  }, []);

  const categories = ['All', ...Array.from(new Set(photos.map((p) => p.category)))];
  const filtered = filter === 'All' ? photos : photos.filter((p) => p.category === filter);

  const move = useCallback(
    (delta: number) => {
      if (filtered.length === 0) return;
      setSelected((prev) => {
        if (prev === null) return null;
        return (prev + delta + filtered.length) % filtered.length;
      });
    },
    [filtered.length]
  );

  useEffect(() => {
    if (selected === null) return;
    const prevOverflow = document.body.style.overflow;
    const prevActive = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelected(null);
      } else if (e.key === 'ArrowLeft') {
        move(-1);
      } else if (e.key === 'ArrowRight') {
        move(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      prevActive?.focus();
    };
  }, [selected, move]);

  const current = selected === null ? null : filtered[selected] ?? null;

  return (
    <div className="min-h-screen bg-[#F5F0E6] text-[#26312D]">
      <header className="relative overflow-hidden bg-[#163D32] text-[#F5F0E6] border-b border-[#C5A46D]/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(197,164,109,.15),transparent_30%),radial-gradient(circle_at_10%_90%,rgba(138,155,131,.12),transparent_50%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-6 md:px-6">
          <Link href="/guest" className="inline-flex items-center gap-2 text-sm font-bold text-[#F5F0E6]/70 hover:text-[#C5A46D] transition">
            <ArrowLeft className="h-4 w-4" /> Guest services
          </Link>
          <div className="py-14 md:py-20">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#C5A46D]/40 bg-[#C5A46D]/15 px-4 py-2 text-[10px] font-black uppercase tracking-[.24em] text-[#C5A46D]">
              <Camera className="h-4 w-4" /> Tule Resort · Hawassa
            </p>
            <h1 className="mt-5 font-display text-6xl font-light tracking-tight md:text-8xl leading-none">
              TULE<br />
              <span className="italic font-normal text-[#C5A46D]">GALLERY.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[#F5F0E6]/80 md:text-lg">
              A visual journey through suites, lakeside leisure, signature dining, wellness, celebratory events, and the natural beauty of Lake Hawassa.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
        {/* Category Filter Pills */}
        <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label="Filter gallery by category">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              aria-pressed={filter === category}
              onClick={() => {
                setFilter(category);
                setSelected(null);
              }}
              className={`rounded-full px-5 py-2 text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                filter === category
                  ? 'bg-[#163D32] text-[#F5F0E6] shadow-md ring-2 ring-[#C5A46D]'
                  : 'bg-white border border-[#163D32]/15 text-[#26312D] hover:bg-[#EDE8DC] hover:text-[#163D32]'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Masonry / Photo Cards Grid */}
        <div className="columns-1 gap-6 sm:columns-2 lg:columns-3">
          {filtered.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              aria-label={`View ${photo.title} in ${photo.category}`}
              onClick={() => setSelected(index)}
              className="group mb-6 block w-full overflow-hidden rounded-[2rem] bg-white text-left shadow-[0_12px_35px_rgba(22,61,50,0.06)] border border-[#163D32]/10 transition-all duration-300 hover:-translate-y-1 hover:border-[#C5A46D]/60 hover:shadow-[0_20px_45px_rgba(22,61,50,0.12)] cursor-pointer"
            >
              <div className="overflow-hidden">
                <Image
                  src={photo.image_url}
                  alt={photo.title}
                  width={900}
                  height={675}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  unoptimized={!isOptimizableImageSrc(photo.image_url)}
                  className="h-auto w-full object-cover transition duration-700 ease-out group-hover:scale-105"
                />
              </div>
              <div className="p-5">
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#7A5A27]">
                  {photo.category}
                </p>
                <p className="mt-1 font-display text-xl font-medium text-[#26312D]">
                  {photo.title}
                </p>
                {photo.caption && (
                  <p className="mt-1 text-xs text-[#52645D] font-normal leading-relaxed">
                    {photo.caption}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Quick Nav Links */}
        <section className="mt-14 grid gap-4 md:grid-cols-4">
          {[
            ['Explore Rooms', '/guest/rooms'],
            ['Explore Tule Aqua', '/guest/tule-aqua'],
            ['Explore Restaurant', '/guest/restaurant'],
            ['Book Your Stay', '/guest/booking'],
          ].map(([label, href]) => (
            <Link
              key={label}
              href={href}
              className="rounded-2xl border border-[#163D32]/10 bg-white px-5 py-4 text-center text-xs font-black uppercase tracking-[.14em] text-[#163D32] shadow-xs hover:border-[#C5A46D] hover:bg-[#F5F0E6] transition duration-200"
            >
              {label}
            </Link>
          ))}
        </section>
      </main>

      {/* Lightbox Modal */}
      {current && selected !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1E19]/95 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby={lightboxTitleId}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => setSelected(null)}
            className="absolute right-5 top-5 rounded-full bg-white/15 p-3 text-white hover:bg-white/25 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#C5A46D]"
            aria-label="Close lightbox"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => move(-1)}
            className="hidden sm:flex absolute left-4 rounded-full bg-white/15 p-3 text-white hover:bg-white/25 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#C5A46D]"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="max-h-[90vh] max-w-5xl w-full flex flex-col items-center">
            <Image
              src={current.image_url}
              alt={current.title}
              width={1400}
              height={950}
              sizes="(max-width: 1024px) 95vw, 1024px"
              unoptimized={!isOptimizableImageSrc(current.image_url)}
              className="max-h-[70vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl border border-white/10"
            />
            <div className="mt-4 w-full max-w-3xl flex justify-between items-center gap-4 text-white">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#C5A46D]">
                  {current.category} · {selected + 1} / {filtered.length}
                </p>
                <p id={lightboxTitleId} className="font-display text-2xl font-medium text-[#F5F0E6]">
                  {current.title}
                </p>
                <p className="text-xs text-[#D8D0BE]">
                  {current.caption || 'Tule Resort · Lake Hawassa'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => move(-1)}
                  className="sm:hidden rounded-full bg-white/15 p-3 text-white hover:bg-white/25 transition cursor-pointer"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(1)}
                  className="rounded-full bg-white/15 p-3 text-white hover:bg-white/25 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#C5A46D]"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
