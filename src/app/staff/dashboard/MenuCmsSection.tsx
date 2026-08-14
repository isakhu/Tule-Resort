'use client';

import Link from 'next/link';
import { ArrowLeft, LayoutDashboard, UtensilsCrossed } from 'lucide-react';
import MenuItemEditor from '@/components/manager/MenuItemEditor';

export default function MenuCmsSection() {
  return (
    <div className="min-h-screen bg-[#0C0B09] text-white">
      <header className="border-b border-white/10 bg-[#15130F]/95 backdrop-blur-xl"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6"><div className="flex items-center gap-3"><img src="/tule-resort-mark.svg" alt="Tule Resort" className="h-11 w-14 rounded-lg object-cover" /><div><p className="text-sm font-black uppercase tracking-[.16em] text-[#F2C866]">Tule Resort</p><p className="text-[8px] font-bold uppercase tracking-[.25em] text-white/35">Manager CMS</p></div></div><Link href="/staff/dashboard" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white/60 hover:text-white"><ArrowLeft className="h-4 w-4" />Dashboard</Link></div></header>
      <main className="mx-auto max-w-7xl px-4 py-7 md:px-6 md:py-10"><div className="mb-8"><div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.25em] text-[#F2B84B]"><UtensilsCrossed className="h-4 w-4" />Content management</div><h1 className="mt-2 text-4xl md:text-6xl font-black tracking-[-.05em]">FOOD MENU</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/50">Add an image, name, Amharic name, price and description. Tule Resort automatically turns the information into the same customer-facing visual card.</p></div><MenuItemEditor /></main>
    </div>
  );
}
