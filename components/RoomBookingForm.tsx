'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Props = { roomId: string; roomName: string; price: number; currency: string };

export default function RoomBookingForm({ roomId, roomName, price, currency }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({ checkIn: '', checkOut: '', guests: 1, name: '', phone: '', email: '', special: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const nights = useMemo(() => {
    if (!form.checkIn || !form.checkOut) return 0;
    const ms = new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime();
    return ms > 0 ? Math.ceil(ms / 86400000) : 0;
  }, [form.checkIn, form.checkOut]);
  const total = nights * Number(price || 0);

  async function submit(e: FormEvent) {
    e.preventDefault(); setError(''); setSuccess('');
    if (!nights) return setError('Check-out must be after check-in.');
    setLoading(true);
    const bookingNumber = `TULE-${Date.now().toString().slice(-8)}`;
    const { error: insertError } = await supabase.from('room_reservations').insert({
      booking_number: bookingNumber, room_id: roomId, guest_name: form.name.trim(), guest_phone: form.phone.trim(),
      guest_email: form.email.trim() || null, check_in: form.checkIn, check_out: form.checkOut, guests: Number(form.guests),
      total_price: total, currency: currency || 'ETB', status: 'pending', special_requests: form.special.trim() || null,
    });
    setLoading(false);
    if (insertError) return setError(insertError.message);
    setSuccess(`Booking ${bookingNumber} submitted successfully. Your reservation is pending confirmation.`);
    setForm({ checkIn: '', checkOut: '', guests: 1, name: '', phone: '', email: '', special: '' });
    router.refresh();
  }

  const input = 'w-full rounded-xl border border-[#0B4F6C]/15 bg-white px-4 py-3 outline-none focus:border-[#C9A227]';
  return <form onSubmit={submit} className="rounded-[2rem] bg-white p-6 shadow-sm md:p-8">
    <h2 className="text-2xl font-black text-[#073B4C]">Reserve {roomName}</h2>
    <p className="mt-1 text-sm text-[#073B4C]/55">{price.toLocaleString()} {currency || 'ETB'} per night</p>
    {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {success && <p className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-700">{success}</p>}
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-bold">Check-in<input required type="date" className={input + ' mt-2'} value={form.checkIn} onChange={e=>setForm({...form,checkIn:e.target.value})}/></label>
      <label className="text-sm font-bold">Check-out<input required type="date" className={input + ' mt-2'} value={form.checkOut} onChange={e=>setForm({...form,checkOut:e.target.value})}/></label>
      <label className="text-sm font-bold">Guests<input required min={1} type="number" className={input + ' mt-2'} value={form.guests} onChange={e=>setForm({...form,guests:Number(e.target.value)})}/></label>
      <label className="text-sm font-bold">Full name<input required className={input + ' mt-2'} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
      <label className="text-sm font-bold">Phone<input required type="tel" className={input + ' mt-2'} value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label>
      <label className="text-sm font-bold">Email<input type="email" className={input + ' mt-2'} value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
      <label className="text-sm font-bold sm:col-span-2">Special requests<textarea className={input + ' mt-2 min-h-24'} value={form.special} onChange={e=>setForm({...form,special:e.target.value})}/></label>
    </div>
    <div className="mt-6 flex items-center justify-between rounded-2xl bg-[#EAF4F7] p-4"><div><p className="text-xs font-bold uppercase tracking-wider text-[#073B4C]/55">Estimated total</p><p className="text-2xl font-black text-[#073B4C]">{total.toLocaleString()} {currency || 'ETB'}</p></div><button disabled={loading} className="rounded-xl bg-[#073B4C] px-6 py-3 font-black text-white disabled:opacity-50">{loading ? 'Submitting…' : 'Submit booking'}</button></div>
  </form>;
}
