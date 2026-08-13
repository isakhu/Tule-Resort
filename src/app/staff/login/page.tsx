"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '../../../../lib/supabaseClient';

export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await supabase.auth.signInWithPassword({ email, password });
      if (res.error) {
        setError(res.error.message);
        setLoading(false);
        return;
      }
      // On success, redirect to staff dashboard
      router.push('/staff/dashboard');
    } catch (err: any) {
      setError(String(err?.message ?? err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-lg border border-stone-100">
        <h1 className="text-2xl font-serif font-bold text-stone-800 mb-6">Staff Access</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">Email</label>
            <input
              required
              type="email"
              className="w-full bg-stone-50 rounded-2xl p-3 text-sm border-none mt-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">Password</label>
            <input
              required
              type="password"
              className="w-full bg-stone-50 rounded-2xl p-3 text-sm border-none mt-1"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <button
            type="submit"
            className="w-full bg-stone-900 text-white p-4 rounded-full font-bold text-sm hover:bg-stone-800 transition-colors"
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
