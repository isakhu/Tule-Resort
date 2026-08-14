'use client'

import { useState } from 'react'
import { ImagePlus } from 'lucide-react'
import supabase from '@/lib/supabaseClient'

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
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = <K extends keyof ResortService>(key: K, value: ResortService[K]) => setForm(prev => ({ ...prev, [key]: value }))

  function chooseImage(file: File | null) {
    setImageFile(file)
    if (file) set('image_url', URL.createObjectURL(file))
  }

  async function uploadImage(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `services/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('resort-media').upload(path, file, {
      upsert: false,
      contentType: file.type,
      cacheControl: '3600',
    })
    if (error) throw error
    return supabase.storage.from('resort-media').getPublicUrl(path).data.publicUrl
  }

  async function save() {
    if (!form.name.trim()) return setError('Service name is required.')
    setSaving(true); setError('')
    try {
      let imageUrl = initial?.image_url || ''
      if (imageFile) imageUrl = await uploadImage(imageFile)
      else if (!initial?.id) imageUrl = ''

      const payload = {
        name: form.name.trim(), category: form.category.trim(), description: form.description.trim(),
        image_url: imageUrl || null, service_type: form.service_type.trim() || 'experience',
        is_active: form.is_active, display_order: Number(form.display_order) || 0,
        features: featuresText.split(',').map(x => x.trim()).filter(Boolean),
      }
      const result = form.id
        ? await supabase.from('resort_services').update(payload).eq('id', form.id)
        : await supabase.from('resort_services').insert(payload)
      if (result.error) throw result.error
      onSaved?.()
    } catch (err: any) {
      setError(err?.message ?? 'Could not save service.')
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-5 rounded-2xl border border-[#0B3D4A]/10 bg-white p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1"><span className="field-label">Service name</span><input className="field-input" value={form.name} onChange={e => set('name', e.target.value)} /></label>
        <label className="space-y-1"><span className="field-label">Category</span><input className="field-input" value={form.category} onChange={e => set('category', e.target.value)} /></label>
        <label className="space-y-1"><span className="field-label">Service type</span><input className="field-input" value={form.service_type} onChange={e => set('service_type', e.target.value)} /></label>
        <label className="space-y-1"><span className="field-label">Display order</span><input type="number" className="field-input" value={form.display_order} onChange={e => set('display_order', Number(e.target.value))} /></label>
      </div>
      <label className="block space-y-1"><span className="field-label">Description</span><textarea rows={4} className="field-input" value={form.description} onChange={e => set('description', e.target.value)} /></label>
      <div className="space-y-2">
        <span className="field-label">Service image</span>
        <label className="flex min-h-48 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#0B3D4A]/20 bg-[#F8F5EE] p-4 transition hover:border-[#159A9C]/60">
          {form.image_url ? <img src={form.image_url} alt="Service preview" className="max-h-64 w-full rounded-xl object-cover" /> : <span className="flex flex-col items-center gap-2 text-[#0B3D4A]/45"><ImagePlus className="h-10 w-10" /><span className="text-xs font-bold uppercase tracking-wider">Choose image</span></span>}
          <input type="file" accept="image/*" className="sr-only" onChange={e => chooseImage(e.target.files?.[0] ?? null)} />
        </label>
        <p className="text-xs text-[#182326]/45">Upload an image from your computer. It will be stored in Supabase.</p>
      </div>
      <label className="block space-y-1"><span className="field-label">Features <small>(comma separated)</small></span><input className="field-input" value={featuresText} onChange={e => setFeaturesText(e.target.value)} /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} /> Active / visible to guests</label>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="flex gap-3"><button onClick={save} disabled={saving} className="rounded-lg bg-[#159A9C] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : form.id ? 'Save changes' : 'Add service'}</button>{onCancel && <button onClick={onCancel} className="rounded-lg border border-[#0B3D4A]/15 px-5 py-3 text-sm">Cancel</button>}</div>
    </div>
  )
}
