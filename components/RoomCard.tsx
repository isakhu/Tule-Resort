import Link from 'next/link';
import { BedDouble, Maximize2, Users } from 'lucide-react';

export interface RoomCardData {
  id: string;
  name: string;
  amharicName: string;
  description: string;
  price: number;
  area: string;
  view: string;
  bed: string;
  imageUrl: string;
  features: string[];
}

export default function RoomCard({ room }: { room: RoomCardData }) {
  return (
    <article className="group overflow-hidden rounded-[2rem] border border-white/10 bg-[#15130F] shadow-[0_24px_60px_rgba(0,0,0,.28)] transition duration-500 hover:-translate-y-1">
      <div className="relative h-[420px] overflow-hidden">
        <img src={room.imageUrl} alt={room.name} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.08)_0%,rgba(0,0,0,.15)_35%,rgba(0,0,0,.92)_100%)]" />
        <div className="absolute left-5 right-5 top-5 flex items-center justify-between"><span className="rounded-full border border-white/15 bg-black/40 px-3 py-2 text-[9px] font-black uppercase tracking-[.2em] text-white backdrop-blur-md">Accommodation</span><div className="rounded-2xl bg-white/95 px-4 py-3 shadow-xl"><p className="text-[9px] font-black uppercase tracking-[.18em] text-stone-500">Starting price</p><p className="text-2xl leading-none font-black text-stone-950">{room.price.toLocaleString()} <span className="text-xs align-middle">ETB</span></p><p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-stone-500">per night</p></div></div>
        <div className="absolute bottom-5 left-5 right-5"><p className="text-[11px] font-bold uppercase tracking-[.22em] text-[#F2B84B]">{room.amharicName}</p><h3 className="mt-1 text-4xl font-black tracking-[-.05em] text-white">{room.name}</h3></div>
      </div>
      <div className="p-5"><p className="text-sm leading-relaxed text-white/60">{room.description}</p><div className="mt-4 grid grid-cols-3 gap-2"><div className="rounded-2xl bg-white/5 p-3"><Maximize2 className="h-4 w-4 text-[#F2B84B]" /><p className="mt-2 text-[9px] uppercase tracking-wider text-white/35">Guests</p><p className="text-xs font-bold text-white/80">{room.area}</p></div><div className="rounded-2xl bg-white/5 p-3"><BedDouble className="h-4 w-4 text-[#F2B84B]" /><p className="mt-2 text-[9px] uppercase tracking-wider text-white/35">Room</p><p className="text-xs font-bold text-white/80">{room.bed}</p></div><div className="rounded-2xl bg-white/5 p-3"><Users className="h-4 w-4 text-[#F2B84B]" /><p className="mt-2 text-[9px] uppercase tracking-wider text-white/35">View</p><p className="text-xs font-bold text-white/80">{room.view}</p></div></div><div className="mt-4 flex flex-wrap gap-2">{room.features.map((feature) => <span key={feature} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold text-white/60">{feature}</span>)}</div><Link href="/guest/rooms" className="mt-5 block rounded-full bg-[#F2B84B] px-5 py-3 text-center text-xs font-black uppercase tracking-[.12em] text-stone-950 transition hover:scale-[1.01]">View room options</Link></div>
    </article>
  );
}
