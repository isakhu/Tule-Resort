'use client';

import React, { FormEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  AlertTriangle,
  BedDouble,
  CheckCircle2,
  PlayCircle,
  Plus,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

type PriorityLevel = 'low' | 'normal' | 'high' | 'urgent';
type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

interface HousekeepingTask {
  id: string;
  room_id: string;
  assigned_to: string | null;
  task_type: string;
  priority: PriorityLevel;
  status: TaskStatus;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
  roomName?: string | null;
  staffName?: string | null;
}

interface RawHousekeepingRow {
  id: string;
  room_id: string;
  assigned_to: string | null;
  task_type: string;
  priority: string;
  status: string;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
  rooms?: { name: string } | { name: string }[] | null;
  users?: { full_name: string | null } | { full_name: string | null }[] | null;
}

interface RoomOption {
  id: string;
  name: string;
}

interface StaffOption {
  id: string;
  full_name: string | null;
}

function pickJoinedString(
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

function normalizeStatus(value: string): TaskStatus {
  if (value === 'in_progress' || value === 'completed' || value === 'cancelled') return value;
  return 'pending';
}

function mapTaskRow(row: RawHousekeepingRow): HousekeepingTask {
  return {
    id: row.id,
    room_id: row.room_id,
    assigned_to: row.assigned_to,
    task_type: row.task_type,
    priority: normalizePriority(row.priority),
    status: normalizeStatus(row.status),
    notes: row.notes,
    created_at: row.created_at,
    completed_at: row.completed_at,
    roomName: pickJoinedString(row.rooms, 'name'),
    staffName: pickJoinedString(row.users, 'full_name'),
  };
}

async function fetchHousekeepingPayload(): Promise<{
  tasks: HousekeepingTask[];
  rooms: RoomOption[];
  staff: StaffOption[];
  error: string | null;
}> {
  let nextTasks: HousekeepingTask[] = [];
  let loadError: string | null = null;

  const { data: taskData, error: taskErr } = await supabase
    .from('housekeeping_tasks')
    .select(
      `
      id,
      room_id,
      assigned_to,
      task_type,
      priority,
      status,
      notes,
      created_at,
      completed_at,
      rooms(name),
      users:assigned_to(full_name)
    `
    )
    .order('created_at', { ascending: false });

  if (taskErr) {
    const { data: fallbackTasks, error: fallbackErr } = await supabase
      .from('housekeeping_tasks')
      .select('id, room_id, assigned_to, task_type, priority, status, notes, created_at, completed_at')
      .order('created_at', { ascending: false });

    if (fallbackErr) {
      loadError = fallbackErr.message;
    } else {
      nextTasks = ((fallbackTasks ?? []) as RawHousekeepingRow[]).map(mapTaskRow);
    }
  } else {
    nextTasks = ((taskData ?? []) as RawHousekeepingRow[]).map(mapTaskRow);
  }

  const [{ data: roomsData }, { data: staffData }] = await Promise.all([
    supabase.from('rooms').select('id, name').eq('is_active', true).order('name'),
    supabase.from('users').select('id, full_name').order('full_name'),
  ]);

  return {
    tasks: nextTasks,
    rooms: (roomsData ?? []) as RoomOption[],
    staff: (staffData ?? []) as StaffOption[],
    error: loadError,
  };
}

export default function HousekeepingPage() {
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [actionError, setActionError] = useState('');
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);

  // New task modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoomId, setNewRoomId] = useState('');
  const [newTaskType, setNewTaskType] = useState('daily_cleaning');
  const [newPriority, setNewPriority] = useState<PriorityLevel>('normal');
  const [newAssignedTo, setNewAssignedTo] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const modalTitleId = useId();
  const roomSelectId = useId();
  const taskTypeSelectId = useId();
  const prioritySelectId = useId();
  const staffSelectId = useId();
  const notesFieldId = useId();
  const roomSelectRef = useRef<HTMLSelectElement>(null);

  const refreshData = useCallback(async () => {
    try {
      const payload = await fetchHousekeepingPayload();
      setTasks(payload.tasks);
      setRooms(payload.rooms);
      setStaffList(payload.staff);
      if (payload.error) {
        setActionError(`Unable to refresh tasks: ${payload.error}`);
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to load housekeeping schedule.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const payload = await fetchHousekeepingPayload();
        if (!active) return;
        setTasks(payload.tasks);
        setRooms(payload.rooms);
        setStaffList(payload.staff);
        if (payload.error) {
          setActionError(`Unable to load tasks: ${payload.error}`);
        }
      } catch (err: unknown) {
        if (!active) return;
        setActionError(err instanceof Error ? err.message : 'Failed to load housekeeping data.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    const channel = supabase
      .channel('housekeeping_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'housekeeping_tasks' },
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

  useEffect(() => {
    if (!isModalOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      roomSelectRef.current?.focus();
    }, 20);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !creating) {
        setIsModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isModalOpen, creating]);

  async function updateTaskStatus(id: string, status: TaskStatus) {
    setActionError('');
    setBusyTaskId(id);

    const completedAt = status === 'completed' ? new Date().toISOString() : null;
    const { error } = await supabase
      .from('housekeeping_tasks')
      .update({ status, completed_at: completedAt })
      .eq('id', id);

    setBusyTaskId(null);

    if (error) {
      setActionError(`Could not update task status: ${error.message}`);
      return;
    }

    await refreshData();
  }

  async function updateTaskStaff(id: string, assignedTo: string) {
    setActionError('');
    setBusyTaskId(id);

    const { error } = await supabase
      .from('housekeeping_tasks')
      .update({ assigned_to: assignedTo || null })
      .eq('id', id);

    setBusyTaskId(null);

    if (error) {
      setActionError(`Could not assign housekeeping staff: ${error.message}`);
      return;
    }

    await refreshData();
  }

  async function handleCreateTask(e: FormEvent) {
    e.preventDefault();
    if (!newRoomId) {
      setErrorMsg('Please select a room.');
      return;
    }

    setCreating(true);
    setErrorMsg('');

    try {
      const { error } = await supabase.from('housekeeping_tasks').insert({
        room_id: newRoomId,
        task_type: newTaskType,
        priority: newPriority,
        assigned_to: newAssignedTo || null,
        notes: newNotes.trim() || null,
        status: 'pending',
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setIsModalOpen(false);
        setNewRoomId('');
        setNewTaskType('daily_cleaning');
        setNewNotes('');
        setNewAssignedTo('');
        setNewPriority('normal');
        await refreshData();
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setCreating(false);
    }
  }

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter === 'all') return true;
    return t.status === statusFilter;
  });

  const getPriorityBadge = (priority: PriorityLevel) => {
    switch (priority) {
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

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-100 text-emerald-900 border border-emerald-200';
      case 'in_progress':
        return 'bg-sky-100 text-sky-900 border border-sky-200';
      case 'cancelled':
        return 'bg-rose-100 text-rose-900 border border-rose-200';
      default:
        return 'bg-amber-100 text-amber-900 border border-amber-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#163D32] to-[#0F2D24] text-[#C5A46D] border border-[#C5A46D]/25 shadow-sm">
            <Sparkles className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.22em] text-[#7A5A27]">
              Room Operations
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#163D32] tracking-tight">
              Housekeeping
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setErrorMsg('');
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#163D32] hover:bg-[#0F2D24] border border-[#C5A46D]/30 px-5 py-2.5 text-xs font-bold text-[#F5F0E6] shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="h-4 w-4 text-[#C5A46D]" aria-hidden="true" />
          New Cleaning Task
        </button>
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
          All Tasks ({tasks.length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('pending')}
          className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-colors ${
            statusFilter === 'pending'
              ? 'bg-amber-700 text-white shadow-xs'
              : 'text-[#52645D] hover:bg-[#EDE6D8]'
          }`}
        >
          Pending ({tasks.filter((t) => t.status === 'pending').length})
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
          In Progress ({tasks.filter((t) => t.status === 'in_progress').length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('completed')}
          className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-colors ${
            statusFilter === 'completed'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-[#52645D] hover:bg-[#EDE6D8]'
          }`}
        >
          Completed ({tasks.filter((t) => t.status === 'completed').length})
        </button>
      </div>

      {/* Task Grid */}
      {loading ? (
        <div className="py-12 text-center text-sm font-semibold text-[#52645D]">
          Loading housekeeping schedule...
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#D5CCB9] bg-white p-12 text-center">
          <Sparkles className="h-10 w-10 text-[#C5A46D] mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm font-bold text-[#163D32]">No housekeeping tasks in this view</p>
          <p className="text-xs text-[#52645D] mt-1">
            All rooms are clean or scheduled tasks have been fulfilled.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTasks.map((task) => {
            const roomName =
              task.roomName ||
              rooms.find((r) => r.id === task.room_id)?.name ||
              `Room ${task.room_id.slice(0, 8)}`;
            const isBusy = busyTaskId === task.id;

            return (
              <article
                key={task.id}
                className="rounded-2xl border border-[#E6DFD1] bg-white p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <BedDouble className="h-4 w-4 text-[#7A5A27] shrink-0" aria-hidden="true" />
                      <h2 className="font-bold text-[#163D32] text-base truncate">{roomName}</h2>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0 ${getPriorityBadge(
                        task.priority
                      )}`}
                    >
                      {task.priority}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#52645D] capitalize">
                      {task.task_type.replace(/_/g, ' ')}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(
                        task.status
                      )}`}
                    >
                      {task.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {task.notes && (
                    <p className="mt-2.5 text-xs text-[#163D32] bg-[#F5F0E6]/70 p-2.5 rounded-xl border border-[#E6DFD1]">
                      {task.notes}
                    </p>
                  )}

                  {/* Staff Assignment Selector */}
                  <div className="mt-4 flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-[#7A5A27] shrink-0" aria-hidden="true" />
                    <select
                      aria-label={`Assign housekeeping staff for ${roomName}`}
                      value={task.assigned_to || ''}
                      disabled={isBusy}
                      onChange={(e) => updateTaskStaff(task.id, e.target.value)}
                      className="w-full rounded-lg border border-[#D5CCB9] bg-[#F5F0E6]/50 px-2.5 py-1.5 text-xs font-medium text-[#163D32] focus:bg-white focus:border-[#163D32] focus:outline-none focus:ring-2 focus:ring-[#C5A46D]/30 disabled:opacity-60"
                    >
                      <option value="">Unassigned Staff</option>
                      {staffList.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.full_name || 'Staff Member'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Status Transitions */}
                <div className="mt-5 pt-3 border-t border-[#E6DFD1] flex items-center justify-between gap-2">
                  <div className="text-[11px] text-[#52645D] font-medium">
                    {new Date(task.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {task.status === 'pending' && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => updateTaskStatus(task.id, 'in_progress')}
                        className="inline-flex items-center gap-1 rounded-lg bg-sky-50 border border-sky-200 px-2.5 py-1.5 text-[11px] font-bold text-sky-900 hover:bg-sky-100 transition-colors disabled:opacity-50"
                      >
                        <PlayCircle className="h-3.5 w-3.5" aria-hidden="true" /> Start
                      </button>
                    )}

                    {task.status !== 'completed' && task.status !== 'cancelled' && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => updateTaskStatus(task.id, 'completed')}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#163D32] hover:bg-[#0F2D24] px-3 py-1.5 text-[11px] font-bold text-[#F5F0E6] shadow-xs transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#C5A46D]" aria-hidden="true" /> Complete
                      </button>
                    )}

                    {task.status === 'completed' && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => updateTaskStatus(task.id, 'pending')}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#F5F0E6] border border-[#E6DFD1] px-2.5 py-1.5 text-[11px] font-bold text-[#163D32] hover:bg-[#EDE6D8] transition-colors disabled:opacity-50"
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* New Task Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F2D24]/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !creating) {
              setIsModalOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-[#E6DFD1]"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E6DFD1]">
              <h2 id={modalTitleId} className="font-display text-lg font-semibold text-[#163D32]">
                Create Cleaning Task
              </h2>
              <button
                type="button"
                disabled={creating}
                onClick={() => setIsModalOpen(false)}
                aria-label="Close modal"
                className="rounded-lg p-1.5 text-[#52645D] hover:bg-[#F5F0E6] hover:text-[#163D32] transition-colors disabled:opacity-50"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2"
              >
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateTask} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor={roomSelectId}
                  className="block text-xs font-bold text-[#163D32] mb-1"
                >
                  Room
                </label>
                <select
                  ref={roomSelectRef}
                  id={roomSelectId}
                  value={newRoomId}
                  onChange={(e) => setNewRoomId(e.target.value)}
                  required
                  className="w-full rounded-xl border border-[#D5CCB9] bg-[#F5F0E6]/40 p-2.5 text-xs text-[#163D32] focus:bg-white focus:border-[#163D32] focus:outline-none focus:ring-2 focus:ring-[#C5A46D]/30"
                >
                  <option value="">Select a Room</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor={taskTypeSelectId}
                    className="block text-xs font-bold text-[#163D32] mb-1"
                  >
                    Task Type
                  </label>
                  <select
                    id={taskTypeSelectId}
                    value={newTaskType}
                    onChange={(e) => setNewTaskType(e.target.value)}
                    className="w-full rounded-xl border border-[#D5CCB9] bg-[#F5F0E6]/40 p-2.5 text-xs text-[#163D32] focus:bg-white focus:border-[#163D32] focus:outline-none focus:ring-2 focus:ring-[#C5A46D]/30"
                  >
                    <option value="daily_cleaning">Daily Cleaning</option>
                    <option value="deep_clean">Deep Clean</option>
                    <option value="turn_down">Turn Down</option>
                    <option value="inspection">Inspection</option>
                    <option value="amenity_restock">Restock Amenities</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={prioritySelectId}
                    className="block text-xs font-bold text-[#163D32] mb-1"
                  >
                    Priority
                  </label>
                  <select
                    id={prioritySelectId}
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as PriorityLevel)}
                    className="w-full rounded-xl border border-[#D5CCB9] bg-[#F5F0E6]/40 p-2.5 text-xs text-[#163D32] focus:bg-white focus:border-[#163D32] focus:outline-none focus:ring-2 focus:ring-[#C5A46D]/30"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor={staffSelectId}
                  className="block text-xs font-bold text-[#163D32] mb-1"
                >
                  Assign Staff
                </label>
                <select
                  id={staffSelectId}
                  value={newAssignedTo}
                  onChange={(e) => setNewAssignedTo(e.target.value)}
                  className="w-full rounded-xl border border-[#D5CCB9] bg-[#F5F0E6]/40 p-2.5 text-xs text-[#163D32] focus:bg-white focus:border-[#163D32] focus:outline-none focus:ring-2 focus:ring-[#C5A46D]/30"
                >
                  <option value="">Unassigned</option>
                  {staffList.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.full_name || 'Staff Member'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor={notesFieldId}
                  className="block text-xs font-bold text-[#163D32] mb-1"
                >
                  Notes / Instructions
                </label>
                <textarea
                  id={notesFieldId}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Extra towels requested, balcony glass cleaning..."
                  rows={2}
                  className="w-full rounded-xl border border-[#D5CCB9] bg-[#F5F0E6]/40 p-2.5 text-xs text-[#163D32] focus:bg-white focus:border-[#163D32] focus:outline-none focus:ring-2 focus:ring-[#C5A46D]/30"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={creating}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#52645D] hover:bg-[#F5F0E6] rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 text-xs font-bold text-[#F5F0E6] bg-[#163D32] hover:bg-[#0F2D24] border border-[#C5A46D]/30 rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
