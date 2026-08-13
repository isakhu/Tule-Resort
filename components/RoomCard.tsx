import Link from 'next/link';
import { BedDouble, Maximize2, Users } from 'lucide-react';

export interface RoomCardData {
  id: string;
  name: string;
  description: string;
  area: string;
  view: string;
  bed: string;
  imageUrl: string;
  features: string[];
}

export default function RoomCard({ room }: { room: RoomCardData }) {
  return (
    <article className="overflow-hidden rounded-[1.8rem] border border-white/10 bg-white/[.035] shadow-[0_22px_60px_rgba(0,0,0,.22)]">
      <div className="relative h-64 overflow-hidden"><img src={room.imageUrl} alt={room.name} className="absolute inset-0 h-full w-full object-cover transition duration-700 hover:scale-105" loading="lazy" /><div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" /><div className="absolute bottom-4 left-4 right-4"><p className="text-[9px] font-black uppercase tracking-[.2em] text-[#F2B84B]">Accommodation</p><h3 className="mt-1 text-3xl font-black tracking-[-.04em] text-white">{room.name}</h3></div></div>
      <div className="p-5"><p className="text-sm leading-relaxed text-white/55">{room.description}</p><div className="mt-4 grid grid-cols-3 gap-2"><div className="rounded-2xl bg-white/5 p-3"><Maximize2 className="h-4 w-4 text-[#F2B84B]" /><p className="mt-2 text-[9px] uppercase tracking-wider text-white/35">Area</p><p className="text-xs font-bold text-white/80">{room.area}</p></div><div className="rounded-2xl bg-white/5 p-3"><BedDouble className="h-4 w-4 text-[#F2B84B]" /><p className="mt-2 text-[9px] uppercase tracking-wider text-white/35">Bed</p><p className="text-xs font-bold text-white/80">{room.bed}</p></div><div className="rounded-2xl bg-white/5 p-3"><Users className="h-4 w-4 text-[#F2B84B]" /><p className="mt-2 text-[9px] uppercase tracking-wider text-white/35">View</p><p className="text-xs font-bold text-white/80">{room.view}</p></div></div><div className="mt-4 flex flex-wrap gap-2">{room.features.map((feature) => <span key={feature} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold text-white/60">{feature}</span>)}</div><Link href={`/guest/rooms/${room.id}`} className="mt-5 block rounded-full bg-[#F2B84B] px-5 py-3 text-center text-xs font-black uppercase tracking-[.12em] text-stone-950">View room</Link></div>
    </article>
  );
}
