import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, QrCode, Users, UtensilsCrossed } from 'lucide-react';
import { getActiveDiningTablesServer, type PublicDiningTable } from '@/lib/diningTablesServer';

export const dynamic = 'force-dynamic';

export default async function GuestTableDirectoryPage() {
  const tables = await getActiveDiningTablesServer();

  const grouped = tables.reduce<Record<string, PublicDiningTable[]>>((acc, table) => {
    const key = table.section || 'Dining Floor';
    if (!acc[key]) acc[key] = [];
    acc[key].push(table);
    return acc;
  }, {});

  const sections = Object.entries(grouped);

  return (
    <div className="min-h-screen bg-[#F5F0E6] text-[#26312D] pb-20">
      <header className="border-b border-[#C5A46D]/20 bg-[#163D32] text-[#F5F0E6]">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-[#F5F0E6]/75 hover:text-[#C5A46D] transition"
            >
              <ArrowLeft className="h-4 w-4" /> Home
            </Link>
            <Link
              href="/guest/restaurant"
              className="inline-flex items-center gap-2 rounded-full border border-[#C5A46D]/40 bg-[#0F2D24] px-4 py-2 text-xs font-bold text-[#F5F0E6] hover:border-[#C5A46D] transition"
            >
              <UtensilsCrossed className="h-3.5 w-3.5 text-[#C5A46D]" /> View Full Menu
            </Link>
          </div>

          <div className="mt-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#C5A46D]/40 bg-[#C5A46D]/15 px-3.5 py-1 text-[10px] font-black uppercase tracking-[.22em] text-[#C5A46D]">
              <QrCode className="h-3.5 w-3.5" /> Table QR Ordering
            </span>
            <h1 className="mt-4 font-display text-4xl sm:text-5xl font-light tracking-tight">
              Select Your <span className="italic font-normal text-[#C5A46D]">Dining Table.</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-[#F5F0E6]/80">
              Scan the QR code printed at your table, or select your live resort dining table below to open a verified table ordering session.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 space-y-10">
        {sections.length === 0 ? (
          <div className="rounded-3xl border border-[#163D32]/10 bg-white p-10 text-center shadow-sm space-y-4">
            <QrCode className="mx-auto h-10 w-10 text-[#C5A46D]" />
            <h2 className="font-display text-2xl font-medium text-[#163D32]">
              No Active Dining Tables Available
            </h2>
            <p className="mx-auto max-w-md text-xs leading-relaxed text-[#26312D]/70">
              Live table tokens are currently unavailable or offline. You can still browse the lakeside menu or place a room/pickup order directly.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link
                href="/guest/order"
                className="rounded-full bg-[#163D32] px-6 py-2.5 text-xs font-black uppercase tracking-wider text-[#F5F0E6] hover:bg-[#0F2D24] transition"
              >
                Open Order Checkout
              </Link>
              <Link
                href="/guest/restaurant"
                className="rounded-full border border-[#163D32]/20 bg-[#F5F0E6] px-6 py-2.5 text-xs font-bold text-[#163D32] hover:border-[#C5A46D] transition"
              >
                Explore Menu
              </Link>
            </div>
          </div>
        ) : (
          sections.map(([sectionName, sectionTables]) => (
            <section key={sectionName} className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#163D32]/10 pb-2">
                <h2 className="font-display text-2xl font-medium text-[#163D32]">{sectionName}</h2>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A9B83]">
                  {sectionTables.length} Tables
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sectionTables.map((table) => {
                  const isAvailable = table.status === 'available';
                  return (
                    <Link
                      key={table.id}
                      href={`/guest/table/${encodeURIComponent(table.qr_token)}`}
                      className="group flex items-center justify-between rounded-2xl border border-[#163D32]/10 bg-white p-5 shadow-xs transition hover:-translate-y-0.5 hover:border-[#C5A46D]/60 hover:shadow-md"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black text-[#163D32] group-hover:text-[#C5A46D] transition">
                            {table.table_number}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                              isAvailable
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {table.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="flex items-center gap-1.5 text-xs text-[#26312D]/65">
                          <Users className="h-3.5 w-3.5 text-[#C5A46D]" />
                          Seats up to {table.capacity} guests
                        </p>
                      </div>
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F5F0E6] text-[#163D32] group-hover:bg-[#163D32] group-hover:text-[#C5A46D] transition">
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  );
}

