'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function HousekeepingPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('housekeeping_tasks').select('id,room_id,task_type,priority,status,notes,created_at').order('created_at', { ascending: false });
    setTasks(data ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function complete(id: string) {
    await supabase.from('housekeeping_tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id);
    load();
  }

  return <div className="min-h-screen bg-[#F8F5EE] px-5 py-10 text-[#182326] md:px-8"><div className="mx-auto max-w-6xl"><div className="flex items-center gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#159A9C] text-white"><Sparkles /></div><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#159A9C]">Operations</p><h1 className="font-display text-4xl">Housekeeping</h1></div></div><div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{loading ? <p className="text-sm text-black/45">Loading tasks…</p> : tasks.length === 0 ? <div className="rounded-2xl bg-white p-6 text-sm text-black/50">No housekeeping tasks yet.</div> : tasks.map((task) => <article key={task.id} className="rounded-2xl border border-black/5 bg-white p-5"><div className="flex items-center justify-between gap-3"><p className="font-bold">Room {task.room_id.slice(0, 8)}</p><span className="rounded-full bg-[#F3E9D2] px-2 py-1 text-[9px] font-black uppercase">{task.priority}</span></div><p className="mt-3 text-sm text-black/55">{task.task_type}</p><p className="mt-2 text-xs text-black/40">{task.status}</p>{task.status !== 'completed' && <button onClick={() => complete(task.id)} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#0B3D4A] px-4 py-2 text-[10px] font-black uppercase tracking-wider text-white"><CheckCircle2 className="h-3.5 w-3.5" />Complete</button>}</article>)}</div></div></div>;
}
