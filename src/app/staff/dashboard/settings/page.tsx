'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Lock, Save, Settings2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function SettingsPage() {
  const [serviceCharge, setServiceCharge] = useState('0');
  const [tax, setTax] = useState('0');
  const [deadline, setDeadline] = useState('24');
  const [autoNoShow, setAutoNoShow] = useState(false);
  const [noShowHours, setNoShowHours] = useState('4');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Password change state
  const [userEmail, setUserEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) {
        setUserEmail(data.user.email);
      }
    });

    supabase.from('resort_settings').select('*').eq('id', true).single().then(({ data }) => {
      if (!data) return;
      setServiceCharge(String(data.service_charge_percent));
      setTax(String(data.tax_percent));
      setDeadline(String(data.cancellation_deadline_hours));
      setAutoNoShow(Boolean(data.auto_no_show_enabled));
      setNoShowHours(String(data.auto_no_show_hours));
    });
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    const { error } = await supabase.from('resort_settings').upsert({
      id: true,
      service_charge_percent: Number(serviceCharge),
      tax_percent: Number(tax),
      cancellation_deadline_hours: Number(deadline),
      auto_no_show_enabled: autoNoShow,
      auto_no_show_hours: Number(noShowHours),
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    setMessage(error ? error.message : 'Settings saved.');
  }

  async function handlePasswordUpdate(e: FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setPasswordMsg({ type: 'error', text: error.message });
      } else {
        setPasswordMsg({
          type: 'success',
          text: 'Your password was changed successfully! Use this new password for your next login.',
        });
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: unknown) {
      setPasswordMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update password.' });
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F5EE] px-5 py-10 text-[#182326] md:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Link
            href="/staff/dashboard"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0B3D4A] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0B3D4A] text-white">
            <Settings2 />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#159A9C]">Tule Resort</p>
            <h1 className="font-display text-4xl">Operations & Account Settings</h1>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="mt-8 rounded-[2rem] border border-[#0B3D4A]/10 bg-white p-6 shadow-sm md:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B3D4A] text-[#C8A15A]">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#182326]">Change My Password</h2>
              <p className="text-xs text-[#182326]/60">
                Logged in as <strong>{userEmail || 'staff'}</strong>. Replace the default password with your own personal password.
              </p>
            </div>
          </div>

          <form onSubmit={handlePasswordUpdate} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
                  New Password
                </label>
                <div className="relative mt-1">
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    placeholder="New password (min. 6 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 pr-10 text-sm outline-none focus:border-[#0B3D4A] focus:bg-white"
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
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm outline-none focus:border-[#0B3D4A] focus:bg-white"
                />
              </div>
            </div>

            {passwordMsg && (
              <div
                className={`flex items-start gap-2 rounded-xl p-3 text-xs font-semibold ${
                  passwordMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {passwordMsg.type === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={passwordSaving}
                className="inline-flex items-center gap-2 rounded-full bg-[#0B3D4A] px-6 py-2.5 text-xs font-black uppercase tracking-[.13em] text-white transition hover:bg-[#159A9C] disabled:opacity-60"
              >
                <KeyRound className="h-4 w-4 text-[#C8A15A]" />
                {passwordSaving ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>

        {/* Resort Operations Settings Form */}
        <form onSubmit={save} className="mt-8 rounded-[2rem] border border-[#0B3D4A]/10 bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-xl font-black text-[#182326]">Resort Rates & Policies</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-bold">
              Service charge (%)
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={serviceCharge}
                onChange={(e) => setServiceCharge(e.target.value)}
                className="field-input mt-2"
              />
            </label>
            <label className="text-sm font-bold">
              Tax (%)
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={tax}
                onChange={(e) => setTax(e.target.value)}
                className="field-input mt-2"
              />
            </label>
            <label className="text-sm font-bold">
              Cancellation deadline (hours)
              <input
                type="number"
                min="0"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="field-input mt-2"
              />
            </label>
            <label className="text-sm font-bold">
              Automatic no-show after (hours)
              <input
                type="number"
                min="0"
                value={noShowHours}
                onChange={(e) => setNoShowHours(e.target.value)}
                className="field-input mt-2"
              />
            </label>
          </div>
          <label className="mt-6 flex items-center gap-3 rounded-2xl bg-[#EAF4F7] p-4 text-sm font-bold">
            <input
              type="checkbox"
              checked={autoNoShow}
              onChange={(e) => setAutoNoShow(e.target.checked)}
              className="h-4 w-4"
            />
            Enable automatic no-show handling
          </label>
          <div className="mt-7 flex items-center justify-between gap-4">
            <p className="text-sm text-[#182326]/55">
              Currency default: <strong>ETB (ብር)</strong>
            </p>
            <button
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-[#0B3D4A] px-6 py-3 text-xs font-black uppercase tracking-[.13em] text-white disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving…' : 'Save settings'}
            </button>
          </div>
          {message && <p className="mt-5 rounded-xl bg-[#F3E9D2] px-4 py-3 text-sm font-semibold">{message}</p>}
        </form>
      </div>
    </div>
  );
}
