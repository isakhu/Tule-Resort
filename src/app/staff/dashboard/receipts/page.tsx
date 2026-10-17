'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Plus,
  Printer,
  BedDouble,
  Receipt as ReceiptIcon,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  LogOut,
  ChevronRight,
  ShieldCheck,
  CreditCard
} from 'lucide-react';
import supabase from '@/lib/supabaseClient';

interface Receipt {
  id: string;
  receipt_number: string;
  reservation_id: string | null;
  guest_name: string;
  room_number: string | null;
  subtotal: number;
  service_charge_percent: number;
  service_charge: number;
  tax_percent: number;
  tax: number;
  total: number;
  currency: string;
  payment_method: string;
  processed_by: string | null;
  created_at: string;
}

interface CheckedInStay {
  id: string;
  booking_number: string;
  guest_name: string;
  guest_phone: string;
  check_in: string;
  check_out: string;
  room?: { name: string } | null;
}

interface FolioCharge {
  id: string;
  source_type: string;
  source_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  posted_at: string;
}

interface FolioData {
  stay: {
    id: string;
    booking_number: string;
    guest_name: string;
    room_name: string;
    check_in: string;
    check_out: string;
  };
  charges: FolioCharge[];
  subtotal: number;
  service_charge_percent: number;
  service_charge: number;
  tax_percent: number;
  tax: number;
  total: number;
  currency: string;
}

export default function ReceiptsAndFolioPage() {
  const [activeTab, setActiveTab] = useState<'folio' | 'receipts'>('folio');
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [checkedInStays, setCheckedInStays] = useState<CheckedInStay[]>([]);
  const [selectedStayId, setSelectedStayId] = useState<string | null>(null);
  const [folio, setFolio] = useState<FolioData | null>(null);
  const [loadingFolio, setLoadingFolio] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Manual charge form
  const [chargeDesc, setChargeDesc] = useState('');
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeQty, setChargeQty] = useState('1');
  const [addingCharge, setAddingCharge] = useState(false);

  // Checkout form
  const [paymentMethod, setPaymentMethod] = useState('pay_at_resort');
  const [processingCheckout, setProcessingCheckout] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load receipts and checked-in reservations
  const loadData = useCallback(async () => {
    setLoadingData(true);
    // 1. Fetch receipts archive
    const { data: recData } = await supabase
      .from('resort_receipts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setReceipts(recData ?? []);

    // 2. Fetch active checked_in reservations
    const { data: staysData } = await supabase
      .from('room_reservations')
      .select('id, booking_number, guest_name, guest_phone, check_in, check_out, room:rooms(name)')
      .eq('status', 'checked_in')
      .order('check_in', { ascending: true });

    const stays = (staysData ?? []).map((s: any) => ({
      ...s,
      room: Array.isArray(s.room) ? s.room[0] : s.room,
    }));
    setCheckedInStays(stays);

    // Auto-select first stay if none selected
    if (stays.length > 0 && !selectedStayId) {
      setSelectedStayId(stays[0].id);
    }

    setLoadingData(false);
  }, [selectedStayId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load folio when a stay is selected
  const loadFolio = useCallback(async (stayId: string) => {
    setLoadingFolio(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/folio/${stayId}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setFolio(data);
      } else {
        setFeedback({ type: 'error', text: data.error || 'Failed to load folio.' });
        setFolio(null);
      }
    } catch {
      setFeedback({ type: 'error', text: 'Network error retrieving folio.' });
    } finally {
      setLoadingFolio(false);
    }
  }, []);

  useEffect(() => {
    if (selectedStayId) {
      loadFolio(selectedStayId);
    }
  }, [selectedStayId, loadFolio]);

  // Handle Add Manual Charge
  const handleAddCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStayId || !chargeDesc.trim() || !chargeAmount) return;

    setAddingCharge(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/folio/${selectedStayId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: chargeDesc.trim(),
          amount: Number(chargeAmount),
          quantity: Number(chargeQty) || 1,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback({ type: 'success', text: 'Charge added to folio.' });
        setChargeDesc('');
        setChargeAmount('');
        setChargeQty('1');
        await loadFolio(selectedStayId);
      } else {
        setFeedback({ type: 'error', text: json.error || 'Failed to post charge.' });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Network error posting charge.' });
    } finally {
      setAddingCharge(false);
    }
  };

  // Handle Checkout & Generate Receipt from Folio
  const handleCheckout = async () => {
    if (!selectedStayId || !folio) return;
    if (!confirm(`Confirm checkout and receipt generation for ${folio.stay.guest_name} (${folio.total.toLocaleString()} ${folio.currency})?`)) return;

    setProcessingCheckout(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/folio/${selectedStayId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod,
          processedBy: 'Front Desk Cashier',
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback({
          type: 'success',
          text: `Checkout complete! Receipt #${json.receipt_number} generated from folio.`
        });
        setSelectedStayId(null);
        setFolio(null);
        await loadData();
        setActiveTab('receipts');
      } else {
        setFeedback({ type: 'error', text: json.error || 'Checkout failed.' });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Network error executing checkout.' });
    } finally {
      setProcessingCheckout(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F5EE] px-4 py-8 md:px-8 text-[#182326]">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#0B3D4A]/10 pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0B3D4A] text-white shadow-md">
              <FileText className="h-6 w-6 text-[#159A9C]" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#159A9C]">
                Front Desk Operations
              </p>
              <h1 className="font-display text-3xl font-black text-[#0B3D4A]">
                Guest Folio &amp; Checkout Engine
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('folio')}
              className={`rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition ${
                activeTab === 'folio'
                  ? 'bg-[#0B3D4A] text-[#F8D77A] shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-[#0B3D4A]/10'
              }`}
            >
              Active Guest Folios ({checkedInStays.length})
            </button>
            <button
              onClick={() => setActiveTab('receipts')}
              className={`rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition ${
                activeTab === 'receipts'
                  ? 'bg-[#0B3D4A] text-[#F8D77A] shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-[#0B3D4A]/10'
              }`}
            >
              Receipts Archive ({receipts.length})
            </button>
          </div>
        </header>

        {/* Global Feedback Banner */}
        {feedback && (
          <div
            className={`rounded-2xl p-4 text-xs font-bold flex items-center justify-between ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <span>{feedback.text}</span>
            <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-gray-700">✕</button>
          </div>
        )}

        {/* ─── TAB 1: ACTIVE FOLIOS & CHECKOUT ─── */}
        {activeTab === 'folio' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Checked-in guest list */}
            <div className="lg:col-span-4 space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-black uppercase tracking-wider text-[#0B3D4A]">
                  Checked-In Guests
                </span>
                <span className="text-xs text-gray-500 font-bold">
                  {checkedInStays.length} active
                </span>
              </div>

              {checkedInStays.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-[#0B3D4A]/20 bg-white p-8 text-center space-y-2">
                  <BedDouble className="mx-auto h-8 w-8 text-[#0B3D4A]/30" />
                  <p className="font-bold text-sm text-[#0B3D4A]">No Checked-In Guests</p>
                  <p className="text-xs text-gray-500">
                    Check in a reservation from the Reservations dashboard to manage their live folio.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
                  {checkedInStays.map((stay) => {
                    const isSelected = selectedStayId === stay.id;
                    return (
                      <button
                        key={stay.id}
                        onClick={() => setSelectedStayId(stay.id)}
                        className={`w-full text-left rounded-2xl p-4 transition border ${
                          isSelected
                            ? 'bg-[#0B3D4A] text-white border-[#0B3D4A] shadow-md ring-2 ring-[#0B3D4A]/20'
                            : 'bg-white text-gray-800 border-[#0B3D4A]/10 hover:border-[#159A9C]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            isSelected ? 'bg-white/15 text-[#F8D77A]' : 'bg-[#EAF4F7] text-[#0B4F6C]'
                          }`}>
                            {stay.booking_number}
                          </span>
                          <span className="text-[10px] opacity-70">
                            {stay.check_in} — {stay.check_out}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-base mt-2">{stay.guest_name}</h4>
                        <p className={`text-xs mt-0.5 ${isSelected ? 'text-white/70' : 'text-gray-500'}`}>
                          {stay.room?.name || 'Assigned Room'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Folio Details & Checkout Console */}
            <div className="lg:col-span-8 space-y-6">
              {loadingFolio ? (
                <div className="rounded-3xl bg-white p-16 text-center border border-[#0B3D4A]/10">
                  <div className="h-8 w-8 mx-auto rounded-full border-4 border-[#0B3D4A] border-t-transparent animate-spin mb-3" />
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">
                    Loading guest folio from server...
                  </p>
                </div>
              ) : !folio ? (
                <div className="rounded-3xl bg-white p-16 text-center border border-[#0B3D4A]/10 space-y-3">
                  <ReceiptIcon className="mx-auto h-12 w-12 text-[#0B3D4A]/20" />
                  <h3 className="text-lg font-black text-[#0B3D4A]">Select a Stay to View Folio</h3>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    Select any checked-in guest on the left to inspect charges, add incidentals, and calculate taxes.
                  </p>
                </div>
              ) : (
                <div className="rounded-3xl bg-white p-6 md:p-8 shadow-sm border border-[#0B3D4A]/10 space-y-6">
                  {/* Folio Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#159A9C]">
                        Live Folio Summary
                      </span>
                      <h2 className="text-2xl font-black text-[#0B3D4A] mt-1">
                        {folio.stay.guest_name}
                      </h2>
                      <p className="text-xs text-gray-500">
                        {folio.stay.room_name} • Booking: <span className="font-mono font-bold text-[#0B3D4A]">{folio.stay.booking_number}</span>
                      </p>
                    </div>

                    <button
                      onClick={() => selectedStayId && loadFolio(selectedStayId)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100 self-start sm:self-center"
                    >
                      <RotateCw className="w-3.5 h-3.5" /> Refresh Folio
                    </button>
                  </div>

                  {/* Charges Table */}
                  <div className="space-y-2">
                    <p className="text-xs font-black uppercase tracking-wider text-[#0B3D4A]">
                      Itemized Charges ({folio.charges.length})
                    </p>
                    <div className="overflow-x-auto rounded-2xl border border-gray-100">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#0B3D4A]/5 text-gray-700 font-bold border-b border-gray-100">
                          <tr>
                            <th className="p-3">Source</th>
                            <th className="p-3">Description</th>
                            <th className="p-3 text-right">Qty</th>
                            <th className="p-3 text-right">Unit Price</th>
                            <th className="p-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {folio.charges.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-4 text-center text-gray-400">
                                No charges posted to this stay yet.
                              </td>
                            </tr>
                          ) : (
                            folio.charges.map((c) => (
                              <tr key={c.id} className="hover:bg-gray-50/50">
                                <td className="p-3">
                                  <span className="capitalize rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                                    {c.source_type}
                                  </span>
                                </td>
                                <td className="p-3 font-semibold text-gray-800">{c.description}</td>
                                <td className="p-3 text-right text-gray-600">{c.quantity}</td>
                                <td className="p-3 text-right text-gray-600">{Number(c.unit_price).toLocaleString()}</td>
                                <td className="p-3 text-right font-black text-gray-900">{Number(c.amount).toLocaleString()} ETB</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Add Manual Charge Box */}
                  <form onSubmit={handleAddCharge} className="rounded-2xl bg-[#F8F5EE] p-4 border border-[#0B3D4A]/10 space-y-3">
                    <p className="text-xs font-black uppercase tracking-wider text-[#0B3D4A]">
                      Add Manual / Incidental Charge
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <input
                        required
                        type="text"
                        placeholder="Description (e.g. Minibar, Laundry)"
                        value={chargeDesc}
                        onChange={(e) => setChargeDesc(e.target.value)}
                        className="sm:col-span-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-[#159A9C]"
                      />
                      <input
                        required
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="Price (ETB)"
                        value={chargeAmount}
                        onChange={(e) => setChargeAmount(e.target.value)}
                        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-[#159A9C]"
                      />
                      <button
                        disabled={addingCharge}
                        type="submit"
                        className="rounded-xl bg-[#0B3D4A] px-4 py-2 text-xs font-bold text-white hover:bg-[#159A9C] transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {addingCharge ? 'Adding...' : 'Post Charge'}
                      </button>
                    </div>
                  </form>

                  {/* Server Calculation Totals Card */}
                  <div className="rounded-2xl bg-gradient-to-br from-[#0B3D4A] to-[#0E353F] text-white p-6 space-y-3 shadow-lg">
                    <div className="flex justify-between text-xs font-medium opacity-80">
                      <span>Charges Subtotal:</span>
                      <span className="font-mono">{folio.subtotal.toLocaleString()} {folio.currency}</span>
                    </div>
                    <div className="flex justify-between text-xs font-medium opacity-80">
                      <span>Resort Service Charge ({folio.service_charge_percent}%):</span>
                      <span className="font-mono">{folio.service_charge.toLocaleString()} {folio.currency}</span>
                    </div>
                    <div className="flex justify-between text-xs font-medium opacity-80 border-b border-white/10 pb-3">
                      <span>Government Tax / VAT ({folio.tax_percent}%):</span>
                      <span className="font-mono">{folio.tax.toLocaleString()} {folio.currency}</span>
                    </div>
                    <div className="flex justify-between text-lg font-black pt-1">
                      <span className="text-[#F8D77A]">Grand Total Due:</span>
                      <span className="text-[#F8D77A] font-mono">{folio.total.toLocaleString()} {folio.currency}</span>
                    </div>
                  </div>

                  {/* Checkout Action Console */}
                  <div className="rounded-2xl border border-gray-200 p-5 space-y-4">
                    <p className="text-xs font-black uppercase tracking-wider text-[#0B3D4A]">
                      Complete Guest Checkout
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <label className="text-xs font-bold text-gray-700">Payment Method:</label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-800 outline-none focus:border-[#159A9C]"
                        >
                          <option value="pay_at_resort">Cash / Card at Resort</option>
                          <option value="telebirr">Telebirr</option>
                          <option value="cbe_birr">CBE Birr</option>
                          <option value="bank_transfer">Bank Transfer</option>
                        </select>
                      </div>

                      <button
                        disabled={processingCheckout || folio.total <= 0}
                        onClick={handleCheckout}
                        className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-700/20 hover:brightness-110 transition disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <CreditCard className="w-4 h-4" />
                        {processingCheckout ? 'Generating Receipt...' : `Mark Paid & Check Out (${folio.total.toLocaleString()} ETB)`}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 2: RECEIPTS ARCHIVE ─── */}
        {activeTab === 'receipts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-[#0B3D4A]">
                Official Generated Receipts Archive
              </span>
              <span className="text-xs text-gray-500 font-bold">{receipts.length} total receipts</span>
            </div>

            <div className="overflow-x-auto rounded-[2rem] bg-white border border-[#0B3D4A]/10 shadow-sm">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-[#0B3D4A] text-white">
                  <tr>
                    <th className="p-4">Receipt</th>
                    <th className="p-4">Guest</th>
                    <th className="p-4 text-right">Subtotal</th>
                    <th className="p-4 text-right">Service &amp; Tax</th>
                    <th className="p-4 text-right">Total</th>
                    <th className="p-4">Payment</th>
                    <th className="p-4">Date</th>
                    <th className="p-4 text-center">Print</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {receipts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-400">
                        No receipts generated yet. Receipts will automatically appear here once guests check out.
                      </td>
                    </tr>
                  ) : (
                    receipts.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="p-4 font-bold text-[#0B3D4A] font-mono">{r.receipt_number}</td>
                        <td className="p-4">
                          <span className="font-extrabold">{r.guest_name}</span>
                          {r.room_number && (
                            <span className="block text-xs text-black/40">{r.room_number}</span>
                          )}
                        </td>
                        <td className="p-4 text-right font-medium">{Number(r.subtotal).toLocaleString()} {r.currency}</td>
                        <td className="p-4 text-right text-gray-500 text-xs">
                          {(Number(r.service_charge) + Number(r.tax)).toLocaleString()} {r.currency}
                        </td>
                        <td className="p-4 text-right font-black text-[#0B3D4A]">
                          {Number(r.total).toLocaleString()} {r.currency}
                        </td>
                        <td className="p-4 capitalize">
                          <span className="rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-xs font-bold">
                            {r.payment_method.replaceAll('_', ' ')}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-gray-500">
                          {new Date(r.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => window.print()}
                            className="rounded-lg bg-[#F8F5EE] p-2 hover:bg-[#159A9C]/10 transition"
                            title="Print Receipt"
                          >
                            <Printer className="h-4 w-4 text-[#0B3D4A]" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
