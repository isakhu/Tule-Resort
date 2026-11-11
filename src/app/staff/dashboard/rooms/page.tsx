'use client';

import { useCallback, useEffect, useState } from 'react';
import { BedDouble, Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import supabase from '@/lib/supabaseClient';
import RoomEditor, { ManagerRoom } from '@/components/manager/RoomEditor';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export default function ManagerRoomsPage() {
  const [rooms, setRooms] = useState<ManagerRoom[]>([]);
  const [editing, setEditing] = useState<ManagerRoom | null>(null);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ManagerRoom | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setError('');
    const { data, error: fetchError } = await supabase
      .from('rooms')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (fetchError) setError(fetchError.message);
    else setRooms((data ?? []) as ManagerRoom[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  async function toggle(room: ManagerRoom) {
    if (!room.id) return;
    const { error: updateError } = await supabase
      .from('rooms')
      .update({ is_active: !room.is_active, updated_at: new Date().toISOString() })
      .eq('id', room.id);
    if (updateError) setError(updateError.message);
    else await load();
  }

  async function confirmRemove() {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    const { error: delError } = await supabase.from('rooms').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (delError) setError(delError.message);
    else await load();
  }

  const close = () => {
    setAdding(false);
    setEditing(null);
  };
  const saved = async () => {
    close();
    await load();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#163D32]/15 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#163D32] text-[#C5A46D] shadow-xs">
            <BedDouble className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#163D32]">Rooms CMS</h1>
            <p className="text-xs font-bold uppercase tracking-wider text-[#52645D]">
              Accommodation Rates & Availability
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
          <Plus className="h-4 w-4 text-[#C5A46D]" /> Add room
        </button>
      </div>

      {adding && <RoomEditor onSaved={saved} onCancel={close} />}
      {editing && <RoomEditor initial={editing} onSaved={saved} onCancel={close} />}

      {error && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((idx) => (
            <div key={idx} className="h-80 rounded-2xl border border-[#163D32]/10 bg-white animate-pulse" />
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#163D32]/25 bg-white/70 p-12 text-center">
          <p className="font-display text-3xl text-[#163D32]">No rooms yet</p>
          <p className="mt-2 text-sm text-[#52645D]">Add your first room using the button above.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <article
              key={room.id}
              className="overflow-hidden rounded-3xl border border-[#163D32]/15 bg-white shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="aspect-[16/10] bg-[#163D32]/10">
                  {room.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={room.image_url} alt={room.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[#163D32]/30">
                      <BedDouble className="h-12 w-12" />
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-wider text-[#7A5A27]">
                        {room.category || room.type}
                      </p>
                      <h2 className="mt-1 font-display text-2xl font-medium text-[#163D32]">{room.name}</h2>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        room.is_active ? 'bg-emerald-100 text-emerald-900' : 'bg-[#EDE8DC] text-[#52645D]'
                      }`}
                    >
                      {room.is_active ? 'Published' : 'Hidden'}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-[#26312D]/75">{room.description || 'No description yet.'}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-lg font-black text-[#163D32]">
                      {Number(room.price_per_night || 0).toLocaleString()}{' '}
                      <span className="text-xs font-semibold text-[#52645D]">ETB / night</span>
                    </p>
                    <span className={`text-xs font-bold ${room.is_available ? 'text-emerald-800' : 'text-red-700'}`}>
                      {room.is_available ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-[#163D32]/10 px-5 py-4 bg-[#F5F0E6]/40">
                <button
                  type="button"
                  onClick={() => void toggle(room)}
                  title={room.is_active ? 'Hide room' : 'Publish room'}
                  aria-label={room.is_active ? `Hide ${room.name}` : `Publish ${room.name}`}
                  className="rounded-xl border border-[#163D32]/20 bg-white p-2 text-[#163D32] hover:bg-[#EDE8DC] transition"
                >
                  {room.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdding(false);
                    setEditing(room);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#163D32] hover:bg-[#0F2D24] px-3 py-2 text-xs font-bold text-[#F5F0E6] transition"
                >
                  <Pencil className="h-3.5 w-3.5 text-[#C5A46D]" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(room)}
                  aria-label={`Delete ${room.name}`}
                  title={`Delete ${room.name}`}
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
        title="Delete Room"
        description={`Are you sure you want to delete "${deleteTarget?.name ?? 'this room'}"? This action cannot be undone.`}
        confirmLabel="Delete Room"
        tone="danger"
        busy={deleting}
        onConfirm={confirmRemove}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
