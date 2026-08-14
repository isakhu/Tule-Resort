'use client'

import { useEffect, useState } from 'react'
import { BedDouble, Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react'
import supabase from '@/lib/supabaseClient'
import RoomEditor, { ManagerRoom } from '@/components/manager/RoomEditor'

export default function ManagerRoomsPage() {
  const [rooms, setRooms] = useState<ManagerRoom[]>([])
  const [editing, setEditing] = useState<ManagerRoom | null>(null)
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true); setError('')
    const { data, error } = await supabase.from('rooms').select('*').order('display_order', { ascending: true }).order('created_at', { ascending: true })
    if (error) setError(error.message); else setRooms((data ?? []) as ManagerRoom[])
    setLoading(false)
  }
  useEffect(() => { void load() }, [])

  async function toggle(room: ManagerRoom) {
    if (!room.id) return
    const { error } = await supabase.from('rooms').update({ is_active: !room.is_active, updated_at: new Date().toISOString() }).eq('id', room.id)
    if (error) setError(error.message); else await load()
  }
  async function remove(room: ManagerRoom) {
    if (!room.id || !confirm(`Delete “${room.name}”? This cannot be undone.`)) return
    const { error } = await supabase.from('rooms').delete().eq('id', room.id)
    if (error) setError(error.message); else await load()
  }
  const close = () => { setAdding(false); setEditing(null) }
  const saved = async () => { close(); await load() }

  return <main className="min-h-screen bg-[#F8F5EE] text-[#182326]"><header className="border-b border-[#0B3D4A]/10 bg-[#0B3D4A] text-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 md:px-6"><div className="flex items-center gap-3"><BedDouble className="h-6 w-6 text-[#159A9C]" /><div><p className="font-display text-2xl">Rooms</p><p className="text-[10px] font-bold uppercase tracking-[.2em] text-white/50">Tule Resort CMS</p></div></div><button onClick={() => { setEditing(null); setAdding(true) }} className="flex items-center gap-2 rounded-xl bg-[#159A9C] px-4 py-2.5 text-sm font-bold text-white"><Plus className="h-4 w-4" /> Add room</button></div></header><div className="mx-auto max-w-7xl px-4 py-7 md:px-6">{adding && <div className="mb-6"><RoomEditor onSaved={saved} onCancel={close} /></div>}{editing && <div className="mb-6"><RoomEditor initial={editing} onSaved={saved} onCancel={close} /></div>}{error && <div className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}{loading ? <p className="py-12 text-center text-[#182326]/50">Loading rooms…</p> : rooms.length === 0 ? <div className="rounded-2xl border border-dashed border-[#0B3D4A]/20 p-12 text-center"><p className="font-display text-3xl">No rooms yet</p><p className="mt-2 text-sm text-[#182326]/50">Add your first room.</p></div> : <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{rooms.map(room => <article key={room.id} className="overflow-hidden rounded-2xl border border-[#0B3D4A]/10 bg-white shadow-sm"><div className="aspect-[16/10] bg-[#0B3D4A]/5">{room.image_url ? <img src={room.image_url} alt={room.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[#0B3D4A]/25"><BedDouble className="h-12 w-12" /></div>}</div><div className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#159A9C]">{room.category || room.type}</p><h2 className="mt-1 font-display text-3xl">{room.name}</h2></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${room.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>{room.is_active ? 'Published' : 'Hidden'}</span></div><p className="mt-2 text-sm text-[#182326]/55">{room.description || 'No description yet.'}</p><div className="mt-4 flex items-center justify-between"><p className="text-lg font-bold text-[#0B3D4A]">{Number(room.price_per_night || 0).toLocaleString()} <span className="text-xs">ETB / night</span></p><span className={`text-xs font-bold ${room.is_available ? 'text-emerald-700' : 'text-red-600'}`}>{room.is_available ? 'Available' : 'Unavailable'}</span></div><div className="mt-5 flex items-center gap-2 border-t border-[#0B3D4A]/10 pt-4"><button onClick={() => toggle(room)} title={room.is_active ? 'Hide room' : 'Publish room'} className="rounded-lg border border-[#0B3D4A]/10 p-2 hover:bg-[#159A9C]/10">{room.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button><button onClick={() => { setAdding(false); setEditing(room) }} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#0B3D4A] px-3 py-2 text-sm font-bold text-white"><Pencil className="h-4 w-4" /> Edit</button><button onClick={() => remove(room)} className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div></div></article>)}</div>}</div></main>
}
