'use client';

import Link from 'next/link';
import { ArrowLeft, UtensilsCrossed } from 'lucide-react';
import MenuItemEditor from '@/components/manager/MenuItemEditor';

export default function MenuCmsSection() {
  return (
    <div className="min-h-screen bg-[#F5F0E6] text-[#1A1A1A]">
      <div className="mx-auto max-w-7xl px-4 py-7 md:px-6 md:py-10">
        <div className="mb-8 flex flex-col gap-4 border-b border-[#E6DFD1] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#7A5A27]">
              <UtensilsCrossed className="h-4 w-4" aria-hidden="true" />
              Content Management
            </div>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-[#163D32] md:text-5xl">
              Food Menu CMS
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#52645D]">
              Add an image, name, Amharic name, price, and description. Tule Resort renders each item directly into the guest dining menu and QR ordering cards.
            </p>
          </div>
          <Link
            href="/staff/dashboard"
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#163D32]/15 bg-white px-4 py-2.5 text-xs font-semibold text-[#163D32] transition-colors hover:bg-[#163D32]/5"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Dashboard
          </Link>
        </div>
        <MenuItemEditor />
      </div>
    </div>
  );
}
