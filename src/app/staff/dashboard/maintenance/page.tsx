'use client';

import React, { FormEvent, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Send,
  Wrench,
  CheckCircle2,
  Clock,
  User,
  BedDouble,
  PlayCircle,
  Check,
  Filter
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface MaintenanceItem {
  id: string;
  room_id: string | null;
  reported_by: string | null;
  assigned_to: string | null;
  title: string;
  description: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  resolved_at: string | null;
  rooms?: { name: string } | null;
  assigned_user?: { full_name: string } | null;
}

interface RoomOption {
  id: string;
  name: string;
}

interface StaffOption {
  id: string;
  full_name: string | null;
}

export default function MaintenancePage() {
  const [items, setItems] = useState<MaintenanceItem[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [roomId, setRoomId] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function loadData() {
    setLoading(true);
    try {
      // 1. Load requests
      const { data: requestData, error } = await supabase
        .from('maintenance_requests')
        .select(`
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
        `)
        .order('created_at', { ascending: false });

      if (error) {
        // Fallback without relations
        const { data: fallback } = await supabase
          .from('maintenance_requests')
          .select('*')
          .order('created_at', { ascending: false });
        setItems((fallback as any) ?? []);
      } else {
        setItems((requestData as any) ?? []);
      }

      // 2. Load rooms
      const { data: roomData } = await supabase
        .from('rooms')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      setRooms(roomData ?? []);

      // 3. Load staff
      const { data: staffData } = await supabase
        .from('users')
        .select('id, full_name')
        .order('full_name');
      setStaffList(staffData ?? []);
    } catch (err) {
      console.error('Failed to load maintenance data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();

    const channel = supabase
      .channel('maintenance_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'maintenance_requests' },
        () => {
          void loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
        status: 'open'
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setTitle('');
        setDescription('');
        setRoomId('');
        setPriority('normal');
        void loadData();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to report issue');
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(
    id: string,
    status: 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed'
  ) {
    const updatePayload: Record<string, any> = { status };
    if (status === 'resolved' || status === 'closed') {
      updatePayload.resolved_at = new Date().toISOString();
    } else {
      updatePayload.resolved_at = null;
    }

    await supabase.from('maintenance_requests').update(updatePayload).eq('id', id);
    void loadData();
  }

  async function updateAssignee(id: string, assignedTo: string) {
    const updatePayload: Record<string, any> = {
      assigned_to: assignedTo || null,
    };
    if (assignedTo) {
      // Auto-set status to assigned if currently open
      const currentItem = items.find((i) => i.id === id);
      if (currentItem?.status === 'open') {
        updatePayload.status = 'assigned';
      }
    }

    await supabase.from('maintenance_requests').update(updatePayload).eq('id', id);
    void loadData();
  }

  const filteredItems = items.filter((item) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'open') return item.status === 'open' || item.status === 'assigned';
    if (statusFilter === 'in_progress') return item.status === 'in_progress';
    if (statusFilter === 'resolved') return item.status === 'resolved' || item.status === 'closed';
    return true;
  });

  const getPriorityStyle = (p: string) => {
    switch (p) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'low':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'resolved':
      case 'closed':
        return 'bg-emerald-100 text-emerald-800';
      case 'in_progress':
        return 'bg-sky-100 text-sky-800';
      case 'assigned':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-amber-100 text-amber-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#0B252C] to-[#0E7480] text-white shadow-md">
          <Wrench className="h-6 w-6" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#159A9C]">
            Facilities & Engineering
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Maintenance
          </h1>
        </div>
      </div>

      {/* Report Issue Form */}
      <div className="rounded-3xl border border-gray-200/80 bg-white p-5 sm:p-6 shadow-xs">
        <h2 className="text-sm font-extrabold text-gray-900 mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-[#C9902F]" />
          Report Facility or Equipment Issue
        </h2>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleReport} className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-gray-600 mb-1">Issue Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. AC leaking, water pressure low, keycard lock issue"
              className="w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0E7480]/20"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">Location / Room</label>
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0E7480]/20"
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
            <label className="block text-[11px] font-bold text-gray-600 mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0E7480]/20"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-[11px] font-bold text-gray-600 mb-1">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide specific notes, room location details, or observations..."
              className="w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0E7480]/20"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0E7480] to-[#14919B] p-2.5 text-xs font-bold text-white shadow-md hover:brightness-110 transition-all disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {submitting ? 'Submitting...' : 'Dispatch Issue'}
            </button>
          </div>
        </form>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-3 overflow-x-auto text-xs">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
            statusFilter === 'all'
              ? 'bg-[#0E7480] text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          All Requests ({items.length})
        </button>
        <button
          onClick={() => setStatusFilter('open')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
            statusFilter === 'open'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Open / Dispatched ({items.filter((i) => i.status === 'open' || i.status === 'assigned').length})
        </button>
        <button
          onClick={() => setStatusFilter('in_progress')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
            statusFilter === 'in_progress'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          In Progress ({items.filter((i) => i.status === 'in_progress').length})
        </button>
        <button
          onClick={() => setStatusFilter('resolved')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
            statusFilter === 'resolved'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Resolved ({items.filter((i) => i.status === 'resolved' || i.status === 'closed').length})
        </button>
      </div>

      {/* Requests Grid */}
      {loading ? (
        <div className="py-12 text-center text-sm font-semibold text-gray-500">
          Loading maintenance requests...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
          <Wrench className="h-10 w-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-gray-800">No maintenance requests in this view</p>
          <p className="text-xs text-gray-400 mt-1">
            All resort facilities, guest rooms, and equipment are currently operating normally.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => {
            const roomName = item.rooms?.name || (item.room_id ? rooms.find((r) => r.id === item.room_id)?.name : 'General Grounds');
            const assignedStaff = item.assigned_user?.full_name || staffList.find((s) => s.id === item.assigned_to)?.full_name;

            return (
              <article
                key={item.id}
                className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-extrabold text-gray-900 text-base leading-snug">{item.title}</h3>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shrink-0 ${getPriorityStyle(
                        item.priority
                      )}`}
                    >
                      {item.priority}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-gray-600 font-semibold">
                      <BedDouble className="h-3.5 w-3.5 text-[#0E7480]" />
                      <span>{roomName}</span>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(
                        item.status
                      )}`}
                    >
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="mt-3 text-xs text-gray-500 bg-gray-50 p-2.5 rounded-xl border border-gray-100 min-h-[44px]">
                    {item.description || 'No detailed description provided.'}
                  </p>

                  {/* Staff Assignment */}
                  <div className="mt-4 flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <select
                      value={item.assigned_to || ''}
                      onChange={(e) => updateAssignee(item.id, e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-gray-50/60 px-2.5 py-1.5 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0E7480]"
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
                <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <div className="text-[10px] text-gray-400 font-medium">
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {item.status !== 'in_progress' && item.status !== 'resolved' && item.status !== 'closed' && (
                      <button
                        onClick={() => updateStatus(item.id, 'in_progress')}
                        className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700 hover:bg-sky-100 transition-colors"
                      >
                        <PlayCircle className="h-3.5 w-3.5" /> In Progress
                      </button>
                    )}

                    {item.status !== 'resolved' && item.status !== 'closed' && (
                      <button
                        onClick={() => updateStatus(item.id, 'resolved')}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 shadow-xs transition-colors"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
                      </button>
                    )}

                    {(item.status === 'resolved' || item.status === 'closed') && (
                      <button
                        onClick={() => updateStatus(item.id, 'open')}
                        className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-600 hover:bg-gray-200 transition-colors"
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
