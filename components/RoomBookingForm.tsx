'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = { roomId: string; roomName: string; price: number; currency: string; maxGuests: number };

type ReservationResponse = {
  success?: boolean;
  bookingNumber?: string;
  totalPrice?: number;
  currency?: string;
  error?: string;
};

export default function RoomBookingForm({ roomId, roomName, price, currency, maxGuests }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({ checkIn: '', checkOut: '', guests: 1, name: '', phone: '', email: '', special: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const nights = useMemo(() => {
    if (!form.checkIn || !form.checkOut) return 0;
    const checkIn = new Date(`${form.checkIn}T00:00:00`);
    const checkOut = new Date(`${form.checkOut}T00:00:00`);
    const ms = checkOut.getTime() - checkIn.getTime();
    return ms > 0 ? Math.round(ms / 86400000) : 0;
  }, [form.checkIn, form.checkOut]);

  const estimatedTotal = nights * Number(price || 0);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!nights) return setError('Check-out must be after check-in.');
    if (form.guests < 1 || form.guests > maxGuests) return setError(`This room allows up to ${maxGuests} guests.`);

    setLoading(true);
    try {
      const response = await fetch('/api/reservations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          checkIn: form.checkIn,
          checkOut: form.checkOut,
          guests: Number(form.guests),
          guestName: form.name.trim(),
          guestPhone: form.phone.trim(),
          guestEmail: form.email.trim() || null,
          specialRequests: form.special.trim() || null,
        }),
      });

      const result = (await response.json()) as ReservationResponse;
      if (!response.ok) throw new Error(result.error || 'Unable to submit booking.');

      const finalCurrency = result.currency || currency || 'ETB';
      const finalTotal = Number(result.totalPrice ?? estimatedTotal);
      setSuccess(`Booking ${result.bookingNumber ?? 'submitted'} submitted successfully for ${finalTotal.toLocaleString()} ${finalCurrency}. Your reservation is pending confirmation.`);
      setForm({ checkIn: '', checkOut: '', guests: 1, name: '', phone: '', email: '', special: '' });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit booking.');
    } finally {
      setLoading(false);
    }
  }

  const input = 'w-full rounded-xl border border-[#0B4F6C]/15 bg-white px-4 py-3 outline-none focus:border-[#C9A227]';

  return (
    <form onSubmit={submit} className="rounded-[2rem] bg-white p-6 shadow-sm md:p-8">
      <h2 className="text-2xl font-black text-[#073B4C]">Reserve {roomName}</h2>
      <p className="mt-1 text-sm text-[#073B4C]/55">{price.toLocaleString()} {currency || 'ETB'} per night · Up to {maxGuests} guests</p>
      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {success && <p className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-700">{success}</p>}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold">Check-in<input required type="date" className={input + ' mt-2'} value={form.checkIn} onChange={e => setForm({ ...form, checkIn: e.target.value })} /></label>
        <label className="text-sm font-bold">Check-out<input required type="date" className={input + ' mt-2'} value={form.checkOut} onChange={e => setForm({ ...form, checkOut: e.target.value })} /></label>
        <label className="text-sm font-bold">Guests<input required min={1} max={maxGuests} type="number" className={input + ' mt-2'} value={form.guests} onChange={e => setForm({ ...form, guests: Number(e.target.value) })} /></label>
        <label className="text-sm font-bold">Full name<input required className={input + ' mt-2'} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
        <label className="text-sm font-bold">Phone<input required type="tel" className={input + ' mt-2'} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label>
        <label className="text-sm font-bold">Email<input type="email" className={input + ' mt-2'} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
        <label className="text-sm font-bold sm:col-span-2">Special requests<textarea className={input + ' mt-2 min-h-24'} value={form.special} onChange={e => setForm({ ...form, special: e.target.value })} /></label>
      </div>
      <div className="mt-6 flex items-center justify-between rounded-2xl bg-[#EAF4F7] p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#073B4C]/55">Estimated total</p>
          <p className="text-2xl font-black text-[#073B4C]">{estimatedTotal.toLocaleString()} {currency || 'ETB'}</p>
          <p className="mt-1 text-[10px] text-[#073B4C]/45">Final price is verified by Tule Resort when you submit.</p>
        </div>
        <button disabled={loading} className="rounded-xl bg-[#073B4C] px-6 py-3 font-black text-white disabled:opacity-50">{loading ? 'Submitting…' : 'Submit booking'}</button>
      </div>
    </form>
  );
}
