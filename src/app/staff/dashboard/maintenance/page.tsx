'use client';

import React, { FormEvent, useCallback, useEffect, useId, useState } from 'react';
import {
  AlertTriangle,
  BedDouble,
  CheckCircle2,
  PlayCircle,
  Send,
  User,
  Wrench,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

type PriorityLevel = 'low' | 'normal' | 'high' | 'urgent';
type MaintenanceStatus = 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed';

interface MaintenanceItem {
  id: string;
  room_id: string | null;
  reported_by: string | null;
  assigned_to: string | null;
  title: string;
  description: string | null;
  priority: PriorityLevel;
  status: MaintenanceStatus;
  created_at: string;
  resolved_at: string | null;
  roomName?: string | null;
  assignedStaffName?: string | null;
}

interface RawMaintenanceRow {
  id: string;
  room_id: string | null;
  reported_by: string | null;
  assigned_to: string | null;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  rooms?: { name: string } | { name: string }[] | null;
  assigned_user?: { full_name: string | null } | { full_name: string | null }[] | null;
}

interface RoomOption {
  id: string;
  name: string;
}

interface StaffOption {
  id: string;
  full_name: string | null;
}

function pickJoinedField(
  relation: { name?: string; full_name?: string | null } | { name?: string; full_name?: string | null }[] | null | undefined,
  key: 'name' | 'full_name'
): string | null {
  if (!relation) return null;
  const entry = Array.isArray(relation) ? relation[0] : relation;
  return entry?.[key] ?? null;
}

function normalizePriority(value: string): PriorityLevel {
  if (value === 'low' || value === 'high' || value === 'urgent') return value;
  return 'normal';
}

function normalizeStatus(value: string): MaintenanceStatus {
  if (
    value === 'assigned' ||
    value === 'in_progress' ||
    value === 'resolved' ||
    value === 'closed'
  ) {
    return value;
  }
  return 'open';
}

function mapMaintenanceRow(row: RawMaintenanceRow): MaintenanceItem {
  return {
    id: row.id,
    room_id: row.room_id,
    reported_by: row.reported_by,
    assigned_to: row.assigned_to,
    title: row.title,
    description: row.description,
    priority: normalizePriority(row.priority),
    status: normalizeStatus(row.status),
    created_at: row.created_at,
    resolved_at: row.resolved_at,
    roomName: pickJoinedField(row.rooms, 'name'),
    assignedStaffName: pickJoinedField(row.assigned_user, 'full_name'),
  };
}

async function fetchMaintenancePayload(): Promise<{
  items: MaintenanceItem[];
  rooms: RoomOption[];
  staff: StaffOption[];
  error: string | null;
}> {
  let nextItems: MaintenanceItem[] = [];
  let loadError: string | null = null;

  const { data: requestData, error } = await supabase
    .from('maintenance_requests')
    .select(
      `
      id,
      room_id,
      reported_by,
      assigned_to,
      title,
      description,
      priority,
      status,
      created_at,
      resolved_at,
      rooms(name),
      assigned_user:assigned_to(full_name)
    `
    )
    .order('created_at', { ascending: false });

  if (error) {
    const { data: fallback, error: fallbackErr } = await supabase
      .from('maintenance_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (fallbackErr) {
      loadError = fallbackErr.message;
    } else {
      nextItems = ((fallback ?? []) as RawMaintenanceRow[]).map(mapMaintenanceRow);
    }
  } else {
    nextItems = ((requestData ?? []) as RawMaintenanceRow[]).map(mapMaintenanceRow);
  }

  const [{ data: roomData }, { data: staffData }] = await Promise.all([
    supabase.from('rooms').select('id, name').eq('is_active', true).order('name'),
    supabase.from('users').select('id, full_name').order('full_name'),
  ]);

  return {
    items: nextItems,
    rooms: (roomData ?? []) as RoomOption[],
    staff: (staffData ?? []) as StaffOption[],
    error: loadError,
  };
}

export default function MaintenancePage() {
  const [items, setItems] = useState<MaintenanceItem[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [actionError, setActionError] = useState('');
  const [busyItemId, setBusyItemId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [roomId, setRoomId] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('normal');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const issueTitleId = useId();
  const roomFieldId = useId();
  const priorityFieldId = useId();
  const descriptionFieldId = useId();

  const refreshData = useCallback(async () => {
    try {
      const payload = await fetchMaintenancePayload();
      setItems(payload.items);
      setRooms(payload.rooms);
      setStaffList(payload.staff);
      if (payload.error) {
        setActionError(`Unable to refresh requests: ${payload.error}`);
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to load maintenance data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const payload = await fetchMaintenancePayload();
        if (!active) return;
        setItems(payload.items);
        setRooms(payload.rooms);
        setStaffList(payload.staff);
        if (payload.error) {
          setActionError(`Unable to load requests: ${payload.error}`);
        }
      } catch (err: unknown) {
        if (!active) return;
        setActionError(err instanceof Error ? err.message : 'Failed to load maintenance data.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    const channel = supabase
      .channel('maintenance_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'maintenance_requests' },
        () => {
          void refreshData();
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [refreshData]);

  async function handleReport(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    setErrorMsg('');

    try {
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData?.user?.id || null;

      const { error } = await supabase.from('maintenance_requests').insert({
        title: title.trim(),
        description: description.trim() || null,
        room_id: roomId || null,
        priority,
        reported_by: currentUserId,
        status: 'open',
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setTitle('');
        setDescription('');
        setRoomId('');
        setPriority('normal');
        await refreshData();
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to report issue');
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(id: string, status: MaintenanceStatus) {
    setActionError('');
    setBusyItemId(id);

    const resolvedAt =
      status === 'resolved' || status === 'closed' ? new Date().toISOString() : null;

    const { error } = await supabase
      .from('maintenance_requests')
      .update({ status, resolved_at: resolvedAt })
      .eq('id', id);

    setBusyItemId(null);

    if (error) {
      setActionError(`Could not update request status: ${error.message}`);
      return;
    }

    await refreshData();
  }

  async function updateAssignee(id: string, assignedTo: string) {
    setActionError('');
    setBusyItemId(id);

    const updatePayload: { assigned_to: string | null; status?: MaintenanceStatus } = {
      assigned_to: assignedTo || null,
    };

    if (assignedTo) {
      const currentItem = items.find((i) => i.id === id);
      if (currentItem?.status === 'open') {
        updatePayload.status = 'assigned';
      }
    }

    const { error } = await supabase
      .from('maintenance_requests')
      .update(updatePayload)
      .eq('id', id);

    setBusyItemId(null);

    if (error) {
      setActionError(`Could not assign technician: ${error.message}`);
      return;
    }

    await refreshData();
  }

  const filteredItems = items.filter((item) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'open') return item.status === 'open' || item.status === 'assigned';
    if (statusFilter === 'in_progress') return item.status === 'in_progress';
    if (statusFilter === 'resolved') return item.status === 'resolved' || item.status === 'closed';
    return true;
  });

  const getPriorityStyle = (p: PriorityLevel) => {
    switch (p) {
      case 'urgent':
        return 'bg-red-50 text-red-800 border-red-200';
      case 'high':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'low':
        return 'bg-[#F5F0E6] text-[#52645D] border-[#E6DFD1]';
      default:
        return 'bg-[#163D32]/10 text-[#163D32] border-[#163D32]/20';
    }
  };

  const getStatusBadge = (st: MaintenanceStatus) => {
    switch (st) {
      case 'resolved':
      case 'closed':
        return 'bg-emerald-100 text-emerald-900 border border-emerald-200';
      case 'in_progress':
        return 'bg-sky-100 text-sky-900 border border-sky-200';
      case 'assigned':
        return 'bg-purple-100 text-purple-900 border border-purple-200';
      default:
        return 'bg-amber-100 text-amber-900 border border-amber-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#163D32] to-[#0F2D24] text-[#C5A46D] border border-[#C5A46D]/25 shadow-sm">
          <Wrench className="h-6 w-6" aria-hidden="true" />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.22em] text-[#7A5A27]">
            Facilities &amp; Engineering
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#163D32] tracking-tight">
            Maintenance
          </h1>
        </div>
      </div>

      {/* Report Issue Form */}
      <div className="rounded-3xl border border-[#E6DFD1] bg-white p-5 sm:p-6 shadow-xs">
        <h2 className="font-display text-base font-semibold text-[#163D32] mb-3.5 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-[#7A5A27]" aria-hidden="true" />
          Report Facility or Equipment Issue
        </h2>

        {errorMsg && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold"
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleReport} className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label
              htmlFor={issueTitleId}
              className="block text-xs font-bold text-[#163D32] mb-1"
            >
              Issue Title *
            </label>
            <input
              id={issueTitleId}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. AC leaking, water pressure low, keycard lock issue"
              className="w-full rounded-xl border border-[#D5CCB9] bg-[#F5F0E6]/40 p-2.5 text-xs text-[#163D32] focus:bg-white focus:border-[#163D32] focus:outline-none focus:ring-2 focus:ring-[#C5A46D]/30"
            />
          </div>

          <div>
            <label
              htmlFor={roomFieldId}
              className="block text-xs font-bold text-[#163D32] mb-1"
            >
              Location / Room
            </label>
            <select
              id={roomFieldId}
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full rounded-xl border border-[#D5CCB9] bg-[#F5F0E6]/40 p-2.5 text-xs text-[#163D32] focus:bg-white focus:border-[#163D32] focus:outline-none focus:ring-2 focus:ring-[#C5A46D]/30"
            >
              <option value="">General Facility / Grounds</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor={priorityFieldId}
              className="block text-xs font-bold text-[#163D32] mb-1"
            >
              Priority
            </label>
            <select
              id={priorityFieldId}
              value={priority}
              onChange={(e) => setPriority(e.target.value as PriorityLevel)}
              className="w-full rounded-xl border border-[#D5CCB9] bg-[#F5F0E6]/40 p-2.5 text-xs text-[#163D32] focus:bg-white focus:border-[#163D32] focus:outline-none focus:ring-2 focus:ring-[#C5A46D]/30"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <label
              htmlFor={descriptionFieldId}
              className="block text-xs font-bold text-[#163D32] mb-1"
            >
              Description
            </label>
            <input
              id={descriptionFieldId}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide specific notes, room location details, or observations..."
              className="w-full rounded-xl border border-[#D5CCB9] bg-[#F5F0E6]/40 p-2.5 text-xs text-[#163D32] focus:bg-white focus:border-[#163D32] focus:outline-none focus:ring-2 focus:ring-[#C5A46D]/30"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#163D32] hover:bg-[#0F2D24] border border-[#C5A46D]/30 p-2.5 text-xs font-bold text-[#F5F0E6] shadow-xs transition-colors disabled:opacity-50"
            >
              <Send className="h-4 w-4 text-[#C5A46D]" aria-hidden="true" />
              {submitting ? 'Submitting...' : 'Dispatch Issue'}
            </button>
          </div>
        </form>
      </div>

      {actionError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {actionError}
          </span>
          <button
            type="button"
            onClick={() => setActionError('')}
            aria-label="Dismiss error"
            className="rounded-lg p-1 text-red-700 hover:bg-red-100"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E6DFD1] pb-3 overflow-x-auto no-scrollbar text-xs">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-colors ${
            statusFilter === 'all'
              ? 'bg-[#163D32] text-[#F5F0E6] border border-[#C5A46D]/30 shadow-xs'
              : 'text-[#52645D] hover:bg-[#EDE6D8]'
          }`}
        >
          All Requests ({items.length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('open')}
          className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-colors ${
            statusFilter === 'open'
              ? 'bg-amber-700 text-white shadow-xs'
              : 'text-[#52645D] hover:bg-[#EDE6D8]'
          }`}
        >
          Open / Dispatched ({items.filter((i) => i.status === 'open' || i.status === 'assigned').length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('in_progress')}
          className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-colors ${
            statusFilter === 'in_progress'
              ? 'bg-sky-700 text-white shadow-xs'
              : 'text-[#52645D] hover:bg-[#EDE6D8]'
          }`}
        >
          In Progress ({items.filter((i) => i.status === 'in_progress').length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('resolved')}
          className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-colors ${
            statusFilter === 'resolved'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-[#52645D] hover:bg-[#EDE6D8]'
          }`}
        >
          Resolved ({items.filter((i) => i.status === 'resolved' || i.status === 'closed').length})
        </button>
      </div>

      {/* Requests Grid */}
      {loading ? (
        <div className="py-12 text-center text-sm font-semibold text-[#52645D]">
          Loading maintenance requests...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#D5CCB9] bg-white p-12 text-center">
          <Wrench className="h-10 w-10 text-[#C5A46D] mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm font-bold text-[#163D32]">No maintenance requests in this view</p>
          <p className="text-xs text-[#52645D] mt-1">
            All resort facilities, guest rooms, and equipment are currently operating normally.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => {
            const roomName =
              item.roomName ||
              (item.room_id ? rooms.find((r) => r.id === item.room_id)?.name : null) ||
              'General Grounds';
            const isBusy = busyItemId === item.id;

            return (
              <article
                key={item.id}
                className="rounded-2xl border border-[#E6DFD1] bg-white p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-bold text-[#163D32] text-base leading-snug">
                      {item.title}
                    </h2>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0 ${getPriorityStyle(
                        item.priority
                      )}`}
                    >
                      {item.priority}
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-[#52645D] font-semibold">
                      <BedDouble className="h-3.5 w-3.5 text-[#7A5A27]" aria-hidden="true" />
                      <span>{roomName}</span>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(
                        item.status
                      )}`}
                    >
                      {item.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <p className="mt-3 text-xs text-[#163D32] bg-[#F5F0E6]/70 p-2.5 rounded-xl border border-[#E6DFD1] min-h-[44px]">
                    {item.description || 'No detailed description provided.'}
                  </p>

                  {/* Staff Assignment */}
                  <div className="mt-4 flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-[#7A5A27] shrink-0" aria-hidden="true" />
                    <select
                      aria-label={`Assign technician for ${item.title}`}
                      value={item.assigned_to || ''}
                      disabled={isBusy}
                      onChange={(e) => updateAssignee(item.id, e.target.value)}
                      className="w-full rounded-lg border border-[#D5CCB9] bg-[#F5F0E6]/50 px-2.5 py-1.5 text-xs font-medium text-[#163D32] focus:bg-white focus:border-[#163D32] focus:outline-none focus:ring-2 focus:ring-[#C5A46D]/30 disabled:opacity-60"
                    >
                      <option value="">Unassigned Technician</option>
                      {staffList.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.full_name || 'Staff Member'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Workflow Transitions */}
                <div className="mt-5 pt-3 border-t border-[#E6DFD1] flex items-center justify-between gap-2">
                  <div className="text-[11px] text-[#52645D] font-medium">
                    {new Date(item.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {item.status !== 'in_progress' &&
                      item.status !== 'resolved' &&
                      item.status !== 'closed' && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => updateStatus(item.id, 'in_progress')}
                          className="inline-flex items-center gap-1 rounded-lg bg-sky-50 border border-sky-200 px-2.5 py-1.5 text-[11px] font-bold text-sky-900 hover:bg-sky-100 transition-colors disabled:opacity-50"
                        >
                          <PlayCircle className="h-3.5 w-3.5" aria-hidden="true" /> In Progress
                        </button>
                      )}

                    {item.status !== 'resolved' && item.status !== 'closed' && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => updateStatus(item.id, 'resolved')}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#163D32] hover:bg-[#0F2D24] px-3 py-1.5 text-[11px] font-bold text-[#F5F0E6] shadow-xs transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#C5A46D]" aria-hidden="true" /> Resolve
                      </button>
                    )}

                    {(item.status === 'resolved' || item.status === 'closed') && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => updateStatus(item.id, 'open')}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#F5F0E6] border border-[#E6DFD1] px-2.5 py-1.5 text-[11px] font-bold text-[#163D32] hover:bg-[#EDE6D8] transition-colors disabled:opacity-50"
                      >
                        Reopen Issue
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
