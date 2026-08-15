'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Save, Settings2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function SettingsPage() {
  const [serviceCharge, setServiceCharge] = useState('0');
  const [tax, setTax] = useState('0');
  const [deadline, setDeadline] = useState('24');
  const [autoNoShow, setAutoNoShow] = useState(false);
  const [noShowHours, setNoShowHours] = useState('4');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
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

  return (
    <div className="min-h-screen bg-[#F8F5EE] px-5 py-10 text-[#182326] md:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0B3D4A] text-white"><Settings2 /></div><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#159A9C]">Tule Resort</p><h1 className="font-display text-4xl">Operations settings</h1></div></div>
        <form onSubmit={save} className="mt-8 rounded-[2rem] border border-[#0B3D4A]/10 bg-white p-6 shadow-sm md:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-bold">Service charge (%)<input type="number" min="0" max="100" step="0.01" value={serviceCharge} onChange={(e) => setServiceCharge(e.target.value)} className="field-input mt-2" /></label>
            <label className="text-sm font-bold">Tax (%)<input type="number" min="0" max="100" step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} className="field-input mt-2" /></label>
            <label className="text-sm font-bold">Cancellation deadline (hours)<input type="number" min="0" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="field-input mt-2" /></label>
            <label className="text-sm font-bold">Automatic no-show after (hours)<input type="number" min="0" value={noShowHours} onChange={(e) => setNoShowHours(e.target.value)} className="field-input mt-2" /></label>
          </div>
          <label className="mt-6 flex items-center gap-3 rounded-2xl bg-[#EAF4F7] p-4 text-sm font-bold"><input type="checkbox" checked={autoNoShow} onChange={(e) => setAutoNoShow(e.target.checked)} className="h-4 w-4" />Enable automatic no-show handling</label>
          <div className="mt-7 flex items-center justify-between gap-4"><p className="text-sm text-[#182326]/55">Currency default: <strong>ETB (ብር)</strong></p><button disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-[#0B3D4A] px-6 py-3 text-xs font-black uppercase tracking-[.13em] text-white disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save settings'}</button></div>
          {message && <p className="mt-5 rounded-xl bg-[#F3E9D2] px-4 py-3 text-sm font-semibold">{message}</p>}
        </form>
      </div>
    </div>
  );
}
