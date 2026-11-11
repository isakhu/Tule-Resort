'use client';

import { FormEvent, useEffect, useId, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Save,
  Settings2,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function SettingsPage() {
  const [serviceCharge, setServiceCharge] = useState('0');
  const [tax, setTax] = useState('0');
  const [deadline, setDeadline] = useState('24');
  const [autoNoShow, setAutoNoShow] = useState(false);
  const [noShowHours, setNoShowHours] = useState('4');
  const [saving, setSaving] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Password change state
  const [userEmail, setUserEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const newPasswordId = useId();
  const confirmPasswordId = useId();

  useEffect(() => {
    let active = true;

    (async () => {
      const [{ data: userData }, { data: settingsData, error: settingsErr }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('resort_settings').select('*').eq('id', true).single(),
      ]);

      if (!active) return;

      if (userData?.user?.email) {
        setUserEmail(userData.user.email);
      }

      if (settingsErr) {
        setSettingsFeedback({
          type: 'error',
          text: `Could not load resort settings: ${settingsErr.message}`,
        });
        return;
      }

      if (settingsData) {
        setServiceCharge(String(settingsData.service_charge_percent));
        setTax(String(settingsData.tax_percent));
        setDeadline(String(settingsData.cancellation_deadline_hours));
        setAutoNoShow(Boolean(settingsData.auto_no_show_enabled));
        setNoShowHours(String(settingsData.auto_no_show_hours));
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSettingsFeedback(null);

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
    setSettingsFeedback(
      error
        ? { type: 'error', text: error.message }
        : { type: 'success', text: 'Resort rates & policy settings saved.' }
    );
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
          text: 'Your password was changed successfully. Use this new password for your next login.',
        });
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: unknown) {
      setPasswordMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update password.',
      });
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/staff/dashboard"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#7A5A27] hover:text-[#163D32] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Dashboard
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#163D32] text-[#C5A46D] border border-[#C5A46D]/25 shadow-sm">
          <Settings2 className="h-6 w-6" aria-hidden="true" />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.22em] text-[#7A5A27]">
            Tule Resort
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#163D32] tracking-tight">
            Operations &amp; Account Settings
          </h1>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="rounded-3xl border border-[#E6DFD1] bg-white p-6 shadow-xs md:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#163D32] text-[#C5A46D]">
            <Lock className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold text-[#163D32]">
              Change My Password
            </h2>
            <p className="text-xs text-[#52645D]">
              Logged in as <strong className="text-[#163D32]">{userEmail || 'staff'}</strong>.
              Replace your current password with your personal password.
            </p>
          </div>
        </div>

        <form onSubmit={handlePasswordUpdate} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor={newPasswordId}
                className="block text-xs font-bold uppercase tracking-wider text-[#52645D]"
              >
                New Password
              </label>
              <div className="relative mt-1.5">
                <input
                  id={newPasswordId}
                  required
                  type={showPassword ? 'text' : 'password'}
                  placeholder="New password (min. 6 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-[#D5CCB9] bg-[#F5F0E6]/40 px-4 py-2.5 pr-10 text-sm text-[#163D32] outline-none focus:border-[#163D32] focus:bg-white focus:ring-2 focus:ring-[#C5A46D]/30"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#52645D] hover:text-[#163D32]"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor={confirmPasswordId}
                className="block text-xs font-bold uppercase tracking-wider text-[#52645D]"
              >
                Confirm New Password
              </label>
              <input
                id={confirmPasswordId}
                required
                type={showPassword ? 'text' : 'password'}
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#D5CCB9] bg-[#F5F0E6]/40 px-4 py-2.5 text-sm text-[#163D32] outline-none focus:border-[#163D32] focus:bg-white focus:ring-2 focus:ring-[#C5A46D]/30"
              />
            </div>
          </div>

          {passwordMsg && (
            <div
              role={passwordMsg.type === 'error' ? 'alert' : 'status'}
              className={`flex items-start gap-2 rounded-xl p-3 text-xs font-semibold ${
                passwordMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {passwordMsg.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
              )}
              <span>{passwordMsg.text}</span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={passwordSaving}
              className="inline-flex items-center gap-2 rounded-full bg-[#163D32] hover:bg-[#0F2D24] border border-[#C5A46D]/30 px-6 py-2.5 text-xs font-bold uppercase tracking-[.13em] text-[#F5F0E6] transition-colors disabled:opacity-60"
            >
              <KeyRound className="h-4 w-4 text-[#C5A46D]" aria-hidden="true" />
              {passwordSaving ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      {/* Resort Operations Settings Form */}
      <form onSubmit={save} className="rounded-3xl border border-[#E6DFD1] bg-white p-6 shadow-xs md:p-8">
        <h2 className="font-display text-xl font-semibold text-[#163D32]">
          Resort Rates &amp; Policies
        </h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-bold text-[#163D32]">
            Service charge (%)
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={serviceCharge}
              onChange={(e) => setServiceCharge(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[#D5CCB9] bg-[#F5F0E6]/40 px-4 py-2.5 text-sm font-medium text-[#163D32] outline-none focus:border-[#163D32] focus:bg-white focus:ring-2 focus:ring-[#C5A46D]/30"
            />
          </label>
          <label className="text-sm font-bold text-[#163D32]">
            Tax (%)
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={tax}
              onChange={(e) => setTax(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[#D5CCB9] bg-[#F5F0E6]/40 px-4 py-2.5 text-sm font-medium text-[#163D32] outline-none focus:border-[#163D32] focus:bg-white focus:ring-2 focus:ring-[#C5A46D]/30"
            />
          </label>
          <label className="text-sm font-bold text-[#163D32]">
            Cancellation deadline (hours)
            <input
              type="number"
              min="0"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[#D5CCB9] bg-[#F5F0E6]/40 px-4 py-2.5 text-sm font-medium text-[#163D32] outline-none focus:border-[#163D32] focus:bg-white focus:ring-2 focus:ring-[#C5A46D]/30"
            />
          </label>
          <label className="text-sm font-bold text-[#163D32]">
            Automatic no-show after (hours)
            <input
              type="number"
              min="0"
              value={noShowHours}
              onChange={(e) => setNoShowHours(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[#D5CCB9] bg-[#F5F0E6]/40 px-4 py-2.5 text-sm font-medium text-[#163D32] outline-none focus:border-[#163D32] focus:bg-white focus:ring-2 focus:ring-[#C5A46D]/30"
            />
          </label>
        </div>

        <label className="mt-6 flex items-center gap-3 rounded-2xl bg-[#F5F0E6] border border-[#E6DFD1] p-4 text-sm font-bold text-[#163D32] cursor-pointer">
          <input
            type="checkbox"
            checked={autoNoShow}
            onChange={(e) => setAutoNoShow(e.target.checked)}
            className="h-4 w-4 accent-[#163D32]"
          />
          Enable automatic no-show handling
        </label>

        <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-[#52645D]">
            Currency default: <strong className="text-[#163D32]">ETB (ብር)</strong>
          </p>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-[#163D32] hover:bg-[#0F2D24] border border-[#C5A46D]/30 px-6 py-3 text-xs font-bold uppercase tracking-[.13em] text-[#F5F0E6] transition-colors disabled:opacity-60"
          >
            <Save className="h-4 w-4 text-[#C5A46D]" aria-hidden="true" />
            {saving ? 'Saving...' : 'Save settings'}
          </button>
        </div>

        {settingsFeedback && (
          <div
            role={settingsFeedback.type === 'error' ? 'alert' : 'status'}
            className={`mt-5 flex items-start gap-2 rounded-xl px-4 py-3 text-sm font-semibold border ${
              settingsFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            {settingsFeedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-700" aria-hidden="true" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-700" aria-hidden="true" />
            )}
            <span>{settingsFeedback.text}</span>
          </div>
        )}
      </form>
    </div>
  );
}
