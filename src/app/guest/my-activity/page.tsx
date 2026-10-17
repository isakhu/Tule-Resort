'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Phone,
  DollarSign,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
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

export default function MyActivityPage() {
  const [stay, setStay] = useState<GuestStay | null>(null);
  const [loadingStay, setLoadingStay] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [orders, setOrders] = useState<ActivityOrder[]>([]);
  const [requests, setRequests] = useState<ActivityServiceRequest[]>([]);
  const [reservation, setReservation] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'orders' | 'services' | 'room' | 'bill'>('all');
  const [folio, setFolio] = useState<any>(null);
  const [loadingFolio, setLoadingFolio] = useState(false);

  // Login form state (for guest verification)
  const [roomNumberInput, setRoomNumberInput] = useState('');
  const [identifierInput, setIdentifierInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // Cancellation state
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. Check existing guest stay session on mount
  const checkSession = useCallback(async () => {
    setLoadingStay(true);
    const sessionRes = await fetchCurrentGuestStay();
    if (sessionRes.authenticated && sessionRes.stay) {
      setStay(sessionRes.stay);
    } else {
      setStay(null);
    }
    setLoadingStay(false);
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // 2. Load activity for active stay
  const loadActivity = useCallback(async (stayId?: string) => {
    setLoadingData(true);
    setActionMessage(null);
    const result = await fetchGuestActivity(stayId);
    if (result.success) {
      setOrders(result.orders);
      setRequests(result.requests);
      setReservation(result.reservation);
    } else if (result.error) {
      setActionMessage({ type: 'error', text: result.error });
    }
    setLoadingData(false);
  }, []);

  useEffect(() => {
    if (stay?.id) {
      loadActivity(stay.id);
    }
  }, [stay?.id, loadActivity]);

  useEffect(() => {
    if (activeTab === 'bill' && stay?.id) {
      setLoadingFolio(true);
      fetch(`/api/folio/${stay.id}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success) setFolio(d);
          setLoadingFolio(false);
        })
        .catch(() => setLoadingFolio(false));
    }
  }, [activeTab, stay?.id]);

  // 3. Realtime updates for live order & service request status
  useEffect(() => {
    if (!stay?.id) return;

    const channel = supabase
      .channel(`guest-activity-${stay.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          loadActivity(stay.id);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_requests' },
        () => {
          loadActivity(stay.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [stay?.id, loadActivity]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumberInput.trim() || !identifierInput.trim()) return;

    setLoggingIn(true);
    setLoginError('');

    const res = await loginGuestStay(roomNumberInput.trim(), identifierInput.trim());
    if (res.success && res.stay) {
      setStay(res.stay);
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
  };

  // Handle Cancel Item (ONLY allowed while Pending)
  const handleCancel = async (entityType: 'order' | 'service_request', entityId: string, name: string) => {
    if (!confirm(`Are you sure you want to cancel "${name}"?`)) return;

    setCancellingId(entityId);
    setActionMessage(null);

    const res = await cancelGuestItem(entityType, entityId);
    if (res.success) {
      setActionMessage({ type: 'success', text: res.message || 'Cancelled successfully.' });
      if (stay?.id) await loadActivity(stay.id);
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
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 animate-spin" />
            Pending Review
          </span>
        );
      case 7: // Accepted
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle2 className="w-3 h-3" />
            Accepted
          </span>
        );
      case 8: // In Progress
      case 3: // Preparing
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200">
            <Sparkles className="w-3 h-3" />
            In Progress
          </span>
        );
      case 4: // Ready
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Ready for You
          </span>
        );
      case 5: // Delivered
      case 6: // Completed
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-stone-100 text-stone-700 border border-stone-200">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        );
      case 9: // Cancelled
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-stone-50 text-stone-600 border border-stone-200">
            {name}
          </span>
        );
    }
  };

  // Loading state
  if (loadingStay) {
    return (
      <div className="min-h-screen bg-[#FCFAF7] flex items-center justify-center p-6 text-center">
        <div className="space-y-3">
          <div className="h-10 w-10 mx-auto rounded-full border-4 border-[#0B252C] border-t-transparent animate-spin" />
          <p className="text-xs font-black uppercase tracking-widest text-[#0B252C]">
            Connecting to Resort Guest Stay...
          </p>
        </div>
      </div>
    );
  }

  // ─── GUEST ACCESS FORM (Not logged in) ───
  if (!stay) {
    return (
      <div className="min-h-screen bg-[#0C0B09] text-white flex flex-col justify-between">
        <header className="border-b border-white/10 bg-[#17120D] px-6 py-4">
          <div className="max-w-xl mx-auto flex items-center justify-between">
            <Link href="/guest" className="inline-flex items-center gap-2 text-xs font-bold text-white/60 hover:text-white">
              <ArrowLeft className="w-4 h-4" /> Guest Hub
            </Link>
            <span className="text-[10px] font-black uppercase tracking-[.2em] text-[#F2B84B]">
              Tule Resort Hawassa
            </span>
          </div>
        </header>

        <main className="p-6 max-w-md w-full mx-auto my-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-[#F2B84B]/10 border border-[#F2B84B]/30 flex items-center justify-center text-[#F2B84B] shadow-lg shadow-[#F2B84B]/10">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tight">Access Your Stay</h1>
            <p className="text-xs text-white/55 leading-relaxed">
              Enter your room number and booking reference or last name to view real-time orders, wellness requests, and billing activity.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 rounded-3xl border border-white/10 bg-white/[.04] p-6 backdrop-blur-md shadow-2xl">
            {loginError && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-200 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black uppercase tracking-[.18em] text-white/50 mb-1.5">
                Room Number or Villa Name
              </label>
              <input
                required
                type="text"
                placeholder="e.g. 101 or Lake Villa 101"
                value={roomNumberInput}
                onChange={(e) => setRoomNumberInput(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white placeholder-white/30 outline-none focus:border-[#F2B84B]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-[.18em] text-white/50 mb-1.5">
                Booking Number or Last Name
              </label>
              <input
                required
                type="text"
                placeholder="e.g. TUL-DEMO101 or Bekele"
                value={identifierInput}
                onChange={(e) => setIdentifierInput(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white placeholder-white/30 outline-none focus:border-[#F2B84B]"
              />
            </div>

            <button
              disabled={loggingIn}
              type="submit"
              className="w-full rounded-full bg-[#F2B84B] py-3.5 text-xs font-black uppercase tracking-[.15em] text-stone-950 transition hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#F2B84B]/20"
            >
              {loggingIn ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-stone-950 border-t-transparent animate-spin" />
                  Verifying Stay...
                </>
              ) : (
                'Access My Activity'
              )}
            </button>
          </form>

          <div className="rounded-2xl border border-white/5 bg-white/[.02] p-4 text-center">
            <p className="text-[11px] text-white/40">
              Need assistance? Dial <strong>0</strong> from your in-room telephone or speak with the Front Desk team.
            </p>
          </div>
        </main>

        <footer className="p-4 border-t border-white/10 text-center text-[10px] text-white/30">
          Tule Resort &amp; Spa • Hawassa • Guest Identity Verification
        </footer>
      </div>
    );
  }

  // ─── AUTHENTICATED GUEST ACTIVITY VIEW ───
  const totalItemsCount = orders.length + requests.length + (reservation ? 1 : 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans text-stone-900">
      {/* ─── STICKY HEADER ─── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md px-4 sm:px-6 py-4 border-b border-gray-100 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/guest"
              className="h-9 w-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-200 transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-base font-extrabold text-[#0B252C]">My Resort Activity</h1>
              <p className="text-[11px] font-medium text-gray-500">
                {stay.guest_name} • <span className="font-bold text-[#0E7480]">{stay.room_name}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadActivity(stay.id)}
              disabled={loadingData}
              title="Refresh Activity"
              className="h-9 w-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-200 transition"
            >
              <RotateCw className={`w-4 h-4 ${loadingData ? 'animate-spin text-[#0E7480]' : ''}`} />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
            >
              <LogOut className="w-3.5 h-3.5 text-gray-500" />
              <span className="hidden sm:inline">Switch Session</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* ─── STAY BANNER ─── */}
        <section className="rounded-3xl bg-gradient-to-r from-[#0B252C] via-[#0E353F] to-[#0E7480] text-white p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#F8D77A] border border-[#F8D77A]/20">
                  Checked In
                </span>
                <span className="text-xs text-white/70 font-mono">
                  Ref: {stay.booking_number}
                </span>
              </div>
              <h2 className="text-2xl font-black mt-2">{stay.room_name}</h2>
              <p className="text-xs text-white/75 flex items-center gap-2 mt-1">
                <Calendar className="w-3.5 h-3.5 text-[#F8D77A]" />
                {stay.check_in} — {stay.check_out}
              </p>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 border-white/10 pt-3 sm:pt-0">
              <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Active Stay</span>
              <span className="text-xl font-black text-[#F8D77A]">Guest Verified</span>
            </div>
          </div>
        </section>

        {/* Action Notifications */}
        {actionMessage && (
          <div
            className={`rounded-2xl p-4 text-xs font-bold flex items-center justify-between ${
              actionMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <span>{actionMessage.text}</span>
            <button onClick={() => setActionMessage(null)} className="text-stone-400 hover:text-stone-700">✕</button>
          </div>
        )}

        {/* ─── TABS ─── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('all')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-[#0B252C] text-[#F8D77A] shadow-md'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            All Activity ({totalItemsCount})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'orders'
                ? 'bg-[#0B252C] text-[#F8D77A] shadow-md'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            Food &amp; Dining ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'services'
                ? 'bg-[#0B252C] text-[#F8D77A] shadow-md'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            Experiences &amp; Spa ({requests.length})
          </button>
          <button
            onClick={() => setActiveTab('room')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'room'
                ? 'bg-[#0B252C] text-[#F8D77A] shadow-md'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            Room Stay
          </button>
          <button
            onClick={() => setActiveTab('bill')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'bill'
                ? 'bg-[#0B252C] text-[#F8D77A] shadow-md'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            My Folio &amp; Bill
          </button>
        </div>

        {/* ─── LIST CONTENT ─── */}
        {totalItemsCount === 0 ? (
          <div className="rounded-3xl bg-white p-12 text-center border border-gray-100 shadow-sm space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-gray-50 text-gray-400 mx-auto flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-[#0B252C]">No Activity Recorded Yet</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Place dining orders or book wellness and leisure services to track them here in real time.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <Link
                href="/guest/resort-menu"
                className="rounded-xl bg-[#0B252C] px-4 py-2 text-xs font-bold text-[#F8D77A] hover:bg-[#0E7480] transition"
              >
                Browse Resort Menu
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 1. ROOM RESERVATION CARD */}
            {(activeTab === 'all' || activeTab === 'room') && reservation && (
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4 hover:border-[#0E7480]/30 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-[#0B252C] text-[#F8D77A] flex items-center justify-center shadow-xs">
                      <BedDouble className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#0E7480]">
                          Accommodation
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          #{reservation.booking_number}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-sm text-[#0B252C]">{stay.room_name}</h4>
                      <p className="text-[11px] text-gray-500">
                        {reservation.check_in} — {reservation.check_out} ({reservation.guests || 2} Guests)
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    Active Stay
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs">
                  <span className="text-gray-500 font-medium">Payment status: <strong className="text-gray-800 capitalize">{reservation.payment_status || 'Pending'}</strong></span>
                  <span className="font-black text-[#0B252C]">{Number(reservation.total_price || 0).toLocaleString()} ETB</span>
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
                    className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-3 hover:border-[#0E7480]/30 transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#C9902F] flex items-center justify-center shadow-xs">
                          <UtensilsCrossed className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-[#C9902F]">
                              {order.department?.name || 'Restaurant / Kitchen'}
                            </span>
                            {order.room_number && (
                              <span className="text-[10px] text-gray-400 font-medium">
                                Room {order.room_number}
                              </span>
                            )}
                          </div>
                          <h4 className="font-extrabold text-sm text-[#0B252C]">
                            {itemsSummary || 'Dining Order'}
                          </h4>
                          <p className="text-[11px] text-gray-500">
                            {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Total: {order.total} ETB
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        {renderStatusBadge(order.status_id, order.status?.name)}

                        {/* CANCEL BUTTON: ONLY while Pending */}
                        {isPending && (
                          <button
                            disabled={cancellingId === order.id}
                            onClick={() => handleCancel('order', order.id, itemsSummary || 'Dining Order')}
                            className="text-[10px] font-black text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1 rounded-full transition disabled:opacity-50"
                          >
                            {cancellingId === order.id ? 'Cancelling...' : 'Cancel Order'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Order details expansion */}
                    {order.order_items && order.order_items.length > 0 && (
                      <div className="pt-2 border-t border-gray-50 flex flex-wrap gap-2">
                        {order.order_items.map((it) => (
                          <span
                            key={it.id}
                            className="inline-flex items-center rounded-lg bg-gray-50 px-2 py-1 text-[10px] font-medium text-gray-600"
                          >
                            {it.quantity}x {it.menu_item?.name || 'Item'} ({it.price * it.quantity} ETB)
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

                return (
                  <div
                    key={req.id}
                    className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-3 hover:border-[#0E7480]/30 transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#0E7480] flex items-center justify-center shadow-xs">
                          <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-[#0E7480]">
                              {req.department?.name || 'Resort Service'}
                            </span>
                            <span className="text-[10px] text-gray-400 capitalize">
                              {req.service_id.replace('-', ' ')}
                            </span>
                          </div>
                          <h4 className="font-extrabold text-sm text-[#0B252C] capitalize">
                            {req.service_id.replace('-', ' ')} Request
                          </h4>
                          <p className="text-[11px] text-gray-500">
                            Requested for {req.requested_date} {req.requested_time ? `at ${req.requested_time}` : ''} • Party of {req.party_size}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        {renderStatusBadge(req.status_id, req.status?.name)}

                        {/* CANCEL BUTTON: ONLY while Pending */}
                        {isPending && (
                          <button
                            disabled={cancellingId === req.id}
                            onClick={() => handleCancel('service_request', req.id, req.service_id)}
                            className="text-[10px] font-black text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1 rounded-full transition disabled:opacity-50"
                          >
                            {cancellingId === req.id ? 'Cancelling...' : 'Cancel Request'}
                          </button>
                        )}
                      </div>
                    </div>

                    {req.notes && (
                      <p className="text-[11px] text-gray-500 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                        Notes: {req.notes}
                      </p>
                    )}
                  </div>
                );
              })}

            {/* 4. GUEST FOLIO & BILL VIEW */}
            {activeTab === 'bill' && (
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div>
                    <h3 className="text-xl font-extrabold text-[#0B252C]">Itemized Resort Bill</h3>
                    <p className="text-xs text-gray-500">Live charges posted to {stay.room_name} ({stay.booking_number})</p>
                  </div>
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
                  >
                    Print Bill
                  </button>
                </div>

                {loadingFolio ? (
                  <p className="py-8 text-center text-xs text-gray-400">Loading live folio totals from server...</p>
                ) : !folio || !folio.charges || folio.charges.length === 0 ? (
                  <p className="py-8 text-center text-xs text-gray-400">No charges have been posted to your room yet.</p>
                ) : (
                  <div className="space-y-4">
                    <div className="divide-y divide-gray-100">
                      {folio.charges.map((c: any) => (
                        <div key={c.id} className="py-3 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-gray-800">{c.description}</span>
                            <span className="block text-[10px] text-gray-400 capitalize">{c.source_type} • Qty {c.quantity}</span>
                          </div>
                          <span className="font-black text-gray-900">{Number(c.amount).toLocaleString()} ETB</span>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-2xl bg-gray-50 p-4 space-y-2 border border-gray-100 text-xs">
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal:</span>
                        <span className="font-mono">{Number(folio.subtotal).toLocaleString()} {folio.currency}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Resort Service Charge ({folio.service_charge_percent}%):</span>
                        <span className="font-mono">{Number(folio.service_charge).toLocaleString()} {folio.currency}</span>
                      </div>
                      <div className="flex justify-between text-gray-600 border-b border-gray-200 pb-2">
                        <span>Tax / VAT ({folio.tax_percent}%):</span>
                        <span className="font-mono">{Number(folio.tax).toLocaleString()} {folio.currency}</span>
                      </div>
                      <div className="flex justify-between text-sm font-black text-[#0B252C] pt-1">
                        <span>Estimated Total:</span>
                        <span className="font-mono text-[#0E7480]">{Number(folio.total).toLocaleString()} {folio.currency}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
