'use client';

import React, { useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, Clock3, Phone, User, BedDouble, Users, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const REQUEST_SERVICES: Record<string, { name: string; amharic: string; price: number; unit: string; accentClass: string; questions: string }> = {
  'pool-passes': { name: 'Pool Access', amharic: 'የመዋኛ ገንዳ', price: 400, unit: 'ETB / adult / day', accentClass: 'text-[#C5A46D]', questions: 'Pool access for a relaxing lakeside day at Tule Aqua (children 300 ETB).' },
  'gym-membership': { name: 'Gym & Fitness', amharic: 'ጂም እና የአካል ብቃት', price: 500, unit: 'ETB / guest / day', accentClass: 'text-[#C5A46D]', questions: 'Gym and fitness access for your stay.' },
  spa: { name: 'Spa & Wellness', amharic: 'ስፓ እና የውበት እንክብካቤ', price: 800, unit: 'ETB / session', accentClass: 'text-[#C5A46D]', questions: 'Request a relaxing spa or wellness session.' },
  'conference-room': { name: 'Conference Room', amharic: 'የስብሰባ ክፍል', price: 3500, unit: 'ETB / half day', accentClass: 'text-[#C5A46D]', questions: 'Reserve a professional meeting space.' },
  'multi-purpose-halls': { name: 'Multi-purpose Hall', amharic: 'ሁለገብ አዳራሽ', price: 15000, unit: 'ETB / day', accentClass: 'text-[#C5A46D]', questions: 'Plan a celebration, gathering or large event.' },
  experiences: { name: 'Resort Experience', amharic: 'ልዩ የመዝናኛ ተሞክሮ', price: 1000, unit: 'ETB / guest', accentClass: 'text-[#C5A46D]', questions: 'Tell us which resort experience you would like.' },
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
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  if (!service) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#163D32] text-[#F5F0E6] px-4">
        <div className="text-center">
          <p className="text-[#F5F0E6]/80 text-sm font-medium">Service not found.</p>
          <Link href="/guest/resort-menu" className="mt-4 inline-block rounded-full bg-[#C5A46D] px-6 py-3 text-xs font-black uppercase tracking-wider text-[#163D32]">
            Back to resort menu
          </Link>
        </div>
      </div>
    );
  }

  async function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'sending') return;
    setStatus('sending');
    setError('');

    try {
      const res = await fetch('/api/service-requests', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: params.serviceId,
          guestName: name.trim(),
          phone: phone.trim(),
          roomNumber: roomNumber.trim() || null,
          requestedDate: date,
          requestedTime: time || null,
          partySize: Number(guests) || 1,
          notes: notes.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setStatus('error');
        setError(json.error || 'We could not submit your request. Please try again.');
        return;
      }

      setStatus('success');
    } catch {
      setStatus('error');
      setError('Network connection error. Please try again.');
    }
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-[#163D32] px-5 text-[#F5F0E6]">
        <div className="mx-auto flex min-h-screen max-w-lg items-center justify-center">
          <div className="w-full rounded-[2rem] border border-[#C5A46D]/30 bg-[#0F2D24] p-8 text-center shadow-2xl">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#C5A46D]/20 text-[#C5A46D]">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <p className="mt-6 text-xs font-black uppercase tracking-[.22em] text-[#C5A46D]">Request received</p>
            <h1 className="mt-2 font-display text-3xl font-medium text-[#F5F0E6]">
              Thank you, {name.split(' ')[0] || 'Guest'}.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#F5F0E6]/80">
              Your {service.name.toLowerCase()} request has been sent to Tule Resort. Our team can confirm the final availability and price.
            </p>
            <Link
              href="/guest/my-activity"
              className="mt-7 block rounded-full bg-[#C5A46D] hover:bg-[#D4B87D] px-5 py-3 text-xs font-black uppercase tracking-[.12em] text-[#163D32] transition"
            >
              View my activity
            </Link>
            <Link href="/guest/resort-menu" className="mt-3 block text-xs font-bold text-[#F5F0E6]/75 hover:text-[#F5F0E6]">
              Back to resort menu
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#163D32] pb-20 text-[#F5F0E6]">
      <header className="border-b border-[#C5A46D]/20 bg-[#0F2D24]">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <Link href="/guest/resort-menu" className="inline-flex items-center gap-2 text-sm font-bold text-[#F5F0E6]/80 hover:text-[#C5A46D] transition">
            <ArrowLeft className="h-4 w-4" /> Resort menu
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 md:py-12">
        <div className="mb-7">
          <p className={`text-xs font-bold uppercase tracking-[.22em] ${service.accentClass}`}>{service.amharic}</p>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl md:text-6xl font-light tracking-tight text-[#F5F0E6]">{service.name}</h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#F5F0E6]/80">{service.questions}</p>
        </div>
        <div className="mb-6 rounded-[1.7rem] border border-[#C5A46D]/25 bg-[#0F2D24] p-5">
          <p className="text-xs font-black uppercase tracking-[.18em] text-[#C5A46D]">Starting price</p>
          <p className="mt-1 font-display text-3xl font-bold text-[#F5F0E6]">
            {service.price.toLocaleString()} <span className="text-sm font-sans font-normal text-[#F5F0E6]/75">{service.unit}</span>
          </p>
        </div>
        <form onSubmit={submitRequest} className="space-y-4 rounded-[2rem] border border-[#C5A46D]/20 bg-[#0F2D24] p-5 md:p-7">
          <div>
            <label htmlFor="req-name" className="mb-2 block text-xs font-black uppercase tracking-[.14em] text-[#F5F0E6]/85">
              Full name
            </label>
            <div className="relative">
              <User className="absolute left-4 top-3.5 h-4 w-4 text-[#C5A46D]" />
              <input
                id="req-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-2xl border border-[#C5A46D]/25 bg-[#163D32]/60 p-3 pl-11 text-sm text-[#F5F0E6] placeholder:text-[#F5F0E6]/50 outline-none focus:border-[#C5A46D]"
                placeholder="Your full name"
              />
            </div>
          </div>
          <div>
            <label htmlFor="req-phone" className="mb-2 block text-xs font-black uppercase tracking-[.14em] text-[#F5F0E6]/85">
              Phone
            </label>
            <div className="relative">
              <Phone className="absolute left-4 top-3.5 h-4 w-4 text-[#C5A46D]" />
              <input
                id="req-phone"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-2xl border border-[#C5A46D]/25 bg-[#163D32]/60 p-3 pl-11 text-sm text-[#F5F0E6] placeholder:text-[#F5F0E6]/50 outline-none focus:border-[#C5A46D]"
                placeholder="+251 ..."
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="req-date" className="mb-2 block text-xs font-black uppercase tracking-[.14em] text-[#F5F0E6]/85">
                Date
              </label>
              <div className="relative">
                <CalendarDays className="absolute left-4 top-3.5 h-4 w-4 text-[#C5A46D]" />
                <input
                  id="req-date"
                  required
                  type="date"
                  min={todayIso}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-2xl border border-[#C5A46D]/25 bg-[#163D32]/60 p-3 pl-11 text-sm text-[#F5F0E6] outline-none focus:border-[#C5A46D]"
                />
              </div>
            </div>
            <div>
              <label htmlFor="req-time" className="mb-2 block text-xs font-black uppercase tracking-[.14em] text-[#F5F0E6]/85">
                Preferred time
              </label>
              <div className="relative">
                <Clock3 className="absolute left-4 top-3.5 h-4 w-4 text-[#C5A46D]" />
                <input
                  id="req-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-2xl border border-[#C5A46D]/25 bg-[#163D32]/60 p-3 pl-11 text-sm text-[#F5F0E6] outline-none focus:border-[#C5A46D]"
                />
              </div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="req-guests" className="mb-2 block text-xs font-black uppercase tracking-[.14em] text-[#F5F0E6]/85">
                Number of guests
              </label>
              <div className="relative">
                <Users className="absolute left-4 top-3.5 h-4 w-4 text-[#C5A46D]" />
                <input
                  id="req-guests"
                  required
                  min="1"
                  max="500"
                  type="number"
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                  className="w-full rounded-2xl border border-[#C5A46D]/25 bg-[#163D32]/60 p-3 pl-11 text-sm text-[#F5F0E6] outline-none focus:border-[#C5A46D]"
                />
              </div>
            </div>
            <div>
              <label htmlFor="req-room" className="mb-2 block text-xs font-black uppercase tracking-[.14em] text-[#F5F0E6]/85">
                Room number (optional)
              </label>
              <div className="relative">
                <BedDouble className="absolute left-4 top-3.5 h-4 w-4 text-[#C5A46D]" />
                <input
                  id="req-room"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  className="w-full rounded-2xl border border-[#C5A46D]/25 bg-[#163D32]/60 p-3 pl-11 text-sm text-[#F5F0E6] placeholder:text-[#F5F0E6]/50 outline-none focus:border-[#C5A46D]"
                  placeholder="If staying with us"
                />
              </div>
            </div>
          </div>
          <div>
            <label htmlFor="req-notes" className="mb-2 block text-xs font-black uppercase tracking-[.14em] text-[#F5F0E6]/85">
              Additional details
            </label>
            <textarea
              id="req-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full resize-none rounded-2xl border border-[#C5A46D]/25 bg-[#163D32]/60 p-3 text-sm text-[#F5F0E6] placeholder:text-[#F5F0E6]/50 outline-none focus:border-[#C5A46D]"
              placeholder="Tell us anything our team should know..."
            />
          </div>
          {status === 'error' && (
            <div role="alert" className="rounded-2xl border border-red-400/30 bg-red-950/60 p-4 text-xs leading-relaxed text-red-200">
              Could not submit the request. {error}
            </div>
          )}
          <button
            disabled={status === 'sending'}
            type="submit"
            className="w-full rounded-full bg-[#C5A46D] hover:bg-[#D4B87D] p-4 text-xs font-black uppercase tracking-[.14em] text-[#163D32] transition hover:scale-[1.01] disabled:cursor-wait disabled:opacity-60 shadow-lg"
          >
            {status === 'sending' ? 'Sending request...' : 'Submit request'}
          </button>
          <p className="text-center text-xs leading-relaxed text-[#F5F0E6]/75">
            The displayed amount is a starting price. Final availability and pricing are confirmed by Tule Resort.
          </p>
        </form>
      </main>
    </div>
  );
}
