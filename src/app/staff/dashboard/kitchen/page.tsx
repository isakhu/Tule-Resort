'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Layers,
  Filter,
  RefreshCw,
  Utensils
} from 'lucide-react';
import supabase from '@/lib/supabaseClient';

interface KitchenTicket {
  id: string;
  orderNumber: string;
  tableLabel: string;
  station: 'Grill' | 'Hot Wot' | 'Salad & Cold' | 'Bakery' | 'General Kitchen';
  items: { name: string; quantity: number; notes?: string }[];
  status: 'pending' | 'preparing' | 'ready';
  statusId?: number;
  elapsedMinutes: number;
  serverName: string;
}

export default function KitchenStationPage() {
  const [stationFilter, setStationFilter] = useState<string>('All Stations');
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'live' | 'reconnecting'>('live');

  const fetchLiveKitchenOrders = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
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
        `)
        .in('status_id', [1, 2, 7, 3, 8])
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('Could not fetch kitchen orders from Supabase:', error.message);
        setTickets([]);
        return;
      }

      if (!data || data.length === 0) {
        setTickets([]);
        return;
      }

      const formatted: KitchenTicket[] = data.map((o: any) => {
        const createdAt = o.created_at ? new Date(o.created_at).getTime() : Date.now();
        const elapsedMinutes = Math.max(1, Math.round((Date.now() - createdAt) / 60000));

        const items = (o.items || []).map((it: any) => ({
          name: it.menu_item?.name || 'Dish Item',
          quantity: Number(it.quantity) || 1,
          notes: it.menu_item?.category || undefined,
        }));

        const stName = (o.status?.name || '').toLowerCase();
        const isPrep = stName.includes('prep') || stName.includes('progress') || o.status_id === 3 || o.status_id === 8;
        const status: KitchenTicket['status'] = isPrep ? 'preparing' : 'pending';

        const tableLabel = o.dining_table?.table_number
          ? o.dining_table.table_number
          : o.room_number
          ? `Room ${o.room_number}`
          : o.guest_name
          ? `Guest: ${o.guest_name}`
          : 'Dine-In';

        return {
          id: o.id,
          orderNumber: `#${String(o.id).slice(-4).toUpperCase()}`,
          tableLabel,
          station: 'General Kitchen',
          items,
          status,
          statusId: o.status_id,
          elapsedMinutes,
          serverName: 'Tule Waitstaff',
        };
      });

      setTickets(formatted);
    } catch (err) {
      console.warn('Error loading kitchen orders:', err);
      if (!isSilent) setTickets([]);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveKitchenOrders();

    // 1. Live subscription with status monitoring
    const channel = supabase
      .channel('kitchen:orders-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchLiveKitchenOrders(true);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('live');
        } else if (status === 'TIMED_OUT' || status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnectionStatus('reconnecting');
        }
      });

    // 2. Resilience: 15-second background catch-up polling
    const pollInterval = setInterval(() => {
      fetchLiveKitchenOrders(true);
    }, 15000);

    // 3. Fast reconnect upon tablet wake or online event
    const handleOnline = () => {
      setConnectionStatus('live');
      fetchLiveKitchenOrders(true);
    };

    const handleOffline = () => {
      setConnectionStatus('reconnecting');
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchLiveKitchenOrders(true);
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

  const handleUpdateStatus = async (ticketId: string, nextStatus: KitchenTicket['status']) => {
    const currentTicket = tickets.find((t) => t.id === ticketId);
    const expectedStatusId = currentTicket?.statusId;

    // Optimistic UI update
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: nextStatus, statusId: nextStatus === 'preparing' ? 3 : nextStatus === 'ready' ? 4 : 1 } : t))
    );

    // Target status ID: 3 = Preparing, 4 = Ready
    const targetStatusId = nextStatus === 'preparing' ? 3 : nextStatus === 'ready' ? 4 : 1;

    try {
      const { error } = await supabase.rpc('update_entity_status', {
        p_entity_type: 'order',
        p_entity_id: ticketId,
        p_to_status_id: targetStatusId,
        p_notes: `Kitchen marked ticket as ${nextStatus}`,
        p_expected_status_id: expectedStatusId ?? null,
      });

      if (error) {
        console.warn('Failed to update kitchen ticket status:', error.message);
        // Refresh immediately on state conflict or other error
        fetchLiveKitchenOrders();
      }
    } catch (err) {
      console.warn('Failed to update kitchen ticket status in Supabase:', err);
      fetchLiveKitchenOrders();
    }
  };

  const filteredTickets = tickets.filter(
    (t) => stationFilter === 'All Stations' || t.station === stationFilter
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-[#0B252C] border border-[#C9902F]/30 p-1 flex items-center justify-center shadow-md">
            <Image
              src="/tule-resort-mark.svg"
              alt="Tule Logo"
              width={34}
              height={34}
              className="object-contain"
            />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#0B252C] tracking-tight">
              Kitchen Display System (KDS)
            </h1>
            <p className="text-xs text-gray-500 font-medium">Live culinary station tickets and preparation timers</p>
          </div>
        </div>

        {/* Station Tabs, Connection Status & Refresh */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Connection Resilience Indicator */}
          <div
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-bold border transition-colors shadow-2xs ${
              connectionStatus === 'live'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse'
            }`}
            title={
              connectionStatus === 'live'
                ? 'Realtime WebSocket active'
                : 'Realtime disconnected or reconnecting. 15-second background polling active.'
            }
          >
            <span
              className={`h-2 w-2 rounded-full ${
                connectionStatus === 'live' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <span>{connectionStatus === 'live' ? 'Live KDS' : 'Reconnecting (Polling Active)'}</span>
          </div>

          <button
            onClick={() => fetchLiveKitchenOrders()}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs"
            title="Refresh kitchen orders"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-[#0E7480] ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>

          {(['All Stations', 'Grill', 'Hot Wot', 'Salad & Cold'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStationFilter(st)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                stationFilter === st
                  ? 'bg-[#0B252C] text-[#F8D77A] shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets Grid or Clean Empty State */}
      {filteredTickets.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white/70 p-12 text-center max-w-xl mx-auto shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0E7480]/10 text-[#0E7480] mb-4">
            <Utensils className="h-7 w-7" />
          </div>
          <h3 className="text-base font-extrabold text-[#0B252C]">Kitchen Queue Clear</h3>
          <p className="mt-1 text-xs text-gray-500 leading-relaxed max-w-sm mx-auto font-medium">
            No culinary tickets currently waiting for preparation. New guest orders from dining tables or room service will appear here instantly with live timers.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTickets.map((ticket) => {
            const isDelayed = ticket.elapsedMinutes >= 20;

            return (
              <div
                key={ticket.id}
                className={`rounded-3xl bg-white p-5 shadow-sm border flex flex-col justify-between transition-all ${
                  isDelayed
                    ? 'border-red-300 ring-2 ring-red-100'
                    : ticket.status === 'ready'
                    ? 'border-emerald-200 bg-emerald-50/10'
                    : 'border-gray-200/80 hover:border-[#0E7480]/40'
                }`}
              >
                {/* Ticket Top Banner */}
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-[#0B252C]">{ticket.orderNumber}</span>
                      <span className="rounded-lg bg-[#0E7480]/10 px-2 py-0.5 text-[10px] font-black text-[#0E7480]">
                        {ticket.tableLabel}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                        isDelayed
                          ? 'bg-red-100 text-red-700 animate-pulse'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <Clock className="h-3 w-3" />
                      {ticket.elapsedMinutes} min
                    </span>
                  </div>

                  <div className="py-2 text-[10px] text-gray-400 flex items-center justify-between">
                    <span>Station: <strong className="text-gray-700">{ticket.station}</strong></span>
                    <span>Server: {ticket.serverName}</span>
                  </div>

                  {/* Items List */}
                  <div className="mt-2 space-y-2.5">
                    {ticket.items.map((item, idx) => (
                      <div key={idx} className="rounded-xl bg-[#F8FAFC] p-2.5 text-xs border border-gray-100">
                        <div className="flex items-center justify-between font-bold text-gray-900">
                          <span>{item.name}</span>
                          <span className="text-sm font-black text-[#C9902F]">×{item.quantity}</span>
                        </div>
                        {item.notes && (
                          <p className="text-[10px] text-amber-700 font-semibold mt-0.5">
                            Note: {item.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 mt-4 border-t border-gray-100">
                  {ticket.status === 'pending' && (
                    <button
                      onClick={() => handleUpdateStatus(ticket.id, 'preparing')}
                      className="w-full rounded-xl bg-[#0E7480] py-2.5 text-xs font-bold text-white shadow-md shadow-[#0E7480]/20 hover:bg-[#0A5C66] transition-colors"
                    >
                      Start Preparing
                    </button>
                  )}

                  {ticket.status === 'preparing' && (
                    <button
                      onClick={() => handleUpdateStatus(ticket.id, 'ready')}
                      className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-700 transition-colors"
                    >
                      ✓ Mark Ready for Pickup
                    </button>
                  )}

                  {ticket.status === 'ready' && (
                    <div className="rounded-xl bg-emerald-50 py-2 text-center text-xs font-black text-emerald-700">
                      Ready for Server
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
