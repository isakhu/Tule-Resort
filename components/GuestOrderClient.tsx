'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  BedDouble,
  CheckCircle2,
  Loader2,
  Minus,
  Plus,
  RotateCw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  Utensils,
} from 'lucide-react';
import Link from 'next/link';
import { getLiveMenuItems, type MenuItem } from '@/lib/menu';
import { createOrder } from '@/lib/orders';
import { syncCartWithGuestStay, useGuestCart } from '@/lib/guestCart';
import { fetchCurrentGuestStay, loginGuestStay, type GuestStay } from '@/lib/guestSession';

interface SubmittedReceipt {
  orderId: string | null;
  guestName: string;
  deliverySummary: string;
  guestStayId: string | null;
  itemCount: number;
  authoritativeTotal: number;
  serverVerified: boolean;
  isDuplicate: boolean;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function makeIdempotencyKey(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function GuestOrderClient({
  initialMenuItems,
  initialMenuError = null,
}: {
  initialMenuItems?: MenuItem[];
  initialMenuError?: string | null;
}) {
  const { cart, hydrated, changeQuantity, clearCart, removeItems } = useGuestCart();

  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => initialMenuItems ?? []);
  const [loadingMenu, setLoadingMenu] = useState<boolean>(initialMenuItems === undefined);
  const [menuError, setMenuError] = useState<string | null>(initialMenuError);

  const [stay, setStay] = useState<GuestStay | null>(null);
  const [loadingStay, setLoadingStay] = useState<boolean>(true);
  const [fulfillmentMode, setFulfillmentMode] = useState<'room' | 'pickup'>('pickup');

  // Inline stay verification fields when guest selects Room Delivery without an active cookie
  const [verifyRoomInput, setVerifyRoomInput] = useState('');
  const [verifyCodeInput, setVerifyCodeInput] = useState('');
  const [verifyingStay, setVerifyingStay] = useState(false);
  const [verifyStayError, setVerifyStayError] = useState('');

  const [guestName, setGuestName] = useState('');
  const [pickupLocation, setPickupLocation] = useState('Restaurant Terrace / Lounge');
  const [phone, setPhone] = useState('');
  const [specialNotes, setSpecialNotes] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReceipt, setSubmittedReceipt] = useState<SubmittedReceipt | null>(null);

  const submitLockRef = useRef(false);
  const checkoutIdempotencyKey = useRef<string>(makeIdempotencyKey());

  const reloadLiveMenu = useCallback(async () => {
    setLoadingMenu(true);
    setMenuError(null);
    const result = await getLiveMenuItems();
    if (result.error) {
      setMenuError(result.error);
      setMenuItems([]);
    } else {
      setMenuItems(result.items);
    }
    setLoadingMenu(false);
  }, []);

  useEffect(() => {
    if (initialMenuItems === undefined) {
      const timer = setTimeout(() => {
        void reloadLiveMenu();
      }, 0);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [initialMenuItems, reloadLiveMenu]);

  useEffect(() => {
    let active = true;
    fetchCurrentGuestStay()
      .then((res) => {
        if (!active) return;
        if (res.authenticated && res.stay) {
          setStay(res.stay);
          syncCartWithGuestStay(res.stay.id);
          setFulfillmentMode('room');
          setGuestName((prev) => prev || res.stay!.guest_name || '');
          setPhone((prev) => prev || res.stay!.guest_phone || '');
        } else {
          setStay(null);
        }
      })
      .catch(() => {
        if (active) setStay(null);
      })
      .finally(() => {
        if (active) setLoadingStay(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const menuLookup = useMemo(() => new Map(menuItems.map((item) => [item.id, item])), [menuItems]);

  const { selected, unavailableIds } = useMemo(() => {
    if (!hydrated || loadingMenu) {
      return { selected: [] as MenuItem[], unavailableIds: [] as string[] };
    }

    const matched: MenuItem[] = [];
    const missingIds: string[] = [];

    for (const [id, qty] of Object.entries(cart)) {
      if (qty <= 0) continue;
      const found = menuLookup.get(id);
      if (found && found.isAvailable !== false && UUID_REGEX.test(found.id)) {
        matched.push(found);
      } else {
        missingIds.push(id);
      }
    }

    return { selected: matched, unavailableIds: missingIds };
  }, [cart, hydrated, loadingMenu, menuLookup]);

  const totalItems = selected.reduce((sum, item) => sum + (cart[item.id] ?? 0), 0);
  const estimatedTotal = selected.reduce((sum, item) => sum + item.price * (cart[item.id] ?? 0), 0);

  const handleChangeQuantity = (id: string, delta: number) => {
    checkoutIdempotencyKey.current = makeIdempotencyKey();
    setSubmitError('');
    changeQuantity(id, delta);
  };

  const handleClearCart = () => {
    checkoutIdempotencyKey.current = makeIdempotencyKey();
    setSubmitError('');
    clearCart();
  };

  const handleVerifyStay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyRoomInput.trim() || !verifyCodeInput.trim()) return;

    setVerifyingStay(true);
    setVerifyStayError('');

    const res = await loginGuestStay(verifyRoomInput.trim(), verifyCodeInput.trim());
    if (res.success && res.stay) {
      setStay(res.stay);
      syncCartWithGuestStay(res.stay.id);
      setFulfillmentMode('room');
      setGuestName((prev) => prev || res.stay!.guest_name || '');
      setPhone((prev) => prev || res.stay!.guest_phone || '');
      setVerifyRoomInput('');
      setVerifyCodeInput('');
    } else {
      setVerifyStayError(res.error || 'Could not verify your room stay credentials.');
    }
    setVerifyingStay(false);
  };

  const submitOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitLockRef.current || isSubmitting || !selected.length) return;

    const effectiveGuestName = (guestName.trim() || stay?.guest_name || '').trim();
    if (effectiveGuestName.length < 2) {
      setSubmitError('Please enter your full name.');
      return;
    }

    if (!phone.trim()) {
      setSubmitError('Please enter a contact phone number.');
      return;
    }

    if (fulfillmentMode === 'room' && !stay) {
      setSubmitError('Please verify your checked-in room stay first, or choose Dining / Lounge Pickup.');
      return;
    }

    submitLockRef.current = true;
    setSubmitError('');
    setIsSubmitting(true);

    const deliverySummary =
      fulfillmentMode === 'room' && stay
        ? stay.room_name
        : pickupLocation.trim() || 'Restaurant Terrace / Lounge';

    const notesParts = [
      `Phone: ${phone.trim()}`,
      fulfillmentMode === 'pickup' ? `Pickup / Area: ${deliverySummary}` : `Room Delivery: ${deliverySummary}`,
      specialNotes.trim() ? `Notes: ${specialNotes.trim()}` : '',
    ].filter(Boolean);

    try {
      const result = await createOrder({
        guest_name: effectiveGuestName,
        room_number: fulfillmentMode === 'room' && stay ? stay.room_name : undefined,
        guest_stay_id: stay?.id ?? null,
        guestStayId: stay?.id ?? null,
        items: selected.map((item) => ({
          id: item.id,
          menu_item_id: item.id,
          name: item.name,
          quantity: cart[item.id] ?? 0,
        })),
        service_type: 'restaurant',
        special_instructions: notesParts.join(' | '),
        status: 'pending',
        idempotency_key: checkoutIdempotencyKey.current,
      });

      if (!result.success) {
        setSubmitError(result.error ?? 'Order submission failed. Please try again.');
        return;
      }

      const authoritativeTotal =
        typeof result.totalAmount === 'number' && Number.isFinite(result.totalAmount)
          ? result.totalAmount
          : estimatedTotal;

      setSubmittedReceipt({
        orderId: result.orderId ?? null,
        guestName: effectiveGuestName,
        deliverySummary,
        guestStayId: result.guestStayId ?? stay?.id ?? null,
        itemCount: totalItems,
        authoritativeTotal,
        serverVerified: typeof result.totalAmount === 'number' && Number.isFinite(result.totalAmount),
        isDuplicate: Boolean(result.isDuplicate),
      });

      checkoutIdempotencyKey.current = makeIdempotencyKey();
      clearCart();
    } finally {
      setIsSubmitting(false);
      submitLockRef.current = false;
    }
  };

  if (submittedReceipt) {
    return (
      <main className="min-h-screen bg-[#F5F0E6] text-[#26312D] flex items-center justify-center p-5">
        <div className="w-full max-w-lg rounded-[2.2rem] border border-[#163D32]/10 bg-white p-8 md:p-11 text-center shadow-2xl">
          <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-[#163D32] border border-[#C5A46D]/30 overflow-hidden flex items-center justify-center p-2 shadow-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/tule-resort-logo.png" alt="Tule Resort" className="h-full w-full object-contain" />
          </div>
          <p className="text-xs font-black uppercase tracking-[.25em] text-[#C5A46D]">Tule Resort</p>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-bold text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {submittedReceipt.isDuplicate ? 'Existing Submission Confirmed' : 'Confirmed by Kitchen'}
          </div>
          <h1 className="mt-3 font-display text-4xl font-medium tracking-tight text-[#163D32]">ORDER RECEIVED</h1>
          <p className="mt-4 text-sm leading-relaxed text-[#26312D]/80">
            Thank you, <span className="font-bold text-[#163D32]">{submittedReceipt.guestName}</span>. Your order for{' '}
            <span className="font-bold text-[#163D32]">
              {submittedReceipt.itemCount} item{submittedReceipt.itemCount === 1 ? '' : 's'}
            </span>{' '}
            with an authoritative total of{' '}
            <span className="font-bold text-[#163D32]">
              {submittedReceipt.authoritativeTotal.toLocaleString()} ETB
            </span>{' '}
            for <span className="font-semibold">{submittedReceipt.deliverySummary}</span> has been sent to our kitchen.
          </p>

          <div className="mt-5 rounded-2xl border border-[#163D32]/10 bg-[#F5F0E6]/70 p-4 text-left text-xs space-y-1.5">
            {submittedReceipt.orderId && (
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold uppercase tracking-wider text-[#8A9B83]">Order Reference</span>
                <span className="font-mono font-bold text-[#163D32]">#{submittedReceipt.orderId.slice(0, 8).toUpperCase()}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold uppercase tracking-wider text-[#52645D]">Server-Verified Total</span>
              <span className="font-black text-[#163D32]">{submittedReceipt.authoritativeTotal.toLocaleString()} ETB</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold uppercase tracking-wider text-[#52645D]">Stay Folio Link</span>
              <span className="font-bold text-[#163D32]">
                {submittedReceipt.guestStayId ? 'Linked to Verified Stay' : 'Direct / Pay on Delivery'}
              </span>
            </div>
          </div>

          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            {submittedReceipt.guestStayId ? (
              <Link
                href="/guest/my-activity"
                className="flex-1 rounded-full bg-[#163D32] hover:bg-[#C5A46D] hover:text-[#163D32] text-[#F5F0E6] px-5 py-3 text-xs font-black uppercase tracking-[.14em] transition"
              >
                Track in My Activity
              </Link>
            ) : (
              <Link
                href="/guest/restaurant"
                className="flex-1 rounded-full bg-[#163D32] hover:bg-[#C5A46D] hover:text-[#163D32] text-[#F5F0E6] px-5 py-3 text-xs font-black uppercase tracking-[.14em] transition"
              >
                Back to menu
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                setSubmittedReceipt(null);
                setSpecialNotes('');
                checkoutIdempotencyKey.current = makeIdempotencyKey();
              }}
              className="flex-1 rounded-full border border-[#163D32]/20 bg-[#F5F0E6] hover:bg-[#EDE8DC] text-[#26312D] px-5 py-3 text-xs font-black uppercase tracking-[.14em] transition"
            >
              Start another order
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0E6] text-[#26312D]">
      <header className="sticky top-0 z-30 border-b border-[#C5A46D]/20 bg-[#163D32] text-[#F5F0E6] backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/guest/restaurant"
              className="inline-flex items-center gap-2 text-sm font-bold text-[#F5F0E6]/75 hover:text-[#C5A46D] transition"
            >
              <ArrowLeft className="h-4 w-4" /> Restaurant Menu
            </Link>
            <Link
              href="/guest/cafeteria"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-[#C5A46D]/85 hover:text-[#C5A46D] transition"
            >
              <Utensils className="h-3.5 w-3.5" /> Cafeteria
            </Link>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-[#F5F0E6]/70">
            <Sparkles className="h-4 w-4 text-[#C5A46D]" /> Tule Resort • Review your order
          </div>
          <div className="text-right">
            <p className="text-[8px] font-black uppercase tracking-[.18em] text-[#C5A46D]">Estimated</p>
            <p className="font-display text-sm font-bold text-[#F5F0E6]">{estimatedTotal.toLocaleString()} ETB</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 md:px-6 py-6 md:py-10 grid gap-7 lg:grid-cols-[1.25fr_.75fr]">
        <section className="rounded-[2.2rem] border border-[#163D32]/10 bg-white p-5 md:p-8 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[.24em] text-[#7A5A27]">Live kitchen catalog</p>
              <h1 className="mt-1 font-display text-3xl font-medium tracking-tight text-[#26312D]">ORDER BAG</h1>
            </div>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={handleClearCart}
                className="inline-flex items-center gap-2 rounded-full border border-[#163D32]/15 bg-[#F5F0E6] px-3.5 py-2 text-[10px] font-black uppercase tracking-[.12em] text-[#26312D]/70 hover:text-red-600 transition"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </button>
            )}
          </div>

          {menuError ? (
            <div role="alert" className="rounded-[1.8rem] border border-red-200 bg-red-50 p-8 text-center">
              <AlertCircle className="mx-auto h-9 w-9 text-red-600" />
              <h2 className="mt-3 font-display text-xl font-medium text-red-950">Could not load active menu items</h2>
              <p className="mt-1.5 text-sm text-red-800">{menuError}</p>
              <button
                type="button"
                onClick={() => void reloadLiveMenu()}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#163D32] px-5 py-2.5 text-xs font-black uppercase tracking-wider text-[#F5F0E6]"
              >
                <RotateCw className="h-3.5 w-3.5" /> Retry Database Lookup
              </button>
            </div>
          ) : !hydrated || loadingMenu ? (
            <div className="rounded-[1.8rem] border border-[#163D32]/10 bg-[#F5F0E6]/40 p-10 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#163D32]" />
              <p className="mt-3 text-sm font-semibold text-[#26312D]/70">Syncing your basket with live menu prices...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {unavailableIds.length > 0 && (
                <div
                  role="alert"
                  className="rounded-2xl border border-amber-300 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900"
                >
                  <div>
                    <p className="font-bold">
                      {unavailableIds.length} saved item{unavailableIds.length === 1 ? '' : 's'} no longer exist in the active resort menu.
                    </p>
                    <p className="mt-0.5 text-amber-800">
                      Clear unavailable items so your checkout only submits live database items.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItems(unavailableIds)}
                    className="shrink-0 rounded-full bg-amber-900 px-3.5 py-2 text-[10px] font-black uppercase tracking-wider text-white hover:bg-amber-800"
                  >
                    Remove unavailable
                  </button>
                </div>
              )}

              {selected.length === 0 ? (
                <div className="rounded-[1.8rem] border border-dashed border-[#163D32]/20 bg-[#F5F0E6]/50 p-10 text-center">
                  <ShoppingBag className="mx-auto h-10 w-10 text-[#52645D]" />
                  <h2 className="mt-4 font-display text-2xl font-medium text-[#26312D]">Your bag is empty</h2>
                  <p className="mt-2 text-sm text-[#52645D]">
                    Choose dishes from the Restaurant or Cafeteria menu and they will appear here.
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <Link
                      href="/guest/restaurant"
                      className="inline-flex rounded-full bg-[#163D32] hover:bg-[#C5A46D] hover:text-[#163D32] px-6 py-3 text-xs font-black uppercase tracking-[.14em] text-[#F5F0E6] transition"
                    >
                      Restaurant Menu
                    </Link>
                    <Link
                      href="/guest/cafeteria"
                      className="inline-flex rounded-full border border-[#163D32]/20 bg-white hover:border-[#C5A46D] px-6 py-3 text-xs font-black uppercase tracking-[.14em] text-[#163D32] transition"
                    >
                      Cafeteria Menu
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {selected.map((item) => {
                    const quantity = cart[item.id] ?? 0;
                    return (
                      <div key={item.id} className="rounded-[1.6rem] border border-[#163D32]/8 bg-[#F5F0E6]/60 p-4 flex gap-4 items-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.imageUrl || '/tule-resort-logo.png'}
                          alt={item.name}
                          className="h-20 w-20 rounded-2xl object-cover shrink-0 shadow-sm bg-white"
                          onError={(e) => {
                            e.currentTarget.src = '/tule-resort-logo.png';
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[9px] font-bold uppercase tracking-[.18em] text-[#7A5A27]">
                            {item.amharicName || item.category}
                          </p>
                          <h3 className="truncate font-display text-lg font-medium text-[#26312D]">{item.name}</h3>
                          <p className="mt-0.5 text-xs text-[#52645D]">{item.price.toLocaleString()} ETB each</p>
                        </div>
                        <div className="flex items-center gap-2 rounded-full border border-[#163D32]/15 bg-white p-1">
                          <button
                            type="button"
                            onClick={() => handleChangeQuantity(item.id, -1)}
                            className="h-8 w-8 rounded-full bg-[#F5F0E6] text-[#163D32] flex items-center justify-center hover:bg-[#EDE8DC]"
                            aria-label={`Remove one ${item.name}`}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="min-w-5 text-center text-xs font-black text-[#163D32]">{quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleChangeQuantity(item.id, 1)}
                            className="h-8 w-8 rounded-full bg-[#163D32] text-[#F5F0E6] flex items-center justify-center hover:bg-[#C5A46D] hover:text-[#163D32]"
                            aria-label={`Add one ${item.name}`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="hidden sm:block w-24 text-right font-display text-base font-bold text-[#163D32]">
                          {(item.price * quantity).toLocaleString()} ETB
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Guest Details & Stay Association Card */}
        <section className="rounded-[2.2rem] border border-[#C5A46D]/30 bg-[#163D32] text-[#F5F0E6] p-6 md:p-8 h-fit lg:sticky lg:top-24 shadow-xl">
          <p className="text-[9px] font-black uppercase tracking-[.24em] text-[#C5A46D]">Guest session &amp; delivery</p>
          <h2 className="mt-1 font-display text-2xl font-medium">Send to resort staff</h2>
          <p className="mt-2 text-xs leading-relaxed text-[#F5F0E6]/75">
            Final totals are verified by the server at submission. Verified stays link directly to your folio and My Activity.
          </p>

          {/* Active Stay Status */}
          <div className="mt-4 rounded-2xl border border-white/15 bg-[#0F2D24] p-3.5">
            {loadingStay ? (
              <div className="flex items-center gap-2 text-xs text-[#F5F0E6]/70">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#C5A46D]" /> Checking guest stay session...
              </div>
            ) : stay ? (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#F5F0E6] truncate">
                      Verified Stay: {stay.room_name}
                    </p>
                    <p className="text-[10px] text-[#C5A46D]">
                      Booking {stay.booking_number} • {stay.guest_name}
                    </p>
                  </div>
                </div>
                <Link href="/guest/my-activity" className="text-[10px] font-black uppercase tracking-wider text-[#C5A46D] hover:underline shrink-0">
                  Activity
                </Link>
              </div>
            ) : (
              <div className="text-xs text-[#F5F0E6]/75">
                Ordering as a day guest or haven&apos;t signed in yet. Room delivery requires verifying your checked-in stay.
              </div>
            )}
          </div>

          {/* Fulfillment Mode Toggle */}
          <div role="group" aria-label="Order fulfillment method" className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-[#0F2D24] p-1 border border-white/10">
            <button
              type="button"
              aria-pressed={fulfillmentMode === 'room'}
              onClick={() => {
                setFulfillmentMode('room');
                setSubmitError('');
              }}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-wider transition ${
                fulfillmentMode === 'room'
                  ? 'bg-[#C5A46D] text-[#163D32]'
                  : 'text-[#F5F0E6]/75 hover:text-white'
              }`}
            >
              <BedDouble className="h-3.5 w-3.5" /> Room Delivery
            </button>
            <button
              type="button"
              aria-pressed={fulfillmentMode === 'pickup'}
              onClick={() => {
                setFulfillmentMode('pickup');
                setSubmitError('');
              }}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-wider transition ${
                fulfillmentMode === 'pickup'
                  ? 'bg-[#C5A46D] text-[#163D32]'
                  : 'text-[#F5F0E6]/75 hover:text-white'
              }`}
            >
              <Utensils className="h-3.5 w-3.5" /> Dine-In / Pickup
            </button>
          </div>

          {/* Inline Guest Stay Verification when Room Delivery selected without verified stay */}
          {fulfillmentMode === 'room' && !stay && !loadingStay && (
            <form onSubmit={handleVerifyStay} className="mt-4 rounded-2xl border border-[#C5A46D]/35 bg-[#0F2D24] p-4 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#C5A46D]">
                Verify Checked-In Room Stay
              </p>
              <input
                aria-label="Room name or number"
                value={verifyRoomInput}
                onChange={(e) => setVerifyRoomInput(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-[#163D32] px-3 py-2.5 text-xs text-[#F5F0E6] placeholder-[#F5F0E6]/50 outline-none focus:border-[#C5A46D]"
                placeholder="Room name or number (e.g. Twin Room 1)"
                required
              />
              <input
                aria-label="Booking number or guest last name"
                value={verifyCodeInput}
                onChange={(e) => setVerifyCodeInput(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-[#163D32] px-3 py-2.5 text-xs text-[#F5F0E6] placeholder-[#F5F0E6]/50 outline-none focus:border-[#C5A46D]"
                placeholder="Booking number (e.g. TR-...) or Last name"
                required
              />
              {verifyStayError && (
                <p role="alert" className="text-xs text-red-300">
                  {verifyStayError}
                </p>
              )}
              <button
                type="submit"
                disabled={verifyingStay}
                className="w-full rounded-full bg-[#C5A46D] hover:bg-[#B8955E] py-2.5 text-[11px] font-black uppercase tracking-wider text-[#163D32] transition disabled:opacity-50"
              >
                {verifyingStay ? 'Verifying Stay...' : 'Verify & Link Stay'}
              </button>
            </form>
          )}

          <form onSubmit={submitOrder} className="mt-5 space-y-4">
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-[.14em] text-[#F5F0E6]/80">Full name</span>
              <input
                autoComplete="name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="mt-1.5 w-full rounded-2xl border border-white/15 bg-[#0F2D24] px-4 py-3 text-sm text-[#F5F0E6] placeholder-[#F5F0E6]/50 outline-none focus:border-[#C5A46D]"
                placeholder="Guest name"
                required
              />
            </label>

            {fulfillmentMode === 'room' ? (
              <div className="rounded-2xl border border-white/10 bg-[#0F2D24]/70 px-4 py-3">
                <span className="text-[10px] font-black uppercase tracking-[.14em] text-[#C5A46D] block">
                  Assigned Room
                </span>
                <p className="mt-1 text-sm font-bold text-[#F5F0E6]">
                  {stay ? stay.room_name : 'Verify stay above to unlock room delivery'}
                </p>
              </div>
            ) : (
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-[.14em] text-[#F5F0E6]/70">
                  Pickup or Seating Area
                </span>
                <input
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  className="mt-1.5 w-full rounded-2xl border border-white/15 bg-[#0F2D24] px-4 py-3 text-sm text-[#F5F0E6] placeholder-[#F5F0E6]/40 outline-none focus:border-[#C5A46D]"
                  placeholder="e.g. Lake Terrace, Poolside Bar, Counter Pickup"
                  required
                />
              </label>
            )}

            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-[.14em] text-[#F5F0E6]/80">Phone number</span>
              <input
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1.5 w-full rounded-2xl border border-white/15 bg-[#0F2D24] px-4 py-3 text-sm text-[#F5F0E6] placeholder-[#F5F0E6]/50 outline-none focus:border-[#C5A46D]"
                placeholder="+251 9..."
                required
              />
            </label>

            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-[.14em] text-[#F5F0E6]/70">
                Special instructions (optional)
              </span>
              <input
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
                className="mt-1.5 w-full rounded-2xl border border-white/15 bg-[#0F2D24] px-4 py-3 text-sm text-[#F5F0E6] placeholder-[#F5F0E6]/40 outline-none focus:border-[#C5A46D]"
                placeholder="Spice preference, allergies, cutlery..."
              />
            </label>

            {submitError ? (
              <div role="alert" className="rounded-2xl border border-red-400/40 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-200">
                {submitError}
              </div>
            ) : null}

            <div className="pt-4 border-t border-white/15 flex items-end justify-between gap-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#C5A46D]">Estimated total</p>
                <p className="mt-1 font-display text-3xl font-bold text-[#F5F0E6]">
                  {estimatedTotal.toLocaleString()} <span className="text-xs font-sans font-normal text-[#C5A46D]">ETB</span>
                </p>
              </div>
              <button
                disabled={!selected.length || isSubmitting || Boolean(menuError) || (fulfillmentMode === 'room' && !stay)}
                type="submit"
                className="rounded-full bg-[#C5A46D] hover:bg-[#B8955E] px-6 py-3.5 text-xs font-black uppercase tracking-[.12em] text-[#163D32] transition shadow-md disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
              >
                {isSubmitting ? 'Submitting...' : 'Submit order'}
              </button>
            </div>
          </form>
        </section>
      </main>

      <footer className="border-t border-[#163D32]/10 bg-[#0F2D24] text-[#F5F0E6]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-6 md:px-6">
          <p className="font-display text-sm font-semibold">Tule Resort • Hawassa</p>
          <p className="text-[10px] uppercase tracking-[.18em] text-[#C5A46D]">Relax. Enjoy. Remember.</p>
        </div>
      </footer>
    </div>
  );
}

