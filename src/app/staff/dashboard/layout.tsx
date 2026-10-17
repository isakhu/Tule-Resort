'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import supabase from '@/lib/supabaseClient';
import StaffShell from '@/components/staff/StaffShell';
import { isRouteAllowed, DashboardModule } from '@/lib/permissions';

export default function StaffDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [allowedModules, setAllowedModules] = useState<DashboardModule[]>([]);

  useEffect(() => {
    let mounted = true;

    async function checkAccess() {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        router.replace('/staff/login');
        return;
      }

      const response = await fetch('/api/staff/me', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });

      if (!response.ok) {
        await supabase.auth.signOut();
        router.replace('/staff/login');
        return;
      }

      const json = await response.json();
      const userAllowedModules = (json.profile?.allowedModules ?? []) as DashboardModule[];

      if (mounted) {
        setAllowedModules(userAllowedModules);

        // Server-verified client route gate
        if (!isRouteAllowed(pathname, userAllowedModules)) {
          router.replace('/staff/dashboard');
          return;
        }

        setAuthorized(true);
        setChecking(false);
      }
    }

    checkAccess();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/staff/login');
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [router, pathname]);

  // Route change protection
  useEffect(() => {
    if (!checking && authorized && allowedModules.length > 0) {
      if (!isRouteAllowed(pathname, allowedModules)) {
        router.replace('/staff/dashboard');
      }
    }
  }, [pathname, checking, authorized, allowedModules, router]);

  if (checking || !authorized) {
    return (
      <main className="min-h-screen bg-[#0B252C] text-white flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#0E7480]" />
        <p className="text-xs font-semibold text-[#F8D77A]/80 uppercase tracking-widest">Loading Tule Operations...</p>
      </main>
    );
  }

  return <StaffShell>{children}</StaffShell>;
}
