'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut } from 'lucide-react';
import supabase from '../../../../lib/supabaseClient';

export default function StaffDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

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

      if (mounted) {
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
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace('/staff/login');
    router.refresh();
  }

  if (checking || !authorized) {
    return <main className="min-h-screen bg-[#040D1A] text-white flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#159A9C]" /></main>;
  }

  return (
    <div>
      <div className="fixed bottom-5 right-5 z-50">
        <button onClick={logout} className="inline-flex items-center gap-2 rounded-full bg-[#073B4C] px-5 py-3 text-xs font-black uppercase tracking-wider text-white shadow-xl hover:bg-[#0B4F6C]">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
      {children}
    </div>
  );
}
