'use client';

import { FormEvent, useMemo, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

function makeBookingNumber() {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TULE-${stamp}-${random}`;
}

function nightsBetween(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
}

export default function RoomBookingForm({ roomId, roomName, price, currency, maxGuests }: { roomId: string; roomName: string; price: number; currency: string; maxGuests: number }) {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [bookingNumber, setBookingNumber] = useState('');

  const nights = useMemo(() => nightsBetween(checkIn, checkOut), [checkIn, checkOut]);
  const total = nights * price;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (nights < 1) return setError('Please choose a valid check-in and check-out date.');
    if (guests > maxGuests) return setError(`This room allows up to ${maxGuests} guests.`);

    setSubmitting(true);
    const booking = makeBookingNumber();
    const { error: insertError } = await supabase.from('room_reservations').insert({
      booking_number: booking,
      room_id: roomId,
      guest_name: guestName.trim(),
      guest_phone: guestPhone.trim(),
      guest_email: guestEmail.trim() || null,
      check_in: checkIn,
      check_out: checkOut,
      guests,
      total_price: total,
      currency,
      status: 'pending',
      special_requests: specialRequests.trim() || null,
    });

    setSubmitting(false);
    if (insertError) {
      setError(insertError.message.includes('already booked') ? 'This room is already booked for those dates. Please choose different dates.' : insertError.message);
      return;
    }
    setBookingNumber(booking);
  }

  if (bookingNumber) {
    return (
      <div className="rounded-[2rem] border border-[#0B4F6C]/10 bg-white p-7 shadow-sm md:p-10">
        <div className="mx-auto max-w-xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#EAF4F7] text-[#0B4F6C]"><CheckCircle2 className="h-8 w-8" /></div>
          <p className="mt-6 text-[10px] font-black uppercase tracking-[.25em] text-[#C9A227]">Reservation received</p>
          <h2 className="mt-2 text-4xl font-black tracking-[-.04em] text-[#073B4C]">You're booked for review.</h2>
          <p className="mt-4 text-sm leading-7 text-[#073B4C]/60">Your reservation for {roomName} is pending manager confirmation.</p>
          <div className="mt-7 rounded-2xl bg-[#073B4C] p-5 text-white"><p className="text-[9px] font-black uppercase tracking-[.2em] text-white/50">Booking number</p><p className="mt-2 text-2xl font-black tracking-wider">{bookingNumber}</p></div>
          <p className="mt-5 text-xs text-[#073B4C]/50">Keep this booking number for your records.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-[2rem] border border-[#0B4F6C]/10 bg-white p-6 shadow-sm md:p-9">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="text-sm font-bold text-[#073B4C]">Check-in<input required type="date" value={checkIn} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setCheckIn(e.target.value)} className="mt-2 w-full rounded-xl border border-[#0B4F6C]/15 px-4 py-3 outline-none focus:border-[#0B4F6C]" /></label>
        <label className="text-sm font-bold text-[#073B4C]">Check-out<input required type="date" value={checkOut} min={checkIn || new Date().toISOString().slice(0, 10)} onChange={(e) => setCheckOut(e.target.value)} className="mt-2 w-full rounded-xl border border-[#0B4F6C]/15 px-4 py-3 outline-none focus:border-[#0B4F6C]" /></label>
        <label className="text-sm font-bold text-[#073B4C]">Guests<input required type="number" min={1} max={maxGuests} value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="mt-2 w-full rounded-xl border border-[#0B4F6C]/15 px-4 py-3 outline-none focus:border-[#0B4F6C]" /></label>
        <label className="text-sm font-bold text-[#073B4C]">Full name<input required value={guestName} onChange={(e) => setGuestName(e.target.value)} className="mt-2 w-full rounded-xl border border-[#0B4F6C]/15 px-4 py-3 outline-none focus:border-[#0B4F6C]" /></label>
        <label className="text-sm font-bold text-[#073B4C]">Phone<input required type="tel" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} className="mt-2 w-full rounded-xl border border-[#0B4F6C]/15 px-4 py-3 outline-none focus:border-[#0B4F6C]" /></label>
        <label className="text-sm font-bold text-[#073B4C]">Email <span className="font-normal text-[#073B4C]/40">(optional)</span><input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-[#0B4F6C]/15 px-4 py-3 outline-none focus:border-[#0B4F6C]" /></label>
        <label className="text-sm font-bold text-[#073B4C] md:col-span-2">Special requests <span className="font-normal text-[#073B4C]/40">(optional)</span><textarea value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-[#0B4F6C]/15 px-4 py-3 outline-none focus:border-[#0B4F6C]" /></label>
      </div>
      <div className="mt-6 flex flex-col gap-4 rounded-2xl bg-[#EAF4F7] p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-[#0B4F6C]/50">Estimated total</p><p className="mt-1 text-2xl font-black text-[#073B4C]">{total.toLocaleString()} {currency}</p><p className="text-xs text-[#073B4C]/50">{nights || 0} night{nights === 1 ? '' : 's'} · {price.toLocaleString()} {currency}/night</p></div><button disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0B4F6C] px-7 py-3.5 text-xs font-black uppercase tracking-[.14em] text-white transition hover:bg-[#073B4C] disabled:cursor-wait disabled:opacity-60">{submitting && <Loader2 className="h-4 w-4 animate-spin" />} {submitting ? 'Submitting…' : 'Request reservation'}</button></div>
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
      <p className="mt-4 text-xs leading-5 text-[#073B4C]/45">Payment is due at the resort. Your reservation remains pending until Tule Resort confirms it.</p>
    </form>
  );
}
