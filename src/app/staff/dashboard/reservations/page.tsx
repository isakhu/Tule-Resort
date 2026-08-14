'use client'

import { useEffect, useState } from 'react'
import { CalendarDays, Check, Clock3, LogIn, LogOut, RefreshCw, X, Ban } from 'lucide-react'
import supabase from '@/lib/supabaseClient'

type Reservation = {
  id: string
  booking_number: string
  room_id: string
  guest_name: string
  guest_phone: string
  guest_email: string | null
  check_in: string
  check_out: string
  guests: number
  total_price: number
  currency: string
  status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show'
  special_requests: string | null
  created_at: string
  room?: { name: string; room_type: string | null } | null
}

const statusLabel: Record<Reservation['status'], string> = {
  pending: 'Pending', confirmed: 'Confirmed', checked_in: 'Checked In', checked_out: 'Checked Out', cancelled: 'Cancelled', no_show: 'No Show'
}

export default function ManagerReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | Reservation['status']>('all')
  const [busy, setBusy] = useState('')

  async function load() {
    setLoading(true); setError('')
    const { data, error } = await supabase
      .from('room_reservations')
      .select('*, room:rooms(name, room_type)')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setReservations((data ?? []) as Reservation[])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  async function changeStatus(id: string, status: Reservation['status']) {
    setBusy(id); setError('')
    const { error } = await supabase.from('room_reservations').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) setError(error.message); else await load()
    setBusy('')
  }

  const visible = filter === 'all' ? reservations : reservations.filter(r => r.status === filter)
  const counts = reservations.reduce<Record<string, number>>((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a }, {})

  return <main className="min-h-screen bg-[#F8F5EE] text-[#182326]">
    <header className="border-b border-[#0B3D4A]/10 bg-[#0B3D4A] text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 md:px-6">
        <div className="flex items-center gap-3"><CalendarDays className="h-6 w-6 text-[#159A9C]" /><div><p className="font-display text-2xl">Reservations</p><p className="text-[10px] font-bold uppercase tracking-[.2em] text-white/50">Tule Resort · Manager</p></div></div>
        <button onClick={() => void load()} className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold hover:bg-white/15"><RefreshCw className="h-4 w-4" /> Refresh</button>
      </div>
    </header>
    <div className="mx-auto max-w-7xl px-4 py-7 md:px-6">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {(['pending','confirmed','checked_in','checked_out','cancelled','no_show'] as Reservation['status'][]).map(s => <button key={s} onClick={() => setFilter(filter === s ? 'all' : s)} className={`rounded-2xl border p-4 text-left bg-white ${filter === s ? 'border-[#C9A227] ring-2 ring-[#C9A227]/15' : 'border-[#0B3D4A]/10'}`}><p className="text-[10px] font-black uppercase tracking-wider text-[#073B4C]/45">{statusLabel[s]}</p><p className="mt-1 text-2xl font-black text-[#0B3D4A]">{counts[s] || 0}</p></button>)}
      </div>
      {error && <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {loading ? <p className="py-16 text-center text-[#182326]/50">Loading reservations…</p> : visible.length === 0 ? <div className="mt-6 rounded-3xl border border-dashed border-[#0B3D4A]/20 bg-white p-14 text-center"><Clock3 className="mx-auto h-10 w-10 text-[#0B3D4A]/20"/><p className="mt-4 font-display text-3xl">No reservations</p><p className="mt-2 text-sm text-[#182326]/50">New guest room bookings will appear here.</p></div> : <div className="mt-6 space-y-4">{visible.map(r => <article key={r.id} className="rounded-3xl border border-[#0B3D4A]/10 bg-white p-5 shadow-sm md:p-6"><div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#EAF4F7] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#0B4F6C]">{r.booking_number}</span><span className="rounded-full bg-stone-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider">{statusLabel[r.status]}</span></div><h2 className="mt-3 text-2xl font-black text-[#0B3D4A]">{r.guest_name}</h2><p className="mt-1 text-sm text-[#182326]/55">{r.room?.name || 'Room'} · {r.guests} guest{r.guests === 1 ? '' : 's'}</p></div><div className="text-left lg:text-right"><p className="text-2xl font-black text-[#0B3D4A]">{Number(r.total_price || 0).toLocaleString()} {r.currency}</p><p className="text-xs text-[#182326]/45">Total stay</p></div></div><div className="mt-5 grid gap-3 rounded-2xl bg-[#F8F5EE] p-4 text-sm sm:grid-cols-2 lg:grid-cols-4"><div><p className="text-[10px] font-black uppercase tracking-wider text-[#182326]/40">Check-in</p><p className="mt-1 font-bold">{r.check_in}</p></div><div><p className="text-[10px] font-black uppercase tracking-wider text-[#182326]/40">Check-out</p><p className="mt-1 font-bold">{r.check_out}</p></div><div><p className="text-[10px] font-black uppercase tracking-wider text-[#182326]/40">Phone</p><p className="mt-1 font-bold">{r.guest_phone}</p></div><div><p className="text-[10px] font-black uppercase tracking-wider text-[#182326]/40">Email</p><p className="mt-1 break-all font-bold">{r.guest_email || '—'}</p></div></div>{r.special_requests && <p className="mt-4 rounded-xl border border-[#C9A227]/20 bg-[#F3E9D2]/40 p-3 text-sm"><strong>Special request:</strong> {r.special_requests}</p>}<div className="mt-5 flex flex-wrap gap-2 border-t border-[#0B3D4A]/10 pt-4">{r.status === 'pending' && <><Action busy={busy === r.id} onClick={() => void changeStatus(r.id, 'confirmed')} icon={Check} label="Confirm"/><Action busy={busy === r.id} onClick={() => void changeStatus(r.id, 'cancelled')} icon={X} label="Cancel" danger/></>}{r.status === 'confirmed' && <><Action busy={busy === r.id} onClick={() => void changeStatus(r.id, 'checked_in')} icon={LogIn} label="Check In"/><Action busy={busy === r.id} onClick={() => void changeStatus(r.id, 'no_show')} icon={Ban} label="No Show" danger/></>}{r.status === 'checked_in' && <Action busy={busy === r.id} onClick={() => void changeStatus(r.id, 'checked_out')} icon={LogOut} label="Check Out"/>}</div></article>)}</div>}
    </div>
  </main>
}

function Action({ onClick, icon: Icon, label, danger, busy }: { onClick: () => void; icon: typeof Check; label: string; danger?: boolean; busy?: boolean }) { return <button disabled={busy} onClick={onClick} className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50 ${danger ? 'border border-red-200 text-red-700 hover:bg-red-50' : 'bg-[#0B3D4A] text-white hover:bg-[#073B4C]'}`}><Icon className="h-4 w-4" />{busy ? 'Updating…' : label}</button> }
