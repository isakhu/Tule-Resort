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
  Building,
  Smartphone,
  MapPin,
  Star,
  Check,
  Clock,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Copy,
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

  const [paymentMethod, setPaymentMethod] = useState<'telebirr' | 'cbe_birr' | 'bank_transfer' | 'pay_at_resort'>('telebirr');
  const [paymentReference, setPaymentReference] = useState('');
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    message: string;
    bankName?: string;
    payerName?: string;
    amount?: number;
    currency?: string;
    alreadyRecorded?: boolean;
  } | null>(null);

  function copyToClipboard(text: string, key: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  }

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<ReservationResponse & { paymentStatus?: string; paymentReference?: string | null; isVerified?: boolean } | null>(null);

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

  // Verify payment reference with Verify.ET API
  async function handleVerifyPayment() {
    const cleanRef = paymentReference.trim();
    if (!cleanRef) {
      setError('Please enter your transaction reference or receipt number before verifying.');
      return;
    }

    setVerifyingPayment(true);
    setError('');
    setVerificationResult(null);

    try {
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: cleanRef,
          bank: paymentMethod,
          expectedAmount: grandTotal,
          currency,
        }),
      });

      const data = await res.json();
      if (!res.ok && data.error) {
        setVerificationResult({
          verified: false,
          message: data.error,
        });
        return;
      }

      setVerificationResult({
        verified: Boolean(data.verified),
        message: data.message || (data.verified ? 'Payment verified successfully.' : 'Payment could not be verified on the network.'),
        bankName: data.bankName,
        payerName: data.payerName,
        amount: data.amount,
        currency: data.currency || currency,
        alreadyRecorded: data.alreadyRecorded,
      });
    } catch {
      setVerificationResult({
        verified: false,
        message: 'Network error contacting Verify.ET payment verification service.',
      });
    } finally {
      setVerifyingPayment(false);
    }
  }

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

    // If digital payment selected and reference entered, make sure it was not rejected as duplicate
    if (paymentMethod !== 'pay_at_resort' && verificationResult?.alreadyRecorded) {
      setError('This transaction reference has already been used. Please provide a new transaction code or choose Pay at Resort.');
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
          paymentMethod,
          paymentReference: paymentReference.trim() || undefined,
          paymentStatus: verificationResult?.verified ? 'paid' : 'pending',
        }),
      });

      const result = await response.json();
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
            Booking Confirmed
          </span>
          <h2 className="text-2xl font-black text-gray-900 pt-1">
            Reservation Confirmed!
          </h2>
          <p className="text-xs text-gray-500">
            Booking Reference:{' '}
            <strong className="text-[#FF6B00] font-mono text-sm">
              {success.bookingNumber || 'TR-RESERVATION'}
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
            <span className="font-bold text-gray-900 capitalize">{paymentMethod.replace('_', ' ')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Payment Status:</span>
            <span className={`font-bold uppercase tracking-wider text-[11px] px-2 py-0.5 rounded-md ${
              success.paymentStatus === 'paid'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {success.paymentStatus === 'paid' ? '✓ Paid & Verified via Verify.ET' : 'Pending (Pay at Check-in)'}
            </span>
          </div>
          {success.paymentReference && (
            <div className="flex justify-between">
              <span className="text-gray-500">Transaction Ref:</span>
              <span className="font-mono font-bold text-gray-900">{success.paymentReference}</span>
            </div>
          )}
          <div className="pt-2 border-t border-gray-200 flex justify-between font-black text-sm text-gray-900">
            <span>Total:</span>
            <span className="text-[#FF6B00]">
              {(success.totalPrice || grandTotal).toLocaleString()} {currency}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-gray-500">
          A confirmation SMS has been prepared for {form.phone}. Our lakeside reception concierge is ready to welcome you.
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
          <div className="flex items-center gap-1.5 text-amber-500">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="text-xs font-black text-gray-800">5.0</span>
            <span className="text-[10px] text-gray-400 font-semibold">(2.4k reviews)</span>
          </div>

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

      {/* ─── CARD 6: PAYMENT METHOD (Image 3 Payment Method) ─── */}
      <div className="rounded-3xl bg-white p-5 shadow-sm border border-gray-100 space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-gray-400">
          Payment Method
        </h4>

        <div className="space-y-2">
          {/* Telebirr */}
          <label
            onClick={() => setPaymentMethod('telebirr')}
            className={`flex items-center justify-between rounded-2xl border p-3.5 cursor-pointer transition-all ${
              paymentMethod === 'telebirr'
                ? 'border-[#FF6B00] bg-orange-50/30 ring-1 ring-[#FF6B00]'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-xs shadow-sm">
                Tb
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">Telebirr</p>
                <p className="text-[10px] text-gray-400">Instant Ethio Telecom mobile pay</p>
              </div>
            </div>
            <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${paymentMethod === 'telebirr' ? 'border-[#FF6B00] bg-[#FF6B00]' : 'border-gray-300'}`}>
              {paymentMethod === 'telebirr' && <Check className="h-3 w-3 text-white" />}
            </div>
          </label>

          {/* CBE Birr */}
          <label
            onClick={() => setPaymentMethod('cbe_birr')}
            className={`flex items-center justify-between rounded-2xl border p-3.5 cursor-pointer transition-all ${
              paymentMethod === 'cbe_birr'
                ? 'border-[#FF6B00] bg-orange-50/30 ring-1 ring-[#FF6B00]'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-purple-700 text-white flex items-center justify-center font-black text-xs shadow-sm">
                CBE
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">CBE Birr</p>
                <p className="text-[10px] text-gray-400">Commercial Bank of Ethiopia mobile</p>
              </div>
            </div>
            <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${paymentMethod === 'cbe_birr' ? 'border-[#FF6B00] bg-[#FF6B00]' : 'border-gray-300'}`}>
              {paymentMethod === 'cbe_birr' && <Check className="h-3 w-3 text-white" />}
            </div>
          </label>

          {/* Bank Transfer */}
          <label
            onClick={() => setPaymentMethod('bank_transfer')}
            className={`flex items-center justify-between rounded-2xl border p-3.5 cursor-pointer transition-all ${
              paymentMethod === 'bank_transfer'
                ? 'border-[#FF6B00] bg-orange-50/30 ring-1 ring-[#FF6B00]'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                <Building className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">Direct Bank Transfer</p>
                <p className="text-[10px] text-gray-400">Awash, CBE, Dashen, Bank of Abyssinia</p>
              </div>
            </div>
            <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${paymentMethod === 'bank_transfer' ? 'border-[#FF6B00] bg-[#FF6B00]' : 'border-gray-300'}`}>
              {paymentMethod === 'bank_transfer' && <Check className="h-3 w-3 text-white" />}
            </div>
          </label>

          {/* Pay at Resort */}
          <label
            onClick={() => setPaymentMethod('pay_at_resort')}
            className={`flex items-center justify-between rounded-2xl border p-3.5 cursor-pointer transition-all ${
              paymentMethod === 'pay_at_resort'
                ? 'border-[#FF6B00] bg-orange-50/30 ring-1 ring-[#FF6B00]'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#073B4C] text-white flex items-center justify-center shadow-sm">
                <CreditCard className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">Pay at Resort Check-in</p>
                <p className="text-[10px] text-gray-400">Pay cash or card at our front desk</p>
              </div>
            </div>
            <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${paymentMethod === 'pay_at_resort' ? 'border-[#FF6B00] bg-[#FF6B00]' : 'border-gray-300'}`}>
              {paymentMethod === 'pay_at_resort' && <Check className="h-3 w-3 text-white" />}
            </div>
          </label>
        </div>

        {/* ─── VERIFY.ET REAL-TIME DIGITAL PAYMENT VERIFICATION PANEL ─── */}
        {paymentMethod !== 'pay_at_resort' && (
          <div className="mt-4 rounded-2xl border border-teal-100 bg-[#F4F9FA] p-4 space-y-3.5">
            <div className="flex items-center justify-between border-b border-teal-200/60 pb-2">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#007042] text-[10px] font-black text-white">
                  ✓
                </span>
                <span className="text-xs font-black text-[#0B3D4A]">
                  Verify.ET Automated Bank Check
                </span>
              </div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Non-Custodial
              </span>
            </div>

            {/* Official Resort Settlement Account Info */}
            <div className="rounded-xl bg-white p-3.5 text-xs border border-gray-100 space-y-2.5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Account Holder / Beneficiary:
                </span>
                <span className="font-extrabold text-[#0B3D4A] bg-[#EAF4F7] px-2.5 py-0.5 rounded-md text-[11px]">
                  Yishak Tule Karesso
                </span>
              </div>

              {paymentMethod === 'telebirr' && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-orange-50/60 border border-orange-100 font-mono">
                  <div>
                    <span className="text-[10px] text-gray-500 block font-sans font-bold">Telebirr Account Number</span>
                    <span className="font-black text-sm text-[#FF6B00]">0995781422</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('0995781422', 'telebirr')}
                    className="flex items-center gap-1 text-[11px] font-bold text-gray-700 bg-white border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer shadow-xs"
                  >
                    {copiedKey === 'telebirr' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-gray-500" />}
                    {copiedKey === 'telebirr' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}

              {paymentMethod === 'cbe_birr' && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-50/60 border border-purple-100 font-mono">
                  <div>
                    <span className="text-[10px] text-gray-500 block font-sans font-bold">CBE Birr Account Number</span>
                    <span className="font-black text-sm text-purple-700">0995781422</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('0995781422', 'cbe_birr')}
                    className="flex items-center gap-1 text-[11px] font-bold text-gray-700 bg-white border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer shadow-xs"
                  >
                    {copiedKey === 'cbe_birr' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-gray-500" />}
                    {copiedKey === 'cbe_birr' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}

              {paymentMethod === 'bank_transfer' && (
                <div className="space-y-2 pt-0.5">
                  {/* Commercial Bank of Ethiopia */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-gray-100 font-mono">
                    <div>
                      <span className="text-[10px] text-gray-500 block font-sans font-bold">Commercial Bank of Ethiopia (CBE)</span>
                      <span className="font-black text-xs text-gray-900">1000575458711</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('1000575458711', 'cbe')}
                      className="flex items-center gap-1 text-[10px] font-bold text-gray-700 bg-white border border-gray-200 px-2.5 py-1 rounded-md hover:bg-gray-50 cursor-pointer shadow-xs"
                    >
                      {copiedKey === 'cbe' ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 text-gray-500" />}
                      {copiedKey === 'cbe' ? 'Copied' : 'Copy'}
                    </button>
                  </div>

                  {/* Bank of Abyssinia */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-gray-100 font-mono">
                    <div>
                      <span className="text-[10px] text-gray-500 block font-sans font-bold">Bank of Abyssinia (BOA)</span>
                      <span className="font-black text-xs text-gray-900">138186512</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('138186512', 'boa')}
                      className="flex items-center gap-1 text-[10px] font-bold text-gray-700 bg-white border border-gray-200 px-2.5 py-1 rounded-md hover:bg-gray-50 cursor-pointer shadow-xs"
                    >
                      {copiedKey === 'boa' ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 text-gray-500" />}
                      {copiedKey === 'boa' ? 'Copied' : 'Copy'}
                    </button>
                  </div>

                  {/* Awash Bank */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-gray-100 font-mono">
                    <div>
                      <span className="text-[10px] text-gray-500 block font-sans font-bold">Awash Bank</span>
                      <span className="font-black text-xs text-gray-900">01320687351800</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('01320687351800', 'awash')}
                      className="flex items-center gap-1 text-[10px] font-bold text-gray-700 bg-white border border-gray-200 px-2.5 py-1 rounded-md hover:bg-gray-50 cursor-pointer shadow-xs"
                    >
                      {copiedKey === 'awash' ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 text-gray-500" />}
                      {copiedKey === 'awash' ? 'Copied' : 'Copy'}
                    </button>
                  </div>

                  {/* Safaricom M-Pesa */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-gray-100 font-mono">
                    <div>
                      <span className="text-[10px] text-gray-500 block font-sans font-bold">Safaricom M-Pesa</span>
                      <span className="font-black text-xs text-emerald-700">0710028022</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('0710028022', 'mpesa')}
                      className="flex items-center gap-1 text-[10px] font-bold text-gray-700 bg-white border border-gray-200 px-2.5 py-1 rounded-md hover:bg-gray-50 cursor-pointer shadow-xs"
                    >
                      {copiedKey === 'mpesa' ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 text-gray-500" />}
                      {copiedKey === 'mpesa' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-gray-400 pt-1">
                Please transfer exactly <strong className="text-gray-700">{grandTotal.toLocaleString()} {currency}</strong> to any of the above accounts under <strong className="text-[#0B3D4A]">Yishak Tule Karesso</strong>, then enter your transaction number below.
              </p>
            </div>

            {/* Reference Input & Verify Button */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-700">
                Transaction Reference / FT Number / SMS Code:
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder={paymentMethod === 'telebirr' ? 'e.g. 5HB892JKS1 or Telebirr code' : 'e.g. FT26144SG2ST'}
                  value={paymentReference}
                  onChange={(e) => {
                    setPaymentReference(e.target.value);
                    if (verificationResult) setVerificationResult(null);
                  }}
                  className="flex-1 rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs font-mono font-bold text-gray-900 placeholder:font-sans placeholder:font-normal placeholder:text-gray-400 focus:border-[#007042] focus:outline-none focus:ring-1 focus:ring-[#007042]"
                />
                <button
                  type="button"
                  onClick={handleVerifyPayment}
                  disabled={verifyingPayment || !paymentReference.trim()}
                  className="rounded-xl bg-[#007042] hover:bg-[#005a35] px-4 py-2.5 text-xs font-bold text-white transition disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                >
                  {verifyingPayment ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Checking with Bank...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-3.5 w-3.5" />
                      Verify Payment
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Verification Live Feedback Card */}
            {verificationResult && (
              <div
                className={`rounded-xl p-3 text-xs border animate-in fade-in-50 duration-200 ${
                  verificationResult.verified
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <div className="flex items-start gap-2">
                  {verificationResult.verified ? (
                    <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1 flex-1">
                    <p className="font-bold">
                      {verificationResult.verified
                        ? 'Payment Authenticated via Verify.ET'
                        : 'Verification Pending or Not Found'}
                    </p>
                    <p className="text-[11px] leading-relaxed opacity-90">
                      {verificationResult.message}
                    </p>

                    {verificationResult.verified && (
                      <div className="mt-2 pt-2 border-t border-emerald-200/60 grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <span className="text-emerald-700/80 block">Bank Provider:</span>
                          <span className="font-bold">{verificationResult.bankName}</span>
                        </div>
                        <div>
                          <span className="text-emerald-700/80 block">Verified Amount:</span>
                          <span className="font-bold">
                            {verificationResult.amount?.toLocaleString()} {verificationResult.currency}
                          </span>
                        </div>
                        {verificationResult.payerName && (
                          <div className="col-span-2">
                            <span className="text-emerald-700/80 block">Account Holder / Payer:</span>
                            <span className="font-bold">{verificationResult.payerName}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
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
          {loading ? 'Confirming Reservation...' : `Pay & Confirm Booking (${grandTotal.toLocaleString()} ${currency})`}
        </button>

        <p className="mt-2 text-center text-[10px] text-gray-400 flex items-center justify-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          Your booking and payment request are secure and encrypted
        </p>
      </div>
    </form>
  );
}
