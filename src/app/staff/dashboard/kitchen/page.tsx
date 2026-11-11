'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { AlertCircle, Clock, RefreshCw, Utensils, X } from 'lucide-react';
import supabase from '@/lib/supabaseClient';
import {
  deriveTicketStations,
  formatOrderLocationLabel,
  isPreparingOrInProgressStatus,
  isReadyStatus,
  KITCHEN_STATIONS,
  type KitchenStation,
  ORDER_STATUS_ID,
} from '@/lib/orderStatuses';

interface KitchenTicketItem {
  name: string;
  quantity: number;
  category?: string;
}

interface KitchenTicket {
  id: string;
  orderNumber: string;
  tableLabel: string;
  station: KitchenStation;
  stations: KitchenStation[];
  items: KitchenTicketItem[];
  orderNotes?: string;
  status: 'pending' | 'preparing' | 'ready';
  statusId: number;
  elapsedMinutes: number;
  serverName: string;
}

interface KitchenOrderRow {
  id: string;
  guest_name?: string | null;
  room_number?: string | null;
  notes?: string | null;
  status_id?: number | null;
  created_at?: string | null;
  status?: { id?: number; name?: string | null } | Array<{ id?: number; name?: string | null }> | null;
  dining_table?: { table_number?: string | null } | Array<{ table_number?: string | null }> | null;
  items?: Array<{
    id: string;
    quantity?: number | null;
    menu_item?:
      | { id?: string; name?: string | null; category?: string | null }
      | Array<{ id?: string; name?: string | null; category?: string | null }>
      | null;
  }> | null;
}

function unwrapSingle<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default function KitchenStationPage() {
  const [stationFilter, setStationFilter] = useState<'All Stations' | KitchenStation>('All Stations');
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'live' | 'reconnecting'>('live');

  const fetchLiveKitchenOrders = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) {
        setLoading(true);
      }
      const { data, error } = await supabase
        .from('orders')
        .select(
          `
          id,
          guest_name,
          room_number,
          notes,
          total,
          status_id,
          created_at,
          status:order_statuses(id, name),
          dining_table:dining_tables(table_number),
          items:order_items(
            id,
            quantity,
            price,
            menu_item:menu_items(id, name, category)
          )
        `
        )
        .in('status_id', [
          ORDER_STATUS_ID.PENDING,
          ORDER_STATUS_ID.CONFIRMED,
          ORDER_STATUS_ID.ACCEPTED,
          ORDER_STATUS_ID.PREPARING,
          ORDER_STATUS_ID.IN_PROGRESS,
          ORDER_STATUS_ID.READY,
        ])
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('Could not fetch kitchen orders from Supabase:', error.message);
        if (!isSilent) {
          setActionError(`Unable to sync kitchen queue: ${error.message}`);
        }
        return;
      }

      if (!data || data.length === 0) {
        setTickets([]);
        return;
      }

      const formatted: KitchenTicket[] = (data as KitchenOrderRow[]).map((o) => {
        const createdAt = o.created_at ? new Date(o.created_at).getTime() : Date.now();
        const elapsedMinutes = Math.max(1, Math.round((Date.now() - createdAt) / 60000));

        const items: KitchenTicketItem[] = (o.items || []).map((it) => {
          const mi = unwrapSingle(it.menu_item);
          return {
            name: mi?.name || 'Dish Item',
            quantity: Number(it.quantity) || 1,
            category: mi?.category || undefined,
          };
        });

        const st = unwrapSingle(o.status);
        const dt = unwrapSingle(o.dining_table);
        const statusId = Number(o.status_id ?? ORDER_STATUS_ID.PENDING);

        let status: KitchenTicket['status'] = 'pending';
        if (isReadyStatus(statusId, st?.name)) {
          status = 'ready';
        } else if (isPreparingOrInProgressStatus(statusId, st?.name)) {
          status = 'preparing';
        }

        const stations = deriveTicketStations(items);
        const tableLabel = formatOrderLocationLabel({
          tableNumber: dt?.table_number,
          roomNumber: o.room_number,
          guestName: o.guest_name,
          fallback: 'Dine-In',
        });

        return {
          id: o.id,
          orderNumber: `#${String(o.id).slice(-4).toUpperCase()}`,
          tableLabel,
          station: stations[0],
          stations,
          items,
          orderNotes: o.notes?.trim() || undefined,
          status,
          statusId,
          elapsedMinutes,
          serverName: 'Tule Waitstaff',
        };
      });

      setTickets(formatted);
    } catch (err) {
      console.warn('Error loading kitchen orders:', err);
      if (!isSilent) {
        setActionError('Network error syncing kitchen orders.');
      }
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => fetchLiveKitchenOrders(true));

    const channel = supabase
      .channel('kitchen:orders-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        void fetchLiveKitchenOrders(true);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('live');
        } else if (status === 'TIMED_OUT' || status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnectionStatus('reconnecting');
        }
      });

    const pollInterval = setInterval(() => {
      void fetchLiveKitchenOrders(true);
    }, 15000);

    const handleOnline = () => {
      setConnectionStatus('live');
      void fetchLiveKitchenOrders(true);
    };

    const handleOffline = () => {
      setConnectionStatus('reconnecting');
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void fetchLiveKitchenOrders(true);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchLiveKitchenOrders]);

  const handleUpdateStatus = async (
    ticketId: string,
    target: 'preparing' | 'ready' | 'delivered'
  ) => {
    if (updatingId === ticketId) return;

    const currentTicket = tickets.find((t) => t.id === ticketId);
    if (!currentTicket) return;

    const expectedStatusId = currentTicket.statusId;
    const targetStatusId =
      target === 'preparing'
        ? ORDER_STATUS_ID.PREPARING
        : target === 'ready'
        ? ORDER_STATUS_ID.READY
        : ORDER_STATUS_ID.DELIVERED;

    setUpdatingId(ticketId);
    setActionError(null);

    const previousTickets = tickets;
    setTickets((prev) =>
      target === 'delivered'
        ? prev.filter((t) => t.id !== ticketId)
        : prev.map((t) =>
            t.id === ticketId ? { ...t, status: target, statusId: targetStatusId } : t
          )
    );

    try {
      const { error } = await supabase.rpc('update_entity_status', {
        p_entity_type: 'order',
        p_entity_id: ticketId,
        p_to_status_id: targetStatusId,
        p_notes: `Kitchen marked ticket as ${target}`,
        p_expected_status_id: expectedStatusId ?? null,
      });

      if (error) {
        setTickets(previousTickets);
        setActionError(
          error.message.includes('STATE_CONFLICT')
            ? `Conflict updating ${currentTicket.orderNumber}: status changed elsewhere. Queue refreshed.`
            : error.message || `Failed to update ${currentTicket.orderNumber}.`
        );
        void fetchLiveKitchenOrders(true);
      }
    } catch (err) {
      setTickets(previousTickets);
      setActionError(
        err instanceof Error ? err.message : `Connection error updating ${currentTicket.orderNumber}.`
      );
      void fetchLiveKitchenOrders(true);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredTickets = tickets.filter(
    (t) => stationFilter === 'All Stations' || t.stations.includes(stationFilter)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-[#163D32] border border-[#C5A46D]/35 p-1 flex items-center justify-center shadow-sm">
            <Image
              src="/tule-resort-logo.png"
              alt="Tule Resort Logo"
              width={36}
              height={36}
              className="object-contain"
            />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.22em] text-[#7A5A27]">
              Culinary Dispatch
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#163D32] tracking-tight">
              Kitchen Display System (KDS)
            </h1>
            <p className="text-xs text-[#52645D] font-medium">
              Live culinary station tickets and preparation timers
            </p>
          </div>
        </div>

        {/* Station Tabs, Connection Status & Refresh */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="status"
            aria-live="polite"
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-bold border transition-colors ${
              connectionStatus === 'live'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-amber-50 text-amber-900 border-amber-300 animate-pulse'
            }`}
            title={
              connectionStatus === 'live'
                ? 'Realtime WebSocket active'
                : 'Realtime disconnected or reconnecting. 15-second background polling active.'
            }
          >
            <span
              className={`h-2 w-2 rounded-full ${
                connectionStatus === 'live' ? 'bg-emerald-600' : 'bg-amber-600'
              }`}
            />
            <span>{connectionStatus === 'live' ? 'Live KDS' : 'Reconnecting (Polling)'}</span>
          </div>

          <button
            type="button"
            onClick={() => fetchLiveKitchenOrders()}
            className="flex items-center gap-1.5 rounded-xl border border-[#D5CCB9] bg-white px-3 py-1.5 text-xs font-bold text-[#163D32] hover:bg-[#F5F0E6] transition-colors shadow-2xs"
            title="Refresh kitchen orders"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-[#7A5A27] ${loading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>Sync</span>
          </button>

          {(['All Stations', ...KITCHEN_STATIONS] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStationFilter(st)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors ${
                stationFilter === st
                  ? 'bg-[#163D32] text-[#F5F0E6] border border-[#C5A46D]/30 shadow-xs'
                  : 'bg-white text-[#52645D] hover:bg-[#EDE6D8] border border-[#E6DFD1]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {actionError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-900"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => setActionError(null)}
            className="rounded-lg p-1 text-rose-700 hover:bg-rose-100"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Tickets Grid or Clean Empty State */}
      {filteredTickets.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#D5CCB9] bg-white p-12 text-center max-w-xl mx-auto shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5F0E6] border border-[#E6DFD1] text-[#7A5A27] mb-4">
            <Utensils className="h-7 w-7" aria-hidden="true" />
          </div>
          <h2 className="font-display text-lg font-semibold text-[#163D32]">Kitchen Queue Clear</h2>
          <p className="mt-1 text-xs text-[#52645D] leading-relaxed max-w-sm mx-auto font-medium">
            No culinary tickets currently waiting for preparation. New guest orders from dining
            tables or room service will appear here instantly with live timers.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTickets.map((ticket) => {
            const isDelayed = ticket.elapsedMinutes >= 20;

            return (
              <div
                key={ticket.id}
                className={`rounded-3xl bg-white p-5 shadow-xs border flex flex-col justify-between transition-colors ${
                  isDelayed
                    ? 'border-red-300 ring-2 ring-red-100'
                    : ticket.status === 'ready'
                    ? 'border-emerald-300 bg-emerald-50/15'
                    : 'border-[#E6DFD1] hover:border-[#C5A46D]'
                }`}
              >
                {/* Ticket Top Banner */}
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#E6DFD1]">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-[#163D32]">
                        {ticket.orderNumber}
                      </span>
                      <span className="rounded-lg bg-[#163D32]/10 px-2 py-0.5 text-[11px] font-bold text-[#163D32]">
                        {ticket.tableLabel}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        isDelayed
                          ? 'bg-red-100 text-red-800 animate-pulse'
                          : 'bg-[#F5F0E6] text-[#52645D] border border-[#E6DFD1]'
                      }`}
                    >
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {ticket.elapsedMinutes} min
                    </span>
                  </div>

                  <div className="py-2 text-[11px] text-[#52645D] flex items-center justify-between">
                    <span>
                      Station: <strong className="text-[#163D32]">{ticket.station}</strong>
                    </span>
                    <span>Server: {ticket.serverName}</span>
                  </div>

                  {/* Items List */}
                  <div className="mt-2 space-y-2.5">
                    {ticket.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl bg-[#F5F0E6]/65 p-2.5 text-xs border border-[#E6DFD1]"
                      >
                        <div className="flex items-center justify-between font-bold text-[#163D32]">
                          <span>{item.name}</span>
                          <span className="text-sm font-bold text-[#7A5A27]">×{item.quantity}</span>
                        </div>
                        {item.category && (
                          <p className="text-[11px] text-[#52645D] font-semibold mt-0.5">
                            {item.category}
                          </p>
                        )}
                      </div>
                    ))}
                    {ticket.orderNotes && (
                      <p className="rounded-xl bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-900 border border-amber-200">
                        Order Note: {ticket.orderNotes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 mt-4 border-t border-[#E6DFD1]">
                  {ticket.status === 'pending' && (
                    <button
                      type="button"
                      disabled={updatingId === ticket.id}
                      onClick={() => handleUpdateStatus(ticket.id, 'preparing')}
                      className="w-full rounded-xl bg-[#163D32] hover:bg-[#0F2D24] border border-[#C5A46D]/30 py-2.5 text-xs font-bold text-[#F5F0E6] shadow-xs transition-colors disabled:opacity-50"
                    >
                      {updatingId === ticket.id ? 'Updating...' : 'Start Preparing'}
                    </button>
                  )}

                  {ticket.status === 'preparing' && (
                    <button
                      type="button"
                      disabled={updatingId === ticket.id}
                      onClick={() => handleUpdateStatus(ticket.id, 'ready')}
                      className="w-full rounded-xl bg-emerald-700 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition-colors disabled:opacity-50"
                    >
                      {updatingId === ticket.id ? 'Updating...' : '✓ Mark Ready for Pickup'}
                    </button>
                  )}

                  {ticket.status === 'ready' && (
                    <div className="space-y-2">
                      <div className="rounded-xl bg-emerald-50 py-2 text-center text-xs font-bold text-emerald-900 border border-emerald-200">
                        Ready for Server
                      </div>
                      <button
                        type="button"
                        disabled={updatingId === ticket.id}
                        onClick={() => handleUpdateStatus(ticket.id, 'delivered')}
                        className="w-full rounded-xl border border-[#D5CCB9] bg-white py-2 text-[11px] font-bold text-[#163D32] hover:bg-[#F5F0E6] transition-colors disabled:opacity-50"
                      >
                        {updatingId === ticket.id ? 'Clearing...' : 'Mark Served / Picked Up'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
