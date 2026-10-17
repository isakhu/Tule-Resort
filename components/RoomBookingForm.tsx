'use client';

import React, { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  Lock,
  ShieldCheck,
  CheckCircle2,
  Users,
  BedDouble,
  ChevronRight,
  Sparkles,
  CreditCard,
  MapPin,
  Clock
} from 'lucide-react';

interface RoomBookingFormProps {
  roomId: string;
  roomName: string;
  price: number;
  currency?: string;
  maxGuests: number;
  imageUrl?: string;
  roomType?: string;
  bedType?: string;
  sizeSqm?: number;
  location?: string;
  view?: string;
}

type ReservationResponse = {
  success?: boolean;
  bookingNumber?: string;
  totalPrice?: number;
  currency?: string;
  error?: string;
};

export default function RoomBookingForm({
  roomId,
  roomName,
  price,
  currency = 'ETB',
  maxGuests,
  imageUrl,
  roomType,
  bedType,
  sizeSqm,
  location = 'Hawassa, Sidama • Lake Shorefront',
  view = 'Panoramic Lake View',
}: RoomBookingFormProps) {
  const router = useRouter();

  // Tomorrow as default check-in, +3 days check-out
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultOut = new Date(tomorrow);
  defaultOut.setDate(defaultOut.getDate() + 3);

  const formatDateInput = (d: Date) => d.toISOString().split('T')[0];

  const [form, setForm] = useState({
    checkIn: formatDateInput(tomorrow),
    checkOut: formatDateInput(defaultOut),
    guests: Math.min(2, maxGuests),
    name: '',
    phone: '',
    email: '',
    special: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<ReservationResponse | null>(null);

  // Nights calculation
  const nights = useMemo(() => {
    if (!form.checkIn || !form.checkOut) return 0;
    const inDate = new Date(`${form.checkIn}T00:00:00`);
    const outDate = new Date(`${form.checkOut}T00:00:00`);
    const diff = outDate.getTime() - inDate.getTime();
    return diff > 0 ? Math.round(diff / (1000 * 60 * 60 * 24)) : 0;
  }, [form.checkIn, form.checkOut]);

  // Price calculations
  const roomCost = nights * Number(price || 0);
  const taxAndFees = Math.round(roomCost * 0.1); // 10% taxes and service
  const grandTotal = roomCost + taxAndFees;

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return 'Select date';
    const d = new Date(`${dateStr}T00:00:00`);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDayOfWeek = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(`${dateStr}T00:00:00`);
    return d.toLocaleDateString('en-US', { weekday: 'long' });
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (nights <= 0) {
      setError('Check-out date must be after check-in date.');
      return;
    }
    if (form.guests < 1 || form.guests > maxGuests) {
      setError(`This accommodation allows between 1 and ${maxGuests} guests.`);
      return;
    }
    if (!form.name.trim()) {
      setError('Please provide your full legal name.');
      return;
    }
    if (!form.phone.trim()) {
      setError('Please provide a mobile phone number.');
      return;
    }

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
      if (!response.ok) throw new Error(result.error || 'Unable to submit reservation.');

      setSuccess(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit reservation.');
    } finally {
      setLoading(false);
    }
  }

  // ─── BOOKING SUCCESS SCREEN ───
  if (success) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center shadow-xl border border-teal-100 max-w-lg mx-auto space-y-5 animate-in zoom-in-95">
        <div className="h-16 w-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
          <CheckCircle2 className="h-8 w-8" />
        </div>

        <div className="space-y-1">
          <span className="rounded-full bg-teal-50 px-3 py-1 text-[11px] font-black text-[#073B4C] uppercase tracking-wider">
            Pending confirmation
          </span>
          <h2 className="text-2xl font-black text-gray-900 pt-1">
            Reservation request received
          </h2>
          <p className="text-xs text-gray-500">
            Booking Reference:{' '}
            <strong className="text-[#FF6B00] font-mono text-sm">
              {success.bookingNumber || 'Reference pending'}
            </strong>
          </p>
        </div>

        <div className="rounded-2xl bg-[#F8F9FA] p-4 text-left text-xs border border-gray-100 space-y-2.5">
          <div className="flex justify-between">
            <span className="text-gray-500">Room:</span>
            <span className="font-bold text-gray-900">{roomName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Dates:</span>
            <span className="font-bold text-gray-900">
              {formatDateDisplay(form.checkIn)} – {formatDateDisplay(form.checkOut)} ({nights} nights)
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Guests:</span>
            <span className="font-bold text-gray-900">{form.guests} guests</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Payment:</span>
            <span className="font-bold text-gray-900">Pay at resort</span>
          </div>
          <div className="pt-2 border-t border-gray-200 flex justify-between font-black text-sm text-gray-900">
            <span>Total:</span>
            <span className="text-[#FF6B00]">
              {(success.totalPrice || grandTotal).toLocaleString()} {currency}
            </span>
          </div>
        </div>

        <p className="text-[11px] leading-5 text-gray-500">
          This is a reservation request, not a confirmed booking. Please keep your phone available in case the resort needs to discuss availability. Online payment is not processed by this form yet.
        </p>

        <button
          onClick={() => router.push('/guest/rooms')}
          className="w-full rounded-2xl bg-[#073B4C] py-3 text-xs font-bold text-white shadow-md hover:bg-[#0B4F6C] transition-all"
        >
          Return to Accommodations
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="max-w-2xl mx-auto space-y-4">
      {/* ─── CARD 1: ROOM SUMMARY (Image 3 Top Card) ─── */}
      <div className="rounded-3xl bg-white p-4 sm:p-5 shadow-sm border border-gray-100 flex items-center gap-4">
        <div
          className="h-20 w-24 sm:h-24 sm:w-28 rounded-2xl bg-gray-100 bg-cover bg-center shrink-0 border border-gray-200 shadow-inner"
          style={{
            backgroundImage: `url(${imageUrl || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=400&q=80'})`,
          }}
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-base sm:text-lg font-black text-gray-900 truncate mt-0.5">
            {roomName}
          </h3>

          <p className="text-xs text-gray-500 flex items-center gap-1 truncate mt-0.5">
            <MapPin className="h-3.5 w-3.5 text-[#073B4C] shrink-0" />
            {location}
          </p>
        </div>
      </div>

      {/* ─── CARD 2: CHECK-IN / CHECK-OUT DATES (Image 3 Date Card) ─── */}
      <div className="rounded-3xl bg-white p-5 shadow-sm border border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
        {/* Check-In */}
        <div className="space-y-1 sm:pr-4">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-gray-400">
            <CalendarDays className="h-4 w-4 text-[#FF6B00]" />
            Check-in
          </div>
          <p className="text-sm font-black text-gray-900">
            {formatDateDisplay(form.checkIn)}
          </p>
          <p className="text-[11px] text-gray-500 flex items-center gap-1">
            <Clock className="h-3 w-3 text-gray-400" />
            {getDayOfWeek(form.checkIn)} • 3:00 PM
          </p>
          <input
            type="date"
            required
            value={form.checkIn}
            onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
            className="w-full mt-2 rounded-xl border border-gray-200 bg-[#F8F9FA] px-3 py-1.5 text-xs text-gray-800 focus:border-[#FF6B00] focus:outline-none"
          />
        </div>

        {/* Check-Out */}
        <div className="space-y-1 pt-3 sm:pt-0 sm:pl-4">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-gray-400">
            <CalendarDays className="h-4 w-4 text-[#FF6B00]" />
            Check-out
          </div>
          <p className="text-sm font-black text-gray-900">
            {formatDateDisplay(form.checkOut)}
          </p>
          <p className="text-[11px] text-gray-500 flex items-center gap-1">
            <Clock className="h-3 w-3 text-gray-400" />
            {getDayOfWeek(form.checkOut)} • 12:00 PM
          </p>
          <input
            type="date"
            required
            value={form.checkOut}
            onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
            className="w-full mt-2 rounded-xl border border-gray-200 bg-[#F8F9FA] px-3 py-1.5 text-xs text-gray-800 focus:border-[#FF6B00] focus:outline-none"
          />
        </div>
      </div>

      {/* ─── CARD 3: ROOM DETAILS CARD (Image 3) ─── */}
      <div className="rounded-3xl bg-white p-5 shadow-sm border border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-teal-50 text-[#073B4C] flex items-center justify-center font-bold shrink-0">
            <BedDouble className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-sm font-black text-gray-900">{roomType || 'Deluxe Luxury Suite'}</h4>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-0.5">
              <span>{bedType || '1 King Bed'} • {sizeSqm || 42} m²</span>
              <span>•</span>
              <span className="flex items-center gap-1 font-semibold text-[#073B4C]">
                <Users className="h-3.5 w-3.5" />
                Max {maxGuests} guests
              </span>
            </div>
          </div>
        </div>

        {/* Guests selector */}
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Guests</label>
          <select
            value={form.guests}
            onChange={(e) => setForm({ ...form, guests: Number(e.target.value) })}
            className="rounded-xl border border-gray-200 bg-[#F8F9FA] px-3 py-1.5 text-xs font-bold text-gray-800 focus:border-[#FF6B00] focus:outline-none"
          >
            {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? 'Guest' : 'Guests'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ─── CARD 4: GUEST INFORMATION ─── */}
      <div className="rounded-3xl bg-white p-5 shadow-sm border border-gray-100 space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-gray-400">
          Primary Guest Information
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">
              Full Legal Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Dawit Haile"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-[#F8F9FA] px-3.5 py-2.5 text-xs text-gray-800 focus:border-[#FF6B00] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">
              Phone Number *
            </label>
            <input
              type="tel"
              required
              placeholder="+251 911 000 000"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-[#F8F9FA] px-3.5 py-2.5 text-xs text-gray-800 focus:border-[#FF6B00] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">
              Email Address (Optional)
            </label>
            <input
              type="email"
              placeholder="guest@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-[#F8F9FA] px-3.5 py-2.5 text-xs text-gray-800 focus:border-[#FF6B00] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">
              Special Requests (Optional)
            </label>
            <input
              type="text"
              placeholder="High floor, late arrival..."
              value={form.special}
              onChange={(e) => setForm({ ...form, special: e.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-[#F8F9FA] px-3.5 py-2.5 text-xs text-gray-800 focus:border-[#FF6B00] focus:bg-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* ─── CARD 5: PRICE SUMMARY (Image 3 Price Summary) ─── */}
      <div className="rounded-3xl bg-white p-5 shadow-sm border border-gray-100 space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-gray-400">
          Price Summary
        </h4>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between text-gray-600">
            <span>Room ({nights} {nights === 1 ? 'night' : 'nights'} × {price.toLocaleString()} {currency})</span>
            <span className="font-bold text-gray-900">{roomCost.toLocaleString()} {currency}</span>
          </div>

          <div className="flex items-center justify-between text-gray-600">
            <span>Resort Service &amp; Taxes (10%)</span>
            <span className="font-bold text-gray-900">{taxAndFees.toLocaleString()} {currency}</span>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm font-black text-gray-900">Total Price</span>
            <span className="text-xl font-black text-[#FF6B00]">
              {grandTotal.toLocaleString()} {currency}
            </span>
          </div>
        </div>
      </div>

      {/* ─── PAYMENT — ONLINE GATEWAYS ARE NOT CONNECTED YET ─── */}
      <div className="rounded-3xl bg-white p-5 shadow-sm border border-gray-100 space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-gray-400">
          Payment
        </h4>
        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#073B4C] text-white">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Pay at the resort</p>
            <p className="mt-1 text-[11px] leading-5 text-gray-500">
              No online payment is collected here. Telebirr, CBE Birr and bank-payment integration will be added after the resort's payment service is configured.
            </p>
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="rounded-2xl bg-red-50 p-3.5 text-xs font-bold text-red-700 border border-red-200 text-center">
          {error}
        </div>
      )}

      {/* ─── PRIMARY STICKY / BOTTOM CTA (Image 3 Bottom Button) ─── */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={loading || nights <= 0}
          className="w-full rounded-2xl bg-gradient-to-r from-[#073B4C] via-[#0B4F6C] to-[#073B4C] hover:from-[#FF6B00] hover:to-[#E85D04] py-4 text-xs font-black uppercase tracking-wider text-white shadow-xl shadow-teal-900/20 hover:shadow-orange-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Lock className="h-4 w-4" />
          {loading ? 'Confirming Reservation...' : `Submit Reservation Request (${grandTotal.toLocaleString()} ${currency})`}
        </button>

        <p className="mt-2 text-center text-[10px] text-gray-400 flex items-center justify-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          Your reservation request is sent securely. Payment is not collected online in this flow.
        </p>
      </div>
    </form>
  );
}
