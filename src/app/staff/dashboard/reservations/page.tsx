'use client';

import { useEffect, useId, useState } from 'react';
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

type VerifyModalResult = {
  success?: boolean;
  verified: boolean;
  message: string;
  bankName?: string;
  transactionNumber?: string;
  amount?: number;
  currency?: string;
  payerName?: string;
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
  const [verifyResult, setVerifyResult] = useState<VerifyModalResult | null>(null);

  const verifyModalTitleId = useId();
  const verifyRefInputId = useId();

  async function load() {
    setLoading(true);
    setError('');
    const { data, error: fetchError } = await supabase
      .from('room_reservations')
      .select('*, room:rooms(name, room_type)')
      .order('created_at', { ascending: false });

    if (fetchError) setError(fetchError.message);
    else setReservations((data ?? []) as Reservation[]);
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error: fetchError } = await supabase
        .from('room_reservations')
        .select('*, room:rooms(name, room_type)')
        .order('created_at', { ascending: false });
      if (!active) return;
      if (fetchError) setError(fetchError.message);
      else setReservations((data ?? []) as Reservation[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!verifyingRes) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setVerifyingRes(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [verifyingRes]);

  async function changeStatus(id: string, status: Reservation['status']) {
    setBusy(id);
    setError('');
    if (status === 'checked_out') {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) {
          setError('Staff session expired. Please sign in again to process checkout.');
          setBusy('');
          return;
        }
        const target = reservations.find((r) => r.id === id);
        const res = await fetch(`/api/folio/${id}/checkout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            paymentMethod: target?.payment_method || 'pay_at_resort',
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          setError(json.error || 'Checkout failed. Open Folio & Bill to settle stay charges.');
        } else {
          await load();
        }
      } catch {
        setError('Network error executing guest checkout.');
      } finally {
        setBusy('');
      }
      return;
    }

    const patch: { status: Reservation['status']; updated_at: string; checked_in_at?: string } = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === 'checked_in') patch.checked_in_at = new Date().toISOString();
    const { error: updateError } = await supabase.from('room_reservations').update(patch).eq('id', id);
    if (updateError) setError(updateError.message);
    else await load();
    setBusy('');
  }

  async function changePayment(id: string, payment_status: string) {
    setBusy(id);
    const { error: updateError } = await supabase
      .from('room_reservations')
      .update({ payment_status, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (updateError) setError(updateError.message);
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
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          reference: verifyInputRef.trim(),
          bank: verifyingRes.payment_method,
          expectedAmount: Number(verifyingRes.total_price || 0),
          currency: verifyingRes.currency || 'ETB',
        }),
      });

      const data = (await res.json()) as VerifyModalResult;
      setVerifyResult(data);

      if (data.verified) {
        await supabase
          .from('room_reservations')
          .update({
            payment_status: 'paid',
            payment_reference: data.transactionNumber || verifyInputRef.trim().toUpperCase(),
            status: verifyingRes.status === 'pending' ? 'confirmed' : verifyingRes.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', verifyingRes.id);

        await supabase.rpc('register_payment_reference', {
          p_reference: data.transactionNumber || verifyInputRef.trim().toUpperCase(),
          p_entity_type: 'reservation',
          p_entity_id: verifyingRes.id,
          p_amount: Number(verifyingRes.total_price || 0),
          p_currency: verifyingRes.currency || 'ETB',
        });

        await load();
      }
    } catch (err: unknown) {
      setVerifyResult({
        success: false,
        verified: false,
        message: err instanceof Error ? err.message : 'Network error verifying payment.',
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
    <div className="min-h-screen bg-[#F5F0E6] text-[#1A1A1A]">
      <div className="mx-auto max-w-7xl px-4 py-7 md:px-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6DFD1] pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#163D32] text-[#C5A46D] shadow-md">
              <CalendarDays className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7A5A27]">
                Tule Resort · Manager Console
              </p>
              <h1 className="font-display text-3xl font-semibold text-[#163D32]">Reservations</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="flex w-fit items-center gap-2 rounded-xl border border-[#163D32]/15 bg-white px-4 py-2.5 text-sm font-bold text-[#163D32] hover:bg-[#163D32]/5 transition cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </button>
        </div>

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
              type="button"
              key={s}
              onClick={() => setFilter(filter === s ? 'all' : s)}
              className={`rounded-2xl border p-4 text-left bg-white transition cursor-pointer ${
                filter === s
                  ? 'border-[#C5A46D] ring-2 ring-[#C5A46D]/25'
                  : 'border-[#E6DFD1] hover:border-[#163D32]/30'
              }`}
            >
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#52645D]">
                {statusLabel[s]}
              </p>
              <p className="mt-1 text-2xl font-black text-[#163D32]">{counts[s] || 0}</p>
            </button>
          ))}
        </div>

        {error && (
          <div role="alert" className="rounded-xl bg-rose-50 p-4 text-sm font-bold text-rose-800 border border-rose-200">
            {error}
          </div>
        )}

        {loading ? (
          <p className="py-16 text-center text-[#52645D]">Loading reservations…</p>
        ) : visible.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#E6DFD1] bg-white p-14 text-center">
            <Clock3 className="mx-auto h-10 w-10 text-[#7A5A27]/35" aria-hidden="true" />
            <p className="mt-4 font-display text-3xl text-[#163D32]">No reservations found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((r) => (
              <article
                key={r.id}
                className="rounded-3xl border border-[#E6DFD1] bg-white p-5 shadow-sm md:p-6"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#F5F0E6] border border-[#E6DFD1] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#163D32] font-mono">
                        {r.booking_number}
                      </span>
                      <span className="rounded-full bg-[#163D32]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#163D32]">
                        {statusLabel[r.status]}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
                          r.payment_status === 'paid'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {r.payment_status === 'paid' ? '✓ Paid' : 'Payment Pending'}
                      </span>
                    </div>

                    <h2 className="mt-3 font-display text-2xl font-semibold text-[#163D32]">
                      {r.guest_name}
                    </h2>
                    <p className="mt-1 text-sm text-[#52645D]">
                      {r.room?.name || 'Room'} · {r.guests} guest{r.guests === 1 ? '' : 's'}
                    </p>
                  </div>

                  <div className="lg:text-right">
                    <p className="text-2xl font-black text-[#163D32]">
                      {Number(r.total_price || 0).toLocaleString()} {r.currency}
                    </p>
                    <p className="text-xs text-[#52645D] mt-1 capitalize">
                      Method: <strong className="text-[#163D32]">{r.payment_method?.replaceAll('_', ' ') || 'Pay at Resort'}</strong>
                    </p>
                    {r.payment_reference && (
                      <p className="text-xs text-emerald-800 font-mono font-bold mt-0.5">
                        Ref: {r.payment_reference}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 rounded-2xl bg-[#F5F0E6]/75 border border-[#E6DFD1] p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <Info label="Check-in" value={r.check_in} />
                  <Info label="Check-out" value={r.check_out} />
                  <Info label="Phone" value={r.guest_phone} />
                  <Info label="Email" value={r.guest_email || '—'} />
                </div>

                {r.special_requests && (
                  <p className="mt-4 rounded-xl bg-[#F5F0E6] border border-[#E6DFD1] p-3 text-sm text-[#1A1A1A]">
                    <strong className="text-[#163D32]">Special request:</strong> {r.special_requests}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#E6DFD1] pt-4">
                  {/* Verify.ET Bank Verifier Trigger */}
                  <button
                    type="button"
                    onClick={() => openVerifyModal(r)}
                    className="flex items-center gap-2 rounded-xl bg-[#0F2D24] hover:bg-[#163D32] px-4 py-2.5 text-sm font-bold text-[#C5A46D] transition shadow-sm cursor-pointer"
                    title="Verify payment with Verify.ET"
                  >
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
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
                        className="flex items-center gap-2 rounded-xl border border-[#163D32]/20 bg-[#F5F0E6] px-4 py-2.5 text-sm font-bold text-[#163D32] hover:bg-[#E6DFD1] transition"
                      >
                        <FileText className="h-4 w-4" aria-hidden="true" />
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setVerifyingRes(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={verifyModalTitleId}
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-[#E6DFD1] space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#E6DFD1] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#163D32] text-[#C5A46D]">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 id={verifyModalTitleId} className="font-bold text-[#163D32] text-sm">
                    Verify.ET Ethiopian Bank Check
                  </h3>
                  <p className="text-[11px] text-[#52645D] font-semibold uppercase">
                    Automated Non-Custodial Verification
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close payment verification modal"
                onClick={() => setVerifyingRes(null)}
                className="rounded-lg p-1.5 text-[#52645D] hover:bg-[#F5F0E6] hover:text-[#163D32] text-sm"
              >
                ✕
              </button>
            </div>

            <div className="rounded-2xl bg-[#F5F0E6] p-3.5 text-xs space-y-1.5 border border-[#E6DFD1]">
              <div className="flex justify-between">
                <span className="text-[#52645D]">Guest:</span>
                <span className="font-bold text-[#163D32]">{verifyingRes.guest_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#52645D]">Booking:</span>
                <span className="font-mono font-bold text-[#163D32]">{verifyingRes.booking_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#52645D]">Required Amount:</span>
                <span className="font-bold text-emerald-800">
                  {Number(verifyingRes.total_price || 0).toLocaleString()} {verifyingRes.currency || 'ETB'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#52645D]">Payment Method:</span>
                <span className="font-bold capitalize text-[#163D32]">{verifyingRes.payment_method?.replaceAll('_', ' ')}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor={verifyRefInputId} className="block text-xs font-bold text-[#163D32]">
                Transaction Reference / FT / Receipt Code:
              </label>
              <input
                id={verifyRefInputId}
                type="text"
                placeholder="e.g. FT26144SG2ST or Telebirr Txn Number"
                value={verifyInputRef}
                onChange={(e) => setVerifyInputRef(e.target.value)}
                className="w-full rounded-xl border border-[#E6DFD1] bg-white px-3.5 py-2.5 text-xs font-mono font-bold text-[#163D32] focus:border-[#163D32] focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => void runVerification()}
                disabled={verifyLoading || !verifyInputRef.trim()}
                className="flex-1 rounded-xl bg-[#163D32] hover:bg-[#0F2D24] py-2.5 text-xs font-bold text-[#C5A46D] transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                {verifyLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Checking with Bank Network...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" aria-hidden="true" />
                    Verify on Bank Network
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setVerifyingRes(null)}
                className="rounded-xl border border-[#E6DFD1] px-4 py-2.5 text-xs font-bold text-[#52645D] hover:bg-[#F5F0E6]"
              >
                Close
              </button>
            </div>

            {/* Verification Result Feedback */}
            {verifyResult && (
              <div
                role="status"
                className={`rounded-xl p-3.5 text-xs border animate-in fade-in-50 ${
                  verifyResult.verified
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-rose-50 border-rose-200 text-rose-950'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {verifyResult.verified ? (
                    <CheckCircle className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-rose-700 shrink-0 mt-0.5" aria-hidden="true" />
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
                          <span className="text-emerald-800/80 block">Verified Amount:</span>
                          <span className="font-bold">
                            {verifyResult.amount?.toLocaleString()} {verifyResult.currency || 'ETB'}
                          </span>
                        </div>
                        <div>
                          <span className="text-emerald-800/80 block">Payer / Account:</span>
                          <span className="font-bold">{verifyResult.payerName || 'Verified Guest'}</span>
                        </div>
                        <div className="col-span-2 text-emerald-800 font-bold">
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
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#52645D]">{label}</p>
      <p className="mt-1 break-all font-bold text-[#163D32]">{value}</p>
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
      type="button"
      disabled={busy}
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50 transition cursor-pointer ${
        danger
          ? 'border border-rose-200 text-rose-700 hover:bg-rose-50'
          : 'bg-[#163D32] text-white hover:bg-[#0F2D24]'
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {busy ? 'Updating…' : label}
    </button>
  );
}
