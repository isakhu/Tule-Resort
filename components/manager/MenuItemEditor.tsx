'use client';

import Image from 'next/image';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ImagePlus, Pencil, Save, Trash2, X } from 'lucide-react';
import supabase from '@/lib/supabaseClient';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { isOptimizableImageSrc, isRenderableImageSrc } from '@/lib/imageSrc';

type MenuItem = {
  id: string;
  name: string;
  amharic_name: string | null;
  description: string | null;
  category: string | null;
  price: number;
  image_url: string | null;
  created_at: string;
};

type FormState = {
  name: string;
  amharicName: string;
  description: string;
  category: string;
  price: string;
  imageUrl: string;
};

type FeedbackState = {
  type: 'success' | 'error';
  text: string;
} | null;

const emptyForm: FormState = { name: '', amharicName: '', description: '', category: 'Main Course', price: '', imageUrl: '' };
const categories = ['Breakfast', 'Starters', 'Main Course', 'Pizza & Pasta', 'Burgers', 'Dessert', 'Beverages', 'Coffee', 'Kids', 'Other'];

function CardPreview({ form }: { form: FormState }) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-[#163D32]/15 bg-[#163D32] shadow-lg">
      <div className="relative h-72 overflow-hidden bg-[#0F2D24]">
        {isRenderableImageSrc(form.imageUrl) ? (
          <Image
            src={form.imageUrl.trim()}
            alt="Live preview"
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            unoptimized={!isOptimizableImageSrc(form.imageUrl)}
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[#F5F0E6]/30">
            <ImagePlus className="h-12 w-12" aria-hidden="true" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B221B]/85 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#C5A46D]">
            {form.amharicName || 'የምግብ ስም'}
          </p>
          <h3 className="mt-1 font-display text-2xl font-semibold tracking-tight text-white">
            {form.name || 'Food Item'}
          </h3>
        </div>
        <div className="absolute right-4 top-4 rounded-2xl bg-[#F5F0E6] px-3 py-2 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#52645D]">Price</p>
          <p className="text-lg font-extrabold text-[#163D32]">
            {form.price ? Number(form.price).toLocaleString() : '0'} <span className="text-[10px]">ETB</span>
          </p>
        </div>
      </div>
      <div className="p-5">
        <p className="line-clamp-3 text-sm leading-relaxed text-[#F5F0E6]/80">
          {form.description || 'Your food description will appear here.'}
        </p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#F5F0E6]/85">
            {form.category}
          </span>
          <span className="rounded-full bg-[#C5A46D] px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-[#0F2D24]">
            Add to order
          </span>
        </div>
      </div>
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
  const [deleting, setDeleting] = useState(false);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<MenuItem | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [query, setQuery] = useState('');

  const previewObjectUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const imageInputId = useId();
  const nameInputId = useId();
  const amharicInputId = useId();
  const priceInputId = useId();
  const categorySelectId = useId();
  const descInputId = useId();
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
      .from('menu_items')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      setFeedback({ type: 'error', text: error.message });
    } else {
      setItems((data ?? []) as MenuItem[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('created_at', { ascending: false });
      if (!active) return;
      if (error) {
        setFeedback({ type: 'error', text: error.message });
      } else {
        setItems((data ?? []) as MenuItem[]);
      }
      setLoading(false);
    })();

    return () => {
      active = false;
      revokePreviewUrl();
    };
  }, []);

  const filtered = useMemo(
    () =>
      items.filter((item) =>
        `${item.name} ${item.amharic_name ?? ''} ${item.category ?? ''}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [items, query]
  );

  function edit(item: MenuItem) {
    revokePreviewUrl();
    setEditingId(item.id);
    setForm({
      name: item.name,
      amharicName: item.amharic_name ?? '',
      description: item.description ?? '',
      category: item.category ?? 'Other',
      price: String(item.price ?? ''),
      imageUrl: item.image_url ?? '',
    });
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setFeedback(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

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

  async function uploadImage(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `menu/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from('resort-media')
      .upload(path, file, { upsert: false, contentType: file.type, cacheControl: '3600' });
    if (error) throw error;
    const { data } = supabase.storage.from('resort-media').getPublicUrl(path);
    return data.publicUrl;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const parsedPrice = Number(form.price);
      if (!form.name.trim() || !form.price || !Number.isFinite(parsedPrice) || parsedPrice < 0) {
        throw new Error('English name and a valid price are required.');
      }
      let imageUrl = form.imageUrl;
      if (imageFile) imageUrl = await uploadImage(imageFile);
      const payload = {
        name: form.name.trim(),
        amharic_name: form.amharicName.trim() || null,
        description: form.description.trim() || null,
        category: form.category,
        price: parsedPrice,
        image_url: imageUrl || null,
      };
      const result = editingId
        ? await supabase.from('menu_items').update(payload).eq('id', editingId).select().single()
        : await supabase.from('menu_items').insert(payload).select().single();
      if (result.error) throw result.error;
      const savedMessage = editingId ? 'Food item updated and published.' : 'Food item added and published.';
      reset();
      setFeedback({ type: 'success', text: savedMessage });
      await loadItems();
    } catch (error: unknown) {
      setFeedback({
        type: 'error',
        text: error instanceof Error ? error.message : 'Could not save menu item.',
      });
    } finally {
      setSaving(false);
    }
  }

  async function confirmRemove() {
    if (!pendingDeleteItem) return;
    setDeleting(true);
    const target = pendingDeleteItem;
    const { error } = await supabase.from('menu_items').delete().eq('id', target.id);
    setDeleting(false);
    setPendingDeleteItem(null);

    if (error) {
      setFeedback({ type: 'error', text: error.message });
      return;
    }

    if (editingId === target.id) {
      reset();
    }
    setFeedback({ type: 'success', text: `"${target.name}" removed from menu.` });
    await loadItems();
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 xl:grid-cols-[1fr_390px]">
        <form onSubmit={save} className="rounded-[2rem] border border-[#E6DFD1] bg-white p-5 shadow-sm md:p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7A5A27]">Reusable Card CMS</p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-[#163D32]">
                {editingId ? 'Edit food item' : 'Add food item'}
              </h2>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={reset}
                aria-label="Cancel editing menu item"
                className="rounded-full border border-[#E6DFD1] p-2 text-[#52645D] transition-colors hover:bg-[#F5F0E6] hover:text-[#163D32]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor={imageInputId} className="field-label !text-[#52645D]">
                  Food image
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
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  revokePreviewUrl();
                  setImageFile(file);
                  if (file) {
                    const objectUrl = URL.createObjectURL(file);
                    previewObjectUrlRef.current = objectUrl;
                    setForm((f) => ({ ...f, imageUrl: objectUrl }));
                  }
                }}
                className="block w-full rounded-2xl border border-dashed border-[#163D32]/20 bg-[#F5F0E6]/60 p-4 text-xs text-[#52645D] file:mr-4 file:rounded-full file:border-0 file:bg-[#163D32] file:px-4 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-[#0F2D24]"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor={nameInputId} className="field-label !text-[#52645D]">
                English name *
              </label>
              <input
                id={nameInputId}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl border border-[#163D32]/15 bg-white px-4 py-3 text-sm text-[#1A1A1A] outline-none transition focus:border-[#C5A46D] focus:ring-2 focus:ring-[#C5A46D]/20"
                placeholder="Special Shekla Tibs"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor={amharicInputId} className="field-label !text-[#52645D]">
                Amharic name
              </label>
              <input
                id={amharicInputId}
                value={form.amharicName}
                onChange={(e) => setForm({ ...form, amharicName: e.target.value })}
                className="w-full rounded-xl border border-[#163D32]/15 bg-white px-4 py-3 text-sm text-[#1A1A1A] outline-none transition focus:border-[#C5A46D] focus:ring-2 focus:ring-[#C5A46D]/20"
                placeholder="ልዩ ሽክላ ጥብስ"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor={priceInputId} className="field-label !text-[#52645D]">
                Price (ETB) *
              </label>
              <input
                id={priceInputId}
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full rounded-xl border border-[#163D32]/15 bg-white px-4 py-3 text-sm text-[#1A1A1A] outline-none transition focus:border-[#C5A46D] focus:ring-2 focus:ring-[#C5A46D]/20"
                placeholder="850"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor={categorySelectId} className="field-label !text-[#52645D]">
                Category
              </label>
              <select
                id={categorySelectId}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-xl border border-[#163D32]/15 bg-white px-4 py-3 text-sm text-[#1A1A1A] outline-none transition focus:border-[#C5A46D] focus:ring-2 focus:ring-[#C5A46D]/20"
              >
                {categories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label htmlFor={descInputId} className="field-label !text-[#52645D]">
                Description
              </label>
              <textarea
                id={descInputId}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="min-h-28 w-full resize-y rounded-xl border border-[#163D32]/15 bg-white px-4 py-3 text-sm text-[#1A1A1A] outline-none transition focus:border-[#C5A46D] focus:ring-2 focus:ring-[#C5A46D]/20"
                placeholder="Tender beef served with traditional spice blends and fresh injera..."
              />
            </div>
          </div>

          {feedback && (
            <div
              role={feedback.type === 'error' ? 'alert' : 'status'}
              className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-medium ${
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
              {saving ? 'Publishing…' : editingId ? 'Save changes' : 'Save & publish'}
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

        <div className="xl:sticky xl:top-6 xl:self-start">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#52645D]">
            Live Customer Preview
          </p>
          <CardPreview form={form} />
        </div>
      </div>

      <section className="rounded-[2rem] border border-[#E6DFD1] bg-white p-5 shadow-sm md:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7A5A27]">Published Menu</p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-[#163D32]">Food Items</h2>
          </div>
          <div className="w-full max-w-sm">
            <label htmlFor={searchInputId} className="sr-only">
              Search menu items
            </label>
            <input
              id={searchInputId}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-[#163D32]/15 bg-[#F5F0E6]/40 px-4 py-3 text-sm text-[#1A1A1A] outline-none transition focus:border-[#C5A46D] focus:bg-white focus:ring-2 focus:ring-[#C5A46D]/20"
              placeholder="Search food…"
            />
          </div>
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-[#52645D]">Loading menu…</p>
        ) : filtered.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-[#E6DFD1] bg-[#F5F0E6]/60 p-6 text-sm text-[#52645D]">
            No menu items found. Add your first item above.
          </div>
        ) : (
          <div className="mt-6 grid gap-3">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#E6DFD1] bg-[#F5F0E6]/45 p-3 sm:flex-nowrap sm:gap-4"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[#E6DFD1] bg-white">
                  {isRenderableImageSrc(item.image_url) ? (
                    <Image
                      src={item.image_url!.trim()}
                      alt={item.name}
                      fill
                      sizes="64px"
                      unoptimized={!isOptimizableImageSrc(item.image_url)}
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[#52645D]/40">
                      <ImagePlus className="h-5 w-5" aria-hidden="true" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-[#163D32]">{item.name}</p>
                  <p className="text-xs font-medium text-[#7A5A27]">
                    {item.amharic_name || '—'} • {item.category || 'Other'}
                  </p>
                </div>
                <p className="font-extrabold text-[#163D32]">
                  {Number(item.price).toLocaleString()} <span className="text-xs font-semibold">ETB</span>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => edit(item)}
                    className="rounded-xl border border-[#E6DFD1] bg-white p-2 text-[#163D32] transition-colors hover:bg-[#163D32]/5"
                    aria-label={`Edit ${item.name}`}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDeleteItem(item)}
                    className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-700 transition-colors hover:bg-rose-100"
                    aria-label={`Delete ${item.name}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(pendingDeleteItem)}
        title="Delete Menu Item?"
        description={
          pendingDeleteItem
            ? `Remove "${pendingDeleteItem.name}" from the resort menu? Existing historical orders remain intact.`
            : ''
        }
        confirmLabel="Delete Item"
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
