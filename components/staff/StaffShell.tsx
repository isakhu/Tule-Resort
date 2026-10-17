'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardList,
  Clock,
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
  ChefHat,
  CheckCheck
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { DashboardModule } from '@/lib/permissions';

interface StaffProfile {
  id: string;
  email: string | null;
  fullName: string | null;
  role: string;
  departmentName?: string | null;
  allowedModules?: DashboardModule[];
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

  // Live Notifications
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function loadNotifications() {
      try {
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);
        if (data) {
          setNotifications(data);
          setUnreadCount(data.filter((n) => !n.is_read).length);
        }
      } catch (err) {
        console.error('Failed to load notifications:', err);
      }
    }

    void loadNotifications();

    const channel = supabase
      .channel('staff_shell_notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev].slice(0, 20));
          setUnreadCount((c) => c + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function handleMarkAsRead(id?: string) {
    try {
      if (id) {
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } else {
        const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
        if (unreadIds.length > 0) {
          await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
          setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
          setUnreadCount(0);
        }
      }
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  }
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

  interface NavItemDef {
    label: string;
    href: string;
    icon: any;
    module: DashboardModule;
    badge?: number;
  }

  const ALL_NAV_ITEMS: NavItemDef[] = [
    { label: 'Dashboard', href: '/staff/dashboard', icon: LayoutDashboard, module: 'dashboard' },
    { label: 'Live Queue', href: '/staff/dashboard/queue', icon: Clock, module: 'queue' },
    { label: 'Orders', href: '/staff/dashboard/orders', icon: ClipboardList, module: 'orders', badge: badgeCounts?.orders },
    { label: 'Tables', href: '/staff/dashboard/tables', icon: Layers, module: 'tables' },
    { label: 'Kitchen', href: '/staff/dashboard/kitchen', icon: ChefHat, module: 'kitchen' },
    { label: 'Menu', href: '/staff/dashboard/menu', icon: UtensilsCrossed, module: 'menu' },
    { label: 'Reservations', href: '/staff/dashboard/reservations', icon: CalendarDays, module: 'reservations' },
    { label: 'Rooms', href: '/staff/dashboard/rooms', icon: BedDouble, module: 'rooms' },
    { label: 'Receipts & Sales', href: '/staff/dashboard/receipts', icon: DollarSign, module: 'receipts' },
    { label: 'Wellness & Spa', href: '/staff/dashboard/services', icon: Sparkles, module: 'spa' },
    { label: 'Housekeeping', href: '/staff/dashboard/housekeeping', icon: Sparkles, module: 'housekeeping' },
    { label: 'Maintenance', href: '/staff/dashboard/maintenance', icon: Wrench, module: 'maintenance' },
    { label: 'Staff Management', href: '/admin/staff', icon: Users, module: 'staff_management' },
    { label: 'Settings', href: '/staff/dashboard/settings', icon: Settings, module: 'settings' },
  ];

  const visibleNavItems = ALL_NAV_ITEMS.filter((item) => {
    if (!profile?.allowedModules) return true;
    return profile.allowedModules.includes(item.module);
  });

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
          {visibleNavItems.map((item) => {
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
              {visibleNavItems.map((item) => {
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
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative rounded-xl p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                title="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#C9902F] px-1 text-[9px] font-black text-white ring-2 ring-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white p-3 shadow-2xl border border-gray-100 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 text-sm">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => handleMarkAsRead()}
                        className="text-[11px] font-semibold text-[#0E7480] hover:underline flex items-center gap-1"
                      >
                        <CheckCheck className="h-3 w-3" />
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-gray-400">
                        <Bell className="h-6 w-6 mx-auto mb-1 text-gray-300" />
                        <p className="font-semibold">No notifications yet</p>
                        <p className="text-[10px]">Real-time operational alerts will show here</p>
                      </div>
                    ) : (
                      notifications.map((n) => {
                        const payload = n.payload || {};
                        const title =
                          payload.title ||
                          (payload.event === 'new_service_request'
                            ? `New Guest Request: Room ${payload.room_number || 'Floor'}`
                            : payload.event === 'status_changed'
                            ? `${payload.entity_type === 'order' ? 'Order' : 'Request'} Status Updated`
                            : payload.type === 'order'
                            ? 'New Guest Order'
                            : 'Resort Notification');
                        const subtitle =
                          payload.notes ||
                          (payload.event === 'new_service_request'
                            ? `${payload.priority?.toUpperCase() || 'NORMAL'} priority`
                            : payload.event === 'status_changed'
                            ? `Status changed from #${payload.from_status_id} to #${payload.to_status_id}`
                            : 'Tap to view details');
                        const mins = Math.max(
                          0,
                          Math.round((Date.now() - new Date(n.created_at).getTime()) / 60000)
                        );
                        const timeStr = mins === 0 ? 'Just now' : mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`;

                        return (
                          <div
                            key={n.id}
                            onClick={() => {
                              if (!n.is_read) handleMarkAsRead(n.id);
                              setNotificationsOpen(false);
                              if (payload.entity_type === 'service_request' || payload.event === 'new_service_request') {
                                router.push('/staff/dashboard/queue');
                              } else if (payload.entity_type === 'order' || payload.type === 'order') {
                                router.push('/staff/dashboard/kitchen');
                              }
                            }}
                            className={`p-2.5 rounded-xl transition-all cursor-pointer border ${
                              !n.is_read
                                ? 'bg-amber-50/60 border-amber-200/60 hover:bg-amber-100/60'
                                : 'bg-gray-50/50 border-transparent hover:bg-gray-100/70'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className={`font-semibold ${!n.is_read ? 'text-gray-900 font-bold' : 'text-gray-700'}`}>
                                {title}
                              </p>
                              <span className="text-[9px] font-semibold text-gray-400 shrink-0">
                                {timeStr}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{subtitle}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
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
