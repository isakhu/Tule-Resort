'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
import supabase from '../../../../lib/supabaseClient';

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
    <main className="min-h-screen bg-[#040D1A] flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-[2rem] bg-[#07152B] p-8 shadow-2xl border border-white/10">
        <div className="mb-8 text-center">
          <p className="text-[10px] font-black uppercase tracking-[.28em] text-[#C8A15A]">Tule Resort</p>
          <h1 className="mt-3 text-3xl font-black text-white">Staff Login</h1>
          <p className="mt-2 text-sm text-white/50">Manager and administrator access</p>
        </div>

        <div className="space-y-5">
          <label className="block text-sm font-semibold text-white/85">
            Email
            <input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-[#159A9C]" />
          </label>

          <label className="block text-sm font-semibold text-white/85">
            Password
            <div className="relative mt-2">
              <input required type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-11 text-white outline-none focus:border-[#159A9C]" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/45 hover:text-white" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </label>
        </div>

        {error && <p role="alert" className="mt-5 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-200 border border-red-400/20">{error}</p>}

        <button type="submit" disabled={loading} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#159A9C] px-5 py-3.5 text-sm font-black text-white disabled:opacity-60">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
