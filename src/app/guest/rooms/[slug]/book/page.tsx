import Link from 'next/link';
import { ArrowLeft, BedDouble, ShieldCheck, Sparkles, Check, Compass, Maximize2, Users, MapPin, Phone } from 'lucide-react';
import RoomBookingForm from '@/components/RoomBookingForm';
import { getRoomBySlug } from '@/lib/rooms';

export default async function RoomBookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const room = await getRoomBySlug(decodedSlug);

  if (!room) {
    return (
      <main className="min-h-screen bg-[#070A0F] px-4 py-20 text-white flex items-center justify-center">
        <div className="mx-auto max-w-md rounded-3xl border border-[#C5A059]/30 bg-[#121822] p-8 text-center shadow-2xl">
          <h1 className="text-2xl font-black text-[#F5E2B3]">Room Not Found</h1>
          <p className="mt-3 text-sm text-slate-300">The requested room accommodation could not be found or is currently archived.</p>
          <Link href="/guest/rooms" className="mt-6 inline-flex rounded-full bg-gradient-to-r from-[#D4AF37] to-[#B38E33] px-6 py-3 text-xs font-black uppercase tracking-wider text-[#0A0E14] hover:brightness-110">
            Back to luxury rooms
          </Link>
        </div>
      </main>
    );
  }

  const maxGuests = Number(room.maxOccupancy ?? room.capacity ?? 2);
  const price = Number(room.price ?? 0);
  const currency = 'ETB';

  return (
    <main className="min-h-screen bg-[#070A0F] text-[#ECEFF1] pb-20">
      {/* Top Banner */}
      <header className="relative border-b border-[#C5A059]/20 bg-gradient-to-b from-[#0A0E15] via-[#101722] to-[#0A0E15] py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Link
            href="/guest/rooms"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 transition hover:text-[#DFB76C]"
          >
            <ArrowLeft className="h-4 w-4" /> All Luxury Accommodations
          </Link>

          <div className="mt-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.25em] text-[#DFB76C]">
                <BedDouble className="h-4 w-4" /> Tule Resort · Reservation & Stay
              </div>
              {room.nameAm && (
                <p className="mt-1 text-sm font-serif text-[#DFB76C]">{room.nameAm}</p>
              )}
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white font-serif sm:text-5xl">
                Reserve {room.name}
              </h1>
              <p className="mt-3 max-w-2xl text-xs sm:text-sm text-slate-300 leading-relaxed">
                Experience comfort by Lake Hawassa. Select your stay dates and guest details. Your reservation request will be confirmed with our concierge desk upon submission.
              </p>
            </div>

            {/* Nightly rate badge */}
            <div className="rounded-2xl border border-[#C5A059]/30 bg-[#16202E]/80 p-4 backdrop-blur-md">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nightly Rate</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-3xl font-black text-[#F5E2B3] font-serif">{price.toLocaleString()}</span>
                <span className="text-xs font-bold text-[#DFB76C]">ETB</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">Breakfast & Taxes Included</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Reservation Section */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Left Column: Room Summary Card */}
          <div className="lg:col-span-5">
            <div className="sticky top-20 overflow-hidden rounded-3xl border border-[#C5A059]/30 bg-[#121924] shadow-2xl">
              <div className="relative h-64 w-full overflow-hidden bg-black">
                <img
                  src={room.imageUrl}
                  alt={room.name}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#121924] via-transparent to-transparent" />
                <div className="absolute top-4 left-4">
                  <span className="rounded-full border border-[#C5A059]/40 bg-[#0A0E14]/80 px-3 py-1 text-[10px] font-bold text-[#F5E2B3] backdrop-blur-md">
                    {room.view || room.type}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <h3 className="font-serif text-xl font-black text-white">{room.name}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-300">{room.description}</p>

                {/* Specs */}
                <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-[#C5A059]/15 bg-[#16202E]/50 p-2.5 text-center">
                  {room.bedType && (
                    <div className="border-r border-[#C5A059]/15 pr-1">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Bed</span>
                      <span className="text-[11px] font-bold text-slate-200">{room.bedType}</span>
                    </div>
                  )}
                  {room.sizeSqm && (
                    <div className="border-r border-[#C5A059]/15 px-1">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Size</span>
                      <span className="text-[11px] font-bold text-slate-200">{room.sizeSqm} m²</span>
                    </div>
                  )}
                  <div className="pl-1">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Capacity</span>
                    <span className="text-[11px] font-bold text-slate-200">{maxGuests} Guests</span>
                  </div>
                </div>

                {/* Included Amenities */}
                {room.amenities && room.amenities.length > 0 && (
                  <div className="mt-5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#DFB76C]">
                      Included Privileges
                    </span>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {room.amenities.slice(0, 6).map((am) => (
                        <span
                          key={am}
                          className="inline-flex items-center gap-1 rounded-full border border-[#C5A059]/20 bg-[#16202E]/30 px-2.5 py-1 text-[10px] text-slate-300"
                        >
                          <Check className="h-3 w-3 text-[#D4AF37]" />
                          {am}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Booking Form */}
          <div className="lg:col-span-7">
            <RoomBookingForm
              roomId={room.id}
              roomName={room.name}
              price={price}
              currency={currency}
              maxGuests={maxGuests}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
