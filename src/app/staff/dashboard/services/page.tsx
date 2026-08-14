'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Eye, EyeOff, Waves } from 'lucide-react'
import supabase from '@/lib/supabaseClient'
import ServiceEditor, { ResortService } from '@/components/manager/ServiceEditor'

export default function ManagerServicesPage() {
  const [services, setServices] = useState<ResortService[]>([])
  const [editing, setEditing] = useState<ResortService | null>(null)
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true); setError('')
    const { data, error } = await supabase.from('resort_services').select('*').order('display_order', { ascending: true }).order('created_at', { ascending: true })
    if (error) setError(error.message)
    else setServices((data ?? []) as ResortService[])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  async function remove(service: ResortService) {
    if (!service.id || !confirm(`Delete “${service.name}”? This cannot be undone.`)) return
    const { error } = await supabase.from('resort_services').delete().eq('id', service.id)
    if (error) setError(error.message); else await load()
  }

  async function toggle(service: ResortService) {
    if (!service.id) return
    const { error } = await supabase.from('resort_services').update({ is_active: !service.is_active }).eq('id', service.id)
    if (error) setError(error.message); else await load()
  }

  const closeEditor = () => { setAdding(false); setEditing(null) }
  const saved = async () => { closeEditor(); await load() }

  return (
    <main className="min-h-screen bg-[#F8F5EE] text-[#182326]">
      <header className="border-b border-[#0B3D4A]/10 bg-[#0B3D4A] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 md:px-6">
          <div className="flex items-center gap-3"><Waves className="h-6 w-6 text-[#159A9C]" /><div><p className="font-display text-2xl">Resort Services</p><p className="text-[10px] font-bold uppercase tracking-[.2em] text-white/50">Tule Resort CMS</p></div></div>
          <button onClick={() => { setEditing(null); setAdding(true) }} className="flex items-center gap-2 rounded-xl bg-[#159A9C] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#128587]"><Plus className="h-4 w-4" /> Add service</button>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-7 md:px-6">
        {adding && <div className="mb-6"><ServiceEditor onSaved={saved} onCancel={closeEditor} /></div>}
        {editing && <div className="mb-6"><ServiceEditor initial={editing} onSaved={saved} onCancel={closeEditor} /></div>}
        {error && <div className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {loading ? <p className="py-12 text-center text-[#182326]/50">Loading services…</p> : services.length === 0 ? <div className="rounded-2xl border border-dashed border-[#0B3D4A]/20 p-12 text-center"><p className="font-display text-3xl">No services yet</p><p className="mt-2 text-sm text-[#182326]/50">Add your first resort service.</p></div> : <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{services.map(service => <article key={service.id} className="overflow-hidden rounded-2xl border border-[#0B3D4A]/10 bg-white shadow-sm"><div className="aspect-[16/9] bg-[#0B3D4A]/5">{service.image_url ? <img src={service.image_url} alt={service.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[#0B3D4A]/25"><Waves className="h-12 w-12" /></div>}</div><div className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#159A9C]">{service.category || service.service_type}</p><h2 className="mt-1 font-display text-3xl">{service.name}</h2></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${service.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>{service.is_active ? 'Active' : 'Hidden'}</span></div><p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[#182326]/55">{service.description || 'No description yet.'}</p><div className="mt-5 flex items-center gap-2 border-t border-[#0B3D4A]/10 pt-4"><button onClick={() => toggle(service)} title={service.is_active ? 'Hide service' : 'Show service'} className="rounded-lg border border-[#0B3D4A]/10 p-2 hover:bg-[#159A9C]/10">{service.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button><button onClick={() => { setAdding(false); setEditing(service) }} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#0B3D4A] px-3 py-2 text-sm font-bold text-white"><Pencil className="h-4 w-4" /> Edit</button><button onClick={() => remove(service)} title="Delete service" className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div></div></article>)}</div>}
      </div>
    </main>
  )
}
