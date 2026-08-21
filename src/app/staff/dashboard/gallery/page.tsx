'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ImagePlus, Pencil, Save, Star, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

type GalleryItem = {
  id: string;
  title: string;
  caption: string | null;
  category: string;
  image_url: string;
  storage_path: string | null;
  is_active: boolean;
  is_featured: boolean;
  display_order: number;
  created_at: string;
};

type FormState = {
  title: string;
  caption: string;
  category: string;
  imageUrl: string;
  isActive: boolean;
  isFeatured: boolean;
  displayOrder: string;
};

const emptyForm: FormState = {
  title: '',
  caption: '',
  category: 'Resort',
  imageUrl: '',
  isActive: true,
  isFeatured: false,
  displayOrder: '0',
};

export default function GalleryManagerPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');

  async function loadItems() {
    setLoading(true);
    const { data, error } = await supabase
      .from('gallery')
      .select('*')
      .order('is_featured', { ascending: false })
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) setMessage(error.message);
    else setItems((data ?? []) as GalleryItem[]);
    setLoading(false);
  }

  useEffect(() => { void loadItems(); }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return items.filter((item) => `${item.title} ${item.caption ?? ''} ${item.category}`.toLowerCase().includes(q));
  }, [items, query]);

  function reset() {
    setEditingId(null);
    setForm(emptyForm);
    setImageFile(null);
    setMessage('');
  }

  function edit(item: GalleryItem) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      caption: item.caption ?? '',
      category: item.category,
      imageUrl: item.image_url,
      isActive: item.is_active,
      isFeatured: item.is_featured,
      displayOrder: String(item.display_order ?? 0),
    });
    setImageFile(null);
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function uploadImage(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `gallery/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('resort-media').upload(path, file, {
      upsert: false,
      contentType: file.type,
      cacheControl: '31536000',
    });
    if (error) throw error;
    const { data } = supabase.storage.from('resort-media').getPublicUrl(path);
    return { url: data.publicUrl, path };
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      if (!form.title.trim()) throw new Error('Title is required.');
      let imageUrl = form.imageUrl.trim();
      let storagePath: string | null = editingId ? items.find((item) => item.id === editingId)?.storage_path ?? null : null;

      if (imageFile) {
        const uploaded = await uploadImage(imageFile);
        imageUrl = uploaded.url;
        storagePath = uploaded.path;
      }

      if (!imageUrl) throw new Error('Choose an image.');

      const payload = {
        title: form.title.trim(),
        caption: form.caption.trim() || null,
        category: form.category.trim() || 'Resort',
        image_url: imageUrl,
        storage_path: storagePath,
        is_active: form.isActive,
        is_featured: form.isFeatured,
        display_order: Number(form.displayOrder) || 0,
      };

      const result = editingId
        ? await supabase.from('gallery').update(payload).eq('id', editingId).select().single()
        : await supabase.from('gallery').insert(payload).select().single();

      if (result.error) throw result.error;
      setMessage(editingId ? 'Gallery item updated.' : 'Gallery item published.');
      reset();
      await loadItems();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save gallery item.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: GalleryItem) {
    if (!window.confirm(`Delete “${item.title}”?`)) return;
    const { error } = await supabase.from('gallery').delete().eq('id', item.id);
    if (error) {
      setMessage(error.message);
      return;
    }
    if (item.storage_path) {
      await supabase.storage.from('resort-media').remove([item.storage_path]);
    }
    setMessage('Gallery item deleted.');
    await loadItems();
  }

  return (
    <main className="min-h-screen bg-[#F8F5EE] text-[#182326]">
      <header className="border-b border-white/10 bg-[#0B3D4A] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 md:px-6">
          <div className="flex items-center gap-3">
            <Link href="/staff/dashboard" className="rounded-xl bg-white/10 p-2 text-white/80 hover:text-white"><ArrowLeft className="h-5 w-5" /></Link>
            <div><p className="font-display text-2xl">Gallery</p><p className="text-[10px] font-bold uppercase tracking-[.2em] text-white/50">Tule Resort · Manager</p></div>
          </div>
          <span className="rounded-full bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.15em]">Visual CMS</span>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-7 md:px-6">
        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <form onSubmit={save} className="rounded-[2rem] border border-[#0B3D4A]/10 bg-white p-5 shadow-sm md:p-7">
            <div className="flex items-center justify-between gap-4">
              <div><p className="text-[9px] font-black uppercase tracking-[.25em] text-[#C8A15A]">Gallery CMS</p><h1 className="mt-1 text-2xl font-black text-[#0B3D4A]">{editingId ? 'Edit gallery item' : 'Add gallery image'}</h1></div>
              {editingId && <button type="button" onClick={reset} className="rounded-full border border-[#0B3D4A]/10 p-2 text-[#0B3D4A]/50 hover:text-[#0B3D4A]"><X className="h-4 w-4" /></button>}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="space-y-2 md:col-span-2"><span className="text-xs font-black uppercase tracking-wider text-black/45">Image</span><input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0] ?? null; setImageFile(file); if (file) setForm((current) => ({ ...current, imageUrl: URL.createObjectURL(file) })); }} className="block w-full rounded-2xl border border-dashed border-[#0B3D4A]/15 bg-[#F8F5EE] p-4 text-xs text-black/55 file:mr-4 file:rounded-full file:border-0 file:bg-[#C8A15A] file:px-4 file:py-2 file:text-xs file:font-black file:text-white" /></label>
              <label className="space-y-2 md:col-span-2"><span className="text-xs font-black uppercase tracking-wider text-black/45">Title *</span><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-xl border border-[#0B4F6C]/15 bg-white px-4 py-3 outline-none focus:border-[#C9A227]" placeholder="Lake view at sunset" /></label>
              <label className="space-y-2"><span className="text-xs font-black uppercase tracking-wider text-black/45">Category</span><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-xl border border-[#0B4F6C]/15 bg-white px-4 py-3 outline-none focus:border-[#C9A227]" placeholder="Resort" /></label>
              <label className="space-y-2"><span className="text-xs font-black uppercase tracking-wider text-black/45">Display order</span><input type="number" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: e.target.value })} className="w-full rounded-xl border border-[#0B4F6C]/15 bg-white px-4 py-3 outline-none focus:border-[#C9A227]" /></label>
              <label className="space-y-2 md:col-span-2"><span className="text-xs font-black uppercase tracking-wider text-black/45">Caption</span><textarea value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} className="min-h-24 w-full rounded-xl border border-[#0B4F6C]/15 bg-white px-4 py-3 outline-none focus:border-[#C9A227]" placeholder="A calm evening overlooking Lake Hawassa." /></label>
              <label className="flex items-center gap-3 rounded-xl bg-[#F8F5EE] p-4 text-sm font-bold"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Visible to guests</label>
              <label className="flex items-center gap-3 rounded-xl bg-[#F8F5EE] p-4 text-sm font-bold"><input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} /> Featured image</label>
            </div>

            {message && <div className="mt-5 rounded-xl bg-[#EAF4F7] p-3 text-sm text-[#0B3D4A]">{message}</div>}
            <div className="mt-6 flex flex-wrap gap-3"><button disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-[#0B3D4A] px-5 py-3 text-xs font-black uppercase tracking-wider text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Saving…' : editingId ? 'Save changes' : 'Publish image'}</button>{!editingId && <button type="button" onClick={reset} className="rounded-full border border-[#0B3D4A]/10 px-5 py-3 text-xs font-black uppercase tracking-wider text-[#0B3D4A]/60">Clear</button>}</div>
          </form>

          <div className="rounded-[2rem] border border-[#0B3D4A]/10 bg-white p-5 shadow-sm md:p-7 xl:sticky xl:top-6 xl:self-start">
            <p className="text-[9px] font-black uppercase tracking-[.25em] text-black/35">Preview</p>
            <div className="mt-4 overflow-hidden rounded-2xl bg-[#0B3D4A]">
              {form.imageUrl ? <img src={form.imageUrl} alt={form.title || 'Preview'} className="aspect-[4/3] w-full object-cover" /> : <div className="flex aspect-[4/3] items-center justify-center text-white/30"><ImagePlus className="h-12 w-12" /></div>}
              <div className="p-4 text-white"><p className="text-[9px] font-black uppercase tracking-[.2em] text-[#C8A15A]">{form.category}</p><h2 className="mt-1 text-xl font-black">{form.title || 'Gallery image'}</h2><p className="mt-2 text-sm text-white/55">{form.caption || 'Your gallery caption will appear here.'}</p></div>
            </div>
          </div>
        </div>

        <section className="mt-8 rounded-[2rem] border border-[#0B3D4A]/10 bg-white p-5 shadow-sm md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.25em] text-black/35">Published gallery</p><h2 className="mt-1 text-2xl font-black text-[#0B3D4A]">Gallery images</h2></div><input value={query} onChange={(e) => setQuery(e.target.value)} className="w-full max-w-sm rounded-xl border border-[#0B4F6C]/15 bg-white px-4 py-3 outline-none focus:border-[#C9A227]" placeholder="Search gallery…" /></div>
          {loading ? <p className="mt-6 text-sm text-black/45">Loading gallery…</p> : filtered.length === 0 ? <div className="mt-6 rounded-2xl bg-[#F8F5EE] p-6 text-sm text-black/45">No gallery images yet.</div> : <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((item) => <article key={item.id} className="overflow-hidden rounded-2xl border border-[#0B3D4A]/10 bg-[#F8F5EE]"><div className="relative aspect-[4/3] overflow-hidden bg-black/5"><img src={item.image_url} alt={item.title} className="h-full w-full object-cover" />{item.is_featured && <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#C8A15A] px-3 py-1 text-[9px] font-black uppercase text-white"><Star className="h-3 w-3" /> Featured</span>} {!item.is_active && <span className="absolute right-3 top-3 rounded-full bg-black/70 px-3 py-1 text-[9px] font-black uppercase text-white">Hidden</span>}</div><div className="p-4"><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#C8A15A]">{item.category}</p><h3 className="mt-1 font-black text-[#0B3D4A]">{item.title}</h3>{item.caption && <p className="mt-1 line-clamp-2 text-sm text-black/50">{item.caption}</p>}<div className="mt-4 flex gap-2"><button type="button" onClick={() => edit(item)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-[#0B3D4A] shadow-sm"><Pencil className="h-4 w-4" /> Edit</button><button type="button" onClick={() => void remove(item)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700"><Trash2 className="h-4 w-4" /> Delete</button></div></div></article>)}</div>}
        </section>
      </div>
    </main>
  );
}
