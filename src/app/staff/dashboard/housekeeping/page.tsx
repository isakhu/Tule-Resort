'use client';

import React, { useEffect, useState, FormEvent } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  PlayCircle,
  XCircle,
  Plus,
  Filter,
  User,
  BedDouble,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface HousekeepingTask {
  id: string;
  room_id: string;
  assigned_to: string | null;
  task_type: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  completed_at: string | null;
  rooms?: { name: string } | null;
  users?: { full_name: string } | null;
}

interface RoomOption {
  id: string;
  name: string;
}

interface StaffOption {
  id: string;
  full_name: string | null;
}

export default function HousekeepingPage() {
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');

  // New task form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoomId, setNewRoomId] = useState('');
  const [newTaskType, setNewTaskType] = useState('daily_cleaning');
  const [newPriority, setNewPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [newAssignedTo, setNewAssignedTo] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function loadData() {
    setLoading(true);
    try {
      // 1. Load tasks with rooms and users relations
      const { data: taskData, error: taskErr } = await supabase
        .from('housekeeping_tasks')
        .select(`
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
        `)
        .order('created_at', { ascending: false });

      if (taskErr) {
        // Fallback without relations if foreign keys are resolving differently
        const { data: fallbackTasks } = await supabase
          .from('housekeeping_tasks')
          .select('id, room_id, assigned_to, task_type, priority, status, notes, created_at, completed_at')
          .order('created_at', { ascending: false });
        setTasks((fallbackTasks as any) ?? []);
      } else {
        setTasks((taskData as any) ?? []);
      }

      // 2. Load rooms
      const { data: roomsData } = await supabase
        .from('rooms')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      setRooms(roomsData ?? []);

      // 3. Load staff
      const { data: staffData } = await supabase
        .from('users')
        .select('id, full_name')
        .order('full_name');
      setStaffList(staffData ?? []);
    } catch (err) {
      console.error('Error loading housekeeping data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();

    // Realtime channel
    const channel = supabase
      .channel('housekeeping_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'housekeeping_tasks' },
        () => {
          void loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function updateTaskStatus(id: string, status: 'pending' | 'in_progress' | 'completed' | 'cancelled') {
    const updatePayload: Record<string, any> = { status };
    if (status === 'completed') {
      updatePayload.completed_at = new Date().toISOString();
    } else {
      updatePayload.completed_at = null;
    }

    await supabase.from('housekeeping_tasks').update(updatePayload).eq('id', id);
    void loadData();
  }

  async function updateTaskStaff(id: string, assignedTo: string) {
    await supabase
      .from('housekeeping_tasks')
      .update({ assigned_to: assignedTo ? assignedTo : null })
      .eq('id', id);
    void loadData();
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
        assigned_to: newAssignedTo ? newAssignedTo : null,
        notes: newNotes.trim() ? newNotes.trim() : null,
        status: 'pending'
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setIsModalOpen(false);
        setNewRoomId('');
        setNewNotes('');
        setNewAssignedTo('');
        setNewPriority('normal');
        void loadData();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create task');
    } finally {
      setCreating(false);
    }
  }

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter === 'all') return true;
    return t.status === statusFilter;
  });

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-100 text-emerald-800';
      case 'in_progress':
        return 'bg-sky-100 text-sky-800';
      case 'cancelled':
        return 'bg-rose-100 text-rose-800';
      default:
        return 'bg-amber-100 text-amber-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#073B4C] to-[#159A9C] text-white shadow-md">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#159A9C]">
              Room Operations
            </p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Housekeeping
            </h1>
          </div>
        </div>

        <button
          onClick={() => {
            setErrorMsg('');
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0E7480] to-[#14919B] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:brightness-110 transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          New Cleaning Task
        </button>
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
          All Tasks ({tasks.length})
        </button>
        <button
          onClick={() => setStatusFilter('pending')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
            statusFilter === 'pending'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Pending ({tasks.filter((t) => t.status === 'pending').length})
        </button>
        <button
          onClick={() => setStatusFilter('in_progress')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
            statusFilter === 'in_progress'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          In Progress ({tasks.filter((t) => t.status === 'in_progress').length})
        </button>
        <button
          onClick={() => setStatusFilter('completed')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
            statusFilter === 'completed'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Completed ({tasks.filter((t) => t.status === 'completed').length})
        </button>
      </div>

      {/* Task Grid */}
      {loading ? (
        <div className="py-12 text-center text-sm font-semibold text-gray-500">
          Loading housekeeping schedule...
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
          <Sparkles className="h-10 w-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-gray-800">No housekeeping tasks in this view</p>
          <p className="text-xs text-gray-400 mt-1">
            All rooms are clean or scheduled tasks have been fulfilled.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTasks.map((task) => {
            const roomName = task.rooms?.name || rooms.find((r) => r.id === task.room_id)?.name || `Room ${task.room_id.slice(0, 8)}`;
            const assignedStaff = task.users?.full_name || staffList.find((s) => s.id === task.assigned_to)?.full_name;

            return (
              <article
                key={task.id}
                className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <BedDouble className="h-4 w-4 text-[#0E7480]" />
                      <h2 className="font-extrabold text-gray-900 text-base">{roomName}</h2>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${getPriorityBadge(
                        task.priority
                      )}`}
                    >
                      {task.priority}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-600 capitalize">
                      {task.task_type.replace('_', ' ')}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(
                        task.status
                      )}`}
                    >
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>

                  {task.notes && (
                    <p className="mt-2 text-xs text-gray-500 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                      {task.notes}
                    </p>
                  )}

                  {/* Staff Assignment Selector */}
                  <div className="mt-4 flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <select
                      value={task.assigned_to || ''}
                      onChange={(e) => updateTaskStaff(task.id, e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-gray-50/60 px-2.5 py-1.5 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0E7480]"
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
                <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <div className="text-[10px] text-gray-400 font-medium">
                    {new Date(task.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {task.status === 'pending' && (
                      <button
                        onClick={() => updateTaskStatus(task.id, 'in_progress')}
                        className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700 hover:bg-sky-100 transition-colors"
                      >
                        <PlayCircle className="h-3.5 w-3.5" /> Start
                      </button>
                    )}

                    {task.status !== 'completed' && task.status !== 'cancelled' && (
                      <button
                        onClick={() => updateTaskStatus(task.id, 'completed')}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 shadow-xs transition-colors"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                      </button>
                    )}

                    {task.status === 'completed' && (
                      <button
                        onClick={() => updateTaskStatus(task.id, 'pending')}
                        className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-600 hover:bg-gray-200 transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-base font-extrabold text-gray-900">Create Cleaning Task</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateTask} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Room</label>
                <select
                  value={newRoomId}
                  onChange={(e) => setNewRoomId(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0E7480]/20"
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
                  <label className="block text-xs font-bold text-gray-700 mb-1">Task Type</label>
                  <select
                    value={newTaskType}
                    onChange={(e) => setNewTaskType(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0E7480]/20"
                  >
                    <option value="daily_cleaning">Daily Cleaning</option>
                    <option value="deep_clean">Deep Clean</option>
                    <option value="turn_down">Turn Down</option>
                    <option value="inspection">Inspection</option>
                    <option value="amenity_restock">Restock Amenities</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0E7480]/20"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Assign Staff</label>
                <select
                  value={newAssignedTo}
                  onChange={(e) => setNewAssignedTo(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0E7480]/20"
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
                <label className="block text-xs font-bold text-gray-700 mb-1">Notes / Instructions</label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Extra towels requested, balcony glass cleaning..."
                  rows={2}
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0E7480]/20"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#0E7480] to-[#14919B] rounded-xl hover:brightness-110 shadow-md disabled:opacity-50"
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
