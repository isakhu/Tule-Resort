import Link from 'next/link';
import { ArrowLeft, BedDouble, UtensilsCrossed } from 'lucide-react';

export default function MyActivityPage() {
  return (
    <div className="min-h-screen bg-[#fcfaf7] pb-24 font-sans text-stone-900">
      <header className="sticky top-0 z-50 flex items-center gap-4 border-b border-stone-200/50 bg-[#fcfaf7]/90 px-6 py-4 backdrop-blur-md">
        <Link href="/guest" aria-label="Back to guest services">
          <ArrowLeft className="h-5 w-5 text-stone-600" />
        </Link>
        <h1 className="text-lg font-serif font-bold text-stone-800">My Activity</h1>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-5 py-10 md:py-16">
        <div className="rounded-3xl border border-stone-200 bg-white p-7 shadow-sm md:p-10">
          <p className="text-[10px] font-black uppercase tracking-[.24em] text-stone-400">Guest account</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-stone-900">Your activity, in one place.</h2>
          <p className="mt-4 text-sm leading-7 text-stone-600">
            Personal order and booking history is not connected to this page yet. We do not show sample orders as if they belonged to you. Once your activity is linked to your guest account, this page can show real statuses and updates.
          </p>
          <p className="mt-3 text-xs leading-6 text-stone-400">
            You can still browse the menu and room options below. Submitting a request does not mean a booking is confirmed unless the resort confirms it.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/guest/restaurant" className="group rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <UtensilsCrossed className="h-6 w-6 text-stone-600" />
            <h3 className="mt-4 text-base font-black text-stone-900">Browse the menu</h3>
            <p className="mt-2 text-sm leading-6 text-stone-500">Explore dishes and add items to your order bag.</p>
            <span className="mt-5 inline-block text-xs font-black uppercase tracking-[.14em] text-stone-700 group-hover:underline">Open restaurant →</span>
          </Link>
          <Link href="/guest/rooms" className="group rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <BedDouble className="h-6 w-6 text-stone-600" />
            <h3 className="mt-4 text-base font-black text-stone-900">Explore rooms</h3>
            <p className="mt-2 text-sm leading-6 text-stone-500">Review room options and availability information.</p>
            <span className="mt-5 inline-block text-xs font-black uppercase tracking-[.14em] text-stone-700 group-hover:underline">View rooms →</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
