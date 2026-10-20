'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  Check,
  Clock3,
  LogIn,
  LogOut,
  RefreshCw,
  X,
  Ban,
  CreditCard,
  FileText,
  ShieldCheck,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Search,
} from 'lucide-react';
import supabase from '@/lib/supabaseClient';

type Reservation = {
  id: string;
  booking_number: string;
  room_id: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string | null;
  check_in: string;
  check_out: string;
  guests: number;
  total_price: number;
  currency: string;
  payment_method: string;
  payment_status: string;
  payment_reference: string | null;
  status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';
  special_requests: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  created_at: string;
  room?: { name: string; room_type: string | null } | null;
};

const statusLabel = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  checked_in: 'Checked In',
  checked_out: 'Checked Out',
  cancelled: 'Cancelled',
  no_show: 'No Show',
} as const;

export default function ManagerReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | Reservation['status']>('all');
  const [busy, setBusy] = useState('');

  // Verify.ET Modal State
  const [verifyingRes, setVerifyingRes] = useState<Reservation | null>(null);
  const [verifyInputRef, setVerifyInputRef] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);

  async function load() {
    setLoading(true);
    setError('');
    const { data, error } = await supabase
      .from('room_reservations')
      .select('*, room:rooms(name, room_type)')
      .order('created_at', { ascending: false });

    if (error) setError(error.message);
    else setReservations((data ?? []) as Reservation[]);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function changeStatus(id: string, status: Reservation['status']) {
    setBusy(id);
    const patch: any = { status, updated_at: new Date().toISOString() };
    if (status === 'checked_in') patch.checked_in_at = new Date().toISOString();
    if (status === 'checked_out') patch.checked_out_at = new Date().toISOString();
    const { error } = await supabase.from('room_reservations').update(patch).eq('id', id);
    if (error) setError(error.message);
    else await load();
    setBusy('');
  }

  async function changePayment(id: string, payment_status: string) {
    setBusy(id);
    const { error } = await supabase
      .from('room_reservations')
      .update({ payment_status, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) setError(error.message);
    else await load();
    setBusy('');
  }

  // Open Verify.ET Modal
  function openVerifyModal(res: Reservation) {
    setVerifyingRes(res);
    setVerifyInputRef(res.payment_reference || '');
    setVerifyResult(null);
  }

  // Run verification
  async function runVerification() {
    if (!verifyingRes || !verifyInputRef.trim()) return;

    setVerifyLoading(true);
    setVerifyResult(null);

    try {
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: verifyInputRef.trim(),
          bank: verifyingRes.payment_method,
          expectedAmount: Number(verifyingRes.total_price || 0),
          currency: verifyingRes.currency || 'ETB',
        }),
      });

      const data = await res.json();
      setVerifyResult(data);

      if (data.verified) {
        // Update reservation to paid & confirmed in Supabase
        await supabase
          .from('room_reservations')
          .update({
            payment_status: 'paid',
            payment_reference: data.transactionNumber || verifyInputRef.trim().toUpperCase(),
            status: verifyingRes.status === 'pending' ? 'confirmed' : verifyingRes.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', verifyingRes.id);

        // Register in used_payment_references
        await supabase.rpc('register_payment_reference', {
          p_reference: data.transactionNumber || verifyInputRef.trim().toUpperCase(),
          p_entity_type: 'reservation',
          p_entity_id: verifyingRes.id,
          p_amount: Number(verifyingRes.total_price || 0),
          p_currency: verifyingRes.currency || 'ETB',
        });

        await load();
      }
    } catch (err: any) {
      setVerifyResult({
        success: false,
        verified: false,
        message: err.message || 'Network error verifying payment.',
      });
    } finally {
      setVerifyLoading(false);
    }
  }

  const visible =
    filter === 'all'
      ? reservations
      : reservations.filter((r) => r.status === filter);

  const counts = reservations.reduce<Record<string, number>>(
    (a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a),
    {}
  );

  return (
    <main className="min-h-screen bg-[#F8F5EE] text-[#182326]">
      <header className="border-b border-white/10 bg-[#0B3D4A] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 md:px-6">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-6 w-6 text-[#159A9C]" />
            <div>
              <p className="font-display text-2xl">Reservations</p>
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-white/50">
                Tule Resort · Manager Console
              </p>
            </div>
          </div>
          <button
            onClick={() => void load()}
            className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold hover:bg-white/15 transition cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-7 md:px-6">
        {/* Status Filters */}
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {(
            [
              'pending',
              'confirmed',
              'checked_in',
              'checked_out',
              'cancelled',
              'no_show',
            ] as Reservation['status'][]
          ).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(filter === s ? 'all' : s)}
              className={`rounded-2xl border p-4 text-left bg-white transition cursor-pointer ${
                filter === s
                  ? 'border-[#C8A15A] ring-2 ring-[#C8A15A]/15'
                  : 'border-[#0B3D4A]/10 hover:border-[#0B3D4A]/25'
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-wider text-[#182326]/45">
                {statusLabel[s]}
              </p>
              <p className="mt-1 text-2xl font-black text-[#0B3D4A]">{counts[s] || 0}</p>
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700 border border-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <p className="py-16 text-center text-black/50">Loading reservations…</p>
        ) : visible.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-[#0B3D4A]/20 bg-white p-14 text-center">
            <Clock3 className="mx-auto h-10 w-10 text-[#0B3D4A]/20" />
            <p className="mt-4 font-display text-3xl">No reservations found</p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {visible.map((r) => (
              <article
                key={r.id}
                className="rounded-3xl border border-[#0B3D4A]/10 bg-white p-5 shadow-sm md:p-6"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#EAF4F7] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#0B4F6C]">
                        {r.booking_number}
                      </span>
                      <span className="rounded-full bg-stone-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider">
                        {statusLabel[r.status]}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                          r.payment_status === 'paid'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {r.payment_status === 'paid' ? '✓ Paid' : 'Payment Pending'}
                      </span>
                    </div>

                    <h2 className="mt-3 text-2xl font-black text-[#0B3D4A]">
                      {r.guest_name}
                    </h2>
                    <p className="mt-1 text-sm text-black/55">
                      {r.room?.name || 'Room'} · {r.guests} guest{r.guests === 1 ? '' : 's'}
                    </p>
                  </div>

                  <div className="lg:text-right">
                    <p className="text-2xl font-black text-[#0B3D4A]">
                      {Number(r.total_price || 0).toLocaleString()} {r.currency}
                    </p>
                    <p className="text-xs text-black/50 mt-1 capitalize">
                      Method: <strong className="text-gray-800">{r.payment_method?.replaceAll('_', ' ') || 'Pay at Resort'}</strong>
                    </p>
                    {r.payment_reference && (
                      <p className="text-xs text-[#007042] font-mono font-bold mt-0.5">
                        Ref: {r.payment_reference}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 rounded-2xl bg-[#F8F5EE] p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <Info label="Check-in" value={r.check_in} />
                  <Info label="Check-out" value={r.check_out} />
                  <Info label="Phone" value={r.guest_phone} />
                  <Info label="Email" value={r.guest_email || '—'} />
                </div>

                {r.special_requests && (
                  <p className="mt-4 rounded-xl bg-[#F3E9D2]/40 p-3 text-sm">
                    <strong>Special request:</strong> {r.special_requests}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#0B3D4A]/10 pt-4">
                  {/* Verify.ET Bank Verifier Trigger */}
                  <button
                    onClick={() => openVerifyModal(r)}
                    className="flex items-center gap-2 rounded-xl bg-[#007042] hover:bg-[#005a35] px-4 py-2.5 text-sm font-bold text-white transition shadow-sm cursor-pointer"
                    title="Verify payment with Verify.ET"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Verify.ET Check
                  </button>

                  {r.status === 'pending' && (
                    <>
                      <Action
                        busy={busy === r.id}
                        onClick={() => void changeStatus(r.id, 'confirmed')}
                        icon={Check}
                        label="Confirm"
                      />
                      <Action
                        busy={busy === r.id}
                        onClick={() => void changeStatus(r.id, 'cancelled')}
                        icon={X}
                        label="Cancel"
                        danger
                      />
                    </>
                  )}
                  {r.status === 'confirmed' && (
                    <>
                      <Action
                        busy={busy === r.id}
                        onClick={() => void changeStatus(r.id, 'checked_in')}
                        icon={LogIn}
                        label="Check In"
                      />
                      <Action
                        busy={busy === r.id}
                        onClick={() => void changeStatus(r.id, 'no_show')}
                        icon={Ban}
                        label="No Show"
                        danger
                      />
                    </>
                  )}
                  {r.status === 'checked_in' && (
                    <>
                      <Link
                        href="/staff/dashboard/receipts"
                        className="flex items-center gap-2 rounded-xl bg-[#159A9C] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0B3D4A] transition"
                      >
                        <FileText className="h-4 w-4" />
                        Folio &amp; Bill
                      </Link>
                      <Action
                        busy={busy === r.id}
                        onClick={() => void changeStatus(r.id, 'checked_out')}
                        icon={LogOut}
                        label="Check Out"
                      />
                    </>
                  )}

                  <Action
                    busy={busy === r.id}
                    onClick={() =>
                      void changePayment(r.id, r.payment_status === 'paid' ? 'pending' : 'paid')
                    }
                    icon={CreditCard}
                    label={r.payment_status === 'paid' ? 'Mark unpaid' : 'Mark paid'}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* ─── VERIFY.ET MODAL ─── */}
      {verifyingRes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#007042] text-white">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">
                    Verify.ET Ethiopian Bank Check
                  </h3>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase">
                    Automated Non-Custodial Verification
                  </p>
                </div>
              </div>
              <button
                onClick={() => setVerifyingRes(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="rounded-2xl bg-gray-50 p-3.5 text-xs space-y-1.5 border border-gray-100">
              <div className="flex justify-between">
                <span className="text-gray-500">Guest:</span>
                <span className="font-bold text-gray-900">{verifyingRes.guest_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Booking:</span>
                <span className="font-mono font-bold text-[#0B3D4A]">{verifyingRes.booking_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Required Amount:</span>
                <span className="font-bold text-emerald-700">
                  {Number(verifyingRes.total_price || 0).toLocaleString()} {verifyingRes.currency || 'ETB'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Method:</span>
                <span className="font-bold capitalize">{verifyingRes.payment_method?.replaceAll('_', ' ')}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                Transaction Reference / FT / Receipt Code:
              </label>
              <input
                type="text"
                placeholder="e.g. FT26144SG2ST or Telebirr Txn Number"
                value={verifyInputRef}
                onChange={(e) => setVerifyInputRef(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs font-mono font-bold text-gray-900 focus:border-[#007042] focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={runVerification}
                disabled={verifyLoading || !verifyInputRef.trim()}
                className="flex-1 rounded-xl bg-[#007042] hover:bg-[#005a35] py-2.5 text-xs font-bold text-white transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                {verifyLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking with Bank Network...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Verify on Bank Network
                  </>
                )}
              </button>
              <button
                onClick={() => setVerifyingRes(null)}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            {/* Verification Result Feedback */}
            {verifyResult && (
              <div
                className={`rounded-xl p-3.5 text-xs border animate-in fade-in-50 ${
                  verifyResult.verified
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-rose-50 border-rose-200 text-rose-950'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {verifyResult.verified ? (
                    <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1 flex-1">
                    <p className="font-bold">
                      {verifyResult.verified
                        ? `✓ Genuine Payment Verified (${verifyResult.bankName})`
                        : 'Verification Result'}
                    </p>
                    <p className="text-[11px] leading-relaxed opacity-90">{verifyResult.message}</p>
                    {verifyResult.verified && (
                      <div className="mt-2 pt-2 border-t border-emerald-200 grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-emerald-700/80 block">Verified Amount:</span>
                          <span className="font-bold">
                            {verifyResult.amount?.toLocaleString()} {verifyResult.currency || 'ETB'}
                          </span>
                        </div>
                        <div>
                          <span className="text-emerald-700/80 block">Payer / Account:</span>
                          <span className="font-bold">{verifyResult.payerName || 'Verified Guest'}</span>
                        </div>
                        <div className="col-span-2 text-emerald-700 font-bold">
                          ✓ Reservation updated to Paid &amp; Confirmed!
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-wider text-black/40">{label}</p>
      <p className="mt-1 break-all font-bold">{value}</p>
    </div>
  );
}

function Action({
  onClick,
  icon: Icon,
  label,
  danger,
  busy,
}: {
  onClick: () => void;
  icon: typeof Check;
  label: string;
  danger?: boolean;
  busy?: boolean;
}) {
  return (
    <button
      disabled={busy}
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50 transition cursor-pointer ${
        danger
          ? 'border border-red-200 text-red-700 hover:bg-red-50'
          : 'bg-[#0B3D4A] text-white hover:bg-[#073B4C]'
      }`}
    >
      <Icon className="h-4 w-4" />
      {busy ? 'Updating…' : label}
    </button>
  );
}
