'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, Waves } from 'lucide-react';
import supabase from '@/lib/supabaseClient';
import ServiceEditor, { ResortService } from '@/components/manager/ServiceEditor';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export default function ManagerServicesPage() {
  const [services, setServices] = useState<ResortService[]>([]);
  const [editing, setEditing] = useState<ResortService | null>(null);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ResortService | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setError('');
    const { data, error: fetchError } = await supabase
      .from('resort_services')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (fetchError) setError(fetchError.message);
    else setServices((data ?? []) as ResortService[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  async function confirmRemove() {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    const { error: delError } = await supabase.from('resort_services').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (delError) setError(delError.message);
    else await load();
  }

  async function toggle(service: ResortService) {
    if (!service.id) return;
    const { error: updateError } = await supabase
      .from('resort_services')
      .update({ is_active: !service.is_active })
      .eq('id', service.id);
    if (updateError) setError(updateError.message);
    else await load();
  }

  const closeEditor = () => {
    setAdding(false);
    setEditing(null);
  };
  const saved = async () => {
    closeEditor();
    await load();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#163D32]/15 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#163D32] text-[#C5A46D] shadow-xs">
            <Waves className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#163D32]">Resort Services CMS</h1>
            <p className="text-xs font-bold uppercase tracking-wider text-[#52645D]">
              Wellness, Spa, Pool & Guest Experiences
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setAdding(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-[#163D32] hover:bg-[#0F2D24] px-4 py-2.5 text-xs font-bold text-[#F5F0E6] shadow-sm transition self-start sm:self-auto"
        >
          <Plus className="h-4 w-4 text-[#C5A46D]" /> Add service
        </button>
      </div>

      {adding && <ServiceEditor onSaved={saved} onCancel={closeEditor} />}
      {editing && <ServiceEditor initial={editing} onSaved={saved} onCancel={closeEditor} />}

      {error && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((idx) => (
            <div key={idx} className="h-72 rounded-3xl border border-[#163D32]/10 bg-white animate-pulse" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#163D32]/25 bg-white/70 p-12 text-center">
          <p className="font-display text-3xl text-[#163D32]">No services yet</p>
          <p className="mt-2 text-sm text-[#52645D]">Add your first resort service using the button above.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <article
              key={service.id}
              className="overflow-hidden rounded-3xl border border-[#163D32]/15 bg-white shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="aspect-[16/9] bg-[#163D32]/10">
                  {service.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={service.image_url} alt={service.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[#163D32]/30">
                      <Waves className="h-12 w-12" />
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-wider text-[#7A5A27]">
                        {service.category || service.service_type}
                      </p>
                      <h2 className="mt-1 font-display text-2xl font-medium text-[#163D32]">{service.name}</h2>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        service.is_active ? 'bg-emerald-100 text-emerald-900' : 'bg-[#EDE8DC] text-[#52645D]'
                      }`}
                    >
                      {service.is_active ? 'Active' : 'Hidden'}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[#26312D]/75">
                    {service.description || 'No description yet.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-[#163D32]/10 px-5 py-4 bg-[#F5F0E6]/40">
                <button
                  type="button"
                  onClick={() => void toggle(service)}
                  title={service.is_active ? 'Hide service' : 'Show service'}
                  aria-label={service.is_active ? `Hide ${service.name}` : `Show ${service.name}`}
                  className="rounded-xl border border-[#163D32]/20 bg-white p-2 text-[#163D32] hover:bg-[#EDE8DC] transition"
                >
                  {service.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdding(false);
                    setEditing(service);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#163D32] hover:bg-[#0F2D24] px-3 py-2 text-xs font-bold text-[#F5F0E6] transition"
                >
                  <Pencil className="h-3.5 w-3.5 text-[#C5A46D]" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(service)}
                  title={`Delete ${service.name}`}
                  aria-label={`Delete ${service.name}`}
                  className="rounded-xl border border-red-200 bg-white p-2 text-red-700 hover:bg-red-50 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Service"
        description={`Are you sure you want to delete "${deleteTarget?.name ?? 'this service'}"? This action cannot be undone.`}
        confirmLabel="Delete Service"
        tone="danger"
        busy={deleting}
        onConfirm={confirmRemove}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
