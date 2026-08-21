'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import supabase from '../../../lib/supabaseClient';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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

  if (checking || !authorized) {
    return <main className="min-h-screen bg-[#040D1A] flex items-center justify-center text-white"><Loader2 className="h-8 w-8 animate-spin text-[#159A9C]" /></main>;
  }
  return children;
}
