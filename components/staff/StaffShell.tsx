'use client';

import React, { useState, useEffect, useId, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardList,
  Clock,
  UtensilsCrossed,
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
  Store,
  Layers,
  ChefHat,
  CheckCheck,
  Camera,
  type LucideIcon,
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

interface NotificationPayload {
  title?: string;
  event?: string;
  room_number?: string | number;
  entity_type?: string;
  type?: string;
  notes?: string;
  priority?: string;
  from_status_id?: string | number;
  to_status_id?: string | number;
}

interface StaffNotification {
  id: string;
  is_read: boolean;
  created_at: string;
  payload?: NotificationPayload | null;
}

interface NavItemDef {
  label: string;
  href: string;
  icon: LucideIcon;
  module: DashboardModule;
  keywords?: string;
  badge?: number;
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
  const newPasswordId = useId();
  const confirmPasswordId = useId();
  const passwordModalTitleId = useId();
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const notificationsContainerRef = useRef<HTMLDivElement>(null);
  const profileContainerRef = useRef<HTMLDivElement>(null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [nowMs, setNowMs] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  // Password change modal
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Live Notifications
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<StaffNotification[]>([]);
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
          const typedData = data as StaffNotification[];
          setNotifications(typedData);
          setUnreadCount(typedData.filter((n) => !n.is_read).length);
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
          const incoming = payload.new as StaffNotification;
          setNotifications((prev) => [incoming, ...prev].slice(0, 20));
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
      setNowMs(now.getTime());
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
    if (!notificationsOpen && !profileDropdownOpen && !searchFocused && !mobileMenuOpen && !isPasswordModalOpen) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setNotificationsOpen(false);
        setProfileDropdownOpen(false);
        setSearchFocused(false);
        setMobileMenuOpen(false);
        setIsPasswordModalOpen(false);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (notificationsOpen && notificationsContainerRef.current && !notificationsContainerRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
      if (profileDropdownOpen && profileContainerRef.current && !profileContainerRef.current.contains(target)) {
        setProfileDropdownOpen(false);
      }
      if (searchFocused && searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setSearchFocused(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [notificationsOpen, profileDropdownOpen, searchFocused, mobileMenuOpen, isPasswordModalOpen]);

  useEffect(() => {
    if (!mobileMenuOpen && !isPasswordModalOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileMenuOpen, isPasswordModalOpen]);

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

  const ALL_NAV_ITEMS: NavItemDef[] = [
    { label: 'Dashboard', href: '/staff/dashboard', icon: LayoutDashboard, module: 'dashboard', keywords: 'overview home kpi analytics' },
    { label: 'Live Queue', href: '/staff/dashboard/queue', icon: Clock, module: 'queue', keywords: 'service requests active guest queue' },
    { label: 'Orders', href: '/staff/dashboard/orders', icon: ClipboardList, module: 'orders', keywords: 'dining food drink bills receipts', badge: badgeCounts?.orders },
    { label: 'Tables', href: '/staff/dashboard/tables', icon: Layers, module: 'tables', keywords: 'floor plan qr seating dining' },
    { label: 'Kitchen', href: '/staff/dashboard/kitchen', icon: ChefHat, module: 'kitchen', keywords: 'kds tickets cooking prep' },
    { label: 'Menu', href: '/staff/dashboard/menu', icon: UtensilsCrossed, module: 'menu', keywords: 'dishes drinks cafeteria cms' },
    { label: 'Reservations', href: '/staff/dashboard/reservations', icon: CalendarDays, module: 'reservations', keywords: 'bookings folio check-in check-out stays' },
    { label: 'Rooms', href: '/staff/dashboard/rooms', icon: BedDouble, module: 'rooms', keywords: 'suites inventory rates availability' },
    { label: 'Gallery', href: '/staff/dashboard/gallery', icon: Camera, module: 'gallery', keywords: 'photos media resort showcase' },
    { label: 'Receipts & Sales', href: '/staff/dashboard/receipts', icon: DollarSign, module: 'receipts', keywords: 'payments ledger revenue invoices' },
    { label: 'Wellness & Spa', href: '/staff/dashboard/services', icon: Sparkles, module: 'spa', keywords: 'tule aqua pool steam amenities' },
    { label: 'Housekeeping', href: '/staff/dashboard/housekeeping', icon: Sparkles, module: 'housekeeping', keywords: 'cleaning turnover inspection' },
    { label: 'Maintenance', href: '/staff/dashboard/maintenance', icon: Wrench, module: 'maintenance', keywords: 'repairs engineering work orders' },
    { label: 'Staff Management', href: '/admin/staff', icon: Users, module: 'staff_management', keywords: 'roles team accounts permissions' },
    { label: 'Settings', href: '/staff/dashboard/settings', icon: Settings, module: 'settings', keywords: 'taxes service charge bank accounts config' },
  ];

  const visibleNavItems = ALL_NAV_ITEMS.filter((item) => {
    if (!profile?.allowedModules) return true;
    return profile.allowedModules.includes(item.module);
  });

  const canAccessSettings =
    !profile?.allowedModules || profile.allowedModules.includes('settings');

  const trimmedSearch = searchQuery.trim().toLowerCase();
  const quickJumpMatches = trimmedSearch
    ? visibleNavItems.filter(
        (item) =>
          item.label.toLowerCase().includes(trimmedSearch) ||
          (item.keywords && item.keywords.includes(trimmedSearch))
      )
    : [];

  return (
    <div className="flex min-h-screen bg-[#F5F0E6] text-[#26312D]">
      {/* ─── SIDEBAR (Desktop) ─── */}
      <aside className="hidden lg:flex w-64 flex-col bg-[#163D32] text-[#94A3B8] border-r border-[#163D32] shrink-0 select-none">
        {/* Official Logo & Tagline */}
        <Link href="/staff/dashboard" className="p-5 pb-4 flex items-center gap-3 border-b border-[#163D32]/70 hover:opacity-95 transition-opacity">
          <div className="h-11 w-11 shrink-0 flex items-center justify-center rounded-xl bg-black/40 border border-white/10 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/tule-resort-logo.png"
              alt="Tule Resort Logo"
              className="h-full w-full object-contain drop-shadow"
            />
          </div>
          <div>
            <p className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
              Tule Resort
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#C5A46D]">
              Staff & Operations
            </p>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav aria-label="Staff modules" className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin scrollbar-thumb-white/10">
          {visibleNavItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/staff/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-98 ${
                  isActive
                    ? 'bg-gradient-to-r from-[#163D32] to-[#C5A46D] text-white shadow-md shadow-[#163D32]/30 border-l-4 border-[#C5A46D] translate-x-0.5'
                    : 'text-[#CBD5E1] hover:bg-white/5 hover:text-white hover:translate-x-1'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-5 w-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : 'text-[#94A3B8] group-hover:text-white'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold transition-transform duration-200 group-hover:scale-105 animate-[tule-pulse-subtle_2.5s_ease-in-out_infinite] ${
                      isActive
                        ? 'bg-white text-[#163D32]'
                        : 'bg-[#C5A46D]/20 text-[#D4B87D]'
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
        <div className="p-4 border-t border-[#163D32]/70 space-y-3 bg-[#0F2D24]">
          <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white/5 border border-white/5">
            <Store className="h-4 w-4 text-[#C5A46D] shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">Tule Resort & Spa</p>
              <p className="text-[10px] text-teal-100/75 truncate">Lake Hawassa • Main Property</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 text-xs">
            {canAccessSettings ? (
              <Link
                href="/staff/dashboard/settings"
                className="flex items-center gap-1.5 text-gray-300 hover:text-white transition-colors"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            ) : (
              <span className="text-[11px] font-medium text-teal-100/70 capitalize">
                {profile?.departmentName || profile?.role || 'Operations'}
              </span>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-red-300 hover:text-red-200 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Log Out
            </button>
          </div>
        </div>
      </aside>

      {/* ─── MOBILE DRAWER OVERLAY ─── */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Staff navigation"
        >
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] bg-[#163D32] text-[#CBD5E1] h-[100dvh] flex flex-col z-10 shadow-2xl border-r border-[#163D32]">
            <div className="p-5 flex items-center justify-between border-b border-[#163D32]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-black/40 border border-white/10 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/tule-resort-logo.png"
                    alt="Tule Resort Logo"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div>
                  <p className="text-sm font-black text-white">Tule Resort</p>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[#C5A46D]">Staff Portal</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="p-1 rounded-lg text-gray-300 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav aria-label="Mobile staff modules" className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
              {visibleNavItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/staff/dashboard' && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-[#163D32] to-[#163D32] text-white shadow-md shadow-[#163D32]/30 border-l-4 border-[#C5A46D]'
                        : 'text-[#CBD5E1] hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="rounded-full bg-[#C5A46D]/20 text-[#D4B87D] px-2 py-0.5 text-xs font-bold">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-[#163D32] bg-[#0F2D24]">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-500/15 px-4 py-2.5 text-xs font-bold text-red-200 hover:bg-red-500/25"
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
          {/* Left: Mobile hamburger & Quick Jump Search */}
          <div className="flex items-center gap-3 sm:gap-4 flex-1 max-w-xl">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={mobileMenuOpen}
              className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              <MenuIcon className="h-5 w-5" />
            </button>

            <div ref={searchContainerRef} className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#52645D]" />
              <input
                type="search"
                aria-label="Quick jump to staff module"
                placeholder="Jump to module (orders, tables, rooms...)"
                value={searchQuery}
                onFocus={() => setSearchFocused(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchFocused(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && quickJumpMatches.length > 0) {
                    e.preventDefault();
                    router.push(quickJumpMatches[0].href);
                    setSearchQuery('');
                    setSearchFocused(false);
                  }
                }}
                className="w-full rounded-xl border border-gray-200 bg-[#F5F0E6] py-2 pl-10 pr-4 text-xs font-medium text-[#26312D] placeholder-[#52645D] focus:border-[#163D32] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#163D32]/20 transition-all"
              />

              {searchFocused && trimmedSearch.length > 0 && (
                <div
                  role="listbox"
                  aria-label="Matching modules"
                  className="absolute left-0 right-0 mt-1.5 rounded-2xl border border-[#E6DFD1] bg-white p-1.5 shadow-xl z-50 text-xs"
                >
                  {quickJumpMatches.length === 0 ? (
                    <p className="px-3 py-2 text-[#52645D]">No matching modules available</p>
                  ) : (
                    quickJumpMatches.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.href}
                          type="button"
                          onClick={() => {
                            router.push(item.href);
                            setSearchQuery('');
                            setSearchFocused(false);
                          }}
                          className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-left font-semibold text-[#26312D] hover:bg-[#F5F0E6] transition-colors"
                        >
                          <span className="flex items-center gap-2.5">
                            <Icon className="h-4 w-4 text-[#163D32]" />
                            {item.label}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A5A27]">
                            Open
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Date, Notifications, Staff Profile */}
          <div className="flex items-center gap-3 sm:gap-5">
            {/* Live Clock / Date */}
            <div className="hidden md:block text-right">
              <p className="text-xs font-bold text-gray-800">{currentDateTime || 'Loading...'}</p>
              <p className="text-[10px] font-semibold text-emerald-700">● Live Operations</p>
            </div>

            {/* Notification Bell */}
            <div ref={notificationsContainerRef} className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
                aria-expanded={notificationsOpen}
                aria-haspopup="true"
                className="relative rounded-xl p-2 text-[#52645D] hover:bg-gray-100 hover:text-[#163D32] transition-colors"
                title="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#163D32] px-1 text-[9px] font-black text-white ring-2 ring-white">
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
                        type="button"
                        onClick={() => handleMarkAsRead()}
                        className="text-[11px] font-semibold text-[#163D32] hover:underline flex items-center gap-1"
                      >
                        <CheckCheck className="h-3 w-3" />
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-[#52645D]">
                        <Bell className="h-6 w-6 mx-auto mb-1 text-[#7A5A27]" />
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
                        const mins = nowMs
                          ? Math.max(0, Math.round((nowMs - new Date(n.created_at).getTime()) / 60000))
                          : 0;
                        const timeStr = !nowMs
                          ? 'Recent'
                          : mins === 0
                          ? 'Just now'
                          : mins < 60
                          ? `${mins}m ago`
                          : `${Math.round(mins / 60)}h ago`;

                        return (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => {
                              if (!n.is_read) handleMarkAsRead(n.id);
                              setNotificationsOpen(false);
                              if (payload.entity_type === 'service_request' || payload.event === 'new_service_request') {
                                router.push('/staff/dashboard/queue');
                              } else if (payload.entity_type === 'order' || payload.type === 'order') {
                                router.push('/staff/dashboard/kitchen');
                              }
                            }}
                            className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer border ${
                              !n.is_read
                                ? 'bg-amber-50/60 border-amber-200/60 hover:bg-amber-100/60'
                                : 'bg-gray-50/50 border-transparent hover:bg-gray-100/70'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className={`font-semibold ${!n.is_read ? 'text-gray-900 font-bold' : 'text-gray-700'}`}>
                                {title}
                              </p>
                              <span className="text-[10px] font-semibold text-[#52645D] shrink-0">
                                {timeStr}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#52645D] mt-0.5 line-clamp-1">{subtitle}</p>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Pill & Dropdown */}
            <div ref={profileContainerRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                aria-label="Staff account menu"
                aria-expanded={profileDropdownOpen}
                aria-haspopup="menu"
                className="flex items-center gap-2.5 rounded-full p-1 pr-3 hover:bg-gray-100 transition-all border border-gray-200"
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-[#0F2D24] to-[#C5A46D] text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                  {profile?.fullName ? profile.fullName.charAt(0) : 'T'}
                </div>
                <div className="hidden sm:block text-left leading-tight">
                  <p className="text-xs font-bold text-gray-900 truncate max-w-[120px]">
                    {profile?.fullName || 'Staff Member'}
                  </p>
                  <p className="text-[10px] font-semibold text-[#52645D] capitalize">
                    {profile?.role === 'admin' ? 'Super Admin' : (profile?.departmentName || profile?.role || 'Team Member')}
                  </p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-[#52645D]" />
              </button>

              {/* Profile Dropdown */}
              {profileDropdownOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 rounded-2xl bg-white p-2 shadow-2xl border border-gray-100 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150"
                >
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="font-bold text-gray-900">{profile?.fullName || 'Staff Member'}</p>
                    <p className="text-[#52645D] truncate">{profile?.email || 'Signed in staff session'}</p>
                  </div>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      setIsPasswordModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left font-semibold text-gray-700 hover:bg-teal-50 hover:text-[#163D32] rounded-xl transition-colors mt-1"
                  >
                    <KeyRound className="h-4 w-4" />
                    Change Password
                  </button>

                  {canAccessSettings && (
                    <Link
                      href="/staff/dashboard/settings"
                      role="menuitem"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left font-semibold text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                  )}

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      void handleLogout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left font-semibold text-red-700 hover:bg-red-50 rounded-xl transition-colors border-t border-gray-100 mt-1"
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby={passwordModalTitleId}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsPasswordModalOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div id={passwordModalTitleId} className="flex items-center gap-2 text-gray-900 font-bold text-base">
                <KeyRound className="h-5 w-5 text-[#163D32]" />
                Update Staff Password
              </div>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                aria-label="Close password modal"
                className="rounded-lg p-1 text-[#52645D] hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handlePasswordChange} className="mt-4 space-y-4">
              {passwordMsg && (
                <div
                  role={passwordMsg.type === 'error' ? 'alert' : 'status'}
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
                <label htmlFor={newPasswordId} className="block text-xs font-bold text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  id={newPasswordId}
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-gray-900 focus:border-[#163D32] focus:outline-none focus:ring-2 focus:ring-[#163D32]/20"
                />
              </div>

              <div>
                <label htmlFor={confirmPasswordId} className="block text-xs font-bold text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  id={confirmPasswordId}
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  required
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-gray-900 focus:border-[#163D32] focus:outline-none focus:ring-2 focus:ring-[#163D32]/20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-[#52645D] hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="rounded-xl bg-gradient-to-r from-[#163D32] to-[#163D32] px-5 py-2 text-xs font-bold text-white shadow-md shadow-[#163D32]/20 hover:brightness-110 disabled:opacity-50"
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
