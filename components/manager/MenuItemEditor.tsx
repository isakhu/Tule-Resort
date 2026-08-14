'use client';

import { useEffect, useMemo, useState } from 'react';
import { ImagePlus, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import supabase from '@/lib/supabaseClient';

type MenuItem = {
  id: string;
  name: string;
  amharic_name: string | null;
  description: string | null;
  category: string | null;
  price: number;
  image_url: string | null;
  department_id: number | null;
  created_at: string;
};

type FormState = {
  name: string;
  amharicName: string;
  description: string;
  category: string;
  price: string;
  departmentId: string;
  imageUrl: string;
};

const emptyForm: FormState = { name: '', amharicName: '', description: '', category: 'Main Course', price: '', departmentId: '', imageUrl: '' };
const categories = ['Breakfast', 'Starters', 'Main Course', 'Pizza & Pasta', 'Burgers', 'Dessert', 'Beverages', 'Coffee', 'Kids', 'Other'];

function CardPreview({ form }: { form: FormState }) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#15130F] shadow-2xl">
      <div className="relative h-72 overflow-hidden bg-white/5">
        {form.imageUrl ? <img src={form.imageUrl} alt="Live preview" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-white/25"><ImagePlus className="h-12 w-12" /></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-4 right-4"><p className="text-[9px] font-black uppercase tracking-[.22em] text-[#F2B84B]">{form.amharicName || 'የምግብ ስም'}</p><h3 className="mt-1 text-3xl font-black uppercase tracking-[-.04em] text-white">{form.name || 'FOOD ITEM'}</h3></div>
        <div className="absolute right-4 top-4 rounded-2xl bg-white/95 px-3 py-2"><p className="text-[8px] font-black uppercase tracking-wider text-stone-400">Price</p><p className="text-lg font-black text-stone-950">{form.price ? Number(form.price).toLocaleString() : '0'} <span className="text-[9px]">ETB</span></p></div>
      </div>
      <div className="p-4"><p className="line-clamp-3 text-sm leading-relaxed text-white/55">{form.description || 'Your food description will appear here.'}</p><div className="mt-4 flex items-center justify-between"><span className="rounded-full bg-white/5 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-white/40">{form.category}</span><span className="rounded-full bg-[#F2B84B] px-4 py-2 text-[9px] font-black uppercase tracking-wider text-stone-950">Add to order</span></div></div>
    </div>
  );
}

export default function MenuItemEditor() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  async function loadItems() {
    setLoading(true);
    const { data, error } = await supabase.from('menu_items').select('*').order('created_at', { ascending: false });
    if (error) setMessage(error.message); else setItems((data ?? []) as MenuItem[]);
    setLoading(false);
  }

  useEffect(() => { void loadItems(); }, []);

  const filtered = useMemo(() => items.filter((item) => `${item.name} ${item.amharic_name ?? ''} ${item.category ?? ''}`.toLowerCase().includes(query.toLowerCase())), [items, query]);

  function edit(item: MenuItem) {
    setEditingId(item.id);
    setForm({ name: item.name, amharicName: item.amharic_name ?? '', description: item.description ?? '', category: item.category ?? 'Other', price: String(item.price ?? ''), departmentId: item.department_id ? String(item.department_id) : '', imageUrl: item.image_url ?? '' });
    setImageFile(null);
    setMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function reset() { setEditingId(null); setForm(emptyForm); setImageFile(null); setMessage(null); }

  async function uploadImage(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `menu/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('resort-media').upload(path, file, { upsert: false, contentType: file.type, cacheControl: '3600' });
    if (error) throw error;
    const { data } = supabase.storage.from('resort-media').getPublicUrl(path);
    return data.publicUrl;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setMessage(null);
    try {
      if (!form.name.trim() || !form.price) throw new Error('English name and price are required.');
      let imageUrl = form.imageUrl;
      if (imageFile) imageUrl = await uploadImage(imageFile);
      const payload = { name: form.name.trim(), amharic_name: form.amharicName.trim() || null, description: form.description.trim() || null, category: form.category, price: Number(form.price), image_url: imageUrl || null, department_id: form.departmentId ? Number(form.departmentId) : null };
      const result = editingId ? await supabase.from('menu_items').update(payload).eq('id', editingId).select().single() : await supabase.from('menu_items').insert(payload).select().single();
      if (result.error) throw result.error;
      setMessage(editingId ? 'Food item updated and published.' : 'Food item added and published.');
      reset();
      await loadItems();
    } catch (error: any) { setMessage(error?.message ?? 'Could not save item.'); } finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this menu item?')) return;
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if (error) setMessage(error.message); else { setMessage('Menu item deleted.'); await loadItems(); }
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 xl:grid-cols-[1fr_390px]">
        <form onSubmit={save} className="rounded-[2rem] border border-white/10 bg-white/[.045] p-5 md:p-7">
          <div className="flex items-center justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[.25em] text-[#F2B84B]">Reusable card CMS</p><h2 className="mt-1 text-2xl font-black text-white">{editingId ? 'Edit food item' : 'Add food item'}</h2></div>{editingId && <button type="button" onClick={reset} className="rounded-full border border-white/10 p-2 text-white/50 hover:text-white"><X className="h-4 w-4" /></button>}</div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2"><span className="field-label">Food image</span><input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0] ?? null; setImageFile(file); if (file) setForm((f) => ({ ...f, imageUrl: URL.createObjectURL(file) })); }} className="block w-full rounded-2xl border border-dashed border-white/15 bg-black/20 p-4 text-xs text-white/55 file:mr-4 file:rounded-full file:border-0 file:bg-[#F2B84B] file:px-4 file:py-2 file:text-xs file:font-black file:text-stone-950" /></label>
            <label className="space-y-2"><span className="field-label">English name *</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="field-input" placeholder="Special Shekla Tibs" required /></label>
            <label className="space-y-2"><span className="field-label">Amharic name</span><input value={form.amharicName} onChange={(e) => setForm({ ...form, amharicName: e.target.value })} className="field-input" placeholder="ልዩ ሽክላ ጥብስ" /></label>
            <label className="space-y-2"><span className="field-label">Price (ETB) *</span><input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="field-input" placeholder="850" required /></label>
            <label className="space-y-2"><span className="field-label">Category</span><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="field-input">{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
            <label className="space-y-2 md:col-span-2"><span className="field-label">Description</span><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="field-input min-h-28 resize-y" placeholder="Tender beef served with..." /></label>
          </div>
          {message && <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/70">{message}</div>}
          <div className="mt-6 flex flex-wrap gap-3"><button disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-[#F2B84B] px-5 py-3 text-xs font-black uppercase tracking-wider text-stone-950 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Publishing…' : editingId ? 'Save changes' : 'Save & publish'}</button>{!editingId && <button type="button" onClick={reset} className="rounded-full border border-white/10 px-5 py-3 text-xs font-black uppercase tracking-wider text-white/60">Clear</button>}</div>
        </form>
        <div className="xl:sticky xl:top-6 xl:self-start"><p className="mb-3 text-[9px] font-black uppercase tracking-[.25em] text-white/35">Live customer preview</p><CardPreview form={form} /></div>
      </div>

      <section className="rounded-[2rem] border border-white/10 bg-white/[.045] p-5 md:p-7"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.25em] text-white/35">Published menu</p><h2 className="mt-1 text-2xl font-black text-white">Food items</h2></div><input value={query} onChange={(e) => setQuery(e.target.value)} className="field-input max-w-sm" placeholder="Search food…" /></div>{loading ? <p className="mt-6 text-sm text-white/40">Loading menu…</p> : filtered.length === 0 ? <div className="mt-6 rounded-2xl bg-white/5 p-6 text-sm text-white/40">No menu items found. Add your first item above.</div> : <div className="mt-6 grid gap-3">{filtered.map((item) => <div key={item.id} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-3"><div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white/5">{item.image_url && <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />}</div><div className="min-w-0 flex-1"><p className="truncate font-bold text-white">{item.name}</p><p className="text-xs text-[#F2B84B]">{item.amharic_name || '—'} • {item.category || 'Other'}</p></div><p className="font-black text-white">{Number(item.price).toLocaleString()} ETB</p><button type="button" onClick={() => edit(item)} className="rounded-xl bg-white/5 p-2 text-white/50 hover:text-white" aria-label={`Edit ${item.name}`}><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => remove(item.id)} className="rounded-xl bg-rose-500/10 p-2 text-rose-300 hover:bg-rose-500/20" aria-label={`Delete ${item.name}`}><Trash2 className="h-4 w-4" /></button></div>)}</div>}</section>
    </div>
  );
}
