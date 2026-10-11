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
  Users,
  UtensilsCrossed,
  Wrench,
  X,
} from 'lucide-react';
import { useEffect, useState, FormEvent } from 'react';
import { supabase } from '@/lib/supabaseClient';

type UserProfile = {
  id: string;
  email: string | null;
  fullName: string | null;
  role: string;
  departmentId: number | null;
  departmentName: string | null;
};

type ModuleItem = [string, string, any, string];

const ALL_MODULES: Record<string, ModuleItem> = {
  rooms: ['Rooms', 'Manage room inventory, pricing, amenities and availability.', BedDouble, '/staff/dashboard/rooms'],
  reservations: ['Reservations', 'Confirm, reject, check in and check out guests.', CalendarDays, '/staff/dashboard/reservations'],
  menu: ['Restaurant Menu', 'Manage dishes, categories, prices and daily specials.', UtensilsCrossed, '/staff/dashboard/menu'],
  orders: ['Orders & Requests', 'Review live guest dining and service requests.', ClipboardList, '/admin/orders'],
  receipts: ['Receipts & Billing', 'Generate, review and print guest folios and receipts.', DollarSign, '/staff/dashboard/receipts'],
  services: ['Wellness & Services', 'Manage spa treatments, concierge and guest activities.', Sparkles, '/staff/dashboard/services'],
  gallery: ['Resort Gallery', 'Organize and feature high-resolution resort photos.', Images, '/staff/dashboard/gallery'],
  housekeeping: ['Housekeeping', 'Assign, inspect and complete room cleaning tasks.', Sparkles, '/staff/dashboard/housekeeping'],
  maintenance: ['Maintenance', 'Report and track resort equipment and facility repairs.', Wrench, '/staff/dashboard/maintenance'],
  staff: ['Staff Management', 'Create staff accounts, assign departments and reset passwords.', Users, '/admin/staff'],
  settings: ['Resort Settings', 'Configure tax, service charges, cancellation and policies.', Settings, '/staff/dashboard/settings'],
};

export default function StaffDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState({
    reservations: 0,
    rooms: 0,
    revenue: 0,
    gallery: 0,
    menuItems: 0,
  });

  // Filter tab for Admins / Managers (All vs Department view)
  const [activeTab, setActiveTab] = useState<'all' | 'restaurant' | 'frontdesk' | 'housekeeping' | 'spa'>('all');

  // Change Password Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // 1) Fetch user profile & role & department from /api/staff/me
    supabase.auth.getSession().then(async ({ data: sessionData }) => {
      const token = sessionData.session?.access_token;
      if (!token) return;

      try {
        const res = await fetch('/api/staff/me', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (res.ok) {
          const json = await res.json();
          if (json.profile) {
            setProfile(json.profile);
          }
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      }
    });

    // 2) Fetch live metrics
    Promise.all([
      supabase.from('room_reservations').select('id,total_price,status,payment_status'),
      supabase.from('rooms').select('id', { count: 'exact', head: true }),
      supabase.from('gallery').select('id', { count: 'exact', head: true }),
      supabase.from('menu_items').select('id', { count: 'exact', head: true }),
    ]).then(([reservations, rooms, gallery, menu]) => {
      const rows = reservations.data ?? [];
      setStats({
        reservations: rows.length,
        rooms: rooms.count ?? 0,
        revenue: rows.filter((r) => r.payment_status === 'paid').reduce((sum, r) => sum + Number(r.total_price || 0), 0),
        gallery: gallery.count ?? 0,
        menuItems: menu.count ?? 0,
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

  // Determine user category
  const role = profile?.role ?? 'manager';
  const dept = (profile?.departmentName ?? '').toLowerCase();
  const email = (profile?.email ?? '').toLowerCase();
  const isAdmin = role === 'admin' || email.includes('admin') || email.includes('yishakhak');
  const isRestaurant = dept.includes('restaurant') || email.includes('restaurant');
  const isFrontDesk = dept.includes('front desk') || email.includes('frontdesk');
  const isHousekeeping = dept.includes('housekeeping') || email.includes('housekeeping');
  const isSpa = dept.includes('spa') || email.includes('spa');
  const isGeneralManager = !isRestaurant && !isFrontDesk && !isHousekeeping && !isSpa;

  // Compute curated modules
  let activeModules: ModuleItem[] = [];

  if (isRestaurant) {
    activeModules = [ALL_MODULES.menu, ALL_MODULES.orders, ALL_MODULES.receipts];
  } else if (isFrontDesk) {
    activeModules = [ALL_MODULES.reservations, ALL_MODULES.rooms, ALL_MODULES.orders, ALL_MODULES.receipts];
  } else if (isHousekeeping) {
    activeModules = [ALL_MODULES.housekeeping, ALL_MODULES.maintenance, ALL_MODULES.rooms];
  } else if (isSpa) {
    activeModules = [ALL_MODULES.services, ALL_MODULES.orders, ALL_MODULES.gallery];
  } else {
    // Admin or General Manager - full modules
    if (isAdmin) {
      activeModules = [
        ALL_MODULES.staff,
        ALL_MODULES.rooms,
        ALL_MODULES.reservations,
        ALL_MODULES.menu,
        ALL_MODULES.orders,
        ALL_MODULES.receipts,
        ALL_MODULES.services,
        ALL_MODULES.housekeeping,
        ALL_MODULES.maintenance,
        ALL_MODULES.gallery,
        ALL_MODULES.settings,
      ];
    } else {
      activeModules = [
        ALL_MODULES.rooms,
        ALL_MODULES.reservations,
        ALL_MODULES.menu,
        ALL_MODULES.orders,
        ALL_MODULES.receipts,
        ALL_MODULES.services,
        ALL_MODULES.housekeeping,
        ALL_MODULES.maintenance,
        ALL_MODULES.gallery,
        ALL_MODULES.settings,
      ];
    }
  }

  // Header Title & Badge
  let badgeLabel = 'Staff Portal';
  let portalTitle = 'Tule Resort Staff Control';
  let portalDescription = 'Manage your department operations and guest services.';

  if (isAdmin) {
    badgeLabel = 'Executive Super Admin';
    portalTitle = 'Tule Resort Executive Control';
    portalDescription = 'Full administrative control including staff management, financial rates, dining, rooms and all resort operations.';
  } else if (isRestaurant) {
    badgeLabel = 'Dining & Culinary Department';
    portalTitle = 'Restaurant & Dining Portal';
    portalDescription = 'Manage the 100+ menu items, categories, daily prices, and review incoming guest dining orders in real-time.';
  } else if (isFrontDesk) {
    badgeLabel = 'Front Desk & Guest Reception';
    portalTitle = 'Front Desk & Reservations Portal';
    portalDescription = 'Check-in guests, confirm room reservations, monitor room availability, and handle guest service requests.';
  } else if (isHousekeeping) {
    badgeLabel = 'Housekeeping & Facilities';
    portalTitle = 'Housekeeping & Maintenance Operations';
    portalDescription = 'Assign and complete room cleaning schedules, verify room readiness, and track facility repairs.';
  } else if (isSpa) {
    badgeLabel = 'Spa & Wellness Sanctuary';
    portalTitle = 'Spa & Wellness Management';
    portalDescription = 'Manage therapeutic treatments, massage appointments, sauna/steam packages, and guest wellness bookings.';
  } else if (isGeneralManager) {
    badgeLabel = 'General Management';
    portalTitle = 'Resort Operations Center';
    portalDescription = 'Centralized operations oversight across rooms, dining, housekeeping, wellness, and resort settings.';
  }

  return (
    <div className="min-h-screen bg-[#F8F5EE] text-[#182326]">
      {/* Top Navigation Bar */}
      <header className="border-b border-white/10 bg-[#0B3D4A] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <img src="/tule-resort-mark.svg" alt="Tule Resort" className="h-10 w-12 rounded-lg object-cover" />
            <div>
              <p className="font-display text-2xl leading-none">Tule Resort</p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-[.25em] text-[#C8A15A]">{badgeLabel}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {profile?.fullName && (
              <span className="hidden text-xs font-semibold text-white/90 md:inline-block">
                {profile.fullName}
              </span>
            )}
            <span className="hidden rounded-full bg-white/10 px-3 py-1 text-xs text-white/70 sm:inline-block">
              {profile?.email || 'Staff'}
            </span>

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

      {/* Main Dashboard */}
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        {/* Onboarding Notice for Default Password */}
        <section className="mb-6 flex flex-col items-start justify-between gap-4 rounded-2xl border border-[#C8A15A]/30 bg-[#FFFDF8] p-5 shadow-sm sm:flex-row sm:items-center">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0B3D4A] text-[#C8A15A]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#182326]">First Time Logging In?</h3>
              <p className="text-xs text-[#182326]/65">
                If you are using the default onboarding password, click below to set your own private password.
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

        {/* Hero Section Tailored to Role */}
        <section className="rounded-[2rem] bg-[#0B3D4A] p-7 text-white md:p-9">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#C8A15A]/20 px-3 py-1 text-[10px] font-black uppercase tracking-[.2em] text-[#D8C7A3]">
              {badgeLabel}
            </span>
          </div>
          <h1 className="mt-3 font-display text-4xl leading-tight md:text-6xl">{portalTitle}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">{portalDescription}</p>
        </section>

        {/* Role-Specific Metric Cards */}
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isRestaurant && (
            <>
              <Stat icon={UtensilsCrossed} label="Menu items" value={stats.menuItems.toLocaleString()} />
              <Stat icon={ClipboardList} label="Dining orders stream" value="Active" />
              <Stat icon={DollarSign} label="Currency" value="ETB (ብር)" />
              <Stat icon={Images} label="Live catalog" value="Ready" />
            </>
          )}

          {isFrontDesk && (
            <>
              <Stat icon={CalendarDays} label="Total reservations" value={stats.reservations.toLocaleString()} />
              <Stat icon={BedDouble} label="Room inventory" value={stats.rooms.toLocaleString()} />
              <Stat icon={DollarSign} label="Paid revenue" value={`${stats.revenue.toLocaleString()} ብር`} />
              <Stat icon={ClipboardList} label="Guest folios" value="Active" />
            </>
          )}

          {isHousekeeping && (
            <>
              <Stat icon={BedDouble} label="Resort rooms" value={stats.rooms.toLocaleString()} />
              <Stat icon={Sparkles} label="Cleaning queue" value="Ready" />
              <Stat icon={Wrench} label="Maintenance dispatch" value="Active" />
              <Stat icon={CalendarDays} label="Room inspections" value="Daily" />
            </>
          )}

          {isSpa && (
            <>
              <Stat icon={Sparkles} label="Active wellness services" value="Ready" />
              <Stat icon={ClipboardList} label="Spa requests" value="Live" />
              <Stat icon={Images} label="Sanctuary gallery" value={stats.gallery.toLocaleString()} />
              <Stat icon={DollarSign} label="Pricing standard" value="ETB (ብር)" />
            </>
          )}

          {(isAdmin || isGeneralManager) && (
            <>
              <Stat icon={CalendarDays} label="Reservations" value={stats.reservations.toLocaleString()} />
              <Stat icon={BedDouble} label="Rooms" value={stats.rooms.toLocaleString()} />
              <Stat icon={DollarSign} label="Paid revenue" value={`${stats.revenue.toLocaleString()} ብር`} />
              <Stat icon={UtensilsCrossed} label="Menu items" value={stats.menuItems.toLocaleString()} />
            </>
          )}
        </section>

        {/* Action Modules for this Role */}
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold text-[#182326]">
              {isRestaurant
                ? 'Restaurant Management Modules'
                : isFrontDesk
                ? 'Front Desk Workstations'
                : isHousekeeping
                ? 'Housekeeping & Facilities Modules'
                : isSpa
                ? 'Spa & Wellness Workstations'
                : 'Management Control Modules'}
            </h2>
            <span className="text-xs font-semibold text-[#182326]/50">
              {activeModules.length} active {activeModules.length === 1 ? 'module' : 'modules'}
            </span>
          </div>

          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeModules.map(([name, description, Icon, href]) => {
              const I = Icon as typeof BedDouble;
              return (
                <Link
                  key={name as string}
                  href={href as string}
                  className="group rounded-3xl border border-[#0B3D4A]/10 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#C8A15A]/60 hover:shadow-md"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF4F7] group-hover:bg-[#0B3D4A] group-hover:text-white transition">
                    <I className="h-6 w-6 text-[#0B3D4A] group-hover:text-[#C8A15A]" />
                  </div>
                  <h3 className="mt-5 text-xl font-black text-[#182326]">{name as string}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#182326]/60">{description as string}</p>
                  <div className="mt-5 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] text-[#C8A15A]">
                    Open workstation <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
          </section>
        </div>

        {/* Helpful Department Guidelines Card */}
        <section className="mt-8 rounded-[2rem] border border-[#C8A15A]/25 bg-[#D8C7A3]/25 p-7">
          <LayoutDashboard className="h-6 w-6 text-[#0B3D4A]" />
          <h2 className="mt-4 font-display text-3xl text-[#182326]">
            {isRestaurant
              ? 'Dining Operations Notice'
              : isFrontDesk
              ? 'Front Desk Daily Operations'
              : isHousekeeping
              ? 'Housekeeping Quality Standards'
              : isSpa
              ? 'Wellness Experience Standards'
              : 'Tule Resort Executive Operations'}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-[#182326]/70">
            {isRestaurant &&
              'Manage dishes and prices directly through the Menu workstation. All kitchen orders placed by guests or tables show in Orders & Requests.'}
            {isFrontDesk &&
              'Use Reservations to register walk-ins and confirm online bookings. Room statuses update automatically across the entire system.'}
            {isHousekeeping &&
              'Check off room cleanings to update room availability. Report any maintenance issues immediately to notify the facility technician.'}
            {isSpa &&
              'Keep wellness service descriptions and timing up to date so guests can easily reserve spa sessions.'}
            {(isAdmin || isGeneralManager) &&
              'Use Settings to adjust tax and service charge percentages. Admins can manage staff credentials and access in Staff Management.'}
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

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-[#0B3D4A]/10 bg-white p-5">
      <Icon className="h-5 w-5 text-[#0B3D4A]" />
      <p className="mt-4 text-xs font-bold text-[#182326]/50">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}
