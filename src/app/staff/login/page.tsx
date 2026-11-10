'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
import supabase from '@/lib/supabaseClient';

export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError || !data.session) {
        throw new Error(signInError?.message || 'Unable to sign in.');
      }

      const response = await fetch('/api/staff/me', {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
        cache: 'no-store',
      });
      const result = await response.json();

      if (!response.ok || !result.authorized) {
        await supabase.auth.signOut();
        throw new Error(result.error || 'This account does not have manager or admin access.');
      }

      router.replace('/staff/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0F2D24] flex items-center justify-center p-4 sm:p-6 text-[#F5F0E6]">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-[2.5rem] bg-[#163D32] p-8 sm:p-10 shadow-2xl border border-[#C5A46D]/20 space-y-6">
        <div className="text-center space-y-3">
          {/* Official Tule Resort Logo */}
          <div className="mx-auto w-24 h-24 rounded-2xl bg-black/20 border border-white/10 overflow-hidden flex items-center justify-center p-2 shadow-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/tule-resort-logo.png"
              alt="Tule Resort Logo"
              className="w-full h-full object-contain drop-shadow-md"
            />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.28em] text-[#C5A46D]">Tule Resort & Spa</p>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-medium text-[#F5F0E6] tracking-tight">Staff Portal</h1>
            <p className="mt-1 text-xs text-[#8A9B83]">Manager, front desk & kitchen operations</p>
          </div>
        </div>

        <div className="space-y-5">
          <label className="block text-sm font-semibold text-[#F5F0E6]/85">
            Email
            <input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white outline-none focus:border-[#C5A46D]" />
          </label>

          <label className="block text-sm font-semibold text-[#F5F0E6]/85">
            Password
            <div className="relative mt-2">
              <input required type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 pr-11 text-white outline-none focus:border-[#C5A46D]" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/45 hover:text-white" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </label>
        </div>

        {error && <p role="alert" className="mt-5 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-200 border border-red-400/20">{error}</p>}

        <button type="submit" disabled={loading} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#C5A46D] hover:bg-[#B8955E] px-5 py-3.5 text-sm font-black uppercase tracking-wider text-[#163D32] shadow-lg shadow-[#C5A46D]/20 disabled:opacity-60 transition-all cursor-pointer">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          {loading ? 'Signing in…' : 'Sign In to Dashboard'}
        </button>
      </form>
    </main>
  );
}
