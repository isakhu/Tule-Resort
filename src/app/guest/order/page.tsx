'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Minus, Plus, ShoppingBag, Sparkles, Trash2 } from 'lucide-react';
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
    setCart((current) => {
      const next = { ...current };
      const quantity = Math.max(0, (next[id] ?? 0) + delta);
      if (quantity === 0) delete next[id];
      else next[id] = quantity;
      return next;
    });
  };

  const clearCart = () => setCart({});

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
        price: item.price,
      })),
      total_amount: totalPrice,
      service_type: 'restaurant',
      special_instructions: `Guest phone: ${phone}`,
      status: 'pending',
    });

    setIsSubmitting(false);

    if (!result.success) {
      setSubmitError(result.error ?? 'Order submission failed. Please try again.');
      return;
    }

    setSubmitted(true);
    setCart({});
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(CART_KEY);
      window.localStorage.removeItem(LEGACY_CART_KEY);
    }
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-[#0C0B09] text-white flex items-center justify-center p-5">
        <div className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-white/[.05] p-7 md:p-10 text-center shadow-2xl">
          <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-[#7DBA62] text-stone-950 flex items-center justify-center"><ShoppingBag className="h-7 w-7" /></div>
          <p className="text-xs font-black uppercase tracking-[.25em] text-[#F2B84B]">Tule Resort</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">ORDER RECEIVED</h1>
          <p className="mt-4 text-sm leading-relaxed text-white/65">Thank you, {guestName}. Your request for {totalItems} item{totalItems === 1 ? '' : 's'} worth {totalPrice.toLocaleString()} ETB is ready for the next staff workflow.</p>
          <div className="mt-7 flex gap-3"><Link href="/guest/restaurant" className="flex-1 rounded-full bg-white text-stone-950 px-5 py-3 text-xs font-black uppercase tracking-[.14em]">Back to menu</Link><button type="button" onClick={() => { setSubmitted(false); setCart({}); setGuestName(''); setRoomNumber(''); setPhone(''); }} className="flex-1 rounded-full border border-white/10 bg-white/10 px-5 py-3 text-xs font-black uppercase tracking-[.14em]">New order</button></div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#0C0B09] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0C0B09]/90 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-4 flex items-center justify-between gap-4">
          <Link href="/guest/restaurant" className="inline-flex items-center gap-2 text-sm font-bold text-white/75 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to menu</Link>
          <div className="hidden md:flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-white/60"><Sparkles className="h-4 w-4 text-[#F2B84B]" /> Tule Resort • Review your order</div>
          <div className="text-right"><p className="text-[8px] font-black uppercase tracking-[.18em] text-white/40">Total</p><p className="text-sm font-black">{totalPrice.toLocaleString()} ETB</p></div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 md:px-6 py-6 md:py-10 grid gap-7 lg:grid-cols-[1.25fr_.75fr]">
        <section className="rounded-[2rem] border border-white/10 bg-white/[.04] p-4 md:p-6">
          <div className="flex items-center justify-between gap-4 mb-5"><div><p className="text-[9px] font-black uppercase tracking-[.24em] text-[#F2B84B]">Your selections</p><h1 className="mt-1 text-3xl font-black tracking-tight">ORDER BAG</h1></div>{selected.length > 0 && <button type="button" onClick={clearCart} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-[.12em] text-white/60 hover:text-white"><Trash2 className="h-3.5 w-3.5" /> Clear</button>}</div>
          {selected.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-black/20 p-10 text-center"><ShoppingBag className="mx-auto h-10 w-10 text-white/25" /><h2 className="mt-4 text-xl font-black">Your bag is empty</h2><p className="mt-2 text-sm text-white/45">Choose dishes from the visual menu and they will appear here.</p><Link href="/guest/restaurant" className="mt-6 inline-flex rounded-full bg-[#F2B84B] px-5 py-3 text-xs font-black uppercase tracking-[.14em] text-stone-950">Explore menu</Link></div>
          ) : (
            <div className="space-y-3">{selected.map((item) => { const quantity = cart[item.id] ?? 0; return <div key={item.id} className="rounded-[1.4rem] border border-white/10 bg-black/20 p-3 flex gap-3 items-center"><img src={item.imageUrl} alt={item.name} className="h-20 w-20 rounded-2xl object-cover" /><div className="min-w-0 flex-1"><p className="text-[9px] font-bold uppercase tracking-[.18em] text-[#F2B84B]">{item.amharicName}</p><h3 className="truncate text-base font-black">{item.name}</h3><p className="mt-1 text-xs text-white/45">{item.price.toLocaleString()} ETB each</p></div><div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1"><button type="button" onClick={() => changeQuantity(item.id, -1)} className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center"><Minus className="h-3.5 w-3.5" /></button><span className="min-w-5 text-center text-xs font-black">{quantity}</span><button type="button" onClick={() => changeQuantity(item.id, 1)} className="h-8 w-8 rounded-full bg-white text-stone-950 flex items-center justify-center"><Plus className="h-3.5 w-3.5" /></button></div><p className="hidden sm:block w-24 text-right text-sm font-black">{(item.price * quantity).toLocaleString()} ETB</p></div>; })}</div>
          )}
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[.04] p-5 md:p-6 h-fit lg:sticky lg:top-24">
          <p className="text-[9px] font-black uppercase tracking-[.24em] text-[#E56B4D]">Guest details</p><h2 className="mt-1 text-2xl font-black">Send to resort staff</h2><p className="mt-2 text-xs leading-relaxed text-white/45">These details are sent through the live order pipeline and stored in Supabase when the backend is available.</p>
          <form onSubmit={submitOrder} className="mt-6 space-y-4">
            <label className="block"><span className="text-[10px] font-black uppercase tracking-[.14em] text-white/45">Full name</span><input value={guestName} onChange={(e) => setGuestName(e.target.value)} className="mt-1.5 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none focus:border-[#F2B84B]" placeholder="Guest name" required /></label>
            <label className="block"><span className="text-[10px] font-black uppercase tracking-[.14em] text-white/45">Room number</span><input value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} className="mt-1.5 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none focus:border-[#F2B84B]" placeholder="e.g. 203" required /></label>
            <label className="block"><span className="text-[10px] font-black uppercase tracking-[.14em] text-white/45">Phone</span><input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none focus:border-[#F2B84B]" placeholder="+251..." required /></label>
            {submitError ? <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{submitError}</div> : null}
            <div className="pt-3 border-t border-white/10 flex items-end justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-white/35">Grand total</p><p className="mt-1 text-3xl font-black">{totalPrice.toLocaleString()} <span className="text-xs text-white/45">ETB</span></p></div><button disabled={!selected.length || isSubmitting} type="submit" className="rounded-full bg-[#F2B84B] px-5 py-3 text-xs font-black uppercase tracking-[.12em] text-stone-950 disabled:cursor-not-allowed disabled:opacity-30">{isSubmitting ? 'Submitting...' : 'Submit order'}</button></div>
          </form>
        </section>
      </main>
      <footer className="border-t border-white/10 bg-black/25"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-6 md:px-6"><p className="text-xs font-black uppercase tracking-[.18em] text-[#F2C866]">Tule Resort • Hawassa</p><p className="text-[10px] uppercase tracking-[.18em] text-white/35">Relax. Enjoy. Remember.</p></div></footer>
    </div>
  );
}
