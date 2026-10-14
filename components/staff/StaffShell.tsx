'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  Flame,
  CalendarDays,
  BedDouble,
  DollarSign,
  Sparkles,
  Wrench,
  Users,
  Settings,
  LogOut,
  Bell,
  Search,
  Menu as MenuIcon,
  X,
  ChevronDown,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  Store,
  Layers,
  ChefHat
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface StaffProfile {
  id: string;
  email: string | null;
  fullName: string | null;
  role: string;
  departmentName?: string | null;
}

export default function StaffShell({
  children,
  badgeCounts,
}: {
  children: React.ReactNode;
  badgeCounts?: { orders?: number };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Password change modal
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    // Live date and time formatting
    const updateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }) + ' • ' + now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
      setCurrentDateTime(formatted);
    };

    updateTime();
    const timer = setInterval(updateTime, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Fetch profile
    async function fetchProfile() {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) return;

        const res = await fetch('/api/staff/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.profile) {
            setProfile(json.profile);
          }
        }
      } catch (err) {
        console.error('Failed to load profile in shell:', err);
      }
    }
    fetchProfile();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/staff/login');
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);
    if (!newPassword || newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordMsg({ type: 'error', text: error.message });
      } else {
        setPasswordMsg({ type: 'success', text: 'Password successfully updated!' });
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setIsPasswordModalOpen(false), 1500);
      }
    } catch {
      setPasswordMsg({ type: 'error', text: 'Failed to update password.' });
    } finally {
      setIsUpdatingPassword(false);
    }
  }

  const NAV_ITEMS = [
    { label: 'Dashboard', href: '/staff/dashboard', icon: LayoutDashboard },
    { label: 'Orders', href: '/staff/dashboard/orders', icon: ClipboardList, badge: badgeCounts?.orders ?? 3 },
    { label: 'Tables', href: '/staff/dashboard/tables', icon: Layers },
    { label: 'Kitchen', href: '/staff/dashboard/kitchen', icon: ChefHat },
    { label: 'Menu', href: '/staff/dashboard/menu', icon: UtensilsCrossed },
    { label: 'Reservations', href: '/staff/dashboard/reservations', icon: CalendarDays },
    { label: 'Rooms', href: '/staff/dashboard/rooms', icon: BedDouble },
    { label: 'Receipts & Sales', href: '/staff/dashboard/receipts', icon: DollarSign },
    { label: 'Wellness & Spa', href: '/staff/dashboard/services', icon: Sparkles },
    { label: 'Housekeeping', href: '/staff/dashboard/housekeeping', icon: Sparkles },
    { label: 'Maintenance', href: '/staff/dashboard/maintenance', icon: Wrench },
    { label: 'Staff Management', href: '/admin/staff', icon: Users },
    { label: 'Settings', href: '/staff/dashboard/settings', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-[#F4F7F8] text-[#1E293B]">
      {/* ─── SIDEBAR (Desktop) ─── */}
      <aside className="hidden lg:flex w-64 flex-col bg-[#0B252C] text-[#94A3B8] border-r border-[#153E47] shrink-0 select-none">
        {/* Official Logo & Tagline */}
        <Link href="/staff/dashboard" className="p-5 pb-4 flex items-center gap-3 border-b border-[#153E47]/70 hover:opacity-95 transition-opacity">
          <div className="h-11 w-14 shrink-0 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/tule-resort-mark.svg"
              alt="Tule Resort Logo"
              className="h-full w-full object-contain drop-shadow"
            />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
              Tule Resort
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#C9902F]">
              Staff & Operations
            </p>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin scrollbar-thumb-white/10">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/staff/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-gradient-to-r from-[#0E7480] to-[#14919B] text-white shadow-md shadow-[#0E7480]/25 border-l-4 border-[#C9902F]'
                    : 'text-[#94A3B8] hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-5 w-5 transition-transform group-hover:scale-105 ${isActive ? 'text-white' : 'text-[#64748B] group-hover:text-white'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      isActive
                        ? 'bg-white text-[#0E7480]'
                        : 'bg-[#C9902F]/20 text-[#F8D77A]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Location & Account Footer */}
        <div className="p-4 border-t border-[#153E47]/70 space-y-3 bg-[#07191E]">
          <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white/5 border border-white/5">
            <Store className="h-4 w-4 text-[#C9902F] shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">Tule Resort & Spa</p>
              <p className="text-[10px] text-teal-200/50 truncate">Lake Hawassa • Main Property</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 text-xs">
            <Link
              href="/staff/dashboard/settings"
              className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-red-400 hover:text-red-300 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Log Out
            </button>
          </div>
        </div>
      </aside>

      {/* ─── MOBILE DRAWER OVERLAY ─── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] bg-[#0B252C] text-[#94A3B8] h-full flex flex-col z-10 shadow-2xl border-r border-[#153E47]">
            <div className="p-5 flex items-center justify-between border-b border-[#153E47]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-12 shrink-0 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/tule-resort-mark.svg"
                    alt="Tule Resort Logo"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-sm font-black text-white">Tule Resort</h1>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[#C9902F]">Staff Portal</p>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/staff/dashboard' && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-[#0E7480] to-[#14919B] text-white shadow-md shadow-[#0E7480]/30 border-l-4 border-[#C9902F]'
                        : 'text-[#94A3B8] hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="rounded-full bg-[#C9902F]/20 text-[#F8D77A] px-2 py-0.5 text-xs font-bold">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-[#153E47] bg-[#07191E]">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-500/10 px-4 py-2.5 text-xs font-bold text-red-400 hover:bg-red-500/20"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MAIN CONTENT AREA ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 shadow-xs">
          {/* Left: Mobile hamburger & Search bar */}
          <div className="flex items-center gap-3 sm:gap-4 flex-1 max-w-xl">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              <MenuIcon className="h-5 w-5" />
            </button>

            <div className="relative w-full max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search orders, tables, menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-[#F4F7F8] py-2 pl-10 pr-4 text-xs font-medium text-gray-800 placeholder-gray-400 focus:border-[#0E7480] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0E7480]/20 transition-all"
              />
            </div>
          </div>

          {/* Right: Date, Notifications, Staff Profile */}
          <div className="flex items-center gap-3 sm:gap-5">
            {/* Live Clock / Date */}
            <div className="hidden md:block text-right">
              <p className="text-xs font-bold text-gray-800">{currentDateTime || 'Loading...'}</p>
              <p className="text-[10px] font-semibold text-emerald-600">● Live Operations</p>
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                className="relative rounded-xl p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                title="Notifications"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#C9902F] ring-2 ring-white" />
              </button>
            </div>

            {/* User Profile Pill & Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 rounded-full p-1 pr-3 hover:bg-gray-100 transition-all border border-gray-200"
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-[#073B4C] to-[#159A9C] text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                  {profile?.fullName ? profile.fullName.charAt(0) : 'A'}
                </div>
                <div className="hidden sm:block text-left leading-tight">
                  <p className="text-xs font-bold text-gray-900 truncate max-w-[120px]">
                    {profile?.fullName || 'Ahmed Hassan'}
                  </p>
                  <p className="text-[10px] font-semibold text-gray-500 capitalize">
                    {profile?.role === 'admin' ? 'Super Admin' : (profile?.departmentName || profile?.role || 'Restaurant Manager')}
                  </p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
              </button>

              {/* Profile Dropdown */}
              {profileDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-2xl bg-white p-2 shadow-2xl border border-gray-100 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150"
                  onClick={() => setProfileDropdownOpen(false)}
                >
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="font-bold text-gray-900">{profile?.fullName || 'Staff Member'}</p>
                    <p className="text-gray-500 truncate">{profile?.email || 'staff@tuleresort.com'}</p>
                  </div>

                  <button
                    onClick={() => setIsPasswordModalOpen(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left font-semibold text-gray-700 hover:bg-teal-50 hover:text-[#0E7480] rounded-xl transition-colors mt-1"
                  >
                    <KeyRound className="h-4 w-4" />
                    Change Password
                  </button>

                  <Link
                    href="/staff/dashboard/settings"
                    className="w-full flex items-center gap-2 px-3 py-2 text-left font-semibold text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors border-t border-gray-100 mt-1"
                  >
                    <LogOut className="h-4 w-4" />
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* ─── CHANGE PASSWORD MODAL ─── */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2 text-gray-900 font-bold text-base">
                <KeyRound className="h-5 w-5 text-[#0E7480]" />
                Update Staff Password
              </div>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handlePasswordChange} className="mt-4 space-y-4">
              {passwordMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    passwordMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  {passwordMsg.text}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-gray-900 focus:border-[#0E7480] focus:outline-none focus:ring-2 focus:ring-[#0E7480]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  required
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-gray-900 focus:border-[#0E7480] focus:outline-none focus:ring-2 focus:ring-[#0E7480]/20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="rounded-xl bg-gradient-to-r from-[#0E7480] to-[#14919B] px-5 py-2 text-xs font-bold text-white shadow-md shadow-[#0E7480]/20 hover:brightness-110 disabled:opacity-50"
                >
                  {isUpdatingPassword ? 'Updating...' : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
