'use client';

import React, { useState, useEffect, useCallback, useId } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  UtensilsCrossed,
  Sparkles,
  BedDouble,
  LogOut,
  RotateCw,
  Calendar,
  DollarSign,
  ShieldCheck
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  GuestStay,
  ActivityOrder,
  ActivityServiceRequest,
  fetchCurrentGuestStay,
  loginGuestStay,
  logoutGuestStay,
  fetchGuestActivity,
  cancelGuestItem
} from '@/lib/guestSession';

interface ReservationSummary {
  id: string;
  booking_number?: string;
  check_in: string;
  check_out: string;
  guests?: number;
  payment_status?: string;
  total_price?: number;
}

interface FolioCharge {
  id: string;
  description: string;
  source_type: string;
  quantity: number;
  amount: number;
}

interface FolioSummary {
  success: boolean;
  charges: FolioCharge[];
  subtotal: number;
  service_charge_percent: number;
  service_charge: number;
  tax_percent: number;
  tax: number;
  total: number;
  currency: string;
  prepaid_amount?: number;
  balance_due?: number;
  error?: string;
}

export default function MyActivityPage() {
  const [stay, setStay] = useState<GuestStay | null>(null);
  const [loadingStay, setLoadingStay] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [orders, setOrders] = useState<ActivityOrder[]>([]);
  const [requests, setRequests] = useState<ActivityServiceRequest[]>([]);
  const [reservation, setReservation] = useState<ReservationSummary | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'orders' | 'services' | 'room' | 'bill'>('all');
  const [folio, setFolio] = useState<FolioSummary | null>(null);
  const [loadingFolio, setLoadingFolio] = useState(false);
  const [folioError, setFolioError] = useState<string | null>(null);

  // Login form state (for guest verification)
  const [roomNumberInput, setRoomNumberInput] = useState('');
  const [identifierInput, setIdentifierInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // Cancellation state
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [pendingCancel, setPendingCancel] = useState<{
    entityType: 'order' | 'service_request';
    entityId: string;
    name: string;
  } | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const roomInputId = useId();
  const identifierInputId = useId();

  // 1. Check existing guest stay session on mount (no synchronous setState inside effect)
  useEffect(() => {
    let active = true;
    (async () => {
      const sessionRes = await fetchCurrentGuestStay();
      if (!active) return;
      if (sessionRes.authenticated && sessionRes.stay) {
        setStay(sessionRes.stay);
      } else {
        setStay(null);
      }
      setLoadingStay(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  // 2. Load activity & folio helpers
  const loadActivity = useCallback(async (stayId?: string, showSpinner = false) => {
    if (showSpinner) {
      setLoadingData(true);
      setActionMessage(null);
    }
    const result = await fetchGuestActivity(stayId);
    if (result.success) {
      setOrders(result.orders);
      setRequests(result.requests);
      setReservation((result.reservation as ReservationSummary) ?? null);
    } else if (result.error) {
      setActionMessage({ type: 'error', text: result.error });
    }
    setLoadingData(false);
  }, []);

  const refreshFolio = useCallback(async (stayId: string, showSpinner = true) => {
    if (showSpinner) {
      setLoadingFolio(true);
    }
    setFolioError(null);
    try {
      const res = await fetch(`/api/folio/${encodeURIComponent(stayId)}`, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
      });
      const data = (await res.json().catch(() => null)) as FolioSummary | null;
      if (!res.ok || !data?.success) {
        setFolio(null);
        setFolioError(
          data?.error ||
            (res.status === 401
              ? 'Your stay verification expired. Please re-verify your room credentials to view your folio.'
              : 'Unable to load your live room folio right now.')
        );
      } else {
        setFolio(data);
      }
    } catch {
      setFolio(null);
      setFolioError('Network error while loading your live room folio. Please retry.');
    } finally {
      setLoadingFolio(false);
    }
  }, []);

  useEffect(() => {
    if (!stay?.id) return;
    let active = true;
    (async () => {
      const result = await fetchGuestActivity(stay.id);
      if (!active) return;
      if (result.success) {
        setOrders(result.orders);
        setRequests(result.requests);
        setReservation((result.reservation as ReservationSummary) ?? null);
      } else if (result.error) {
        setActionMessage({ type: 'error', text: result.error });
      }
    })();
    return () => {
      active = false;
    };
  }, [stay?.id]);

  // 3. Realtime updates for live order & service request status
  useEffect(() => {
    if (!stay?.id) return;

    const channel = supabase
      .channel(`guest-activity-${stay.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          void loadActivity(stay.id);
          if (activeTab === 'bill') {
            void refreshFolio(stay.id, false);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_requests' },
        () => {
          void loadActivity(stay.id);
          if (activeTab === 'bill') {
            void refreshFolio(stay.id, false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [stay?.id, activeTab, loadActivity, refreshFolio]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumberInput.trim() || !identifierInput.trim()) return;

    setLoggingIn(true);
    setLoginError('');

    const res = await loginGuestStay(roomNumberInput.trim(), identifierInput.trim());
    if (res.success && res.stay) {
      setFolio(null);
      setFolioError(null);
      setActionMessage(null);
      setStay(res.stay);
      await loadActivity(res.stay.id, true);
    } else {
      setLoginError(res.error || 'Stay credentials could not be verified.');
    }
    setLoggingIn(false);
  };

  // Handle Logout
  const handleLogout = async () => {
    await logoutGuestStay();
    setStay(null);
    setOrders([]);
    setRequests([]);
    setReservation(null);
    setFolio(null);
    setFolioError(null);
    setActionMessage(null);
    setActiveTab('all');
  };

  // Handle Cancel Item (ONLY allowed while Pending)
  const handleCancelClick = (entityType: 'order' | 'service_request', entityId: string, name: string) => {
    setPendingCancel({ entityType, entityId, name });
  };

  const confirmCancelItem = async () => {
    if (!pendingCancel) return;
    const { entityType, entityId } = pendingCancel;

    setCancellingId(entityId);
    setActionMessage(null);

    const res = await cancelGuestItem(entityType, entityId);
    setPendingCancel(null);
    if (res.success) {
      setActionMessage({ type: 'success', text: res.message || 'Cancelled successfully.' });
      if (stay?.id) {
        await loadActivity(stay.id, true);
        if (activeTab === 'bill') {
          await refreshFolio(stay.id);
        }
      }
    } else {
      setActionMessage({ type: 'error', text: res.error || 'Failed to cancel item.' });
    }
    setCancellingId(null);
  };

  // Status badge helper
  const renderStatusBadge = (statusId: number, statusName?: string) => {
    const name = statusName || (statusId === 1 ? 'Pending' : statusId === 4 ? 'Ready' : statusId === 9 ? 'Cancelled' : 'In Progress');
    switch (statusId) {
      case 1: // Pending
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3" aria-hidden="true" />
            Pending Review
          </span>
        );
      case 7: // Accepted
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
            <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
            Accepted
          </span>
        );
      case 8: // In Progress
      case 3: // Preparing
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#163D32]/10 text-[#163D32] border border-[#163D32]/20">
            <Sparkles className="w-3 h-3" aria-hidden="true" />
            In Progress
          </span>
        );
      case 4: // Ready
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
            Ready for You
          </span>
        );
      case 5: // Delivered
      case 6: // Completed
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#F5F0E6] text-[#163D32] border border-[#E6DFD1]">
            <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
            Completed
          </span>
        );
      case 9: // Cancelled
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3" aria-hidden="true" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#F5F0E6] text-[#52645D] border border-[#E6DFD1]">
            {name}
          </span>
        );
    }
  };

  // Loading state
  if (loadingStay) {
    return (
      <div className="min-h-screen bg-[#F5F0E6] flex items-center justify-center p-6 text-center">
        <div className="space-y-3">
          <div className="h-10 w-10 mx-auto rounded-full border-4 border-[#163D32] border-t-transparent animate-spin" />
          <p className="text-xs font-black uppercase tracking-widest text-[#163D32]">
            Connecting to Resort Guest Stay...
          </p>
        </div>
      </div>
    );
  }

  // ─── GUEST ACCESS FORM (Not logged in) ───
  if (!stay) {
    return (
      <div className="min-h-screen bg-[#163D32] text-white flex flex-col justify-between">
        <header className="border-b border-white/10 bg-[#0F2D24] px-6 py-4">
          <div className="max-w-xl mx-auto flex items-center justify-between">
            <Link href="/guest" className="inline-flex items-center gap-2 text-xs font-bold text-[#F5F0E6]/80 hover:text-white">
              <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Guest Hub
            </Link>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#C5A46D]">
              Tule Resort Hawassa
            </span>
          </div>
        </header>

        <main className="p-6 max-w-md w-full mx-auto my-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-[#C5A46D]/15 border border-[#C5A46D]/35 flex items-center justify-center text-[#C5A46D] shadow-lg shadow-[#C5A46D]/10">
              <ShieldCheck className="w-8 h-8" aria-hidden="true" />
            </div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-white">Access Your Stay</h1>
            <p className="text-xs text-[#F5F0E6]/80 leading-relaxed">
              Enter your room number and booking reference or last name to view real-time orders, wellness requests, and billing activity.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 rounded-3xl border border-white/15 bg-white/[0.06] p-6 backdrop-blur-md shadow-2xl">
            {loginError && (
              <div role="alert" className="rounded-2xl border border-rose-300/35 bg-rose-500/15 p-3.5 text-xs text-rose-100 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-300 mt-0.5" aria-hidden="true" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label htmlFor={roomInputId} className="block text-[11px] font-bold uppercase tracking-[0.18em] text-[#F5F0E6]/85 mb-1.5">
                Room Number or Villa Name
              </label>
              <input
                id={roomInputId}
                required
                type="text"
                placeholder="e.g. 101 or Lake Villa 101"
                value={roomNumberInput}
                onChange={(e) => setRoomNumberInput(e.target.value)}
                className="w-full rounded-2xl border border-white/15 bg-[#0F2D24]/80 p-3 text-sm text-white placeholder-[#F5F0E6]/45 outline-none focus:border-[#C5A46D]"
              />
            </div>

            <div>
              <label htmlFor={identifierInputId} className="block text-[11px] font-bold uppercase tracking-[0.18em] text-[#F5F0E6]/85 mb-1.5">
                Booking Number or Last Name
              </label>
              <input
                id={identifierInputId}
                required
                type="text"
                placeholder="e.g. TUL-DEMO101 or Bekele"
                value={identifierInput}
                onChange={(e) => setIdentifierInput(e.target.value)}
                className="w-full rounded-2xl border border-white/15 bg-[#0F2D24]/80 p-3 text-sm text-white placeholder-[#F5F0E6]/45 outline-none focus:border-[#C5A46D]"
              />
            </div>

            <button
              disabled={loggingIn}
              type="submit"
              className="w-full rounded-full bg-[#C5A46D] py-3.5 text-xs font-extrabold uppercase tracking-[0.15em] text-[#0F2D24] transition hover:brightness-105 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#C5A46D]/20"
            >
              {loggingIn ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-[#0F2D24] border-t-transparent animate-spin" />
                  Verifying Stay...
                </>
              ) : (
                'Access My Activity'
              )}
            </button>
          </form>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
            <p className="text-xs text-[#F5F0E6]/75">
              Need assistance? Dial <strong className="text-white">0</strong> from your in-room telephone or speak with the Front Desk team.
            </p>
          </div>
        </main>

        <footer className="p-4 border-t border-white/10 text-center text-[11px] text-[#F5F0E6]/65">
          Tule Resort &amp; Spa • Hawassa • Guest Identity Verification
        </footer>
      </div>
    );
  }

  // ─── AUTHENTICATED GUEST ACTIVITY VIEW ───
  const totalItemsCount = orders.length + requests.length + (reservation ? 1 : 0);

  return (
    <div className="min-h-screen bg-[#F5F0E6] pb-24 font-sans text-[#1A1A1A] print:bg-white print:pb-0">
      {/* ─── STICKY HEADER ─── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-4 border-b border-[#E6DFD1] shadow-xs print:hidden">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/guest"
              aria-label="Back to Guest Hub"
              className="h-9 w-9 rounded-xl bg-[#F5F0E6] border border-[#E6DFD1] flex items-center justify-center text-[#163D32] hover:bg-[#163D32]/10 transition"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            </Link>
            <div>
              <h1 className="font-display text-lg font-semibold text-[#163D32]">My Resort Activity</h1>
              <p className="text-xs font-medium text-[#52645D]">
                {stay.guest_name} • <span className="font-bold text-[#163D32]">{stay.room_name}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void loadActivity(stay.id, true);
                if (activeTab === 'bill') {
                  void refreshFolio(stay.id);
                }
              }}
              disabled={loadingData || loadingFolio}
              aria-label="Refresh Activity"
              title="Refresh Activity"
              className="h-9 w-9 rounded-xl bg-[#F5F0E6] border border-[#E6DFD1] flex items-center justify-center text-[#163D32] hover:bg-[#163D32]/10 transition"
            >
              <RotateCw className={`w-4 h-4 ${loadingData || loadingFolio ? 'animate-spin text-[#163D32]' : ''}`} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-xl border border-[#E6DFD1] bg-white px-3 py-2 text-xs font-bold text-[#163D32] hover:bg-[#F5F0E6] transition"
            >
              <LogOut className="w-3.5 h-3.5 text-[#52645D]" aria-hidden="true" />
              <span className="hidden sm:inline">Switch Session</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* ─── STAY BANNER ─── */}
        <section className="rounded-3xl bg-gradient-to-r from-[#163D32] via-[#0F2D24] to-[#163D32] text-white p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#C5A46D] border border-[#C5A46D]/25">
                  Checked In
                </span>
                <span className="text-xs text-[#F5F0E6]/80 font-mono">
                  Ref: {stay.booking_number}
                </span>
              </div>
              <h2 className="font-display text-2xl font-semibold mt-2">{stay.room_name}</h2>
              <p className="text-xs text-[#F5F0E6]/85 flex items-center gap-2 mt-1">
                <Calendar className="w-3.5 h-3.5 text-[#C5A46D]" aria-hidden="true" />
                {stay.check_in} — {stay.check_out}
              </p>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 border-white/10 pt-3 sm:pt-0">
              <span className="text-[11px] font-bold text-[#F5F0E6]/75 uppercase tracking-widest">Active Stay</span>
              <span className="text-xl font-extrabold text-[#C5A46D]">Guest Verified</span>
            </div>
          </div>
        </section>

        {/* Action Notifications */}
        {actionMessage && (
          <div
            role={actionMessage.type === 'error' ? 'alert' : 'status'}
            className={`rounded-2xl p-4 text-xs font-bold flex items-center justify-between ${actionMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
          >
            <span>{actionMessage.text}</span>
            <button
              type="button"
              onClick={() => setActionMessage(null)}
              aria-label="Dismiss notification"
              className="text-[#52645D] hover:text-[#163D32] px-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* ─── TABS ─── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar print:hidden">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition-all ${activeTab === 'all'
              ? 'bg-[#163D32] text-[#C5A46D] shadow-md'
              : 'bg-white text-[#163D32] border border-[#E6DFD1] hover:bg-[#163D32]/5'
              }`}
          >
            All Activity ({totalItemsCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition-all ${activeTab === 'orders'
              ? 'bg-[#163D32] text-[#C5A46D] shadow-md'
              : 'bg-white text-[#163D32] border border-[#E6DFD1] hover:bg-[#163D32]/5'
              }`}
          >
            Food &amp; Dining ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('services')}
            className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition-all ${activeTab === 'services'
              ? 'bg-[#163D32] text-[#C5A46D] shadow-md'
              : 'bg-white text-[#163D32] border border-[#E6DFD1] hover:bg-[#163D32]/5'
              }`}
          >
            Experiences &amp; Spa ({requests.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('room')}
            className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition-all ${activeTab === 'room'
              ? 'bg-[#163D32] text-[#C5A46D] shadow-md'
              : 'bg-white text-[#163D32] border border-[#E6DFD1] hover:bg-[#163D32]/5'
              }`}
          >
            Room Stay
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('bill');
              if (stay?.id) {
                void refreshFolio(stay.id);
              }
            }}
            className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition-all ${activeTab === 'bill'
              ? 'bg-[#163D32] text-[#C5A46D] shadow-md'
              : 'bg-white text-[#163D32] border border-[#E6DFD1] hover:bg-[#163D32]/5'
              }`}
          >
            My Folio &amp; Bill
          </button>
        </div>

        {/* ─── LIST CONTENT ─── */}
        {activeTab === 'bill' ? (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-[#E6DFD1] space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E6DFD1] pb-4">
              <div>
                <h3 className="font-display text-xl font-semibold text-[#163D32]">Itemized Resort Bill</h3>
                <p className="text-xs text-[#52645D]">Live charges posted to {stay.room_name} ({stay.booking_number})</p>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <button
                  type="button"
                  onClick={() => void refreshFolio(stay.id)}
                  disabled={loadingFolio}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#E6DFD1] bg-[#F5F0E6]/60 px-3 py-1.5 text-xs font-bold text-[#163D32] hover:bg-[#F5F0E6] transition disabled:opacity-50"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${loadingFolio ? 'animate-spin' : ''}`} aria-hidden="true" />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#163D32] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#0F2D24] transition"
                >
                  Print Bill
                </button>
              </div>
            </div>

            {loadingFolio ? (
              <p className="py-8 text-center text-xs text-[#52645D]">Loading live folio totals from server...</p>
            ) : folioError ? (
              <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center space-y-3">
                <AlertCircle className="w-6 h-6 text-rose-600 mx-auto" aria-hidden="true" />
                <p className="text-xs font-bold text-rose-800">{folioError}</p>
                <button
                  type="button"
                  onClick={() => void refreshFolio(stay.id)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-700 px-4 py-2 text-xs font-bold text-white hover:bg-rose-800 transition"
                >
                  <RotateCw className="w-3.5 h-3.5" aria-hidden="true" /> Retry Loading Bill
                </button>
              </div>
            ) : !folio || !folio.charges || folio.charges.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <DollarSign className="w-8 h-8 text-[#7A5A27]/60 mx-auto" aria-hidden="true" />
                <p className="text-sm font-bold text-[#163D32]">No Folio Charges Posted Yet</p>
                <p className="text-xs text-[#52645D] max-w-sm mx-auto">
                  Completed dining orders, spa charges, and room folio items appear here automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="divide-y divide-[#E6DFD1]">
                  {folio.charges.map((c) => (
                    <div key={c.id} className="py-3 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-[#1A1A1A]">{c.description}</span>
                        <span className="block text-[11px] text-[#52645D] capitalize">{c.source_type} • Qty {c.quantity}</span>
                      </div>
                      <span className="font-extrabold text-[#163D32]">{Number(c.amount).toLocaleString()} {folio.currency || 'ETB'}</span>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl bg-[#F5F0E6]/70 p-4 space-y-2 border border-[#E6DFD1] text-xs">
                  <div className="flex justify-between text-[#52645D]">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold text-[#1A1A1A]">{Number(folio.subtotal).toLocaleString()} {folio.currency}</span>
                  </div>
                  <div className="flex justify-between text-[#52645D]">
                    <span>Resort Service Charge ({folio.service_charge_percent}%):</span>
                    <span className="font-mono font-semibold text-[#1A1A1A]">{Number(folio.service_charge).toLocaleString()} {folio.currency}</span>
                  </div>
                  <div className="flex justify-between text-[#52645D] border-b border-[#E6DFD1] pb-2">
                    <span>Tax / VAT ({folio.tax_percent}%):</span>
                    <span className="font-mono font-semibold text-[#1A1A1A]">{Number(folio.tax).toLocaleString()} {folio.currency}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-[#163D32] pt-1">
                    <span>Estimated Total:</span>
                    <span className="font-mono text-[#163D32]">{Number(folio.total).toLocaleString()} {folio.currency}</span>
                  </div>
                  {Number(folio.prepaid_amount ?? 0) > 0 && (
                    <>
                      <div className="flex justify-between text-emerald-800 font-bold">
                        <span>Already Paid Online:</span>
                        <span className="font-mono">- {Number(folio.prepaid_amount).toLocaleString()} {folio.currency}</span>
                      </div>
                      <div className="flex justify-between text-sm font-black text-[#163D32] pt-1 border-t border-[#E6DFD1]">
                        <span>Remaining Balance Due:</span>
                        <span className="font-mono text-[#163D32]">{Number(folio.balance_due ?? Math.max(0, Number(folio.total) - Number(folio.prepaid_amount))).toLocaleString()} {folio.currency}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'all' && loadingData && totalItemsCount === 0 ? (
          <div className="rounded-3xl bg-white p-12 text-center border border-[#E6DFD1] shadow-sm space-y-2">
            <RotateCw className="w-6 h-6 animate-spin text-[#163D32] mx-auto" aria-hidden="true" />
            <p className="text-xs font-bold text-[#52645D]">Syncing your stay activity...</p>
          </div>
        ) : activeTab === 'all' && totalItemsCount === 0 ? (
          <div className="rounded-3xl bg-white p-12 text-center border border-[#E6DFD1] shadow-sm space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-[#F5F0E6] text-[#7A5A27] mx-auto flex items-center justify-center">
              <Sparkles className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="font-display text-xl font-semibold text-[#163D32]">No Activity Recorded Yet</h3>
            <p className="text-xs text-[#52645D] max-w-sm mx-auto">
              Place dining orders or book wellness and leisure services to track them here in real time.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-3">
              <Link
                href="/guest/resort-menu"
                className="rounded-xl bg-[#163D32] px-4 py-2 text-xs font-bold text-[#C5A46D] hover:bg-[#0F2D24] transition"
              >
                Browse Resort Menu
              </Link>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('bill');
                  if (stay?.id) void refreshFolio(stay.id);
                }}
                className="rounded-xl border border-[#E6DFD1] bg-white px-4 py-2 text-xs font-bold text-[#163D32] hover:bg-[#F5F0E6] transition"
              >
                View My Folio &amp; Bill
              </button>
            </div>
          </div>
        ) : activeTab === 'orders' && orders.length === 0 ? (
          <div className="rounded-3xl bg-white p-12 text-center border border-[#E6DFD1] shadow-sm space-y-3">
            <UtensilsCrossed className="w-8 h-8 text-[#7A5A27] mx-auto" aria-hidden="true" />
            <h3 className="font-display text-xl font-semibold text-[#163D32]">No Food &amp; Dining Orders Yet</h3>
            <p className="text-xs text-[#52645D] max-w-sm mx-auto">
              Explore our restaurant &amp; lakeside dining menu to place an order to your room.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <Link
                href="/guest/resort-menu"
                className="rounded-xl bg-[#163D32] px-4 py-2 text-xs font-bold text-[#C5A46D] hover:bg-[#0F2D24] transition"
              >
                Open Resort Menu
              </Link>
            </div>
          </div>
        ) : activeTab === 'services' && requests.length === 0 ? (
          <div className="rounded-3xl bg-white p-12 text-center border border-[#E6DFD1] shadow-sm space-y-3">
            <Sparkles className="w-8 h-8 text-[#7A5A27] mx-auto" aria-hidden="true" />
            <h3 className="font-display text-xl font-semibold text-[#163D32]">No Experiences or Spa Requests Yet</h3>
            <p className="text-xs text-[#52645D] max-w-sm mx-auto">
              Book spa rituals, pool cabanas, airport transfers, or curated resort services anytime.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <Link
                href="/guest/services"
                className="rounded-xl bg-[#163D32] px-4 py-2 text-xs font-bold text-[#C5A46D] hover:bg-[#0F2D24] transition"
              >
                Explore Resort Services
              </Link>
            </div>
          </div>
        ) : activeTab === 'room' && !reservation ? (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#E6DFD1] space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#163D32] text-[#C5A46D] flex items-center justify-center shadow-xs">
                  <BedDouble className="w-6 h-6" aria-hidden="true" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#163D32]">
                      Active Stay
                    </span>
                    <span className="text-[11px] text-[#52645D] font-mono">
                      #{stay.booking_number}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-[#163D32]">{stay.room_name}</h3>
                  <p className="text-xs text-[#52645D]">
                    {stay.check_in} — {stay.check_out}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                Checked In
              </span>
            </div>
            <p className="text-xs text-[#52645D] border-t border-[#E6DFD1] pt-3">
              Your stay was registered directly by the resort desk. Open <strong className="text-[#163D32]">My Folio &amp; Bill</strong> to view posted room charges.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 1. ROOM RESERVATION CARD */}
            {(activeTab === 'all' || activeTab === 'room') && reservation && (
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#E6DFD1] space-y-4 hover:border-[#163D32]/30 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-[#163D32] text-[#C5A46D] flex items-center justify-center shadow-xs">
                      <BedDouble className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#163D32]">
                          Accommodation
                        </span>
                        <span className="text-[11px] text-[#52645D] font-mono">
                          #{reservation.booking_number}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-[#163D32]">{stay.room_name}</h3>
                      <p className="text-xs text-[#52645D]">
                        {reservation.check_in} — {reservation.check_out} ({reservation.guests || 2} Guests)
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                    Active Stay
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#E6DFD1] text-xs">
                  <span className="text-[#52645D] font-medium">Payment status: <strong className="text-[#163D32] capitalize">{reservation.payment_status || 'Pending'}</strong></span>
                  <span className="font-extrabold text-[#163D32]">{Number(reservation.total_price || 0).toLocaleString()} ETB</span>
                </div>
              </div>
            )}

            {/* 2. ORDERS LIST */}
            {(activeTab === 'all' || activeTab === 'orders') &&
              orders.map((order) => {
                const isPending = order.status_id === 1;
                const itemsSummary = (order.order_items || [])
                  .map((i) => `${i.quantity}x ${i.menu_item?.name || 'Item'}`)
                  .join(', ');

                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-3xl p-5 shadow-sm border border-[#E6DFD1] space-y-3 hover:border-[#163D32]/30 transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-[#F5F0E6] border border-[#E6DFD1] text-[#7A5A27] flex items-center justify-center shadow-xs">
                          <UtensilsCrossed className="w-6 h-6" aria-hidden="true" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A5A27]">
                              {order.department?.name || 'Restaurant / Kitchen'}
                            </span>
                            {order.room_number && (
                              <span className="text-[11px] text-[#52645D] font-medium">
                                Room {order.room_number}
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-sm text-[#163D32]">
                            {itemsSummary || 'Dining Order'}
                          </h3>
                          <p className="text-xs text-[#52645D]">
                            {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Total: {Number(order.total).toLocaleString()} ETB
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        {renderStatusBadge(order.status_id, order.status?.name)}

                        {/* CANCEL BUTTON: ONLY while Pending */}
                        {isPending && (
                          <button
                            type="button"
                            disabled={cancellingId === order.id}
                            onClick={() => handleCancelClick('order', order.id, itemsSummary || 'Dining Order')}
                            className="text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1 rounded-full transition disabled:opacity-50"
                          >
                            {cancellingId === order.id ? 'Cancelling...' : 'Cancel Order'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Order details expansion */}
                    {order.order_items && order.order_items.length > 0 && (
                      <div className="pt-2 border-t border-[#E6DFD1]/60 flex flex-wrap gap-2">
                        {order.order_items.map((it) => (
                          <span
                            key={it.id}
                            className="inline-flex items-center rounded-lg bg-[#F5F0E6]/70 border border-[#E6DFD1] px-2.5 py-1 text-[11px] font-medium text-[#52645D]"
                          >
                            {it.quantity}x {it.menu_item?.name || 'Item'} ({(it.price * it.quantity).toLocaleString()} ETB)
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

            {/* 3. SERVICE REQUESTS LIST */}
            {(activeTab === 'all' || activeTab === 'services') &&
              requests.map((req) => {
                const isPending = req.status_id === 1;
                const serviceTitle = req.service_id.replace(/-/g, ' ');

                return (
                  <div
                    key={req.id}
                    className="bg-white rounded-3xl p-5 shadow-sm border border-[#E6DFD1] space-y-3 hover:border-[#163D32]/30 transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-[#163D32]/10 border border-[#163D32]/15 text-[#163D32] flex items-center justify-center shadow-xs">
                          <Sparkles className="w-6 h-6" aria-hidden="true" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[#163D32]">
                              {req.department?.name || 'Resort Service'}
                            </span>
                            <span className="text-[11px] text-[#52645D] capitalize">
                              {serviceTitle}
                            </span>
                          </div>
                          <h3 className="font-bold text-sm text-[#163D32] capitalize">
                            {serviceTitle} Request
                          </h3>
                          <p className="text-xs text-[#52645D]">
                            Requested for {req.requested_date} {req.requested_time ? `at ${req.requested_time}` : ''} • Party of {req.party_size}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        {renderStatusBadge(req.status_id, req.status?.name)}

                        {/* CANCEL BUTTON: ONLY while Pending */}
                        {isPending && (
                          <button
                            type="button"
                            disabled={cancellingId === req.id}
                            onClick={() => handleCancelClick('service_request', req.id, serviceTitle)}
                            className="text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1 rounded-full transition disabled:opacity-50"
                          >
                            {cancellingId === req.id ? 'Cancelling...' : 'Cancel Request'}
                          </button>
                        )}
                      </div>
                    </div>

                    {req.notes && (
                      <p className="text-xs text-[#52645D] bg-[#F5F0E6]/60 p-2.5 rounded-xl border border-[#E6DFD1]">
                        Notes: {req.notes}
                      </p>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </main>

      <ConfirmDialog
        open={Boolean(pendingCancel)}
        title={pendingCancel?.entityType === 'order' ? 'Cancel Dining Order?' : 'Cancel Service Request?'}
        description={
          pendingCancel
            ? `Are you sure you want to cancel "${pendingCancel.name}"? Only pending items can be cancelled online.`
            : ''
        }
        confirmLabel="Yes, Cancel Item"
        tone="danger"
        busy={Boolean(cancellingId)}
        onConfirm={() => void confirmCancelItem()}
        onCancel={() => {
          if (!cancellingId) setPendingCancel(null);
        }}
      />
    </div>
  );
}
