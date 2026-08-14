'use client';

import React, { useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, Clock3, Phone, User, BedDouble, Users, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

const REQUEST_SERVICES: Record<string, { name: string; amharic: string; price: number; unit: string; color: string; questions: string }> = {
  'pool-passes': { name: 'Pool Access', amharic: 'የመዋኛ ገንዳ', price: 250, unit: 'ETB / guest / day', color: '#5FA7C9', questions: 'Pool access for a relaxing day at Tule Resort.' },
  'gym-membership': { name: 'Gym & Fitness', amharic: 'ጂም እና የአካል ብቃት', price: 500, unit: 'ETB / guest / day', color: '#7DBA62', questions: 'Gym and fitness access for your stay.' },
  spa: { name: 'Spa & Wellness', amharic: 'ስፓ እና የውበት እንክብካቤ', price: 800, unit: 'ETB / session', color: '#C9828E', questions: 'Request a relaxing spa or wellness session.' },
  'conference-room': { name: 'Conference Room', amharic: 'የስብሰባ ክፍል', price: 3500, unit: 'ETB / half day', color: '#8D9CC8', questions: 'Reserve a professional meeting space.' },
  'multi-purpose-halls': { name: 'Multi-purpose Hall', amharic: 'ሁለገብ አዳራሽ', price: 15000, unit: 'ETB / day', color: '#E56B4D', questions: 'Plan a celebration, gathering or large event.' },
  experiences: { name: 'Resort Experience', amharic: 'ልዩ የመዝናኛ ተሞክሮ', price: 1000, unit: 'ETB / guest', color: '#86A96B', questions: 'Tell us which resort experience you would like.' },
};

export default function RequestPage() {
  const params = useParams<{ serviceId: string }>();
  const service = useMemo(() => REQUEST_SERVICES[params.serviceId], [params.serviceId]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [guests, setGuests] = useState('1');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  if (!service) {
    return <div className="min-h-screen grid place-items-center bg-[#0C0B09] text-white"><div className="text-center"><p className="text-white/50">Service not found.</p><Link href="/guest/resort-menu" className="mt-4 inline-block rounded-full bg-[#F2B84B] px-5 py-3 text-xs font-black uppercase text-stone-950">Back to resort menu</Link></div></div>;
  }

  async function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('sending');
    setError('');
    const requestNotes = [`SERVICE REQUEST: ${service.name}`, `Amharic: ${service.amharic}`, `Requested date: ${date}`, `Requested time: ${time || 'Flexible'}`, `Guests: ${guests}`, `Room: ${roomNumber || 'Not provided'}`, `Details: ${notes || 'None'}`].join('\n');

    const { error: insertError } = await supabase.from('orders').insert({
      guest_name: name.trim(),
      room_number: roomNumber.trim() || null,
      items: [{ id: `service-${params.serviceId}`, name: service.name, quantity: Number(guests), price: service.price }],
      total: service.price * Number(guests),
      total_amount: service.price * Number(guests),
      service_type: `resort_${params.serviceId}`,
      special_instructions: requestNotes,
      notes: requestNotes,
      status: 'pending',
    });

    if (insertError) {
      setStatus('error');
      setError(insertError.message || 'We could not submit your request. Please try again.');
      return;
    }
    setStatus('success');
  }

  if (status === 'success') {
    return <div className="min-h-screen bg-[#0C0B09] px-5 text-white"><div className="mx-auto flex min-h-screen max-w-lg items-center justify-center"><div className="w-full rounded-[2rem] border border-white/10 bg-white/[.05] p-8 text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full" style={{ backgroundColor: `${service.color}22` }}><CheckCircle2 className="h-8 w-8" style={{ color: service.color }} /></div><p className="mt-6 text-[10px] font-black uppercase tracking-[.25em]" style={{ color: service.color }}>Request received</p><h1 className="mt-2 text-3xl font-black">Thank you, {name.split(' ')[0] || 'Guest'}.</h1><p className="mt-3 text-sm leading-relaxed text-white/55">Your {service.name.toLowerCase()} request has been sent to Tule Resort. Our team can confirm the final availability and price.</p><Link href="/guest/my-activity" className="mt-7 block rounded-full px-5 py-3 text-xs font-black uppercase tracking-[.12em] text-stone-950" style={{ backgroundColor: service.color }}>View my activity</Link><Link href="/guest/resort-menu" className="mt-3 block text-xs font-bold text-white/45 hover:text-white">Back to resort menu</Link></div></div></div>;
  }

  return (
    <div className="min-h-screen bg-[#0C0B09] pb-20 text-white">
      <header className="border-b border-white/10 bg-[#17120D]"><div className="mx-auto max-w-3xl px-4 py-4"><Link href="/guest/resort-menu" className="inline-flex items-center gap-2 text-sm font-bold text-white/55 hover:text-white"><ArrowLeft className="h-4 w-4" />Resort menu</Link></div></header>
      <main className="mx-auto max-w-3xl px-4 py-8 md:py-12"><div className="mb-7"><p className="text-[11px] font-bold uppercase tracking-[.25em]" style={{ color: service.color }}>{service.amharic}</p><h1 className="mt-2 text-5xl md:text-6xl font-black uppercase tracking-[-.06em]">{service.name}</h1><p className="mt-4 max-w-xl text-sm leading-relaxed text-white/55">{service.questions}</p></div>
        <div className="mb-6 rounded-[1.7rem] border border-white/10 bg-white/[.04] p-5"><p className="text-[9px] font-black uppercase tracking-[.2em] text-white/35">Starting price</p><p className="mt-1 text-3xl font-black">{service.price.toLocaleString()} <span className="text-sm text-white/45">{service.unit}</span></p></div>
        <form onSubmit={submitRequest} className="space-y-4 rounded-[2rem] border border-white/10 bg-white/[.04] p-5 md:p-7">
          <div><label className="mb-2 block text-[10px] font-black uppercase tracking-[.16em] text-white/45">Full name</label><div className="relative"><User className="absolute left-4 top-3.5 h-4 w-4 text-white/30" /><input required value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/20 p-3 pl-11 text-sm outline-none focus:border-[#F2B84B]" placeholder="Your full name" /></div></div>
          <div><label className="mb-2 block text-[10px] font-black uppercase tracking-[.16em] text-white/45">Phone</label><div className="relative"><Phone className="absolute left-4 top-3.5 h-4 w-4 text-white/30" /><input required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/20 p-3 pl-11 text-sm outline-none focus:border-[#F2B84B]" placeholder="+251 ..." /></div></div>
          <div className="grid gap-4 md:grid-cols-2"><div><label className="mb-2 block text-[10px] font-black uppercase tracking-[.16em] text-white/45">Date</label><div className="relative"><CalendarDays className="absolute left-4 top-3.5 h-4 w-4 text-white/30" /><input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/20 p-3 pl-11 text-sm outline-none focus:border-[#F2B84B]" /></div></div><div><label className="mb-2 block text-[10px] font-black uppercase tracking-[.16em] text-white/45">Preferred time</label><div className="relative"><Clock3 className="absolute left-4 top-3.5 h-4 w-4 text-white/30" /><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/20 p-3 pl-11 text-sm outline-none focus:border-[#F2B84B]" /></div></div></div>
          <div className="grid gap-4 md:grid-cols-2"><div><label className="mb-2 block text-[10px] font-black uppercase tracking-[.16em] text-white/45">Number of guests</label><div className="relative"><Users className="absolute left-4 top-3.5 h-4 w-4 text-white/30" /><input required min="1" max="500" type="number" value={guests} onChange={(e) => setGuests(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/20 p-3 pl-11 text-sm outline-none focus:border-[#F2B84B]" /></div></div><div><label className="mb-2 block text-[10px] font-black uppercase tracking-[.16em] text-white/45">Room number (optional)</label><div className="relative"><BedDouble className="absolute left-4 top-3.5 h-4 w-4 text-white/30" /><input value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/20 p-3 pl-11 text-sm outline-none focus:border-[#F2B84B]" placeholder="If staying with us" /></div></div></div>
          <div><label className="mb-2 block text-[10px] font-black uppercase tracking-[.16em] text-white/45">Additional details</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="w-full resize-none rounded-2xl border border-white/10 bg-black/20 p-3 text-sm outline-none focus:border-[#F2B84B]" placeholder="Tell us anything our team should know..." /></div>
          {status === 'error' && <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-xs leading-relaxed text-red-200">Could not submit the request. {error}</div>}
          <button disabled={status === 'sending'} type="submit" className="w-full rounded-full p-4 text-xs font-black uppercase tracking-[.14em] text-stone-950 transition hover:scale-[1.01] disabled:cursor-wait disabled:opacity-60" style={{ backgroundColor: service.color }}>{status === 'sending' ? 'Sending request...' : 'Submit request'}</button>
          <p className="text-center text-[10px] leading-relaxed text-white/30">The displayed amount is a starting price. Final availability and pricing are confirmed by Tule Resort.</p>
        </form>
      </main>
    </div>
  );
}
