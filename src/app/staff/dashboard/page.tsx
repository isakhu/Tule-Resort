'use client';

import Link from 'next/link';
import { ArrowRight, BedDouble, CalendarDays, ClipboardList, DollarSign, Images, LayoutDashboard, Settings, Sparkles, UtensilsCrossed, Wrench } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const modules = [
  ['Rooms','Manage rooms, prices, amenities and availability.',BedDouble,'/staff/dashboard/rooms'],
  ['Reservations','Confirm, reject, check in and check out guests.',CalendarDays,'/staff/dashboard/reservations'],
  ['Restaurant','Manage food, categories, prices and orders.',UtensilsCrossed,'/staff/dashboard/menu'],
  ['Services','Manage wellness, transport, concierge and room service.',Sparkles,'/staff/dashboard/services'],
  ['Gallery','Organize and feature resort photos.',Images,'/staff/dashboard/gallery'],
  ['Orders & Requests','Review guest food and service requests.',ClipboardList,'/admin/orders'],
  ['Housekeeping','Assign and complete room cleaning tasks.',Sparkles,'/staff/dashboard/housekeeping'],
  ['Maintenance','Report and track resort maintenance issues.',Wrench,'/staff/dashboard/maintenance'],
  ['Settings','Tax, service charge, cancellation and no-show policies.',Settings,'/staff/dashboard/settings'],
];

export default function ManagerDashboard() {
  const [stats, setStats] = useState({ reservations: 0, rooms: 0, revenue: 0, gallery: 0 });
  useEffect(() => {
    Promise.all([
      supabase.from('room_reservations').select('id,total_price,status,payment_status'),
      supabase.from('rooms').select('id', { count: 'exact', head: true }),
      supabase.from('gallery').select('id', { count: 'exact', head: true }),
    ]).then(([reservations, rooms, gallery]) => {
      const rows = reservations.data ?? [];
      setStats({
        reservations: rows.length,
        rooms: rooms.count ?? 0,
        revenue: rows.filter((r) => r.payment_status === 'paid').reduce((sum, r) => sum + Number(r.total_price || 0), 0),
        gallery: gallery.count ?? 0,
      });
    });
  }, []);

  return <div className="min-h-screen bg-[#F8F5EE] text-[#182326]">
    <header className="border-b border-white/10 bg-[#0B3D4A] text-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 md:px-6"><div className="flex items-center gap-3"><img src="/tule-resort-mark.svg" alt="Tule Resort" className="h-11 w-14 rounded-lg object-cover"/><div><p className="font-display text-2xl">Tule Resort</p><p className="text-[9px] font-bold uppercase tracking-[.25em] text-white/45">Manager Dashboard</p></div></div><span className="rounded-full bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.15em]">Lake Luxury</span></div></header>
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
      <section className="rounded-[2rem] bg-[#0B3D4A] p-7 text-white md:p-9"><p className="text-[10px] font-black uppercase tracking-[.24em] text-[#D8C7A3]">Control center</p><h1 className="mt-2 font-display text-5xl leading-none md:text-7xl">Manage Tule Resort.</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-white/60">Rooms, reservations, payments, dining, housekeeping, maintenance and resort settings in one place.</p></section>
      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Stat icon={CalendarDays} label="Reservations" value={stats.reservations.toLocaleString()}/><Stat icon={BedDouble} label="Rooms" value={stats.rooms.toLocaleString()}/><Stat icon={DollarSign} label="Paid revenue" value={`${stats.revenue.toLocaleString()} ብር`}/><Stat icon={Images} label="Gallery items" value={stats.gallery.toLocaleString()}/></section>
      <section className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-4">{modules.map(([name,description,Icon,href])=>{const I=Icon as typeof BedDouble;return <Link key={name as string} href={href as string} className="group rounded-3xl border border-[#0B3D4A]/10 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#C8A15A]/60"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF4F7]"><I className="h-6 w-6 text-[#0B3D4A]"/></div><h2 className="mt-5 text-xl font-black">{name as string}</h2><p className="mt-2 text-sm leading-6 text-[#182326]/55">{description as string}</p><div className="mt-5 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] text-[#C8A15A]">Manage <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1"/></div></Link>})}</section>
      <section className="mt-8 rounded-[2rem] border border-[#C8A15A]/25 bg-[#D8C7A3]/25 p-7"><LayoutDashboard className="h-6 w-6 text-[#0B3D4A]"/><h2 className="mt-4 font-display text-3xl">Tule Resort operations</h2><p className="mt-2 max-w-3xl text-sm leading-7 text-[#182326]/60">Use Settings to configure tax and service charges without changing code. Payment methods remain ETB-first and can be expanded later.</p></section>
    </main>
  </div>;
}
function Stat({icon:Icon,label,value}:{icon:typeof CalendarDays;label:string;value:string}){return <div className="rounded-3xl border border-[#0B3D4A]/10 bg-white p-5"><Icon className="h-5 w-5 text-[#0B3D4A]"/><p className="mt-4 text-xs font-bold text-[#182326]/50">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>}
