'use client';

import React, { FormEvent, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { calculateResortPricingBreakdown } from '@/lib/pricing';
import { RESORT_BANK_ACCOUNTS } from '@/lib/resortAccounts';
import {
  CalendarDays,
  Lock,
  ShieldCheck,
  CheckCircle2,
  Users,
  BedDouble,
  CreditCard,
  Building,
  MapPin,
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
  serviceChargePercent?: number;
  taxPercent?: number;
  maxGuests: number;
  imageUrl?: string;
  roomType?: string;
  bedType?: string;
  sizeSqm?: number;
  location?: string;
  view?: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: number;
}

type ReservationResponse = {
  success?: boolean;
  bookingNumber?: string;
  subtotal?: number;
  serviceChargePercent?: number;
  serviceCharge?: number;
  taxPercent?: number;
  tax?: number;
  totalPrice?: number;
  currency?: string;
  error?: string;
};

export default function RoomBookingForm({
  roomId,
  roomName,
  price,
  currency = 'ETB',
  serviceChargePercent = 0,
  taxPercent = 0,
  maxGuests,
  imageUrl,
  roomType,
  bedType,
  sizeSqm,
  location = 'Hawassa, Sidama • Lake Shorefront',
  view = 'Panoramic Lake View',
  initialCheckIn,
  initialCheckOut,
  initialGuests,
}: RoomBookingFormProps) {
  const router = useRouter();

  // Tomorrow as default check-in, +3 days check-out (overridden by valid query params)
  const formatDateInput = (d: Date) => d.toISOString().split('T')[0];
  const today = new Date();
  const todayStr = formatDateInput(today);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultOut = new Date(tomorrow);
  defaultOut.setDate(defaultOut.getDate() + 3);

  const validInitialCheckIn =
    initialCheckIn && /^\d{4}-\d{2}-\d{2}$/.test(initialCheckIn) && initialCheckIn >= todayStr
      ? initialCheckIn
      : formatDateInput(tomorrow);

  let resolvedInitialCheckOut = formatDateInput(defaultOut);
  if (
    initialCheckOut &&
    /^\d{4}-\d{2}-\d{2}$/.test(initialCheckOut) &&
    initialCheckOut > validInitialCheckIn
  ) {
    resolvedInitialCheckOut = initialCheckOut;
  } else if (validInitialCheckIn >= resolvedInitialCheckOut) {
    const fallbackOut = new Date(`${validInitialCheckIn}T00:00:00Z`);
    fallbackOut.setUTCDate(fallbackOut.getUTCDate() + 3);
    resolvedInitialCheckOut = formatDateInput(fallbackOut);
  }

  const resolvedInitialGuests =
    typeof initialGuests === 'number' && Number.isInteger(initialGuests) && initialGuests >= 1
      ? Math.min(initialGuests, maxGuests)
      : Math.min(2, maxGuests);

  const [form, setForm] = useState({
    checkIn: validInitialCheckIn,
    checkOut: resolvedInitialCheckOut,
    guests: resolvedInitialGuests,
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

  const checkInId = useId();
  const checkOutId = useId();
  const guestsId = useId();
  const guestNameId = useId();
  const guestPhoneId = useId();
  const guestEmailId = useId();
  const guestSpecialId = useId();
  const paymentRefId = useId();

  const telebirrAccount = RESORT_BANK_ACCOUNTS.telebirr;
  const cbeBirrAccount = RESORT_BANK_ACCOUNTS.cbe_birr;
  const transferAccounts = [
    RESORT_BANK_ACCOUNTS.cbe,
    RESORT_BANK_ACCOUNTS.boa,
    RESORT_BANK_ACCOUNTS.awash,
    RESORT_BANK_ACCOUNTS.mpesa,
  ];
  const beneficiaryName = telebirrAccount.accountHolder;

  // Nights calculation
  const nights = useMemo(() => {
    if (!form.checkIn || !form.checkOut) return 0;
    const inDate = new Date(`${form.checkIn}T00:00:00`);
    const outDate = new Date(`${form.checkOut}T00:00:00`);
    const diff = outDate.getTime() - inDate.getTime();
    return diff > 0 ? Math.round(diff / (1000 * 60 * 60 * 24)) : 0;
  }, [form.checkIn, form.checkOut]);

  // Unified price breakdown matching server resort_settings & folio rules
  const pricing = useMemo(
    () =>
      calculateResortPricingBreakdown(
        nights * Number(price || 0),
        serviceChargePercent,
        taxPercent,
      ),
    [nights, price, serviceChargePercent, taxPercent],
  );
  const roomCost = pricing.subtotal;
  const serviceCharge = pricing.serviceCharge;
  const taxAmount = pricing.tax;
  const grandTotal = pricing.grandTotal;

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
      <div className="rounded-3xl bg-white p-8 text-center shadow-xl border border-[#E6DFD1] max-w-lg mx-auto space-y-5 animate-in zoom-in-95">
        <div className="h-16 w-16 rounded-full bg-emerald-50 text-emerald-700 mx-auto flex items-center justify-center shadow-inner">
          <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
        </div>

        <div className="space-y-1">
          <span className="inline-block rounded-full bg-[#163D32]/10 px-3 py-1 text-[11px] font-bold text-[#163D32] uppercase tracking-wider">
            Booking Confirmed
          </span>
          <h2 className="font-display text-2xl font-semibold text-[#163D32] pt-1">
            Reservation Confirmed!
          </h2>
          <p className="text-xs text-[#52645D]">
            Booking Reference:{' '}
            <strong className="text-[#7A5A27] font-mono text-sm">
              {success.bookingNumber || 'TR-RESERVATION'}
            </strong>
          </p>
        </div>

        <div className="rounded-2xl bg-[#F5F0E6] p-4 text-left text-xs border border-[#E6DFD1] space-y-2.5">
          <div className="flex justify-between">
            <span className="text-[#52645D]">Room:</span>
            <span className="font-bold text-[#163D32]">{roomName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#52645D]">Dates:</span>
            <span className="font-bold text-[#163D32]">
              {formatDateDisplay(form.checkIn)} – {formatDateDisplay(form.checkOut)} ({nights} nights)
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#52645D]">Guests:</span>
            <span className="font-bold text-[#163D32]">{form.guests} guests</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#52645D]">Payment:</span>
            <span className="font-bold text-[#163D32] capitalize">{paymentMethod.replace(/_/g, ' ')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#52645D]">Payment Status:</span>
            <span className={`font-bold uppercase tracking-wider text-[11px] px-2 py-0.5 rounded-md ${
              success.paymentStatus === 'paid'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}>
              {success.paymentStatus === 'paid' ? '✓ Paid & Verified via Verify.ET' : 'Pending (Pay at Check-in)'}
            </span>
          </div>
          {success.paymentReference && (
            <div className="flex justify-between">
              <span className="text-[#52645D]">Transaction Ref:</span>
              <span className="font-mono font-bold text-[#163D32]">{success.paymentReference}</span>
            </div>
          )}
          <div className="pt-2 border-t border-[#E6DFD1] flex justify-between font-black text-sm text-[#163D32]">
            <span>Total:</span>
            <span className="text-[#7A5A27]">
              {(success.totalPrice ?? grandTotal).toLocaleString()} {success.currency || currency}
            </span>
          </div>
        </div>

        <p className="text-xs text-[#52645D]">
          Save your Booking Reference above to track your stay, order dining, or view your folio once checked in.
        </p>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <Link
            href="/guest/my-activity"
            className="flex-1 rounded-2xl border border-[#163D32]/20 bg-[#F5F0E6] py-3 text-xs font-bold text-[#163D32] hover:bg-[#E6DFD1]/60 transition-all text-center"
          >
            View My Stay &amp; Billing
          </Link>
          <button
            type="button"
            onClick={() => router.push('/guest/rooms')}
            className="flex-1 rounded-2xl bg-[#163D32] py-3 text-xs font-bold text-[#C5A46D] shadow-md hover:bg-[#0F2D24] transition-all"
          >
            Return to Accommodations
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="max-w-2xl mx-auto space-y-4">
      {/* ─── CARD 1: ROOM SUMMARY ─── */}
      <div className="rounded-3xl bg-white p-4 sm:p-5 shadow-sm border border-[#E6DFD1] flex items-center gap-4">
        <div
          className="h-20 w-24 sm:h-24 sm:w-28 rounded-2xl bg-[#F5F0E6] bg-cover bg-center shrink-0 border border-[#E6DFD1] shadow-inner"
          style={{
            backgroundImage: `url(${imageUrl || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=400&q=80'})`,
          }}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#7A5A27]">
            {roomType || 'Lakefront Accommodation'} • {view}
          </p>

          <h3 className="font-display text-lg sm:text-xl font-semibold text-[#163D32] truncate mt-0.5">
            {roomName}
          </h3>

          <p className="text-xs text-[#52645D] flex items-center gap-1 truncate mt-0.5">
            <MapPin className="h-3.5 w-3.5 text-[#163D32] shrink-0" aria-hidden="true" />
            {location}
          </p>
        </div>
      </div>

      {/* ─── CARD 2: CHECK-IN / CHECK-OUT DATES ─── */}
      <div className="rounded-3xl bg-white p-5 shadow-sm border border-[#E6DFD1] grid grid-cols-1 sm:grid-cols-2 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E6DFD1]">
        {/* Check-In */}
        <div className="space-y-1 sm:pr-4">
          <label htmlFor={checkInId} className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#52645D]">
            <CalendarDays className="h-4 w-4 text-[#7A5A27]" aria-hidden="true" />
            Check-in
          </label>
          <p className="text-sm font-black text-[#163D32]">
            {formatDateDisplay(form.checkIn)}
          </p>
          <p className="text-xs text-[#52645D] flex items-center gap-1">
            <Clock className="h-3 w-3 text-[#7A5A27]" aria-hidden="true" />
            {getDayOfWeek(form.checkIn)} • 3:00 PM
          </p>
          <input
            id={checkInId}
            type="date"
            required
            min={todayStr}
            value={form.checkIn}
            onChange={(e) => {
              const nextIn = e.target.value;
              setForm((prev) => {
                let nextOut = prev.checkOut;
                if (nextIn && (!nextOut || nextOut <= nextIn)) {
                  const d = new Date(`${nextIn}T00:00:00Z`);
                  d.setUTCDate(d.getUTCDate() + 1);
                  nextOut = formatDateInput(d);
                }
                return { ...prev, checkIn: nextIn, checkOut: nextOut };
              });
            }}
            className="w-full mt-2 rounded-xl border border-[#E6DFD1] bg-[#F5F0E6]/70 px-3 py-2 text-xs font-semibold text-[#163D32] focus:border-[#C5A46D] focus:bg-white focus:outline-none"
          />
        </div>

        {/* Check-Out */}
        <div className="space-y-1 pt-3 sm:pt-0 sm:pl-4">
          <label htmlFor={checkOutId} className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#52645D]">
            <CalendarDays className="h-4 w-4 text-[#7A5A27]" aria-hidden="true" />
            Check-out
          </label>
          <p className="text-sm font-black text-[#163D32]">
            {formatDateDisplay(form.checkOut)}
          </p>
          <p className="text-xs text-[#52645D] flex items-center gap-1">
            <Clock className="h-3 w-3 text-[#7A5A27]" aria-hidden="true" />
            {getDayOfWeek(form.checkOut)} • 12:00 PM
          </p>
          <input
            id={checkOutId}
            type="date"
            required
            min={form.checkIn || todayStr}
            value={form.checkOut}
            onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
            className="w-full mt-2 rounded-xl border border-[#E6DFD1] bg-[#F5F0E6]/70 px-3 py-2 text-xs font-semibold text-[#163D32] focus:border-[#C5A46D] focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* ─── CARD 3: ROOM DETAILS CARD ─── */}
      <div className="rounded-3xl bg-white p-5 shadow-sm border border-[#E6DFD1] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-[#163D32]/10 text-[#163D32] flex items-center justify-center font-bold shrink-0">
            <BedDouble className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h4 className="text-sm font-black text-[#163D32]">{roomType || 'Deluxe Luxury Suite'}</h4>
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#52645D] mt-0.5">
              <span>{bedType || '1 King Bed'} • {sizeSqm || 42} m²</span>
              <span>•</span>
              <span className="flex items-center gap-1 font-semibold text-[#163D32]">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                Max {maxGuests} guests
              </span>
            </div>
          </div>
        </div>

        {/* Guests selector */}
        <div className="flex items-center gap-2">
          <label htmlFor={guestsId} className="text-xs font-bold text-[#52645D] uppercase">Guests</label>
          <select
            id={guestsId}
            value={form.guests}
            onChange={(e) => setForm({ ...form, guests: Number(e.target.value) })}
            className="rounded-xl border border-[#E6DFD1] bg-[#F5F0E6]/70 px-3 py-2 text-xs font-bold text-[#163D32] focus:border-[#C5A46D] focus:bg-white focus:outline-none"
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
      <div className="rounded-3xl bg-white p-5 shadow-sm border border-[#E6DFD1] space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#7A5A27]">
          Primary Guest Information
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor={guestNameId} className="block text-xs font-bold text-[#163D32] mb-1">
              Full Legal Name *
            </label>
            <input
              id={guestNameId}
              type="text"
              required
              placeholder="e.g. Dawit Tadesse"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl border border-[#E6DFD1] bg-[#F5F0E6]/60 px-3.5 py-2.5 text-xs text-[#1A1A1A] focus:border-[#C5A46D] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor={guestPhoneId} className="block text-xs font-bold text-[#163D32] mb-1">
              Phone Number *
            </label>
            <input
              id={guestPhoneId}
              type="tel"
              required
              placeholder="+251 911 000 000"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-xl border border-[#E6DFD1] bg-[#F5F0E6]/60 px-3.5 py-2.5 text-xs text-[#1A1A1A] focus:border-[#C5A46D] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor={guestEmailId} className="block text-xs font-bold text-[#163D32] mb-1">
              Email Address (Optional)
            </label>
            <input
              id={guestEmailId}
              type="email"
              placeholder="guest@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-xl border border-[#E6DFD1] bg-[#F5F0E6]/60 px-3.5 py-2.5 text-xs text-[#1A1A1A] focus:border-[#C5A46D] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor={guestSpecialId} className="block text-xs font-bold text-[#163D32] mb-1">
              Special Requests (Optional)
            </label>
            <input
              id={guestSpecialId}
              type="text"
              placeholder="High floor, late arrival..."
              value={form.special}
              onChange={(e) => setForm({ ...form, special: e.target.value })}
              className="w-full rounded-xl border border-[#E6DFD1] bg-[#F5F0E6]/60 px-3.5 py-2.5 text-xs text-[#1A1A1A] focus:border-[#C5A46D] focus:bg-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* ─── CARD 5: PRICE SUMMARY ─── */}
      <div className="rounded-3xl bg-white p-5 shadow-sm border border-[#E6DFD1] space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#7A5A27]">
          Price Summary
        </h4>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between text-[#52645D]">
            <span>Room ({nights} {nights === 1 ? 'night' : 'nights'} × {price.toLocaleString()} {currency})</span>
            <span className="font-bold text-[#163D32]">{roomCost.toLocaleString()} {currency}</span>
          </div>

          {pricing.serviceChargePercent > 0 && (
            <div className="flex items-center justify-between text-[#52645D]">
              <span>Resort Service Charge ({pricing.serviceChargePercent}%)</span>
              <span className="font-bold text-[#163D32]">{serviceCharge.toLocaleString()} {currency}</span>
            </div>
          )}

          {pricing.taxPercent > 0 && (
            <div className="flex items-center justify-between text-[#52645D]">
              <span>Government Tax / VAT ({pricing.taxPercent}%)</span>
              <span className="font-bold text-[#163D32]">{taxAmount.toLocaleString()} {currency}</span>
            </div>
          )}

          {pricing.serviceChargePercent === 0 && pricing.taxPercent === 0 && (
            <div className="flex items-center justify-between text-[#52645D]">
              <span>Taxes &amp; Service Fees (0%)</span>
              <span className="font-bold text-[#163D32]">0 {currency}</span>
            </div>
          )}

          <div className="pt-3 border-t border-[#E6DFD1] flex items-center justify-between">
            <span className="text-sm font-black text-[#163D32]">Total Price</span>
            <span className="text-xl font-black text-[#7A5A27]">
              {grandTotal.toLocaleString()} {currency}
            </span>
          </div>
        </div>
      </div>

      {/* ─── CARD 6: PAYMENT METHOD ─── */}
      <div className="rounded-3xl bg-white p-5 shadow-sm border border-[#E6DFD1] space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#7A5A27]">
          Payment Method
        </h4>

        <div className="space-y-2" role="radiogroup" aria-label="Select payment method">
          {/* Telebirr */}
          <label
            className={`flex items-center justify-between rounded-2xl border p-3.5 cursor-pointer transition-all focus-within:ring-2 focus-within:ring-[#163D32]/30 ${
              paymentMethod === 'telebirr'
                ? 'border-[#C5A46D] bg-[#F5F0E6]/75 ring-1 ring-[#C5A46D]'
                : 'border-[#E6DFD1] hover:bg-[#F5F0E6]/40'
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value="telebirr"
              checked={paymentMethod === 'telebirr'}
              onChange={() => setPaymentMethod('telebirr')}
              className="sr-only"
            />
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#0172BB] text-white flex items-center justify-center font-black text-xs shadow-sm">
                Tb
              </div>
              <div>
                <p className="text-xs font-bold text-[#163D32]">Telebirr</p>
                <p className="text-[11px] text-[#52645D]">Instant Ethio Telecom mobile pay</p>
              </div>
            </div>
            <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${paymentMethod === 'telebirr' ? 'border-[#163D32] bg-[#163D32]' : 'border-[#E6DFD1]'}`}>
              {paymentMethod === 'telebirr' && <Check className="h-3 w-3 text-[#C5A46D]" aria-hidden="true" />}
            </div>
          </label>

          {/* CBE Birr */}
          <label
            className={`flex items-center justify-between rounded-2xl border p-3.5 cursor-pointer transition-all focus-within:ring-2 focus-within:ring-[#163D32]/30 ${
              paymentMethod === 'cbe_birr'
                ? 'border-[#C5A46D] bg-[#F5F0E6]/75 ring-1 ring-[#C5A46D]'
                : 'border-[#E6DFD1] hover:bg-[#F5F0E6]/40'
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value="cbe_birr"
              checked={paymentMethod === 'cbe_birr'}
              onChange={() => setPaymentMethod('cbe_birr')}
              className="sr-only"
            />
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#8C2D85] text-white flex items-center justify-center font-black text-xs shadow-sm">
                CBE
              </div>
              <div>
                <p className="text-xs font-bold text-[#163D32]">CBE Birr</p>
                <p className="text-[11px] text-[#52645D]">Commercial Bank of Ethiopia mobile</p>
              </div>
            </div>
            <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${paymentMethod === 'cbe_birr' ? 'border-[#163D32] bg-[#163D32]' : 'border-[#E6DFD1]'}`}>
              {paymentMethod === 'cbe_birr' && <Check className="h-3 w-3 text-[#C5A46D]" aria-hidden="true" />}
            </div>
          </label>

          {/* Bank Transfer */}
          <label
            className={`flex items-center justify-between rounded-2xl border p-3.5 cursor-pointer transition-all focus-within:ring-2 focus-within:ring-[#163D32]/30 ${
              paymentMethod === 'bank_transfer'
                ? 'border-[#C5A46D] bg-[#F5F0E6]/75 ring-1 ring-[#C5A46D]'
                : 'border-[#E6DFD1] hover:bg-[#F5F0E6]/40'
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value="bank_transfer"
              checked={paymentMethod === 'bank_transfer'}
              onChange={() => setPaymentMethod('bank_transfer')}
              className="sr-only"
            />
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#0F2D24] text-[#C5A46D] flex items-center justify-center shadow-sm">
                <Building className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#163D32]">Direct Bank Transfer</p>
                <p className="text-[11px] text-[#52645D]">CBE, Bank of Abyssinia, Awash, Safaricom M-Pesa</p>
              </div>
            </div>
            <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${paymentMethod === 'bank_transfer' ? 'border-[#163D32] bg-[#163D32]' : 'border-[#E6DFD1]'}`}>
              {paymentMethod === 'bank_transfer' && <Check className="h-3 w-3 text-[#C5A46D]" aria-hidden="true" />}
            </div>
          </label>

          {/* Pay at Resort */}
          <label
            className={`flex items-center justify-between rounded-2xl border p-3.5 cursor-pointer transition-all focus-within:ring-2 focus-within:ring-[#163D32]/30 ${
              paymentMethod === 'pay_at_resort'
                ? 'border-[#C5A46D] bg-[#F5F0E6]/75 ring-1 ring-[#C5A46D]'
                : 'border-[#E6DFD1] hover:bg-[#F5F0E6]/40'
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value="pay_at_resort"
              checked={paymentMethod === 'pay_at_resort'}
              onChange={() => setPaymentMethod('pay_at_resort')}
              className="sr-only"
            />
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#163D32] text-[#C5A46D] flex items-center justify-center shadow-sm">
                <CreditCard className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#163D32]">Pay at Resort Check-in</p>
                <p className="text-[11px] text-[#52645D]">Pay cash or card at our front desk</p>
              </div>
            </div>
            <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${paymentMethod === 'pay_at_resort' ? 'border-[#163D32] bg-[#163D32]' : 'border-[#E6DFD1]'}`}>
              {paymentMethod === 'pay_at_resort' && <Check className="h-3 w-3 text-[#C5A46D]" aria-hidden="true" />}
            </div>
          </label>
        </div>

        {/* ─── VERIFY.ET REAL-TIME DIGITAL PAYMENT VERIFICATION PANEL ─── */}
        {paymentMethod !== 'pay_at_resort' && (
          <div className="mt-4 rounded-2xl border border-[#163D32]/15 bg-[#F5F0E6] p-4 space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#E6DFD1] pb-2">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#163D32] text-[10px] font-black text-[#C5A46D]">
                  ✓
                </span>
                <span className="text-xs font-black text-[#163D32]">
                  Verify.ET Automated Bank Check
                </span>
              </div>
              <span className="text-[11px] font-bold text-[#52645D] uppercase tracking-wider">
                Non-Custodial
              </span>
            </div>

            {/* Official Resort Settlement Account Info */}
            <div className="rounded-xl bg-white p-3.5 text-xs border border-[#E6DFD1] space-y-2.5">
              <div className="flex items-center justify-between border-b border-[#E6DFD1] pb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#52645D]">
                  Account Holder / Beneficiary:
                </span>
                <span className="font-extrabold text-[#163D32] bg-[#F5F0E6] border border-[#E6DFD1] px-2.5 py-0.5 rounded-md text-xs">
                  {beneficiaryName}
                </span>
              </div>

              {paymentMethod === 'telebirr' && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F5F0E6]/75 border border-[#E6DFD1] font-mono">
                  <div>
                    <span className="text-[11px] text-[#52645D] block font-sans font-bold">{telebirrAccount.name} Account</span>
                    <span className="font-black text-sm text-[#163D32]">{telebirrAccount.accountNumber}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(telebirrAccount.accountNumber, 'telebirr')}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#163D32] bg-white border border-[#E6DFD1] px-3 py-1.5 rounded-lg hover:bg-[#F5F0E6] cursor-pointer shadow-xs"
                  >
                    {copiedKey === 'telebirr' ? <Check className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5 text-[#52645D]" aria-hidden="true" />}
                    {copiedKey === 'telebirr' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}

              {paymentMethod === 'cbe_birr' && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F5F0E6]/75 border border-[#E6DFD1] font-mono">
                  <div>
                    <span className="text-[11px] text-[#52645D] block font-sans font-bold">{cbeBirrAccount.name} Account</span>
                    <span className="font-black text-sm text-[#163D32]">{cbeBirrAccount.accountNumber}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(cbeBirrAccount.accountNumber, 'cbe_birr')}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#163D32] bg-white border border-[#E6DFD1] px-3 py-1.5 rounded-lg hover:bg-[#F5F0E6] cursor-pointer shadow-xs"
                  >
                    {copiedKey === 'cbe_birr' ? <Check className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5 text-[#52645D]" aria-hidden="true" />}
                    {copiedKey === 'cbe_birr' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}

              {paymentMethod === 'bank_transfer' && (
                <div className="space-y-2 pt-0.5">
                  {transferAccounts.map((acc) => (
                    <div key={acc.code} className="flex items-center justify-between p-2 rounded-xl bg-[#F5F0E6]/65 border border-[#E6DFD1] font-mono">
                      <div>
                        <span className="text-[11px] text-[#52645D] block font-sans font-bold">{acc.name}</span>
                        <span className="font-black text-xs text-[#163D32]">{acc.accountNumber}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(acc.accountNumber, acc.code)}
                        className="flex items-center gap-1 text-[11px] font-bold text-[#163D32] bg-white border border-[#E6DFD1] px-2.5 py-1 rounded-md hover:bg-[#F5F0E6] cursor-pointer shadow-xs"
                      >
                        {copiedKey === acc.code ? <Check className="h-3 w-3 text-emerald-700" aria-hidden="true" /> : <Copy className="h-3 w-3 text-[#52645D]" aria-hidden="true" />}
                        {copiedKey === acc.code ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-[11px] text-[#52645D] pt-1">
                Please transfer exactly <strong className="text-[#163D32]">{grandTotal.toLocaleString()} {currency}</strong> to any of the above accounts under <strong className="text-[#163D32]">{beneficiaryName}</strong>, then enter your transaction number below.
              </p>
            </div>

            {/* Reference Input & Verify Button */}
            <div className="space-y-1.5">
              <label htmlFor={paymentRefId} className="block text-xs font-bold text-[#163D32]">
                Transaction Reference / FT Number / SMS Code:
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id={paymentRefId}
                  type="text"
                  placeholder={paymentMethod === 'telebirr' ? 'e.g. 5HB892JKS1 or Telebirr code' : 'e.g. FT26144SG2ST'}
                  value={paymentReference}
                  onChange={(e) => {
                    setPaymentReference(e.target.value);
                    if (verificationResult) setVerificationResult(null);
                  }}
                  className="flex-1 rounded-xl border border-[#E6DFD1] bg-white px-3.5 py-2.5 text-xs font-mono font-bold text-[#163D32] placeholder:font-sans placeholder:font-normal placeholder:text-[#52645D]/70 focus:border-[#163D32] focus:outline-none focus:ring-1 focus:ring-[#163D32]"
                />
                <button
                  type="button"
                  onClick={handleVerifyPayment}
                  disabled={verifyingPayment || !paymentReference.trim()}
                  className="rounded-xl bg-[#163D32] hover:bg-[#0F2D24] px-4 py-2.5 text-xs font-bold text-[#C5A46D] transition disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                >
                  {verifyingPayment ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      Checking with Bank...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      Verify Payment
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Verification Live Feedback Card */}
            {verificationResult && (
              <div
                role="status"
                className={`rounded-xl p-3 text-xs border animate-in fade-in-50 duration-200 ${
                  verificationResult.verified
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <div className="flex items-start gap-2">
                  {verificationResult.verified ? (
                    <CheckCircle className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
                  )}
                  <div className="space-y-1 flex-1">
                    <p className="font-bold">
                      {verificationResult.verified
                        ? 'Payment Authenticated via Verify.ET'
                        : 'Verification Pending or Not Found'}
                    </p>
                    <p className="text-xs leading-relaxed opacity-90">
                      {verificationResult.message}
                    </p>

                    {verificationResult.verified && (
                      <div className="mt-2 pt-2 border-t border-emerald-200/60 grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-emerald-800/80 block">Bank Provider:</span>
                          <span className="font-bold">{verificationResult.bankName}</span>
                        </div>
                        <div>
                          <span className="text-emerald-800/80 block">Verified Amount:</span>
                          <span className="font-bold">
                            {verificationResult.amount?.toLocaleString()} {verificationResult.currency}
                          </span>
                        </div>
                        {verificationResult.payerName && (
                          <div className="col-span-2">
                            <span className="text-emerald-800/80 block">Account Holder / Payer:</span>
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
        <div role="alert" className="rounded-2xl bg-rose-50 p-3.5 text-xs font-bold text-rose-800 border border-rose-200 text-center">
          {error}
        </div>
      )}

      {/* ─── PRIMARY BOTTOM CTA ─── */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={loading || nights <= 0}
          className="w-full rounded-2xl bg-gradient-to-r from-[#163D32] via-[#0F2D24] to-[#163D32] hover:brightness-110 py-4 text-xs font-extrabold uppercase tracking-wider text-[#C5A46D] border border-[#C5A46D]/30 shadow-xl shadow-[#163D32]/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Lock className="h-4 w-4 text-[#C5A46D]" aria-hidden="true" />
          {loading
            ? 'Confirming Reservation...'
            : paymentMethod === 'pay_at_resort'
              ? `Confirm Reservation — Pay at Check-in (${grandTotal.toLocaleString()} ${currency})`
              : `Pay & Confirm Booking (${grandTotal.toLocaleString()} ${currency})`}
        </button>

        <p className="mt-2 text-center text-[11px] text-[#52645D] flex items-center justify-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
          Your booking and payment request are secure and encrypted
        </p>
      </div>
    </form>
  );
}
