'use client';

import React, { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Layers,
  Maximize2,
  Plus,
  Printer,
  QrCode,
  Sparkles,
  Users,
  UtensilsCrossed,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { DiningTable, getDiningTables, updateTableStatus } from '@/lib/diningTables';
import { generateQrSvgUri } from '@/lib/qrCode';

const FLOOR_SECTIONS: DiningTable['section'][] = [
  'Floor 1',
  'Lake Terrace',
  'Poolside',
  'VIP Lounge',
];

export default function StaffTablesPage() {
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<DiningTable['section']>('Floor 1');
  const [selectedTable, setSelectedTable] = useState<DiningTable | null>(null);
  const [qrModalTable, setQrModalTable] = useState<DiningTable | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const qrModalTitleId = useId();

  useEffect(() => {
    let active = true;

    getDiningTables()
      .then((loaded) => {
        if (!active) return;
        setTables(loaded);
        const defaultTbl = loaded.find((t) => t.table_number.includes('07')) || loaded[0];
        if (defaultTbl) {
          setSelectedTable(defaultTbl);
          setSelectedFloor(defaultTbl.section);
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        setErrorMsg(err instanceof Error ? err.message : 'Unable to load dining tables.');
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!qrModalTable) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setQrModalTable(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [qrModalTable]);

  const floorTables = tables.filter((t) => t.section === selectedFloor);

  // Status counts
  const totalCount = tables.length || 24;
  const occupiedCount = tables.filter((t) => t.status === 'occupied').length;
  const availableCount = tables.filter((t) => t.status === 'available').length;
  const cleaningCount = tables.filter((t) => t.status === 'cleaning').length;
  const outOfServiceCount = tables.filter((t) => t.status === 'out_of_service').length;

  const handleStatusChange = async (newStatus: DiningTable['status']) => {
    if (!selectedTable) return;
    setErrorMsg('');
    setIsUpdating(true);

    const ok = await updateTableStatus(selectedTable.id, newStatus);
    setIsUpdating(false);

    if (!ok) {
      setErrorMsg(`Could not update ${selectedTable.table_number} to ${newStatus}.`);
      return;
    }

    setTables((prev) =>
      prev.map((t) => (t.id === selectedTable.id ? { ...t, status: newStatus } : t))
    );
    setSelectedTable((prev) => (prev ? { ...prev, status: newStatus } : null));
  };

  const getTableColorClass = (status: DiningTable['status'], isSelected: boolean) => {
    let base = '';
    if (status === 'occupied') {
      base = 'bg-[#163D32] text-[#F5F0E6] ring-2 ring-[#C5A46D] shadow-sm';
    } else if (status === 'available') {
      base = 'bg-emerald-600 text-white shadow-sm';
    } else if (status === 'cleaning') {
      base = 'bg-purple-700 text-white shadow-sm';
    } else {
      base = 'bg-[#52645D] text-white';
    }

    if (isSelected) {
      return `${base} ring-4 ring-[#C5A46D]/60 scale-110 z-20 shadow-xl`;
    }
    return `${base} shadow-xs hover:scale-105 z-10`;
  };

  // Printable table card QR link
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://tuleresort.com';
  const cleanQrToken = qrModalTable?.qr_token?.trim() || '';
  const hasValidQrToken = Boolean(cleanQrToken);
  const qrUrl =
    qrModalTable && hasValidQrToken
      ? `${currentOrigin}/guest/table/${encodeURIComponent(cleanQrToken)}`
      : '';
  let qrSvgDataUri = '';
  let qrGenerationError = '';
  if (qrModalTable && hasValidQrToken) {
    try {
      qrSvgDataUri = generateQrSvgUri(qrUrl, 260);
    } catch (err) {
      qrGenerationError = err instanceof Error ? err.message : 'Unable to encode table QR code.';
    }
  }

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadQrSvg = () => {
    if (!qrModalTable || !qrSvgDataUri) return;
    const safeName = qrModalTable.table_number.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
    const link = document.createElement('a');
    link.href = qrSvgDataUri;
    link.download = `tule-resort-${safeName}-qr.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-6 print:hidden">
        {/* ─── PAGE HEADER & NEW ACTION ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.22em] text-[#7A5A27]">
              Dining Floor
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#163D32] tracking-tight">
              Tables Layout
            </h1>
            <p className="text-xs text-[#52645D]">
              Manage table availability, seating and generate official QR tent cards
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!selectedTable}
              onClick={() => {
                if (selectedTable) setQrModalTable(selectedTable);
              }}
              className="flex items-center gap-2 rounded-xl bg-white border border-[#D5CCB9] px-4 py-2 text-xs font-bold text-[#163D32] shadow-xs hover:bg-[#F5F0E6] transition-colors cursor-pointer disabled:opacity-50"
            >
              <QrCode className="h-4 w-4 text-[#7A5A27]" aria-hidden="true" />
              Print Table QR
            </button>
            <Link
              href="/staff/dashboard/reservations"
              className="flex items-center gap-2 rounded-xl bg-[#163D32] hover:bg-[#0F2D24] border border-[#C5A46D]/30 px-4 py-2 text-xs font-bold text-[#F5F0E6] shadow-xs transition-colors"
            >
              <Plus className="h-4 w-4 text-[#C5A46D]" aria-hidden="true" />
              New Reservation
            </Link>
          </div>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800"
          >
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {errorMsg}
            </span>
            <button
              type="button"
              onClick={() => setErrorMsg('')}
              aria-label="Dismiss error"
              className="rounded-lg p-1 text-red-700 hover:bg-red-100"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* ─── 1. TOP KPI SUMMARY ROW ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
          {/* Occupied */}
          <div className="rounded-2xl bg-white p-4 shadow-xs border border-[#E6DFD1] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="h-8 w-8 rounded-xl bg-[#163D32]/10 text-[#163D32] flex items-center justify-center">
                <Layers className="h-4 w-4" aria-hidden="true" />
              </div>
              <span className="text-[11px] font-bold text-[#52645D]">
                {Math.round((occupiedCount / totalCount) * 100)}%
              </span>
            </div>
            <div className="mt-2">
              <p className="text-[11px] font-bold text-[#52645D]">Occupied</p>
              <p className="text-xl font-bold text-[#163D32]">
                {occupiedCount}{' '}
                <span className="text-xs font-semibold text-[#52645D]">/ {totalCount}</span>
              </p>
            </div>
            <div className="mt-2 h-1.5 w-full bg-[#F5F0E6] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#163D32] rounded-full"
                style={{ width: `${(occupiedCount / totalCount) * 100}%` }}
              />
            </div>
          </div>

          {/* Available */}
          <div className="rounded-2xl bg-white p-4 shadow-xs border border-[#E6DFD1] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              </div>
              <span className="text-[11px] font-bold text-[#52645D]">
                {Math.round((availableCount / totalCount) * 100)}%
              </span>
            </div>
            <div className="mt-2">
              <p className="text-[11px] font-bold text-[#52645D]">Available</p>
              <p className="text-xl font-bold text-[#163D32]">{availableCount}</p>
            </div>
            <div className="mt-2 h-1.5 w-full bg-[#F5F0E6] rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full"
                style={{ width: `${(availableCount / totalCount) * 100}%` }}
              />
            </div>
          </div>

          {/* Cleaning */}
          <div className="rounded-2xl bg-white p-4 shadow-xs border border-[#E6DFD1] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              </div>
              <span className="text-[11px] font-bold text-[#52645D]">
                {Math.round((cleaningCount / totalCount) * 100)}%
              </span>
            </div>
            <div className="mt-2">
              <p className="text-[11px] font-bold text-[#52645D]">Cleaning</p>
              <p className="text-xl font-bold text-[#163D32]">{cleaningCount}</p>
            </div>
            <div className="mt-2 h-1.5 w-full bg-[#F5F0E6] rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-700 rounded-full"
                style={{ width: `${(cleaningCount / totalCount) * 100}%` }}
              />
            </div>
          </div>

          {/* Out of Service */}
          <div className="rounded-2xl bg-white p-4 shadow-xs border border-[#E6DFD1] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="h-8 w-8 rounded-xl bg-[#F5F0E6] text-[#7A5A27] flex items-center justify-center">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              </div>
              <span className="text-[11px] font-bold text-[#52645D]">
                {Math.round((outOfServiceCount / totalCount) * 100)}%
              </span>
            </div>
            <div className="mt-2">
              <p className="text-[11px] font-bold text-[#52645D]">Out of Service</p>
              <p className="text-xl font-bold text-[#163D32]">{outOfServiceCount}</p>
            </div>
            <div className="mt-2 h-1.5 w-full bg-[#F5F0E6] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#52645D] rounded-full"
                style={{ width: `${(outOfServiceCount / totalCount) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* ─── 2. MAIN FLOOR PLAN + INSPECTOR DRAWER ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left (2 Cols): Interactive Floor Map */}
          <div className="lg:col-span-2 space-y-4">
            {/* Floor tabs & Zoom controls */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
                {FLOOR_SECTIONS.map((floor) => (
                  <button
                    key={floor}
                    type="button"
                    onClick={() => setSelectedFloor(floor)}
                    className={`rounded-xl px-4 py-2 text-xs font-bold whitespace-nowrap transition-colors ${
                      selectedFloor === floor
                        ? 'bg-[#163D32] text-[#F5F0E6] border border-[#C5A46D]/30 shadow-xs'
                        : 'bg-white text-[#52645D] hover:bg-[#EDE6D8] border border-[#E6DFD1]'
                    }`}
                  >
                    {floor}
                  </button>
                ))}
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 rounded-xl bg-white border border-[#E6DFD1] p-1 shadow-xs">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(1.4, Number((z + 0.1).toFixed(2))))}
                  className="p-1.5 rounded-lg text-[#163D32] hover:bg-[#F5F0E6]"
                  title="Zoom in"
                  aria-label="Zoom in floor map"
                >
                  <ZoomIn className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(0.8, Number((z - 0.1).toFixed(2))))}
                  className="p-1.5 rounded-lg text-[#163D32] hover:bg-[#F5F0E6]"
                  title="Zoom out"
                  aria-label="Zoom out floor map"
                >
                  <ZoomOut className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(1)}
                  className="p-1.5 rounded-lg text-[#163D32] hover:bg-[#F5F0E6]"
                  title="Reset zoom"
                  aria-label="Reset floor map zoom"
                >
                  <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Architectural Floor Plan Canvas */}
            <div className="relative aspect-[4/3] min-h-[340px] w-full rounded-3xl bg-[#F5F0E6] border border-[#D5CCB9] p-6 overflow-auto shadow-inner">
              {/* Visual Ambiance / Architectural markers */}
              <div className="pointer-events-none absolute top-4 left-6 z-10 rounded-2xl bg-white/90 border border-[#E6DFD1] px-4 py-2.5 text-xs font-bold text-[#163D32] flex items-center gap-2 shadow-xs">
                <UtensilsCrossed className="h-4 w-4 text-[#7A5A27]" aria-hidden="true" />
                Main Kitchen &amp; Prep Station
              </div>

              <div className="pointer-events-none absolute top-4 right-6 z-10 rounded-2xl bg-[#163D32]/10 border border-[#C5A46D]/30 px-5 py-2.5 text-xs font-bold text-[#163D32]">
                Cocktail &amp; Coffee Bar
              </div>

              <div className="pointer-events-none absolute bottom-4 right-6 z-10 rounded-full bg-white/95 border border-[#E6DFD1] px-4 py-1 text-[11px] font-bold text-[#52645D] shadow-xs">
                Entrance • Reception Lobby
              </div>

              {/* Render Tables */}
              <div
                className="relative w-full h-full min-w-[460px] min-h-[300px] transition-transform duration-200 origin-center"
                style={{ transform: `scale(${zoomLevel})` }}
              >
                {floorTables.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-xs font-semibold text-[#52645D]">
                    No active tables assigned to {selectedFloor}.
                  </div>
                ) : (
                  floorTables.map((table) => {
                    const isSelected = selectedTable?.id === table.id;
                    const num = table.table_number.replace(/[^0-9]/g, '') || '01';

                    return (
                      <button
                        key={table.id}
                        type="button"
                        onClick={() => setSelectedTable(table)}
                        aria-label={`Select ${table.table_number} (${table.capacity} seats, ${table.status})`}
                        aria-pressed={isSelected}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl flex flex-col items-center justify-center font-bold cursor-pointer transition-transform duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#C5A46D] ${getTableColorClass(
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
                        <span className="text-sm font-bold">{num}</span>
                        <span className="text-[9px] font-semibold opacity-90">
                          {table.capacity} seats
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Canvas Bottom Legend */}
              <div className="pointer-events-none absolute bottom-4 left-6 flex flex-wrap items-center gap-3 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-[#E6DFD1] text-[11px] font-bold text-[#163D32] shadow-xs">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#163D32] ring-1 ring-[#C5A46D]" /> Occupied
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" /> Available
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-purple-700" /> Cleaning
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#52645D]" /> Out of Service
                </span>
              </div>
            </div>
          </div>

          {/* Right (1 Col): Table Inspector Drawer */}
          <div className="space-y-4">
            {selectedTable ? (
              <div className="rounded-3xl bg-white p-6 shadow-xs border border-[#E6DFD1] space-y-5">
                {/* Table Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[#E6DFD1]">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-[#163D32] text-[#C5A46D] flex items-center justify-center font-bold">
                      <Layers className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-semibold text-[#163D32]">
                        {selectedTable.table_number}
                      </h2>
                      <p className="text-[11px] font-semibold text-[#52645D]">
                        {selectedTable.section}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold capitalize border ${
                      selectedTable.status === 'occupied'
                        ? 'bg-[#F5F0E6] text-[#7A5A27] border-[#C5A46D]/40'
                        : selectedTable.status === 'available'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : selectedTable.status === 'cleaning'
                        ? 'bg-purple-50 text-purple-800 border-purple-200'
                        : 'bg-[#F5F0E6] text-[#52645D] border-[#D5CCB9]'
                    }`}
                  >
                    {selectedTable.status.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Guest & Waiter info */}
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-[#52645D]">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Users className="h-4 w-4 text-[#7A5A27]" aria-hidden="true" />
                      Guests:
                    </span>
                    <span className="font-bold text-[#163D32]">
                      {selectedTable.guest_count || selectedTable.capacity} Guests
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[#52645D]">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Clock className="h-4 w-4 text-[#7A5A27]" aria-hidden="true" />
                      Occupied Since:
                    </span>
                    <span className="font-bold text-[#163D32]">
                      {selectedTable.occupied_since || 'Not recorded'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[#52645D]">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Users className="h-4 w-4 text-[#7A5A27]" aria-hidden="true" />
                      Assigned Waiter:
                    </span>
                    <span className="font-bold text-[#163D32]">
                      {selectedTable.active_waiter || 'Front Desk / Waitstaff'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/staff/dashboard/orders"
                    className="rounded-xl bg-[#163D32] hover:bg-[#0F2D24] border border-[#C5A46D]/30 px-4 py-2.5 text-xs font-bold text-[#F5F0E6] text-center shadow-xs transition-colors"
                  >
                    View All Orders
                  </Link>
                  <button
                    type="button"
                    onClick={() =>
                      handleStatusChange(
                        selectedTable.status === 'occupied' ? 'available' : 'occupied'
                      )
                    }
                    disabled={isUpdating}
                    className="rounded-xl bg-[#F5F0E6] hover:bg-[#EDE6D8] border border-[#E6DFD1] px-4 py-2.5 text-xs font-bold text-[#163D32] text-center transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {selectedTable.status === 'occupied' ? 'Clear Table' : 'Seat Table'}
                  </button>
                </div>

                {/* Table Seating State Card */}
                {selectedTable.status === 'occupied' ? (
                  <div className="rounded-2xl bg-[#F5F0E6]/80 p-4 border border-[#E6DFD1] space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b border-[#E6DFD1]">
                      <span className="text-xs font-bold text-[#163D32]">Seated Table Status</span>
                      <span className="text-[10px] font-bold text-[#F5F0E6] bg-[#163D32] px-2.5 py-0.5 rounded-full">
                        Occupied
                      </span>
                    </div>
                    <p className="text-xs text-[#52645D]">
                      Guests are currently seated at {selectedTable.table_number}. When orders are
                      placed via table QR code, dishes and tickets appear on the orders dispatch
                      board.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-[#F5F0E6]/60 p-5 border border-[#E6DFD1] text-center space-y-2">
                    <div className="h-10 w-10 mx-auto rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <p className="text-xs font-bold text-[#163D32]">Table Available</p>
                    <p className="text-[11px] text-[#52645D] max-w-[240px] mx-auto">
                      No active orders on this table. Seat guests or generate an official Table QR
                      tent card for direct table ordering.
                    </p>
                  </div>
                )}

                {/* Quick Actions Grid & QR Generator Button */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setQrModalTable(selectedTable)}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#163D32] to-[#0F2D24] border border-[#C5A46D]/40 p-3 text-xs font-bold uppercase tracking-wider text-[#F5F0E6] shadow-xs hover:brightness-110 transition-all cursor-pointer"
                  >
                    <QrCode className="h-4 w-4 text-[#C5A46D]" aria-hidden="true" />
                    Generate &amp; Print Table QR
                  </button>

                  <div className="grid grid-cols-2 gap-2 text-xs font-bold text-[#163D32]">
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleStatusChange('cleaning')}
                      className="p-2.5 rounded-xl border border-[#D5CCB9] hover:bg-[#F5F0E6] text-center cursor-pointer disabled:opacity-50"
                    >
                      Mark Cleaning
                    </button>
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleStatusChange('available')}
                      className="p-2.5 rounded-xl border border-[#D5CCB9] hover:bg-[#F5F0E6] text-center cursor-pointer disabled:opacity-50"
                    >
                      Mark Available
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl bg-white p-8 text-center text-[#52645D] border border-[#E6DFD1]">
                <Layers className="h-10 w-10 mx-auto text-[#C5A46D] mb-2" aria-hidden="true" />
                <p className="text-xs font-bold text-[#163D32]">
                  Select any table on the floor plan
                </p>
                <p className="text-[11px] text-[#52645D] mt-1">
                  View details, assign waiters, and manage orders
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── PRINTABLE TABLE QR CODE MODAL ─── */}
      {qrModalTable && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F2D24]/70 backdrop-blur-sm print:static print:inset-auto print:p-0 print:bg-white"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setQrModalTable(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={qrModalTitleId}
            className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-[#E6DFD1] animate-in zoom-in-95 print:shadow-none print:border-none print:p-0 print:max-w-sm print:mx-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E6DFD1] print:hidden">
              <div
                id={qrModalTitleId}
                className="flex items-center gap-2 text-[#163D32] font-bold text-sm"
              >
                <QrCode className="h-5 w-5 text-[#7A5A27]" aria-hidden="true" />
                Official Table QR Tent Card
              </div>
              <button
                type="button"
                aria-label="Close QR card modal"
                onClick={() => setQrModalTable(null)}
                className="p-1.5 rounded-lg text-[#52645D] hover:bg-[#F5F0E6] hover:text-[#163D32] cursor-pointer"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {/* Printable Tent Card Canvas */}
            <div
              id="printable-tent-card"
              className="mt-4 rounded-3xl bg-gradient-to-b from-[#163D32] via-[#0F2D24] to-[#0A1F18] p-6 text-[#F5F0E6] text-center shadow-xl space-y-4 border-4 border-[#C5A46D]/45 print:mt-0 print:shadow-none"
            >
              <div className="space-y-1">
                <div className="mx-auto w-14 h-14 rounded-xl bg-black/30 border border-[#C5A46D]/30 overflow-hidden flex items-center justify-center p-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/tule-resort-logo.png"
                    alt="Tule Resort Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#C5A46D]">
                  TULE RESORT &amp; SPA
                </p>
                <h2 className="text-2xl font-bold tracking-tight text-[#F5F0E6] font-display">
                  {qrModalTable.table_number}
                </h2>
                <p className="text-xs text-[#E6DFD1]/90 font-medium">{qrModalTable.section}</p>
              </div>

              <div className="mx-auto w-52 h-52 bg-white rounded-2xl p-2 shadow-inner flex items-center justify-center">
                {qrSvgDataUri ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={qrSvgDataUri}
                    alt={`QR code for ${qrModalTable.table_number}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="px-3 text-center text-xs font-semibold text-rose-700">
                    {qrGenerationError ||
                      'Missing QR token for this table. Please configure a QR token before printing.'}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold text-[#F5F0E6]">Scan to View Menu &amp; Order</p>
                <p className="text-[10px] text-[#E6DFD1]/80">
                  No app download needed • Direct table service
                </p>
                <p className="text-[9px] font-mono text-[#C5A46D] pt-1 truncate opacity-90">
                  {qrUrl || 'No QR token configured'}
                </p>
              </div>
            </div>

            {/* Print & Action Controls */}
            <div className="mt-6 flex flex-wrap items-center justify-end gap-2 print:hidden">
              <button
                type="button"
                onClick={() => setQrModalTable(null)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-[#52645D] hover:bg-[#F5F0E6] cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                disabled={!qrSvgDataUri}
                onClick={handleDownloadQrSvg}
                className="flex items-center gap-2 rounded-xl border border-[#D5CCB9] bg-white px-4 py-2 text-xs font-bold text-[#163D32] hover:bg-[#F5F0E6] disabled:opacity-50 cursor-pointer"
              >
                <Download className="h-4 w-4 text-[#7A5A27]" aria-hidden="true" />
                Download SVG
              </button>
              <button
                type="button"
                disabled={!qrSvgDataUri}
                onClick={handlePrint}
                className="flex items-center gap-2 rounded-xl bg-[#163D32] hover:bg-[#0F2D24] border border-[#C5A46D]/30 px-5 py-2 text-xs font-bold text-[#F5F0E6] shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <Printer className="h-4 w-4 text-[#C5A46D]" aria-hidden="true" />
                Print Table Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
