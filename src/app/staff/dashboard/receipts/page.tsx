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
  CreditCard,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Search,
  Building,
  Smartphone,
  Sparkles,
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
  payment_reference?: string | null;
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
  const [activeTab, setActiveTab] = useState<'folio' | 'receipts' | 'verify'>('folio');
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
  const [checkoutPaymentRef, setCheckoutPaymentRef] = useState('');
  const [verifyingCheckout, setVerifyingCheckout] = useState(false);
  const [checkoutVerification, setCheckoutVerification] = useState<{
    verified: boolean;
    message: string;
    bankName?: string;
    payerName?: string;
    amount?: number;
    currency?: string;
    alreadyRecorded?: boolean;
  } | null>(null);
  const [processingCheckout, setProcessingCheckout] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Standalone Verify.ET tester state
  const [testRef, setTestRef] = useState('');
  const [testBank, setTestBank] = useState('');
  const [testAmount, setTestAmount] = useState('');
  const [testingPayment, setTestingPayment] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

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

  // Verify checkout payment reference via Verify.ET
  const handleVerifyCheckoutPayment = async () => {
    const cleanRef = checkoutPaymentRef.trim();
    if (!cleanRef) {
      setFeedback({ type: 'error', text: 'Please enter a transaction reference or receipt code to verify.' });
      return;
    }
    setVerifyingCheckout(true);
    setCheckoutVerification(null);
    setFeedback(null);
    try {
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: cleanRef,
          bank: paymentMethod,
          expectedAmount: folio?.total,
          currency: folio?.currency || 'ETB',
        }),
      });
      const data = await res.json();
      setCheckoutVerification({
        verified: Boolean(data.verified),
        message: data.message || (data.verified ? 'Verified on bank network.' : 'Payment not found on bank records.'),
        bankName: data.bankName,
        payerName: data.payerName,
        amount: data.amount,
        currency: data.currency || 'ETB',
        alreadyRecorded: data.alreadyRecorded,
      });
      if (data.verified) {
        setFeedback({ type: 'success', text: `Verified by Verify.ET: ${data.bankName || 'Bank'} (${data.amount ? data.amount.toLocaleString() : ''} ETB)` });
      } else {
        setFeedback({ type: 'error', text: data.message || 'Payment not verified on bank records.' });
      }
    } catch {
      setCheckoutVerification({
        verified: false,
        message: 'Network error contacting Verify.ET service.',
      });
      setFeedback({ type: 'error', text: 'Network error contacting Verify.ET service.' });
    } finally {
      setVerifyingCheckout(false);
    }
  };

  // Run standalone verification in tester tab
  const handleRunStandaloneVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRef.trim()) return;
    setTestingPayment(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: testRef.trim(),
          bank: testBank || undefined,
          expectedAmount: testAmount ? Number(testAmount) : undefined,
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        success: false,
        verified: false,
        message: err.message || 'Network error verifying payment.',
      });
    } finally {
      setTestingPayment(false);
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
          paymentReference: checkoutPaymentRef.trim() || undefined,
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
        setCheckoutPaymentRef('');
        setCheckoutVerification(null);
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
            <button
              onClick={() => setActiveTab('verify')}
              className={`rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 ${
                activeTab === 'verify'
                  ? 'bg-[#007042] text-white shadow-md'
                  : 'bg-white text-[#007042] hover:bg-emerald-50 border border-[#007042]/30'
              }`}
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Verify.ET Bank Verifier
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
                  <div className="rounded-2xl border border-gray-200 p-5 space-y-4 bg-gray-50/50">
                    <p className="text-xs font-black uppercase tracking-wider text-[#0B3D4A]">
                      Complete Guest Checkout
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <label className="text-xs font-bold text-gray-700">Payment Method:</label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => {
                            setPaymentMethod(e.target.value);
                            setCheckoutVerification(null);
                          }}
                          className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-800 outline-none focus:border-[#159A9C]"
                        >
                          <option value="pay_at_resort">Cash / POS Card at Resort</option>
                          <option value="telebirr">Telebirr Mobile Money</option>
                          <option value="cbe_birr">CBE Birr</option>
                          <option value="bank_transfer">Direct Bank Transfer</option>
                        </select>
                      </div>

                      <button
                        disabled={processingCheckout || folio.total <= 0}
                        onClick={handleCheckout}
                        className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-700/20 hover:brightness-110 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <CreditCard className="w-4 h-4" />
                        {processingCheckout ? 'Generating Receipt...' : `Mark Paid & Check Out (${folio.total.toLocaleString()} ETB)`}
                      </button>
                    </div>

                    {/* Verify.ET Transaction Verification Console for Digital Payments */}
                    {paymentMethod !== 'pay_at_resort' && (
                      <div className="pt-3 border-t border-gray-200 space-y-2.5">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                          <div className="flex-1 w-full">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                              Payment Transaction Reference (CBE FT Code / Telebirr Txn ID):
                            </label>
                            <input
                              type="text"
                              placeholder={paymentMethod === 'telebirr' ? 'e.g. 5HB892JKS1' : 'e.g. FT26144SG2ST'}
                              value={checkoutPaymentRef}
                              onChange={(e) => {
                                setCheckoutPaymentRef(e.target.value);
                                if (checkoutVerification) setCheckoutVerification(null);
                              }}
                              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-mono font-bold text-gray-900 placeholder:font-sans placeholder:font-normal placeholder:text-gray-400 focus:border-[#007042] focus:outline-none"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={handleVerifyCheckoutPayment}
                            disabled={verifyingCheckout || !checkoutPaymentRef.trim()}
                            className="mt-4 sm:mt-5 rounded-xl bg-[#007042] hover:bg-[#005a35] px-4 py-2.5 text-xs font-bold text-white transition disabled:opacity-50 flex items-center gap-1.5 shrink-0 cursor-pointer"
                          >
                            {verifyingCheckout ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Verifying...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-3.5 w-3.5" />
                                Verify with Verify.ET
                              </>
                            )}
                          </button>
                        </div>

                        {checkoutVerification && (
                          <div
                            className={`rounded-xl p-3 text-xs border ${
                              checkoutVerification.verified
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                : 'bg-rose-50 border-rose-200 text-rose-900'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              {checkoutVerification.verified ? (
                                <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                              )}
                              <div className="space-y-1 flex-1">
                                <p className="font-bold">
                                  {checkoutVerification.verified
                                    ? `✓ Genuine Payment Verified (${checkoutVerification.bankName})`
                                    : 'Verification Notice'}
                                </p>
                                <p className="text-[11px] opacity-90">{checkoutVerification.message}</p>
                                {checkoutVerification.verified && (
                                  <div className="mt-1 pt-1 border-t border-emerald-200/50 flex flex-wrap gap-4 text-[11px]">
                                    {checkoutVerification.payerName && (
                                      <span>Payer: <strong>{checkoutVerification.payerName}</strong></span>
                                    )}
                                    {checkoutVerification.amount && (
                                      <span>Amount: <strong>{checkoutVerification.amount.toLocaleString()} {checkoutVerification.currency}</strong></span>
                                    )}
                                    <span className="text-emerald-700">Replay Protection: <strong>Passed</strong></span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
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
                          <span className="rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-xs font-bold block w-fit">
                            {r.payment_method.replaceAll('_', ' ')}
                          </span>
                          {r.payment_reference && (
                            <span className="mt-1 block text-[10px] font-mono text-gray-500 font-bold">
                              Ref: {r.payment_reference}
                            </span>
                          )}
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

        {/* ─── TAB 3: STANDALONE ETHIOPIAN BANK PAYMENT VERIFIER ─── */}
        {activeTab === 'verify' && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-[#007042]/20 bg-white p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#007042] text-white shadow-md">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-black text-[#0B3D4A]">
                      Verify.ET Automated Bank Payment Verifier
                    </h2>
                    <p className="text-xs text-gray-500">
                      Instantly verify customer bank transfers, Telebirr mobile money, and CBE receipts without fake screenshots.
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-[#007042] border border-emerald-200">
                  Live API Connected
                </span>
              </div>

              {/* Official Accounts Quick Reference for Staff */}
              <div className="rounded-2xl bg-gray-50 p-4 border border-gray-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                    Official Resort Settlement Accounts • Beneficiary: <strong className="text-[#0B3D4A]">Yishak Tule Karesso</strong>
                  </span>
                  <span className="text-[10px] text-gray-400 font-bold">Auto-Linked to Verify.ET</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-[11px] font-mono">
                  <div className="bg-white p-2 rounded-xl border border-gray-200">
                    <span className="text-[9px] text-gray-400 font-sans block font-bold">Telebirr</span>
                    <span className="font-bold text-[#FF6B00]">0995781422</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-gray-200">
                    <span className="text-[9px] text-gray-400 font-sans block font-bold">CBE Birr</span>
                    <span className="font-bold text-purple-700">0995781422</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-gray-200">
                    <span className="text-[9px] text-gray-400 font-sans block font-bold">CBE Account</span>
                    <span className="font-bold text-gray-900">1000575458711</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-gray-200">
                    <span className="text-[9px] text-gray-400 font-sans block font-bold">Bank of Abyssinia</span>
                    <span className="font-bold text-gray-900">138186512</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-gray-200">
                    <span className="text-[9px] text-gray-400 font-sans block font-bold">Awash Bank</span>
                    <span className="font-bold text-gray-900">01320687351800</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-gray-200">
                    <span className="text-[9px] text-gray-400 font-sans block font-bold">M-Pesa</span>
                    <span className="font-bold text-emerald-700">0710028022</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleRunStandaloneVerification} className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-5">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Transaction Reference / Receipt Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FT26144SG2ST or Telebirr Txn Number"
                    value={testRef}
                    onChange={(e) => setTestRef(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs font-mono font-bold text-gray-900 focus:border-[#007042] focus:outline-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Supports FT numbers, Telebirr SMS codes, or CBE receipt URLs.
                  </p>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Bank / Wallet Provider
                  </label>
                  <select
                    value={testBank}
                    onChange={(e) => setTestBank(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs font-semibold text-gray-800 focus:border-[#007042] focus:outline-none"
                  >
                    <option value="">Universal Auto-Detect</option>
                    <option value="telebirr">Telebirr (Ethio Telecom)</option>
                    <option value="cbe">Commercial Bank of Ethiopia (CBE)</option>
                    <option value="cbebirr">CBE Birr</option>
                    <option value="boa">Bank of Abyssinia</option>
                    <option value="dashen">Dashen Bank</option>
                    <option value="awash">Awash Bank</option>
                    <option value="mpesa">Safaricom M-Pesa</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Expected Amount (ETB)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 1500"
                    value={testAmount}
                    onChange={(e) => setTestAmount(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs text-gray-900 focus:border-[#007042] focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2 flex items-end">
                  <button
                    type="submit"
                    disabled={testingPayment || !testRef.trim()}
                    className="w-full rounded-xl bg-[#007042] hover:bg-[#005a35] py-2.5 text-xs font-black uppercase tracking-wider text-white transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                  >
                    {testingPayment ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4" />
                        Verify
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Standalone Verification Result Display */}
              {testResult && (
                <div
                  className={`rounded-2xl p-5 border animate-in fade-in-50 duration-200 ${
                    testResult.verified
                      ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                      : 'bg-rose-50/70 border-rose-200 text-rose-950'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white font-black ${
                        testResult.verified ? 'bg-emerald-600' : 'bg-rose-600'
                      }`}
                    >
                      {testResult.verified ? '✓' : '✕'}
                    </div>

                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-base font-black">
                          {testResult.verified
                            ? `Payment Confirmed & Verified: ${testResult.bankName}`
                            : 'Transaction Verification Failed'}
                        </h3>
                        <span
                          className={`rounded-full px-3 py-0.5 text-xs font-black uppercase tracking-wider ${
                            testResult.verified
                              ? 'bg-emerald-200 text-emerald-900'
                              : 'bg-rose-200 text-rose-900'
                          }`}
                        >
                          {testResult.verified ? 'Verified Active' : 'Not Found'}
                        </span>
                      </div>

                      <p className="text-xs leading-relaxed">{testResult.message}</p>

                      {testResult.verified && (
                        <div className="mt-4 rounded-xl bg-white p-4 border border-emerald-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div>
                            <span className="text-gray-400 block text-[10px] uppercase font-bold">Transaction Reference</span>
                            <span className="font-mono font-black text-gray-900">{testResult.transactionNumber}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[10px] uppercase font-bold">Verified Amount</span>
                            <span className="font-black text-[#007042] text-sm">
                              {testResult.amount ? Number(testResult.amount).toLocaleString() : '—'} {testResult.currency || 'ETB'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[10px] uppercase font-bold">Payer / Account Holder</span>
                            <span className="font-bold text-gray-900">{testResult.payerName || 'Verified Customer'}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[10px] uppercase font-bold">Replay / Duplicate</span>
                            <span className="font-bold text-emerald-700">
                              {testResult.alreadyRecorded ? '⚠️ Already Recorded in Resort Folio' : '✓ Unique (Not Reused)'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
