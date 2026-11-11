'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ImagePlus, Pencil, Save, Star, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { isOptimizableImageSrc, isRenderableImageSrc } from '@/lib/imageSrc';

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

type FeedbackState = {
  type: 'success' | 'error';
  text: string;
} | null;

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
  const [deleting, setDeleting] = useState(false);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<GalleryItem | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [query, setQuery] = useState('');

  const previewObjectUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const imageInputId = useId();
  const titleInputId = useId();
  const categoryInputId = useId();
  const orderInputId = useId();
  const captionInputId = useId();
  const searchInputId = useId();

  function revokePreviewUrl() {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
  }

  async function loadItems() {
    setLoading(true);
    const { data, error } = await supabase
      .from('gallery')
      .select('*')
      .order('is_featured', { ascending: false })
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) setFeedback({ type: 'error', text: error.message });
    else setItems((data ?? []) as GalleryItem[]);
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('gallery')
        .select('*')
        .order('is_featured', { ascending: false })
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (!active) return;
      if (error) setFeedback({ type: 'error', text: error.message });
      else setItems((data ?? []) as GalleryItem[]);
      setLoading(false);
    })();

    return () => {
      active = false;
      revokePreviewUrl();
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return items.filter((item) =>
      `${item.title} ${item.caption ?? ''} ${item.category}`.toLowerCase().includes(q)
    );
  }, [items, query]);

  function reset() {
    revokePreviewUrl();
    setEditingId(null);
    setForm(emptyForm);
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setFeedback(null);
  }

  function handleClearImage() {
    revokePreviewUrl();
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setForm((current) => ({ ...current, imageUrl: '' }));
  }

  function edit(item: GalleryItem) {
    revokePreviewUrl();
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
    if (fileInputRef.current) fileInputRef.current.value = '';
    setFeedback(null);
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
    setFeedback(null);
    try {
      if (!form.title.trim()) throw new Error('Title is required.');
      let imageUrl = form.imageUrl.trim();
      let storagePath: string | null = editingId
        ? items.find((item) => item.id === editingId)?.storage_path ?? null
        : null;

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
      const savedText = editingId ? 'Gallery item updated.' : 'Gallery item published.';
      reset();
      setFeedback({ type: 'success', text: savedText });
      await loadItems();
    } catch (error) {
      setFeedback({
        type: 'error',
        text: error instanceof Error ? error.message : 'Could not save gallery item.',
      });
    } finally {
      setSaving(false);
    }
  }

  async function confirmRemove() {
    if (!pendingDeleteItem) return;
    setDeleting(true);
    const target = pendingDeleteItem;
    const { error } = await supabase.from('gallery').delete().eq('id', target.id);
    if (error) {
      setDeleting(false);
      setPendingDeleteItem(null);
      setFeedback({ type: 'error', text: error.message });
      return;
    }
    if (target.storage_path) {
      await supabase.storage.from('resort-media').remove([target.storage_path]);
    }
    setDeleting(false);
    setPendingDeleteItem(null);
    if (editingId === target.id) {
      reset();
    }
    setFeedback({ type: 'success', text: `"${target.title}" deleted.` });
    await loadItems();
  }

  return (
    <div className="min-h-screen bg-[#F5F0E6] text-[#1A1A1A]">
      <div className="mx-auto max-w-7xl px-4 py-7 md:px-6 md:py-10">
        <div className="mb-8 flex flex-col gap-4 border-b border-[#E6DFD1] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7A5A27]">
              Tule Resort · Visual CMS
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-[#163D32] md:text-5xl">
              Gallery CMS
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[#52645D]">
              Curate resort, poolside, dining, and lakeside imagery visible across the guest gallery.
            </p>
          </div>
          <Link
            href="/staff/dashboard"
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#163D32]/15 bg-white px-4 py-2.5 text-xs font-semibold text-[#163D32] transition-colors hover:bg-[#163D32]/5"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Dashboard
          </Link>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <form onSubmit={save} className="rounded-[2rem] border border-[#E6DFD1] bg-white p-5 shadow-sm md:p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7A5A27]">Gallery Editor</p>
                <h2 className="mt-1 font-display text-2xl font-semibold text-[#163D32]">
                  {editingId ? 'Edit gallery item' : 'Add gallery image'}
                </h2>
              </div>
              {editingId && (
                <button
                  type="button"
                  onClick={reset}
                  aria-label="Cancel editing gallery item"
                  className="rounded-full border border-[#E6DFD1] p-2 text-[#52645D] transition-colors hover:bg-[#F5F0E6] hover:text-[#163D32]"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor={imageInputId} className="text-xs font-bold uppercase tracking-wider text-[#52645D]">
                    Image *
                  </label>
                  {form.imageUrl && (
                    <button
                      type="button"
                      onClick={handleClearImage}
                      className="text-xs font-semibold text-rose-700 hover:underline"
                    >
                      Remove image
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  id={imageInputId}
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    revokePreviewUrl();
                    setImageFile(file);
                    if (file) {
                      const objectUrl = URL.createObjectURL(file);
                      previewObjectUrlRef.current = objectUrl;
                      setForm((current) => ({ ...current, imageUrl: objectUrl }));
                    }
                  }}
                  className="block w-full rounded-2xl border border-dashed border-[#163D32]/20 bg-[#F5F0E6]/60 p-4 text-xs text-[#52645D] file:mr-4 file:rounded-full file:border-0 file:bg-[#163D32] file:px-4 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-[#0F2D24]"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label htmlFor={titleInputId} className="text-xs font-bold uppercase tracking-wider text-[#52645D]">
                  Title *
                </label>
                <input
                  id={titleInputId}
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-xl border border-[#163D32]/15 bg-white px-4 py-3 text-sm text-[#1A1A1A] outline-none transition focus:border-[#C5A46D] focus:ring-2 focus:ring-[#C5A46D]/20"
                  placeholder="Lake view at sunset"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor={categoryInputId} className="text-xs font-bold uppercase tracking-wider text-[#52645D]">
                  Category
                </label>
                <input
                  id={categoryInputId}
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-xl border border-[#163D32]/15 bg-white px-4 py-3 text-sm text-[#1A1A1A] outline-none transition focus:border-[#C5A46D] focus:ring-2 focus:ring-[#C5A46D]/20"
                  placeholder="Resort"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor={orderInputId} className="text-xs font-bold uppercase tracking-wider text-[#52645D]">
                  Display order
                </label>
                <input
                  id={orderInputId}
                  type="number"
                  value={form.displayOrder}
                  onChange={(e) => setForm({ ...form, displayOrder: e.target.value })}
                  className="w-full rounded-xl border border-[#163D32]/15 bg-white px-4 py-3 text-sm text-[#1A1A1A] outline-none transition focus:border-[#C5A46D] focus:ring-2 focus:ring-[#C5A46D]/20"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label htmlFor={captionInputId} className="text-xs font-bold uppercase tracking-wider text-[#52645D]">
                  Caption
                </label>
                <textarea
                  id={captionInputId}
                  value={form.caption}
                  onChange={(e) => setForm({ ...form, caption: e.target.value })}
                  className="min-h-24 w-full rounded-xl border border-[#163D32]/15 bg-white px-4 py-3 text-sm text-[#1A1A1A] outline-none transition focus:border-[#C5A46D] focus:ring-2 focus:ring-[#C5A46D]/20"
                  placeholder="A calm evening overlooking the lakeside gardens."
                />
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#E6DFD1] bg-[#F5F0E6]/60 p-4 text-sm font-semibold text-[#163D32]">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="h-4 w-4 accent-[#163D32]"
                />
                Visible to guests
              </label>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#E6DFD1] bg-[#F5F0E6]/60 p-4 text-sm font-semibold text-[#163D32]">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                  className="h-4 w-4 accent-[#163D32]"
                />
                Featured image
              </label>
            </div>

            {feedback && (
              <div
                role={feedback.type === 'error' ? 'alert' : 'status'}
                className={`mt-5 rounded-xl border px-4 py-3 text-sm font-medium ${
                  feedback.type === 'error'
                    ? 'border-rose-200 bg-rose-50 text-rose-800'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                }`}
              >
                {feedback.text}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-[#163D32] px-5 py-3 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#0F2D24] disabled:opacity-50"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Publish image'}
              </button>
              {!editingId && (
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-full border border-[#163D32]/15 bg-white px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#52645D] transition-colors hover:bg-[#F5F0E6] hover:text-[#163D32]"
                >
                  Clear
                </button>
              )}
            </div>
          </form>

          <div className="rounded-[2rem] border border-[#E6DFD1] bg-white p-5 shadow-sm md:p-7 xl:sticky xl:top-6 xl:self-start">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#52645D]">Live Preview</p>
            <div className="mt-4 overflow-hidden rounded-2xl bg-[#163D32]">
              {isRenderableImageSrc(form.imageUrl) ? (
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  <Image
                    src={form.imageUrl.trim()}
                    alt={form.title || 'Preview'}
                    fill
                    sizes="(max-width: 1280px) 100vw, 480px"
                    unoptimized={!isOptimizableImageSrc(form.imageUrl)}
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center text-[#F5F0E6]/35">
                  <ImagePlus className="h-12 w-12" aria-hidden="true" />
                </div>
              )}
              <div className="p-4 text-white">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#C5A46D]">{form.category}</p>
                <h3 className="mt-1 font-display text-xl font-semibold">{form.title || 'Gallery image'}</h3>
                <p className="mt-2 text-sm text-[#F5F0E6]/80">
                  {form.caption || 'Your gallery caption will appear here.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-8 rounded-[2rem] border border-[#E6DFD1] bg-white p-5 shadow-sm md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7A5A27]">Published Gallery</p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-[#163D32]">Gallery Images</h2>
            </div>
            <div className="w-full max-w-sm">
              <label htmlFor={searchInputId} className="sr-only">
                Search gallery images
              </label>
              <input
                id={searchInputId}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-xl border border-[#163D32]/15 bg-[#F5F0E6]/40 px-4 py-3 text-sm text-[#1A1A1A] outline-none transition focus:border-[#C5A46D] focus:bg-white focus:ring-2 focus:ring-[#C5A46D]/20"
                placeholder="Search gallery…"
              />
            </div>
          </div>

          {loading ? (
            <p className="mt-6 text-sm text-[#52645D]">Loading gallery…</p>
          ) : filtered.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-[#E6DFD1] bg-[#F5F0E6]/60 p-6 text-sm text-[#52645D]">
              No gallery images yet.
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((item) => (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-2xl border border-[#E6DFD1] bg-[#F5F0E6]/55"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-[#163D32]/10">
                    {isRenderableImageSrc(item.image_url) ? (
                      <Image
                        src={item.image_url.trim()}
                        alt={item.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        unoptimized={!isOptimizableImageSrc(item.image_url)}
                        className="object-cover"
                      />
                    ) : null}
                    {item.is_featured && (
                      <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#C5A46D] px-3 py-1 text-[10px] font-bold uppercase text-[#0F2D24]">
                        <Star className="h-3 w-3" aria-hidden="true" /> Featured
                      </span>
                    )}
                    {!item.is_active && (
                      <span className="absolute right-3 top-3 rounded-full bg-[#163D32] px-3 py-1 text-[10px] font-bold uppercase text-white">
                        Hidden
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7A5A27]">
                      {item.category}
                    </p>
                    <h3 className="mt-1 font-semibold text-[#163D32]">{item.title}</h3>
                    {item.caption && (
                      <p className="mt-1 line-clamp-2 text-sm text-[#52645D]">{item.caption}</p>
                    )}
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => edit(item)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#E6DFD1] bg-white px-3 py-2 text-xs font-bold text-[#163D32] shadow-sm transition-colors hover:bg-[#163D32]/5"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteItem(item)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDeleteItem)}
        title="Delete Gallery Image?"
        description={
          pendingDeleteItem
            ? `Permanently delete "${pendingDeleteItem.title}" from the resort gallery?`
            : ''
        }
        confirmLabel="Delete Image"
        tone="danger"
        busy={deleting}
        onConfirm={() => void confirmRemove()}
        onCancel={() => {
          if (!deleting) setPendingDeleteItem(null);
        }}
      />
    </div>
  );
}
