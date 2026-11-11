'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Check, Minus, Phone, Plus, Search, ShoppingBag, Sparkles, UtensilsCrossed } from 'lucide-react';
import type { MenuItem } from '@/lib/menu';
import { syncCartWithGuestStay, useGuestCart } from '@/lib/guestCart';
import { fetchCurrentGuestStay } from '@/lib/guestSession';
import { FALLBACK_FOOD_IMAGE, isOptimizableImageSrc } from '@/lib/imageSrc';

function FlowerPriceBadge({ price }: { price: number }) {
  return (
    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center select-none transition-transform hover:scale-105">
      <svg viewBox="0 0 100 100" className="h-full w-full text-[#C5A46D] drop-shadow-[0_4px_10px_rgba(197,164,109,0.35)]" fill="currentColor">
        <path d="M50 3 C53.5 3 56.5 9 60.5 10 C64.5 11 69 7.5 72.5 9.5 C76 11.5 77 18 80.5 21 C84 24 90 23.5 92.5 27 C95 30.5 93 36.5 94.5 40.5 C96 44.5 100 47.5 100 51.5 C100 55.5 96 58.5 94.5 62.5 C93 66.5 95 72.5 92.5 76 C90 79.5 84 79 80.5 82 C77 85 76 91.5 72.5 93.5 C69 95.5 64.5 92 60.5 93 C56.5 94 53.5 100 50 100 C46.5 100 43.5 94 39.5 93 C35.5 92 31 95.5 27.5 93.5 C24 91.5 23 85 19.5 82 C16 79 10 79.5 7.5 76 C5 72.5 7 66.5 5.5 62.5 C4 58.5 0 55.5 0 51.5 C0 47.5 4 44.5 5.5 40.5 C7 36.5 5 30.5 7.5 27 C10 23.5 16 24 19.5 21 C23 18 24 11.5 27.5 9.5 C31 7.5 35.5 11 39.5 10 C43.5 9 46.5 3 50 3 Z" />
      </svg>
      <div className="absolute text-center leading-none text-[#163D32] pointer-events-none">
        <span className="block text-sm font-black tracking-tight">{price}</span>
        <span className="block text-[7px] font-extrabold uppercase opacity-90">ETB</span>
      </div>
    </div>
  );
}

const PREFERRED_CATEGORY_ORDER = [
  'Breakfast',
  'Ethiopian',
  'Beef & Lamb',
  'Poultry & Fish',
  'Mains',
  'Main Course',
  'Fish & Seafood',
  'Vegetarian & Vegan',
  'Fast Food & Bowls',
  'Pizza',
  'Pasta',
  'Pizza & Pasta',
  'Burgers & Sandwiches',
  'Burgers',
  'Modern & Intercontinental',
  'Sides',
  'Sides & Appetizers',
  'Starters',
  'Appetizers',
  'Desserts',
  'Desserts & Sweets',
  'Dessert',
  'Drinks',
  'Beverages',
  'Coffee',
  'Kids',
  'Other',
];

export default function RestaurantMenuClient({ items }: { items: MenuItem[] }) {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [failedImgIds, setFailedImgIds] = useState<Record<string, boolean>>({});
  const { cart, hydrated, changeQuantity } = useGuestCart();
  const isClickScrolling = useRef(false);

  useEffect(() => {
    let active = true;
    fetchCurrentGuestStay()
      .then((res) => {
        if (active && res.authenticated && res.stay?.id) {
          syncCartWithGuestStay(res.stay.id);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Helper to generate section id
  const getCatId = (cat: string) => `cat-${cat.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  const categoryTabs = useMemo(() => {
    const uniqueCats = Array.from(
      new Set(items.map((item) => (item.category || 'General').trim()).filter(Boolean)),
    );
    uniqueCats.sort((a, b) => {
      const idxA = PREFERRED_CATEGORY_ORDER.findIndex((c) => c.toLowerCase() === a.toLowerCase());
      const idxB = PREFERRED_CATEGORY_ORDER.findIndex((c) => c.toLowerCase() === b.toLowerCase());
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
    return ['All', ...uniqueCats];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.amharicName.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query);

      return matchesSearch;
    });
  }, [items, searchQuery]);

  // Group items by category for smooth jumping & section view
  const categorySections = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    categoryTabs.filter((t) => t !== 'All').forEach((tab) => map.set(tab, []));

    filteredItems.forEach((item) => {
      const cat = (item.category || 'General').trim();
      if (!map.has(cat)) {
        map.set(cat, []);
      }
      map.get(cat)!.push(item);
    });

    return Array.from(map.entries())
      .map(([category, catItems]) => ({
        category,
        id: getCatId(category),
        items: catItems,
      }))
      .filter((s) => s.items.length > 0);
  }, [filteredItems, categoryTabs]);

  const handleScrollToCategory = (cat: string) => {
    setActiveCategory(cat);
    if (cat === 'All') {
      const allEl = document.getElementById('menu-content-top');
      if (allEl) {
        allEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }

    const catId = getCatId(cat);
    const target = document.getElementById(catId);
    if (target) {
      isClickScrolling.current = true;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => {
        isClickScrolling.current = false;
      }, 800);
    }
  };

  // IntersectionObserver for active category highlight on scroll
  useEffect(() => {
    if (searchQuery.trim()) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isClickScrolling.current) return;
        const visible = entries.find((e) => e.isIntersecting);
        if (visible && visible.target.id) {
          const matchedSection = categorySections.find((s) => s.id === visible.target.id);
          if (matchedSection) {
            setActiveCategory(matchedSection.category);
          }
        }
      },
      {
        rootMargin: '-20% 0px -65% 0px',
        threshold: 0.05,
      }
    );

    categorySections.forEach((section) => {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [categorySections, searchQuery, isClickScrolling]);

  const totalItems = hydrated
    ? Object.values(cart).reduce((sum, quantity) => sum + quantity, 0)
    : 0;
  const totalAmount = useMemo(() => {
    if (!hydrated) return 0;
    return Object.entries(cart).reduce((sum, [id, qty]) => {
      const item = items.find((i) => i.id === id);
      return sum + (item ? item.price * qty : 0);
    }, 0);
  }, [hydrated, cart, items]);

  return (
    <main id="menu" className="relative min-h-screen bg-[#F5F0E6] pb-28 pt-8 text-[#26312D]">
      {/* Top Banner & Search — Deep Forest Green */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-[#163D32] p-6 text-[#F5F0E6] shadow-2xl md:p-10 border border-[#C5A46D]/20">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#C5A46D]/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-[#8A9B83]/20 blur-3xl" />

          <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-black/20 border border-white/10 overflow-hidden">
                  <Image
                    src="/tule-resort-logo.png"
                    alt="Tule Resort Logo"
                    width={40}
                    height={40}
                    className="h-full w-full object-contain"
                  />
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#C5A46D]/40 bg-[#C5A46D]/15 px-3.5 py-1 text-[10px] font-black uppercase tracking-[.22em] text-[#C5A46D] backdrop-blur-md">
                  <Sparkles className="h-3.5 w-3.5 text-[#C5A46D]" />
                  Tule Resort Lakeside Dining ({items.length} Specialties)
                </span>
              </div>
              <h2 className="font-display font-medium text-3xl tracking-tight sm:text-4xl md:text-5xl uppercase leading-none">
                FRESH. FLAVORFUL.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F5F0E6] via-[#C5A46D] to-[#D4B87D] italic">
                  LAKESIDE GASTRONOMY.
                </span>
              </h2>
              <p className="text-xs text-[#F5F0E6]/80 sm:text-sm leading-relaxed">
                Explore our culinary collection from authentic Ethiopian favorites and sizzling clay-pot tibs to fresh Lake Hawassa tilapia, woodfired pizzas, and artisan beverages.
              </p>
            </div>

            {/* Quick Live Order Counter Pill */}
            {totalItems > 0 && (
              <Link
                href="/guest/order"
                className="inline-flex items-center gap-3 rounded-full bg-[#C5A46D] px-6 py-3.5 text-xs font-black uppercase tracking-[.14em] text-[#163D32] shadow-xl transition hover:scale-105 active:scale-95 shrink-0"
              >
                <ShoppingBag className="h-4 w-4 text-[#163D32]" />
                Review Order ({totalItems} items · {totalAmount.toLocaleString()} ETB)
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>

          {/* Search Bar inside banner */}
          <div className="relative mt-8">
            <div className="relative flex items-center">
              <Search className="pointer-events-none absolute left-5 h-5 w-5 text-[#52645D]" />
              <input
                type="search"
                aria-label="Search restaurant dishes and drinks"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across all dishes & drinks (e.g. Tibs, Tilapia, Kitfo, Boba, Pizza, Burger, Coffee...)"
                className="w-full rounded-full border border-white/20 bg-white py-4 pl-14 pr-16 text-sm font-bold text-[#26312D] placeholder:text-[#52645D] shadow-lg outline-none transition focus:border-[#C5A46D] focus:ring-4 focus:ring-[#C5A46D]/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear menu search"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-5 text-xs font-black uppercase text-[#52645D] hover:text-[#26312D]"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Sticky Horizontal Category Pill Navigation Bar */}
      <nav
        aria-label="Menu Categories"
        className="sticky top-0 z-30 mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8 py-2.5 backdrop-blur-md bg-[#F5F0E6]/90 border-y border-[#163D32]/10 shadow-xs"
      >
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none py-1">
          {categoryTabs.map((tab) => {
            const isActive = activeCategory === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => handleScrollToCategory(tab)}
                className={`shrink-0 rounded-full px-5 py-2 text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-[#163D32] text-[#F5F0E6] shadow-md shadow-[#163D32]/25 ring-2 ring-[#C5A46D] scale-[1.03]'
                    : 'bg-white text-[#26312D]/80 hover:bg-[#EDE8DC] hover:text-[#163D32] border border-[#163D32]/15 shadow-2xs'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </nav>

      <div id="menu-content-top" />

      {/* Results Header */}
      <section className="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between border-b border-[#163D32]/10 pb-4">
          <div>
            <h3 className="font-display text-2xl font-medium tracking-tight text-[#26312D]">
              {searchQuery ? `Search Results for "${searchQuery}"` : `Resort Dining Menu (${filteredItems.length} Specialties)`}
            </h3>
            <p className="text-xs font-bold text-[#8A9B83]">
              Showing {filteredItems.length} available dishes &amp; beverages across {categorySections.length} categories
            </p>
          </div>
        </div>
      </section>

      {/* Styled Menu Cards by Category */}
      <section className="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
        {filteredItems.length === 0 ? (
          <div className="rounded-[2.5rem] border border-dashed border-[#163D32]/20 bg-white p-12 text-center">
            <UtensilsCrossed className="mx-auto h-12 w-12 text-[#C5A46D]" />
            <h4 className="mt-4 font-display text-2xl font-medium text-[#26312D]">No items match &quot;{searchQuery}&quot;</h4>
            <p className="mt-2 text-sm text-[#8A9B83]">Try searching for keywords like &quot;tibs&quot;, &quot;tilapia&quot;, &quot;burger&quot;, &quot;coffee&quot;, or &quot;pasta&quot;.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('All');
              }}
              className="mt-5 rounded-full bg-[#163D32] hover:bg-[#C5A46D] hover:text-[#163D32] px-6 py-2.5 text-xs font-black uppercase tracking-wider text-[#F5F0E6] transition shadow-md"
            >
              Reset Search
            </button>
          </div>
        ) : (
          categorySections.map((section) => (
            <div key={section.id} id={section.id} className="scroll-mt-28 space-y-6">
              {/* Category Section Header */}
              <div className="flex items-center justify-between border-b border-[#163D32]/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="h-3 w-3 rounded-full bg-[#C5A46D]" />
                  <h3 className="font-display text-2xl sm:text-3xl font-medium tracking-tight text-[#26312D]">
                    {section.category}
                  </h3>
                  <span className="rounded-full bg-[#163D32]/10 px-2.5 py-0.5 text-[11px] font-black text-[#163D32]">
                    {section.items.length}
                  </span>
                </div>
              </div>

              {/* Items Grid */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {section.items.map((item, index) => {
                  const quantity = hydrated ? (cart[item.id] ?? 0) : 0;
                  const isEven = index % 2 === 0;

                  return (
                    <article
                      key={item.id}
                      className="group relative flex flex-col justify-between overflow-hidden rounded-[2.2rem] border border-[#163D32]/10 bg-white p-6 shadow-[0_12px_32px_rgba(22,61,50,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(22,61,50,0.1)] hover:border-[#C5A46D]/60"
                    >
                      {/* Pod Header: Title & Badges */}
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <span className="rounded-full bg-[#F5F0E6] px-3 py-1 text-[9px] font-black uppercase tracking-[.18em] text-[#163D32]">
                            {item.category}
                          </span>
                          {item.amharicName && (
                            <span className="rounded-full bg-[#163D32]/5 px-2.5 py-0.5 text-[11px] font-display font-medium text-[#7A5A27]">
                              {item.amharicName}
                            </span>
                          )}
                        </div>

                        {/* Alternating Layout */}
                        <div className={`mt-4 flex items-center gap-4 ${isEven ? 'flex-row' : 'flex-row-reverse'}`}>
                          {/* Circular Food Plate Image */}
                          <div className="relative h-28 w-28 sm:h-32 sm:w-32 shrink-0 overflow-hidden rounded-full shadow-[0_12px_24px_rgba(0,0,0,0.15)] ring-4 ring-[#F5F0E6]">
                            <Image
                              src={failedImgIds[item.id] ? FALLBACK_FOOD_IMAGE : item.imageUrl}
                              alt={item.name}
                              fill
                              sizes="128px"
                              unoptimized={!isOptimizableImageSrc(failedImgIds[item.id] ? FALLBACK_FOOD_IMAGE : item.imageUrl)}
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                              onError={() =>
                                setFailedImgIds((prev) => (prev[item.id] ? prev : { ...prev, [item.id]: true }))
                              }
                            />
                          </div>

                          {/* Title & Scalloped Flower Price Badge */}
                          <div className="flex flex-1 flex-col justify-center">
                            <h4 className="font-display font-medium text-xl sm:text-2xl tracking-tight text-[#26312D] leading-tight line-clamp-2">
                              {item.name}
                            </h4>

                            <div className="mt-3 flex items-center gap-2">
                              <FlowerPriceBadge price={item.price} />
                            </div>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="mt-4 text-xs leading-relaxed text-[#52645D] line-clamp-2">
                          {item.description}
                        </p>
                      </div>

                      {/* ORDER NOW Action Bar */}
                      <div className="mt-5 border-t border-[#163D32]/10 pt-4">
                        {quantity === 0 ? (
                          <button
                            type="button"
                            onClick={() => changeQuantity(item.id, 1)}
                            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#163D32] hover:bg-[#C5A46D] hover:text-[#163D32] py-3 text-xs font-black uppercase tracking-[.16em] text-[#F5F0E6] shadow-md transition duration-300 active:scale-95 cursor-pointer"
                          >
                            ORDER NOW
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        ) : (
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center rounded-full border border-[#163D32]/20 bg-[#F5F0E6] p-1 shadow-sm">
                              <button
                                type="button"
                                onClick={() => changeQuantity(item.id, -1)}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#163D32] transition hover:bg-[#EDE8DC] active:scale-90"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="min-w-8 text-center text-xs font-black text-[#163D32]">
                                {quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => changeQuantity(item.id, 1)}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#163D32] text-[#F5F0E6] transition hover:bg-[#C5A46D] hover:text-[#163D32] active:scale-90"
                                aria-label="Increase quantity"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <Link
                              href="/guest/order"
                              className="inline-flex items-center gap-1.5 rounded-full bg-[#163D32] px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-[#C5A46D] shadow-md transition hover:bg-[#0F2D24]"
                            >
                              <Check className="h-3.5 w-3.5" />
                              In Bag ({quantity})
                            </Link>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </section>

      {/* Floating Bottom Cart Bar when items are selected */}
      {totalItems > 0 && (
        <aside className="fixed bottom-6 left-1/2 z-50 w-[92%] max-w-2xl -translate-x-1/2">
          <div className="flex items-center justify-between rounded-full bg-[#163D32] p-3 pl-6 text-[#F5F0E6] shadow-2xl ring-2 ring-[#C5A46D]">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#C5A46D]">Order Summary</p>
              <p className="text-base font-black">
                {totalItems} item{totalItems > 1 ? 's' : ''} · <span className="text-[#C5A46D]">{totalAmount.toLocaleString()} ETB</span>
              </p>
            </div>
            <Link
              href="/guest/order"
              className="inline-flex items-center gap-2 rounded-full bg-[#C5A46D] px-6 py-3 text-xs font-black uppercase tracking-[.14em] text-[#163D32] shadow-lg transition hover:scale-105 active:scale-95"
            >
              <ShoppingBag className="h-4 w-4" />
              Checkout Now
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </aside>
      )}

      {/* Footer Contact bar */}
      <footer className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 rounded-3xl bg-[#163D32] p-6 text-[#F5F0E6] sm:flex-row sm:px-8 border border-[#C5A46D]/20 shadow-xl">
          <div className="flex items-center gap-3">
            <Phone className="h-6 w-6 text-[#C5A46D]" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#8A9B83]">Room Delivery &amp; Table Reservation</p>
              <p className="font-display font-medium text-xl text-[#F5F0E6]">+251 994 781 422</p>
            </div>
          </div>
          <div className="text-center sm:text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#C5A46D]">Tule Resort Lake Hawassa</p>
            <p className="text-sm font-medium text-[#F5F0E6]/80">Lakeside Terrace &amp; Resort Dining</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
