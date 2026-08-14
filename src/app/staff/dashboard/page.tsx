import Link from 'next/link';
import { ArrowRight, BedDouble, CalendarDays, ClipboardList, Images, LayoutDashboard, Settings, UtensilsCrossed, Waves, Sparkles, DollarSign } from 'lucide-react';

const modules = [
  ['Rooms','Manage rooms, photos, prices, amenities and availability.',BedDouble,'/staff/dashboard/rooms'],
  ['Reservations','View, confirm, reject and manage guest reservations.',CalendarDays,'/staff/dashboard/reservations'],
  ['Restaurant','Manage food, prices, photos, categories, availability and orders.',UtensilsCrossed,'/staff/dashboard/menu'],
  ['Tule Aqua','Manage pool information, photos, hours and pricing.',Waves,'/staff/dashboard/tule-aqua'],
  ['Services','Manage wellness, gym, transport, concierge and room service.',Sparkles,'/staff/dashboard/services'],
  ['Gallery','Upload, replace, delete, feature and organize resort photos.',Images,'/staff/dashboard/gallery'],
  ['Orders & Requests','Review guest food orders and service requests.',ClipboardList,'/admin/orders'],
  ['Settings','Manage resort information, contact, hours, booking and social settings.',Settings,'/staff/dashboard/settings'],
];

export default function ManagerDashboard() {
  return <div className="min-h-screen bg-[#F8FBFC] text-[#073B4C]">
    <header className="border-b border-[#0B4F6C]/10 bg-[#073B4C] text-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 md:px-6"><div className="flex items-center gap-3"><img src="/tule-resort-mark.svg" alt="Tule Resort" className="h-11 w-14 rounded-lg object-cover"/><div><p className="text-2xl font-black">Tule Resort</p><p className="text-[9px] font-bold uppercase tracking-[.25em] text-white/45">Manager Dashboard</p></div></div><span className="rounded-full bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.15em]">Lake Luxury</span></div></header>
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
      <section className="rounded-[2rem] bg-[#0B4F6C] p-7 text-white md:p-9"><p className="text-[10px] font-black uppercase tracking-[.24em] text-[#E2C35A]">Control center</p><h1 className="mt-2 text-4xl font-black tracking-[-.05em] md:text-6xl">Manage Tule Resort.</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-white/60">One place for rooms, reservations, dining, services, gallery content and resort settings. Content will be connected to Supabase so managers can update the guest website without editing code.</p></section>
      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Stat icon={CalendarDays} label="Reservations"/><Stat icon={BedDouble} label="Rooms"/><Stat icon={DollarSign} label="Revenue"/><Stat icon={Images} label="Gallery"/></section>
      <section className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-4">{modules.map(([name,description,Icon,href])=>{const I=Icon as typeof BedDouble;return <Link key={name as string} href={href as string} className="group rounded-3xl border border-[#0B4F6C]/10 bg-white p-6 shadow-[0_15px_45px_rgba(7,59,76,.06)] transition hover:-translate-y-1 hover:border-[#C9A227]/40"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF4F7]"><I className="h-6 w-6 text-[#0B4F6C]"/></div><h2 className="mt-5 text-xl font-black">{name as string}</h2><p className="mt-2 text-sm leading-6 text-[#073B4C]/55">{description as string}</p><div className="mt-5 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] text-[#C9A227]">Manage <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1"/></div></Link>})}</section>
      <section className="mt-8 rounded-[2rem] border border-[#C9A227]/25 bg-[#F3E9D2]/55 p-7"><LayoutDashboard className="h-6 w-6 text-[#0B4F6C]"/><h2 className="mt-4 text-2xl font-black">Manager controls everything.</h2><p className="mt-2 max-w-3xl text-sm leading-7 text-[#073B4C]/60">Your selected setup gives the manager full control of resort content, pricing, photos, availability, bookings, orders and settings. User/role controls can remain restricted to administrators when authentication is finalized.</p></section>
    </main>
  </div>;
}
function Stat({icon:Icon,label}:{icon:typeof CalendarDays;label:string}){return <div className="rounded-3xl border border-[#0B4F6C]/10 bg-white p-5"><Icon className="h-5 w-5 text-[#0B4F6C]"/><p className="mt-4 text-xs font-bold text-[#073B4C]/50">{label}</p><p className="mt-1 text-2xl font-black">—</p></div>}
