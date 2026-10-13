'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Layers,
  Users,
  Clock,
  Printer,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  Plus,
  RefreshCw,
  X,
  Share2,
  UtensilsCrossed,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';
import { getDiningTables, DiningTable, updateTableStatus } from '@/lib/diningTables';
import { generateQrCodeImageUrl } from '@/lib/qrCode';

export default function StaffTablesPage() {
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<'Floor 1' | 'Lake Terrace' | 'Poolside'>('Floor 1');
  const [selectedTable, setSelectedTable] = useState<DiningTable | null>(null);
  const [qrModalTable, setQrModalTable] = useState<DiningTable | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isUpdating, setIsUpdating] = useState(false);
  const [tableActionError, setTableActionError] = useState('');

  useEffect(() => {
    getDiningTables().then((loaded) => {
      setTables(loaded);
      // Default select Table 07 if available
      const defaultTbl = loaded.find((t) => t.table_number.includes('07')) || loaded[0];
      if (defaultTbl) setSelectedTable(defaultTbl);
    });
  }, []);

  const floorTables = tables.filter((t) => t.section === selectedFloor);

  // Status counts
  const totalCount = tables.length;
  const occupiedCount = tables.filter((t) => t.status === 'occupied').length;
  const availableCount = tables.filter((t) => t.status === 'available').length;
  const cleaningCount = tables.filter((t) => t.status === 'cleaning').length;
  const outOfServiceCount = tables.filter((t) => t.status === 'out_of_service').length;

  const handleStatusChange = async (newStatus: DiningTable['status']) => {
    if (!selectedTable) return;
    setIsUpdating(true);
    setTableActionError('');
    const saved = await updateTableStatus(selectedTable.id, newStatus);
    if (!saved) {
      setTableActionError('The table status could not be saved. Check your connection and staff permissions.');
      setIsUpdating(false);
      return;
    }
    setTables((prev) =>
      prev.map((t) => (t.id === selectedTable.id ? { ...t, status: newStatus } : t))
    );
    setSelectedTable((prev) => (prev ? { ...prev, status: newStatus } : null));
    setIsUpdating(false);
  };

  const getTableColorClass = (status: DiningTable['status'], isSelected: boolean) => {
    let base = '';
    if (status === 'occupied') base = 'bg-[#FF6B00] text-white ring-2 ring-orange-300';
    else if (status === 'available') base = 'bg-emerald-500 text-white';
    else if (status === 'cleaning') base = 'bg-purple-600 text-white';
    else base = 'bg-gray-400 text-white';

    if (isSelected) {
      return `${base} ring-4 ring-[#FF6B00]/40 scale-110 z-20 shadow-xl`;
    }
    return `${base} shadow-md hover:scale-105 z-10`;
  };

  // Printable table card QR link
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://tuleresort.com';
  const qrUrl = qrModalTable ? `${currentOrigin}/guest/table/${qrModalTable.qr_token}` : '';
  const qrImageUrl = qrModalTable ? generateQrCodeImageUrl(qrUrl, 260) : '';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* ─── PAGE HEADER & NEW ACTION ─── */}
      {tableActionError ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{tableActionError}</div>
      ) : null}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Tables</h1>
          <p className="text-xs text-gray-500">Manage table status, guests and generate QR table codes</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (selectedTable) setQrModalTable(selectedTable);
            }}
            className="flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-all"
          >
            <QrCode className="h-4 w-4 text-[#FF6B00]" />
            Print Table QR
          </button>
          <Link
            href="/staff/dashboard/reservations"
            className="flex items-center gap-2 rounded-xl bg-[#FF6B00] px-4 py-2 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:bg-[#E85D04] transition-all"
          >
            <Plus className="h-4 w-4" />
            New Reservation
          </Link>
        </div>
      </div>

      {/* ─── 1. TOP KPI SUMMARY ROW (Image 3) ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Occupied */}
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="h-8 w-8 rounded-xl bg-orange-50 text-[#FF6B00] flex items-center justify-center">
              <Layers className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-bold text-gray-400">
              {Math.round((occupiedCount / totalCount) * 100)}%
            </span>
          </div>
          <div className="mt-2">
            <p className="text-[11px] font-bold text-gray-500">Occupied</p>
            <p className="text-xl font-black text-gray-900">
              {occupiedCount}{' '}
              <span className="text-xs font-semibold text-gray-400">/ {totalCount}</span>
            </p>
          </div>
          <div className="mt-2 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#FF6B00] rounded-full"
              style={{ width: `${(occupiedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>

        {/* Available */}
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-bold text-gray-400">
              {Math.round((availableCount / totalCount) * 100)}%
            </span>
          </div>
          <div className="mt-2">
            <p className="text-[11px] font-bold text-gray-500">Available</p>
            <p className="text-xl font-black text-gray-900">{availableCount}</p>
          </div>
          <div className="mt-2 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${(availableCount / totalCount) * 100}%` }}
            />
          </div>
        </div>

        {/* Cleaning */}
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-bold text-gray-400">
              {Math.round((cleaningCount / totalCount) * 100)}%
            </span>
          </div>
          <div className="mt-2">
            <p className="text-[11px] font-bold text-gray-500">Cleaning</p>
            <p className="text-xl font-black text-gray-900">{cleaningCount}</p>
          </div>
          <div className="mt-2 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-600 rounded-full"
              style={{ width: `${(cleaningCount / totalCount) * 100}%` }}
            />
          </div>
        </div>

        {/* Out of Service */}
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="h-8 w-8 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-bold text-gray-400">0%</span>
          </div>
          <div className="mt-2">
            <p className="text-[11px] font-bold text-gray-500">Out of Service</p>
            <p className="text-xl font-black text-gray-900">{outOfServiceCount}</p>
          </div>
          <div className="mt-2 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gray-400 rounded-full" style={{ width: '0%' }} />
          </div>
        </div>
      </div>

      {/* ─── 2. MAIN FLOOR PLAN + INSPECTOR DRAWER (Image 3) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 Cols): Interactive Floor Map */}
        <div className="lg:col-span-2 space-y-4">
          {/* Floor tabs & Zoom controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {(['Floor 1', 'Lake Terrace', 'Poolside'] as const).map((floor) => (
                <button
                  key={floor}
                  onClick={() => setSelectedFloor(floor)}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                    selectedFloor === floor
                      ? 'bg-[#FF6B00] text-white shadow-md shadow-orange-500/20'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {floor}
                </button>
              ))}
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 rounded-xl bg-white border border-gray-200 p-1 shadow-sm">
              <button
                onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
                className="p-1 rounded-lg text-gray-500 hover:bg-gray-100"
                title="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.1))}
                className="p-1 rounded-lg text-gray-500 hover:bg-gray-100"
                title="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                onClick={() => setZoomLevel(1)}
                className="p-1 rounded-lg text-gray-500 hover:bg-gray-100"
                title="Reset zoom"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Architectural Floor Plan Canvas */}
          <div className="relative aspect-[4/3] w-full rounded-3xl bg-[#F4EFEA] border border-gray-300/80 p-6 overflow-hidden shadow-inner">
            {/* Visual Ambiance / Architectural markers */}
            <div className="absolute top-4 left-6 rounded-2xl bg-gray-200/80 border border-gray-300 px-4 py-3 text-xs font-bold text-gray-600 flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4 text-[#FF6B00]" />
              Main Kitchen & Prep Station
            </div>

            <div className="absolute top-4 right-6 rounded-2xl bg-amber-100/70 border border-amber-200 px-6 py-2.5 text-xs font-bold text-amber-800">
              Cocktail & Coffee Bar
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/90 border border-gray-200 px-4 py-1 text-[10px] font-bold text-gray-500 shadow-sm">
              Entrance • Reception Lobby
            </div>

            {/* Render Tables */}
            <div
              className="relative w-full h-full transition-transform duration-200"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              {floorTables.map((table) => {
                const isSelected = selectedTable?.id === table.id;
                const num = table.table_number.replace(/[^0-9]/g, '') || '01';

                return (
                  <div
                    key={table.id}
                    onClick={() => setSelectedTable(table)}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl flex flex-col items-center justify-center font-black cursor-pointer transition-all duration-200 ${getTableColorClass(
                      table.status,
                      isSelected
                    )}`}
                    style={{
                      left: `${table.pos_x}%`,
                      top: `${table.pos_y}%`,
                      width: table.capacity >= 6 ? '58px' : '48px',
                      height: table.capacity >= 6 ? '58px' : '48px',
                    }}
                  >
                    <span className="text-sm font-black">{num}</span>
                    <span className="text-[8px] font-semibold opacity-90">{table.capacity} seats</span>
                  </div>
                );
              })}
            </div>

            {/* Canvas Bottom Legend */}
            <div className="absolute bottom-4 left-6 flex items-center gap-3 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-gray-200 text-[10px] font-bold text-gray-600 shadow-sm">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#FF6B00]" /> Occupied
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-purple-600" /> Cleaning
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-gray-400" /> Out of Service
              </span>
            </div>
          </div>
        </div>

        {/* Right (1 Col): Table Inspector Drawer (Image 3) */}
        <div className="space-y-4">
          {selectedTable ? (
            <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100 space-y-5">
              {/* Table Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-orange-50 text-[#FF6B00] flex items-center justify-center font-black">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900">{selectedTable.table_number}</h3>
                    <p className="text-[10px] font-semibold text-gray-400">{selectedTable.section}</p>
                  </div>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-black capitalize ${
                    selectedTable.status === 'occupied'
                      ? 'bg-orange-50 text-[#FF6B00] border border-orange-200'
                      : selectedTable.status === 'available'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-purple-50 text-purple-700 border border-purple-200'
                  }`}
                >
                  {selectedTable.status}
                </span>
              </div>

              {/* Guest & Waiter info */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-gray-600">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Users className="h-4 w-4 text-gray-400" />
                    Guests:
                  </span>
                  <span className="font-extrabold text-gray-900">
                    {selectedTable.guest_count || selectedTable.capacity} Guests
                  </span>
                </div>

                <div className="flex items-center justify-between text-gray-600">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Clock className="h-4 w-4 text-gray-400" />
                    Occupied Since:
                  </span>
                  <span className="font-extrabold text-gray-900">
                    {selectedTable.occupied_since || '12:15 PM'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-gray-600">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Users className="h-4 w-4 text-gray-400" />
                    Assigned Waiter:
                  </span>
                  <span className="font-extrabold text-[#FF6B00]">
                    {selectedTable.active_waiter || 'Omar Ahmed'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/staff/dashboard/orders"
                  className="rounded-xl bg-[#FF6B00] px-4 py-2 text-xs font-bold text-white text-center shadow-md shadow-orange-500/20 hover:bg-[#E85D04]"
                >
                  View Order
                </Link>
                <button
                  onClick={() => handleStatusChange(selectedTable.status === 'occupied' ? 'available' : 'occupied')}
                  disabled={isUpdating}
                  className="rounded-xl bg-gray-100 hover:bg-gray-200 px-4 py-2 text-xs font-bold text-gray-700 text-center transition-all"
                >
                  {selectedTable.status === 'occupied' ? 'Clear Table' : 'Seat Table'}
                </button>
              </div>

              {/* Order Details Line Items */}
              <div className="rounded-2xl bg-[#F8F9FA] p-4 border border-gray-100 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200/60">
                  <span className="text-xs font-black text-gray-900">Order Details</span>
                  <span className="text-xs font-bold text-gray-400">#4587</span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-900">Grilled Salmon</p>
                      <p className="text-[10px] text-gray-400">× 2 portions</p>
                    </div>
                    <span className="font-extrabold text-gray-900">560 ETB</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-900">Caesar Salad</p>
                      <p className="text-[10px] text-gray-400">× 1 portion</p>
                    </div>
                    <span className="font-extrabold text-gray-900">140 ETB</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-900">Fresh Lemonade</p>
                      <p className="text-[10px] text-gray-400">× 2 cups</p>
                    </div>
                    <span className="font-extrabold text-gray-900">100 ETB</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between font-black text-sm text-gray-900">
                  <span>Total</span>
                  <span className="text-[#FF6B00]">800.00 ETB</span>
                </div>

                {/* Status bar */}
                <div className="rounded-xl bg-orange-100/60 p-2.5 flex items-center justify-between text-xs text-orange-900 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-[#FF6B00]" />
                    Order in Progress
                  </span>
                  <span className="text-[10px] text-orange-700">Est. 10 min</span>
                </div>
              </div>

              {/* Quick Actions Grid & QR Generator Button */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => setQrModalTable(selectedTable)}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#073B4C] to-[#159A9C] p-3 text-xs font-black uppercase tracking-wider text-white shadow-md hover:brightness-110 transition-all"
                >
                  <QrCode className="h-4 w-4" />
                  Generate & Print Table QR
                </button>

                <div className="grid grid-cols-2 gap-2 text-xs font-bold text-gray-700">
                  <button
                    onClick={() => handleStatusChange('cleaning')}
                    className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-center"
                  >
                    Mark Cleaning
                  </button>
                  <button
                    onClick={() => handleStatusChange('available')}
                    className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-center"
                  >
                    Mark Ready
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl bg-white p-8 text-center text-gray-400 border border-gray-100">
              <Layers className="h-10 w-10 mx-auto text-gray-300 mb-2" />
              <p className="text-xs font-bold text-gray-600">Select any table on the floor plan</p>
              <p className="text-[10px] text-gray-400 mt-1">View details, assign waiters, and manage orders</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── PRINTABLE TABLE QR CODE MODAL ─── */}
      {qrModalTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm print:p-0 print:bg-white">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-gray-200 animate-in zoom-in-95 print:shadow-none print:border-none print:p-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 print:hidden">
              <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                <QrCode className="h-5 w-5 text-[#FF6B00]" />
                Official Table QR Tent Card
              </div>
              <button
                onClick={() => setQrModalTable(null)}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Printable Tent Card Canvas */}
            <div
              id="printable-tent-card"
              className="mt-4 rounded-3xl bg-gradient-to-b from-[#073B4C] via-[#0A1828] to-[#11161B] p-6 text-white text-center shadow-xl space-y-4 border-4 border-[#FF6B00]/30"
            >
              {/* Resort Branding */}
              <div className="space-y-1">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#FF6B00]">
                  TULE RESORT & SPA
                </p>
                <h2 className="text-2xl font-black tracking-tight text-white">
                  {qrModalTable.table_number}
                </h2>
                <p className="text-xs text-teal-200/90 font-medium">{qrModalTable.section}</p>
              </div>

              {/* Scannable QR Code Frame */}
              <div className="mx-auto w-52 h-52 bg-white rounded-2xl p-3 shadow-inner flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrImageUrl}
                  alt={`QR code for ${qrModalTable.table_number}`}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Instruction */}
              <div className="space-y-1">
                <p className="text-xs font-bold text-white">
                  Scan to View Menu &amp; Order
                </p>
                <p className="text-[10px] text-gray-300">
                  No app download needed • Direct table service
                </p>
                <p className="text-[9px] font-mono text-[#FF6B00] pt-1 truncate opacity-80">
                  {qrUrl}
                </p>
              </div>
            </div>

            {/* Print & Action Controls */}
            <div className="mt-6 flex items-center justify-end gap-2 print:hidden">
              <button
                onClick={() => setQrModalTable(null)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100"
              >
                Close
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 rounded-xl bg-[#FF6B00] px-5 py-2 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:bg-[#E85D04]"
              >
                <Printer className="h-4 w-4" />
                Print Table Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
