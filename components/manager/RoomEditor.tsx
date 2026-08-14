'use client'

import { useState } from 'react'
import { ImagePlus } from 'lucide-react'
import supabase from '@/lib/supabaseClient'

export type ManagerRoom = {
  id?: string
  slug: string
  name: string
  type: string
  category: string
  description: string
  price_per_night: number
  capacity: number
  max_occupancy: number
  image_url: string
  images: string[]
  amenities: string[]
  is_active: boolean
  is_available: boolean
  display_order: number
}

const emptyRoom: ManagerRoom = {
  slug: '', name: '', type: 'Standard', category: 'Accommodation', description: '', price_per_night: 0,
  capacity: 2, max_occupancy: 2, image_url: '', images: [], amenities: [], is_active: true, is_available: true, display_order: 0,
}

function makeSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function RoomEditor({ initial, onSaved, onCancel }: { initial?: Partial<ManagerRoom>; onSaved?: () => void; onCancel?: () => void }) {
  const [form, setForm] = useState<ManagerRoom>({ ...emptyRoom, ...initial })
  const [amenitiesText, setAmenitiesText] = useState((initial?.amenities ?? []).join(', '))
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = <K extends keyof ManagerRoom>(key: K, value: ManagerRoom[K]) => setForm(prev => ({ ...prev, [key]: value }))

  function chooseImage(file: File | null) {
    setImageFile(file)
    if (file) set('image_url', URL.createObjectURL(file))
  }

  async function uploadImage(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `rooms/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('resort-media').upload(path, file, { upsert: false, contentType: file.type, cacheControl: '3600' })
    if (error) throw error
    return supabase.storage.from('resort-media').getPublicUrl(path).data.publicUrl
  }

  async function save() {
    if (!form.name.trim()) return setError('Room name is required.')
    setSaving(true); setError('')
    try {
      let imageUrl = initial?.image_url || ''
      if (imageFile) imageUrl = await uploadImage(imageFile)
      const slug = form.slug.trim() || makeSlug(form.name)
      const amenities = amenitiesText.split(',').map(x => x.trim()).filter(Boolean)
      const payload = {
        slug, name: form.name.trim(), type: form.type.trim() || 'Standard', category: form.category.trim() || 'Accommodation',
        description: form.description.trim(), short_description: form.description.trim(), price_per_night: Number(form.price_per_night) || 0,
        base_price: Number(form.price_per_night) || 0, capacity: Number(form.capacity) || 2, max_occupancy: Number(form.max_occupancy) || 2,
        image_url: imageUrl || null, images: imageUrl ? [imageUrl] : [], amenities, is_active: form.is_active, is_available: form.is_available,
        display_order: Number(form.display_order) || 0, updated_at: new Date().toISOString(),
      }
      const result = form.id ? await supabase.from('rooms').update(payload).eq('id', form.id) : await supabase.from('rooms').insert(payload)
      if (result.error) throw result.error
      onSaved?.()
    } catch (err: any) { setError(err?.message ?? 'Could not save room.') }
    finally { setSaving(false) }
  }

  return <div className="space-y-5 rounded-2xl border border-[#0B3D4A]/10 bg-white p-5 shadow-sm">
    <div className="grid gap-4 md:grid-cols-2">
      <label className="space-y-1"><span className="field-label">Room name</span><input className="field-input" value={form.name} onChange={e => set('name', e.target.value)} /></label>
      <label className="space-y-1"><span className="field-label">Room type</span><input className="field-input" value={form.type} onChange={e => set('type', e.target.value)} /></label>
      <label className="space-y-1"><span className="field-label">Category</span><input className="field-input" value={form.category} onChange={e => set('category', e.target.value)} /></label>
      <label className="space-y-1"><span className="field-label">Price per night (ETB)</span><input type="number" min="0" className="field-input" value={form.price_per_night} onChange={e => set('price_per_night', Number(e.target.value))} /></label>
      <label className="space-y-1"><span className="field-label">Capacity</span><input type="number" min="1" className="field-input" value={form.capacity} onChange={e => set('capacity', Number(e.target.value))} /></label>
      <label className="space-y-1"><span className="field-label">Maximum occupancy</span><input type="number" min="1" className="field-input" value={form.max_occupancy} onChange={e => set('max_occupancy', Number(e.target.value))} /></label>
      <label className="space-y-1"><span className="field-label">Display order</span><input type="number" min="0" className="field-input" value={form.display_order} onChange={e => set('display_order', Number(e.target.value))} /></label>
      <label className="space-y-1"><span className="field-label">Slug (optional)</span><input className="field-input" value={form.slug} onChange={e => set('slug', e.target.value)} placeholder="Automatically generated" /></label>
    </div>
    <label className="block space-y-1"><span className="field-label">Description</span><textarea rows={4} className="field-input" value={form.description} onChange={e => set('description', e.target.value)} /></label>
    <div className="space-y-2"><span className="field-label">Room image</span><label className="flex min-h-48 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#0B3D4A]/20 bg-[#F8F5EE] p-4 hover:border-[#159A9C]/60">{form.image_url ? <img src={form.image_url} alt="Room preview" className="max-h-64 w-full rounded-xl object-cover" /> : <span className="flex flex-col items-center gap-2 text-[#0B3D4A]/45"><ImagePlus className="h-10 w-10" /><span className="text-xs font-bold uppercase tracking-wider">Choose image</span></span>}<input type="file" accept="image/*" className="sr-only" onChange={e => chooseImage(e.target.files?.[0] ?? null)} /></label></div>
    <label className="block space-y-1"><span className="field-label">Amenities <small>(comma separated)</small></span><input className="field-input" value={amenitiesText} onChange={e => setAmenitiesText(e.target.value)} placeholder="Wi-Fi, Balcony, Room service" /></label>
    <div className="flex flex-wrap gap-5 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} /> Published</label><label className="flex items-center gap-2"><input type="checkbox" checked={form.is_available} onChange={e => set('is_available', e.target.checked)} /> Available for booking</label></div>
    {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="flex gap-3"><button onClick={save} disabled={saving} className="rounded-lg bg-[#159A9C] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : form.id ? 'Save changes' : 'Add room'}</button>{onCancel && <button onClick={onCancel} className="rounded-lg border border-[#0B3D4A]/15 px-5 py-3 text-sm">Cancel</button>}</div>
  </div>
}
