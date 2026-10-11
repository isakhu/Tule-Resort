'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  Eye,
  EyeOff,
  Images,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  Sparkles,
  UtensilsCrossed,
  Wrench,
  X,
} from 'lucide-react';
import { useEffect, useState, FormEvent } from 'react';
import { supabase } from '@/lib/supabaseClient';

const modules = [
  ['Rooms', 'Manage rooms, prices, amenities and availability.', BedDouble, '/staff/dashboard/rooms'],
  ['Reservations', 'Confirm, reject, check in and check out guests.', CalendarDays, '/staff/dashboard/reservations'],
  ['Restaurant', 'Manage food, categories, prices and orders.', UtensilsCrossed, '/staff/dashboard/menu'],
  ['Services', 'Manage wellness, transport, concierge and room service.', Sparkles, '/staff/dashboard/services'],
  ['Gallery', 'Organize and feature resort photos.', Images, '/staff/dashboard/gallery'],
  ['Orders & Requests', 'Review guest food and service requests.', ClipboardList, '/admin/orders'],
  ['Housekeeping', 'Assign and complete room cleaning tasks.', Sparkles, '/staff/dashboard/housekeeping'],
  ['Maintenance', 'Report and track resort maintenance issues.', Wrench, '/staff/dashboard/maintenance'],
  ['Settings', 'Tax, service charge, cancellation and no-show policies.', Settings, '/staff/dashboard/settings'],
];

export default function ManagerDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({ reservations: 0, rooms: 0, revenue: 0, gallery: 0 });
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Change Password Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) {
        setUserEmail(data.user.email);
      }
    });

    Promise.all([
      supabase.from('room_reservations').select('id,total_price,status,payment_status'),
      supabase.from('rooms').select('id', { count: 'exact', head: true }),
      supabase.from('gallery').select('id', { count: 'exact', head: true }),
    ]).then(([reservations, rooms, gallery]) => {
      const rows = reservations.data ?? [];
      setStats({
        reservations: rows.length,
        rooms: rooms.count ?? 0,
        revenue: rows.filter((r) => r.payment_status === 'paid').reduce((sum, r) => sum + Number(r.total_price || 0), 0),
        gallery: gallery.count ?? 0,
      });
    });
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/staff/login');
    router.refresh();
  }

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setPasswordMessage({ type: 'error', text: error.message });
      } else {
        setPasswordMessage({
          type: 'success',
          text: 'Password updated successfully! Use your new personal password for future logins.',
        });
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setPasswordMessage({ type: 'error', text: err?.message || 'Failed to update password.' });
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F5EE] text-[#182326]">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0B3D4A] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <img src="/tule-resort-mark.svg" alt="Tule Resort" className="h-10 w-12 rounded-lg object-cover" />
            <div>
              <p className="font-display text-2xl">Tule Resort</p>
              <p className="text-[9px] font-bold uppercase tracking-[.25em] text-white/50">Staff & Management</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {userEmail && (
              <span className="hidden rounded-full bg-white/10 px-3.5 py-1.5 text-xs text-white/80 sm:inline-block">
                {userEmail}
              </span>
            )}

            <button
              onClick={() => {
                setIsPasswordModalOpen(true);
                setPasswordMessage(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
              title="Change Password"
            >
              <KeyRound className="h-3.5 w-3.5 text-[#C8A15A]" />
              <span className="hidden sm:inline">Change Password</span>
            </button>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-100 transition hover:bg-red-500/30"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        {/* Onboarding Notice for First-time Default Password Users */}
        <section className="mb-6 flex flex-col items-start justify-between gap-4 rounded-2xl border border-[#C8A15A]/30 bg-[#FFFDF8] p-5 shadow-sm sm:flex-row sm:items-center">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0B3D4A] text-[#C8A15A]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#182326]">First Time Logging In?</h3>
              <p className="text-xs text-[#182326]/65">
                If you logged in using the default onboarding password, please update it now to your own private password.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsPasswordModalOpen(true);
              setPasswordMessage(null);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0B3D4A] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#159A9C]"
          >
            <KeyRound className="h-3.5 w-3.5 text-[#C8A15A]" />
            Set My Personal Password
          </button>
        </section>

        {/* Hero */}
        <section className="rounded-[2rem] bg-[#0B3D4A] p-7 text-white md:p-9">
          <p className="text-[10px] font-black uppercase tracking-[.24em] text-[#D8C7A3]">Control center</p>
          <h1 className="mt-2 font-display text-5xl leading-none md:text-7xl">Manage Tule Resort.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60">
            Rooms, reservations, payments, dining, housekeeping, maintenance and resort settings in one place.
          </p>
        </section>

        {/* Stats */}
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={CalendarDays} label="Reservations" value={stats.reservations.toLocaleString()} />
          <Stat icon={BedDouble} label="Rooms" value={stats.rooms.toLocaleString()} />
          <Stat icon={DollarSign} label="Paid revenue" value={`${stats.revenue.toLocaleString()} ብር`} />
          <Stat icon={Images} label="Gallery items" value={stats.gallery.toLocaleString()} />
        </section>

        {/* Modules */}
        <section className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {modules.map(([name, description, Icon, href]) => {
            const I = Icon as typeof BedDouble;
            return (
              <Link
                key={name as string}
                href={href as string}
                className="group rounded-3xl border border-[#0B3D4A]/10 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#C8A15A]/60"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF4F7]">
                  <I className="h-6 w-6 text-[#0B3D4A]" />
                </div>
                <h2 className="mt-5 text-xl font-black">{name as string}</h2>
                <p className="mt-2 text-sm leading-6 text-[#182326]/55">{description as string}</p>
                <div className="mt-5 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] text-[#C8A15A]">
                  Manage <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </section>

        {/* Operations */}
        <section className="mt-8 rounded-[2rem] border border-[#C8A15A]/25 bg-[#D8C7A3]/25 p-7">
          <LayoutDashboard className="h-6 w-6 text-[#0B3D4A]" />
          <h2 className="mt-4 font-display text-3xl">Tule Resort operations</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-[#182326]/60">
            Use Settings to configure tax and service charges without changing code. Payment methods remain ETB-first and can be expanded later.
          </p>
        </section>
      </main>

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl border border-[#0B3D4A]/20 bg-white p-6 shadow-2xl md:p-8">
            <button
              onClick={() => setIsPasswordModalOpen(false)}
              className="absolute right-5 top-5 rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0B3D4A] text-white">
                <KeyRound className="h-5 w-5 text-[#C8A15A]" />
              </div>
              <div>
                <h3 className="text-xl font-black text-[#182326]">Change Password</h3>
                <p className="text-xs text-[#182326]/60">Create your new personal password</p>
              </div>
            </div>

            <form onSubmit={handlePasswordChange} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
                  New Password
                </label>
                <div className="relative mt-1">
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password (min. 6 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 pr-11 text-sm outline-none focus:border-[#0B3D4A] focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
                  Confirm New Password
                </label>
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-[#0B3D4A] focus:bg-white"
                />
              </div>

              {passwordMessage && (
                <div
                  className={`flex items-start gap-2 rounded-xl p-3 text-xs font-semibold ${
                    passwordMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {passwordMessage.type === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />}
                  <span>{passwordMessage.text}</span>
                </div>
              )}

              <div className="mt-6 flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-xs font-bold text-stone-600 hover:bg-stone-100"
                >
                  {passwordMessage?.type === 'success' ? 'Close' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="rounded-xl bg-[#0B3D4A] px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-sm transition hover:bg-[#159A9C] disabled:opacity-60"
                >
                  {passwordLoading ? 'Saving…' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-[#0B3D4A]/10 bg-white p-5">
      <Icon className="h-5 w-5 text-[#0B3D4A]" />
      <p className="mt-4 text-xs font-bold text-[#182326]/50">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}
