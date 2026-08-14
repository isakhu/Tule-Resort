'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabaseClient'

export type ResortService = {
  id?: string
  name: string
  category: string
  description: string
  image_url: string
  service_type: string
  is_active: boolean
  display_order: number
  features: string[]
}

const emptyService: ResortService = {
  name: '', category: '', description: '', image_url: '', service_type: 'experience',
  is_active: true, display_order: 0, features: [],
}

export default function ServiceEditor({ initial, onSaved, onCancel }: {
  initial?: Partial<ResortService>
  onSaved?: () => void
  onCancel?: () => void
}) {
  const [form, setForm] = useState<ResortService>({ ...emptyService, ...initial })
  const [featuresText, setFeaturesText] = useState((initial?.features ?? []).join(', '))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const set = <K extends keyof ResortService>(key: K, value: ResortService[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  async function save() {
    if (!form.name.trim()) return setError('Service name is required.')
    setSaving(true); setError('')
    const payload = {
      name: form.name.trim(), category: form.category.trim(), description: form.description.trim(),
      image_url: form.image_url.trim() || null, service_type: form.service_type.trim() || 'experience',
      is_active: form.is_active, display_order: Number(form.display_order) || 0,
      features: featuresText.split(',').map(x => x.trim()).filter(Boolean),
    }
    const result = form.id
      ? await supabase.from('resort_services').update(payload).eq('id', form.id)
      : await supabase.from('resort_services').insert(payload)
    setSaving(false)
    if (result.error) return setError(result.error.message)
    onSaved?.()
  }

  return (
    <div className="space-y-5 rounded-2xl border border-white/10 bg-black/20 p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1"><span>Service name</span><input className="w-full rounded-lg border border-white/10 bg-white/5 p-3" value={form.name} onChange={e => set('name', e.target.value)} /></label>
        <label className="space-y-1"><span>Category</span><input className="w-full rounded-lg border border-white/10 bg-white/5 p-3" value={form.category} onChange={e => set('category', e.target.value)} /></label>
        <label className="space-y-1"><span>Service type</span><input className="w-full rounded-lg border border-white/10 bg-white/5 p-3" value={form.service_type} onChange={e => set('service_type', e.target.value)} /></label>
        <label className="space-y-1"><span>Display order</span><input type="number" className="w-full rounded-lg border border-white/10 bg-white/5 p-3" value={form.display_order} onChange={e => set('display_order', Number(e.target.value))} /></label>
      </div>
      <label className="block space-y-1"><span>Description</span><textarea rows={4} className="w-full rounded-lg border border-white/10 bg-white/5 p-3" value={form.description} onChange={e => set('description', e.target.value)} /></label>
      <label className="block space-y-1"><span>Image URL</span><input className="w-full rounded-lg border border-white/10 bg-white/5 p-3" placeholder="Paste a Supabase/public image URL" value={form.image_url} onChange={e => set('image_url', e.target.value)} /></label>
      <label className="block space-y-1"><span>Features <small>(comma separated)</small></span><input className="w-full rounded-lg border border-white/10 bg-white/5 p-3" value={featuresText} onChange={e => setFeaturesText(e.target.value)} /></label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} /> Active / visible to guests</label>
      {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      <div className="flex gap-3"><button onClick={save} disabled={saving} className="rounded-lg bg-amber-400 px-5 py-3 font-semibold text-black disabled:opacity-50">{saving ? 'Saving…' : form.id ? 'Save changes' : 'Add service'}</button>{onCancel && <button onClick={onCancel} className="rounded-lg border border-white/10 px-5 py-3">Cancel</button>}</div>
    </div>
  )
}
