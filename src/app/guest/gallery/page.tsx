'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, Camera, ChevronLeft, ChevronRight, X } from 'lucide-react';

const photos = [
  ['Resort Overview', 'Resort exterior', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=85'],
  ['Rooms', 'Lake Luxury rooms', 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=85'],
  ['Tule Aqua', 'Pool experience', 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1200&q=85'],
  ['Restaurant & Food', 'Luxury dining', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=85'],
  ['Events & Conferences', 'Meetings & celebrations', 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1200&q=85'],
  ['Spa & Wellness', 'Relaxation', 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=85'],
  ['Nature / Lake / Hawassa', 'Lakeside atmosphere', 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1200&q=85'],
  ['Family', 'Family moments', 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1200&q=85'],
];

export default function GalleryPage() {
  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState<number | null>(null);
  const categories = ['All', ...Array.from(new Set(photos.map((p) => p[0])))];
  const filtered = filter === 'All' ? photos : photos.filter((p) => p[0] === filter);

  const move = (delta: number) => {
    if (selected === null) return;
    const next = (selected + delta + filtered.length) % filtered.length;
    const photo = filtered[next];
    setSelected(photos.indexOf(photo));
  };

  const current = selected === null ? null : photos[selected];

  return <div className="min-h-screen bg-[#F8FBFC] text-[#073B4C]">
    <header className="relative overflow-hidden bg-[#073B4C] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(201,162,39,.24),transparent_30%),radial-gradient(circle_at_10%_90%,rgba(11,79,108,.9),transparent_50%)]" />
      <div className="relative mx-auto max-w-7xl px-4 py-6 md:px-6">
        <Link href="/guest" className="inline-flex items-center gap-2 text-sm font-bold text-white/65 hover:text-white"><ArrowLeft className="h-4 w-4" /> Guest services</Link>
        <div className="py-14 md:py-20"><p className="inline-flex items-center gap-2 rounded-full border border-[#C9A227]/40 bg-[#C9A227]/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.24em] text-[#E2C35A]"><Camera className="h-4 w-4" /> Tule Resort · Hawassa</p><h1 className="mt-5 text-6xl font-black tracking-[-.07em] md:text-8xl">TULE<br /><span className="text-[#C9A227]">GALLERY.</span></h1><p className="mt-6 max-w-2xl text-base leading-8 text-white/65 md:text-lg">A visual journey through rooms, water, dining, wellness, events, family moments and the beauty surrounding Tule Resort.</p></div>
      </div>
    </header>
    <main className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
      <div className="mb-8 flex flex-wrap gap-2">{categories.map((category) => <button key={category} onClick={() => setFilter(category)} className={`rounded-full px-4 py-2 text-xs font-black transition ${filter === category ? 'bg-[#0B4F6C] text-white' : 'bg-white border border-[#0B4F6C]/10 text-[#073B4C]/60 hover:bg-[#EAF4F7]'}`}>{category}</button>)}</div>
      <div className="columns-1 gap-5 sm:columns-2 lg:columns-3">{filtered.map((photo, index) => <button key={photo[0]} onClick={() => setSelected(photos.indexOf(photo))} className="group mb-5 block w-full overflow-hidden rounded-[1.5rem] bg-white text-left shadow-[0_15px_45px_rgba(7,59,76,.08)]"><img src={photo[2]} alt={photo[1]} className="w-full object-cover transition duration-500 group-hover:scale-[1.03]" /><div className="p-4"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#C9A227]">{photo[0]}</p><p className="mt-1 font-black">{photo[1]}</p></div></button>)}</div>
      <section className="mt-12 grid gap-4 md:grid-cols-4">{['Explore Rooms', 'Explore Tule Aqua', 'Explore Restaurant', 'Book Your Stay'].map((label, i) => <Link key={label} href={i === 0 ? '/guest/rooms' : i === 1 ? '/guest/tule-aqua' : i === 2 ? '/guest/restaurant' : '/guest/my-activity'} className="rounded-2xl border border-[#0B4F6C]/10 bg-white px-5 py-4 text-center text-xs font-black uppercase tracking-[.12em] hover:bg-[#EAF4F7]">{label}</Link>)}</section>
    </main>
    {current && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#031C24]/95 p-4" role="dialog" aria-modal="true"><button onClick={() => setSelected(null)} className="absolute right-5 top-5 rounded-full bg-white/10 p-3 text-white"><X /></button><button onClick={() => move(-1)} className="absolute left-4 rounded-full bg-white/10 p-3 text-white"><ChevronLeft /></button><div className="max-h-[90vh] max-w-5xl"><img src={current[2]} alt={current[1]} className="max-h-[78vh] w-auto max-w-full rounded-2xl object-contain" /><div className="mt-3 flex justify-between gap-4 text-white"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#E2C35A]">{current[0]}</p><p className="font-black">{current[1]}</p><p className="text-xs text-white/45">Tule Resort · Hawassa</p></div><button onClick={() => move(1)} className="rounded-full bg-white/10 p-3"><ChevronRight /></button></div></div></div>}
  </div>;
}
