'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Minus, Plus, ShoppingBag, Sparkles, Trash2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { menuItems } from '@/data/menu-items';
import { createOrder } from '@/lib/orders';

type Cart = Record<string, number>;
const CART_KEY = 'tule-resort-cart';
const LEGACY_CART_KEY = 'haile-resort-cart';

export default function GuestOrderPage() {
  const [cart, setCart] = useState<Cart>({});
  const [submitted, setSubmitted] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stable idempotency key across retries and double taps
  const checkoutIdempotencyKey = useRef<string>(
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `order_${Date.now()}`
  );

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CART_KEY) ?? window.localStorage.getItem(LEGACY_CART_KEY);
      if (saved) setCart(JSON.parse(saved));
    } catch {
      setCart({});
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  const selected = useMemo(
    () => menuItems.filter((item) => (cart[item.id] ?? 0) > 0),
    [cart],
  );

  const totalItems = selected.reduce((sum, item) => sum + (cart[item.id] ?? 0), 0);
  const totalPrice = selected.reduce((sum, item) => sum + item.price * (cart[item.id] ?? 0), 0);

  const changeQuantity = (id: string, delta: number) => {
    checkoutIdempotencyKey.current = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `order_${Date.now()}`;
    setCart((current) => {
      const next = { ...current };
      const quantity = Math.max(0, (next[id] ?? 0) + delta);
      if (quantity === 0) delete next[id];
      else next[id] = quantity;
      return next;
    });
  };

  const clearCart = () => {
    checkoutIdempotencyKey.current = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `order_${Date.now()}`;
    setCart({});
  };

  const submitOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected.length || !guestName.trim() || !roomNumber.trim() || !phone.trim()) return;

    setSubmitError('');
    setIsSubmitting(true);

    const result = await createOrder({
      guest_name: guestName,
      room_number: roomNumber,
      items: selected.map((item) => ({
        id: item.id,
        menu_item_id: item.id,
        name: item.name,
        quantity: cart[item.id] ?? 0,
      })),
      service_type: 'restaurant',
      special_instructions: `Guest phone: ${phone}`,
      status: 'pending',
      idempotency_key: checkoutIdempotencyKey.current,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setSubmitError(result.error ?? 'Order submission failed. Please try again.');
      return;
    }

    // Regenerate for future orders
    checkoutIdempotencyKey.current = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `order_${Date.now()}`;
    setSubmitted(true);
    setCart({});
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(CART_KEY);
      window.localStorage.removeItem(LEGACY_CART_KEY);
    }
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-[#F5F0E6] text-[#26312D] flex items-center justify-center p-5">
        <div className="w-full max-w-lg rounded-[2.2rem] border border-[#163D32]/10 bg-white p-8 md:p-11 text-center shadow-2xl">
          <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-[#163D32] border border-[#C5A46D]/30 overflow-hidden flex items-center justify-center p-2 shadow-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/tule-resort-logo.png" alt="Tule Resort" className="h-full w-full object-contain" />
          </div>
          <p className="text-xs font-black uppercase tracking-[.25em] text-[#C5A46D]">Tule Resort</p>
          <h1 className="mt-2 font-display text-4xl font-medium tracking-tight text-[#163D32]">ORDER RECEIVED</h1>
          <p className="mt-4 text-sm leading-relaxed text-[#26312D]/75">
            Thank you, {guestName}. Your order for {totalItems} item{totalItems === 1 ? '' : 's'} worth {totalPrice.toLocaleString()} ETB has been received and sent to our kitchen.
          </p>
          <div className="mt-8 flex gap-3">
            <Link
              href="/guest/restaurant"
              className="flex-1 rounded-full bg-[#163D32] hover:bg-[#C5A46D] hover:text-[#163D32] text-[#F5F0E6] px-5 py-3 text-xs font-black uppercase tracking-[.14em] transition"
            >
              Back to menu
            </Link>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setCart({});
                setGuestName('');
                setRoomNumber('');
                setPhone('');
              }}
              className="flex-1 rounded-full border border-[#163D32]/20 bg-[#F5F0E6] hover:bg-[#EDE8DC] text-[#26312D] px-5 py-3 text-xs font-black uppercase tracking-[.14em] transition"
            >
              New order
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
          <Link href="/guest/restaurant" className="inline-flex items-center gap-2 text-sm font-bold text-[#F5F0E6]/75 hover:text-[#C5A46D] transition">
            <ArrowLeft className="h-4 w-4" /> Back to menu
          </Link>
          <div className="hidden md:flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-[#F5F0E6]/70">
            <Sparkles className="h-4 w-4 text-[#C5A46D]" /> Tule Resort • Review your order
          </div>
          <div className="text-right">
            <p className="text-[8px] font-black uppercase tracking-[.18em] text-[#C5A46D]">Total</p>
            <p className="font-display text-sm font-bold text-[#F5F0E6]">{totalPrice.toLocaleString()} ETB</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 md:px-6 py-6 md:py-10 grid gap-7 lg:grid-cols-[1.25fr_.75fr]">
        <section className="rounded-[2.2rem] border border-[#163D32]/10 bg-white p-5 md:p-8 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[.24em] text-[#C5A46D]">Your selections</p>
              <h1 className="mt-1 font-display text-3xl font-medium tracking-tight text-[#26312D]">ORDER BAG</h1>
            </div>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="inline-flex items-center gap-2 rounded-full border border-[#163D32]/15 bg-[#F5F0E6] px-3.5 py-2 text-[10px] font-black uppercase tracking-[.12em] text-[#26312D]/70 hover:text-red-600 transition"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </button>
            )}
          </div>

          {selected.length === 0 ? (
            <div className="rounded-[1.8rem] border border-dashed border-[#163D32]/20 bg-[#F5F0E6]/50 p-10 text-center">
              <ShoppingBag className="mx-auto h-10 w-10 text-[#8A9B83]" />
              <h2 className="mt-4 font-display text-2xl font-medium text-[#26312D]">Your bag is empty</h2>
              <p className="mt-2 text-sm text-[#8A9B83]">Choose dishes from the visual dining menu and they will appear here.</p>
              <Link
                href="/guest/restaurant"
                className="mt-6 inline-flex rounded-full bg-[#163D32] hover:bg-[#C5A46D] hover:text-[#163D32] px-6 py-3 text-xs font-black uppercase tracking-[.14em] text-[#F5F0E6] transition"
              >
                Explore menu
              </Link>
            </div>
          ) : (
            <div className="space-y-3.5">
              {selected.map((item) => {
                const quantity = cart[item.id] ?? 0;
                return (
                  <div key={item.id} className="rounded-[1.6rem] border border-[#163D32]/8 bg-[#F5F0E6]/60 p-4 flex gap-4 items-center">
                    <img src={item.imageUrl} alt={item.name} className="h-20 w-20 rounded-2xl object-cover shrink-0 shadow-sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-bold uppercase tracking-[.18em] text-[#C5A46D]">{item.amharicName}</p>
                      <h3 className="truncate font-display text-lg font-medium text-[#26312D]">{item.name}</h3>
                      <p className="mt-0.5 text-xs text-[#8A9B83]">{item.price.toLocaleString()} ETB each</p>
                    </div>
                    <div className="flex items-center gap-2 rounded-full border border-[#163D32]/15 bg-white p-1">
                      <button
                        type="button"
                        onClick={() => changeQuantity(item.id, -1)}
                        className="h-8 w-8 rounded-full bg-[#F5F0E6] text-[#163D32] flex items-center justify-center hover:bg-[#EDE8DC]"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-5 text-center text-xs font-black text-[#163D32]">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => changeQuantity(item.id, 1)}
                        className="h-8 w-8 rounded-full bg-[#163D32] text-[#F5F0E6] flex items-center justify-center hover:bg-[#C5A46D] hover:text-[#163D32]"
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
        </section>

        {/* Guest Details Submission Card */}
        <section className="rounded-[2.2rem] border border-[#C5A46D]/30 bg-[#163D32] text-[#F5F0E6] p-6 md:p-8 h-fit lg:sticky lg:top-24 shadow-xl">
          <p className="text-[9px] font-black uppercase tracking-[.24em] text-[#C5A46D]">Guest details</p>
          <h2 className="mt-1 font-display text-2xl font-medium">Send to resort staff</h2>
          <p className="mt-2 text-xs leading-relaxed text-[#F5F0E6]/75">
            Orders are processed immediately by the kitchen team and folio charged or paid on delivery.
          </p>

          <form onSubmit={submitOrder} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-[.14em] text-[#F5F0E6]/70">Full name</span>
              <input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="mt-1.5 w-full rounded-2xl border border-white/15 bg-[#0F2D24] px-4 py-3 text-sm text-[#F5F0E6] placeholder-[#F5F0E6]/40 outline-none focus:border-[#C5A46D]"
                placeholder="Guest name"
                required
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-[.14em] text-[#F5F0E6]/70">Room or Table number</span>
              <input
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                className="mt-1.5 w-full rounded-2xl border border-white/15 bg-[#0F2D24] px-4 py-3 text-sm text-[#F5F0E6] placeholder-[#F5F0E6]/40 outline-none focus:border-[#C5A46D]"
                placeholder="e.g. Room 204 or Lake Table 3"
                required
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-[.14em] text-[#F5F0E6]/70">Phone number</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1.5 w-full rounded-2xl border border-white/15 bg-[#0F2D24] px-4 py-3 text-sm text-[#F5F0E6] placeholder-[#F5F0E6]/40 outline-none focus:border-[#C5A46D]"
                placeholder="+251 9..."
                required
              />
            </label>

            {submitError ? (
              <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-200">
                {submitError}
              </div>
            ) : null}

            <div className="pt-4 border-t border-white/15 flex items-end justify-between gap-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#C5A46D]">Grand total</p>
                <p className="mt-1 font-display text-3xl font-bold text-[#F5F0E6]">
                  {totalPrice.toLocaleString()} <span className="text-xs font-sans font-normal text-[#C5A46D]">ETB</span>
                </p>
              </div>
              <button
                disabled={!selected.length || isSubmitting}
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
