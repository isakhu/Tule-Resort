'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AlertTriangle, Send } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function MaintenancePage() {
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [roomId, setRoomId] = useState('');

  async function load() {
    const { data } = await supabase.from('maintenance_requests').select('*').order('created_at', { ascending: false });
    setItems(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function report(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    await supabase.from('maintenance_requests').insert({ title: title.trim(), description: description.trim() || null, room_id: roomId.trim() || null });
    setTitle(''); setDescription(''); setRoomId(''); load();
  }

  return <div className="min-h-screen bg-[#F8F5EE] px-5 py-10 text-[#182326] md:px-8"><div className="mx-auto max-w-6xl"><div className="flex items-center gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0B3D4A] text-white"><AlertTriangle /></div><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#159A9C]">Operations</p><h1 className="font-display text-4xl">Maintenance</h1></div></div><form onSubmit={report} className="mt-8 grid gap-4 rounded-[2rem] bg-white p-6 md:grid-cols-3"><input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Issue title" className="field-input" /><input value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="Room ID (optional)" className="field-input" /><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="field-input" /><button className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0B3D4A] px-5 py-3 text-xs font-black uppercase tracking-wider text-white md:col-span-3"><Send className="h-4 w-4" />Report issue</button></form><div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{items.map((item) => <article key={item.id} className="rounded-2xl bg-white p-5"><div className="flex justify-between gap-3"><h2 className="font-bold">{item.title}</h2><span className="text-[9px] font-black uppercase text-[#159A9C]">{item.status}</span></div><p className="mt-3 text-sm text-black/50">{item.description || 'No description provided.'}</p><p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-black/35">Priority: {item.priority}</p></article>)}</div></div></div>;
}
