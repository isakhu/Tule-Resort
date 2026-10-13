'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Layers,
  ArrowLeft,
  Filter
} from 'lucide-react';

interface KitchenTicket {
  id: string;
  orderNumber: string;
  tableLabel: string;
  station: 'Grill' | 'Hot Wot' | 'Salad & Cold' | 'Bakery';
  items: { name: string; quantity: number; notes?: string }[];
  status: 'pending' | 'preparing' | 'ready';
  elapsedMinutes: number;
  serverName: string;
}

export default function KitchenStationPage() {
  const [stationFilter, setStationFilter] = useState<string>('All Stations');

  const [tickets, setTickets] = useState<KitchenTicket[]>([
    {
      id: 'k-1',
      orderNumber: '#4587',
      tableLabel: 'Table 12',
      station: 'Grill',
      items: [
        { name: 'Pasta Alfredo', quantity: 1, notes: 'Extra parmesan' },
        { name: 'Caesar Salad', quantity: 1 },
      ],
      status: 'preparing',
      elapsedMinutes: 12,
      serverName: 'Abebe Bekele',
    },
    {
      id: 'k-2',
      orderNumber: '#4586',
      tableLabel: 'Table 8',
      station: 'Grill',
      items: [
        { name: 'Tule Special Tibs', quantity: 2, notes: 'Medium rare, rosemary' },
        { name: 'French Fries', quantity: 1 },
      ],
      status: 'preparing',
      elapsedMinutes: 18,
      serverName: 'Omar Ahmed',
    },
    {
      id: 'k-3',
      orderNumber: '#4582',
      tableLabel: 'Terrace 03',
      station: 'Hot Wot',
      items: [
        { name: 'Doro Wot', quantity: 2, notes: 'Extra injera, 2 eggs' },
        { name: 'Garlic Bread', quantity: 1 },
      ],
      status: 'pending',
      elapsedMinutes: 24,
      serverName: 'Sara Kidane',
    },
    {
      id: 'k-4',
      orderNumber: '#4583',
      tableLabel: 'Table 03',
      station: 'Grill',
      items: [
        { name: 'Kitfo Special', quantity: 1, notes: 'Leb-leb (light warm)' },
        { name: 'Ayeb & Gomen', quantity: 1 },
      ],
      status: 'preparing',
      elapsedMinutes: 8,
      serverName: 'Omar Ahmed',
    },
    {
      id: 'k-5',
      orderNumber: '#4584',
      tableLabel: 'Terrace 02',
      station: 'Grill',
      items: [
        { name: 'Grilled Tilapia', quantity: 1, notes: 'Crispy skin' },
        { name: 'Roasted Vegetables', quantity: 1 },
      ],
      status: 'ready',
      elapsedMinutes: 30,
      serverName: 'Sara Kidane',
    },
  ]);

  const handleUpdateStatus = (ticketId: string, nextStatus: KitchenTicket['status']) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: nextStatus } : t))
    );
  };

  const filteredTickets = tickets.filter(
    (t) => stationFilter === 'All Stations' || t.station === stationFilter
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#FF6B00] to-[#E85D04] text-white flex items-center justify-center shadow-md">
            <ChefHat className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Kitchen Display System (KDS)
            </h1>
            <p className="text-xs text-gray-500">Live order tickets and kitchen prep timers</p>
          </div>
        </div>

        {/* Station Tabs */}
        <div className="flex items-center gap-2">
          {(['All Stations', 'Grill', 'Hot Wot', 'Salad & Cold'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStationFilter(st)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                stationFilter === st
                  ? 'bg-[#11161B] text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets Grid */}
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
                  : 'border-gray-100'
              }`}
            >
              {/* Ticket Top Banner */}
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-gray-900">{ticket.orderNumber}</span>
                    <span className="rounded-lg bg-orange-50 px-2 py-0.5 text-[10px] font-black text-[#FF6B00]">
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
                    <div key={idx} className="rounded-xl bg-[#F8F9FA] p-2.5 text-xs">
                      <div className="flex items-center justify-between font-bold text-gray-900">
                        <span>{item.name}</span>
                        <span className="text-sm font-black text-[#FF6B00]">×{item.quantity}</span>
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
                    className="w-full rounded-xl bg-[#FF6B00] py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:bg-[#E85D04]"
                  >
                    Start Preparing
                  </button>
                )}

                {ticket.status === 'preparing' && (
                  <button
                    onClick={() => handleUpdateStatus(ticket.id, 'ready')}
                    className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-700"
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
    </div>
  );
}
