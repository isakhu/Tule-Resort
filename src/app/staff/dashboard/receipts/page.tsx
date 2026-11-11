'use client';

import { useState, useEffect, useCallback, useId } from 'react';
import {
  FileText,
  Plus,
  Printer,
  BedDouble,
  Receipt as ReceiptIcon,
  RotateCw,
  ShieldCheck,
  CreditCard,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Search,
} from 'lucide-react';
import supabase from '@/lib/supabaseClient';
import { RESORT_BANK_ACCOUNTS } from '@/lib/resortAccounts';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

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
  prepaid_amount?: number;
  balance_due?: number;
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

interface CheckedInStayQueryRow extends Omit<CheckedInStay, 'room'> {
  room?: { name: string } | Array<{ name: string }> | null;
}

interface PaymentTestResult {
  success?: boolean;
  verified: boolean;
  message: string;
  bankName?: string;
  transactionNumber?: string;
  amount?: number;
  currency?: string;
  payerName?: string;
  alreadyRecorded?: boolean;
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
  prepaid_amount?: number;
  balance_due?: number;
  reservation_payment_status?: string;
  currency: string;
}

export default function ReceiptsAndFolioPage() {
  const [activeTab, setActiveTab] = useState<'folio' | 'receipts' | 'verify'>('folio');
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [checkedInStays, setCheckedInStays] = useState<CheckedInStay[]>([]);
  const [selectedStayId, setSelectedStayId] = useState<string | null>(null);
  const [folio, setFolio] = useState<FolioData | null>(null);
  const [loadingFolio, setLoadingFolio] = useState(false);

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
  const [confirmCheckoutOpen, setConfirmCheckoutOpen] = useState(false);
  const [printingReceipt, setPrintingReceipt] = useState<Receipt | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Standalone Verify.ET tester state
  const [testRef, setTestRef] = useState('');
  const [testBank, setTestBank] = useState('');
  const [testAmount, setTestAmount] = useState('');
  const [testingPayment, setTestingPayment] = useState(false);
  const [testResult, setTestResult] = useState<PaymentTestResult | null>(null);

  const chargeDescId = useId();
  const chargeQtyId = useId();
  const chargeAmountId = useId();
  const paymentMethodId = useId();
  const checkoutRefId = useId();
  const testRefId = useId();
  const testBankId = useId();
  const testAmountId = useId();

  const settlementAccounts = [
    RESORT_BANK_ACCOUNTS.telebirr,
    RESORT_BANK_ACCOUNTS.cbe_birr,
    RESORT_BANK_ACCOUNTS.cbe,
    RESORT_BANK_ACCOUNTS.boa,
    RESORT_BANK_ACCOUNTS.awash,
    RESORT_BANK_ACCOUNTS.mpesa,
  ];
  const beneficiaryName = RESORT_BANK_ACCOUNTS.telebirr.accountHolder;

  useEffect(() => {
    const handleAfterPrint = () => {
      document.body.classList.remove('printing-folio-receipt');
      setPrintingReceipt(null);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
      document.body.classList.remove('printing-folio-receipt');
    };
  }, []);

  const triggerScopedPrint = (receiptToPrint: Receipt) => {
    setPrintingReceipt(receiptToPrint);
    document.body.classList.add('printing-folio-receipt');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
      });
    });
  };

  // Load receipts and checked-in reservations
  const loadData = useCallback(async () => {
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

    const stays: CheckedInStay[] = ((staysData ?? []) as CheckedInStayQueryRow[]).map((s) => ({
      ...s,
      room: Array.isArray(s.room) ? s.room[0] : s.room,
    }));
    setCheckedInStays(stays);

    // Auto-select first stay if none selected
    if (stays.length > 0 && !selectedStayId) {
      setSelectedStayId(stays[0].id);
    }
  }, [selectedStayId]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) return loadData();
    });
    return () => {
      active = false;
    };
  }, [loadData]);

  const getAuthHeaders = useCallback(async (includeJson = false): Promise<Record<string, string>> => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const headers: Record<string, string> = {};
    if (includeJson) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }, []);

  // Load folio when a stay is selected
  const loadFolio = useCallback(async (stayId: string) => {
    setLoadingFolio(true);
    setFeedback(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/folio/${stayId}`, { headers, cache: 'no-store' });
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
  }, [getAuthHeaders]);

  useEffect(() => {
    if (!selectedStayId) return;
    let active = true;
    void Promise.resolve().then(() => {
      if (active) return loadFolio(selectedStayId);
    });
    return () => {
      active = false;
    };
  }, [selectedStayId, loadFolio]);

  // Handle Add Manual Charge
  const handleAddCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStayId || addingCharge) return;

    const cleanDesc = chargeDesc.trim();
    const numericAmount = Number(chargeAmount);
    const numericQty = Number(chargeQty);

    if (!cleanDesc) {
      setFeedback({ type: 'error', text: 'Please enter a charge description.' });
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setFeedback({ type: 'error', text: 'Unit price must be greater than 0 ETB.' });
      return;
    }
    if (!Number.isInteger(numericQty) || numericQty < 1 || numericQty > 1000) {
      setFeedback({ type: 'error', text: 'Quantity must be a whole number between 1 and 1,000.' });
      return;
    }

    setAddingCharge(true);
    setFeedback(null);

    try {
      const headers = await getAuthHeaders(true);
      const res = await fetch(`/api/folio/${selectedStayId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          description: cleanDesc,
          amount: numericAmount,
          quantity: numericQty,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        const lineTotal = Math.round(numericAmount * numericQty * 100) / 100;
        setFeedback({
          type: 'success',
          text: `Added "${cleanDesc}" (${numericQty} × ${numericAmount.toLocaleString()} = ${lineTotal.toLocaleString()} ETB) to folio.`,
        });
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
      const headers = await getAuthHeaders(true);
      const expectedCheckoutAmount = folio ? Number(folio.balance_due ?? folio.total) : undefined;
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          reference: cleanRef,
          bank: paymentMethod,
          expectedAmount: expectedCheckoutAmount,
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
      const headers = await getAuthHeaders(true);
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          reference: testRef.trim(),
          bank: testBank || undefined,
          expectedAmount: testAmount ? Number(testAmount) : undefined,
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error verifying payment.';
      setTestResult({
        success: false,
        verified: false,
        message,
      });
    } finally {
      setTestingPayment(false);
    }
  };

  // Handle Checkout & Generate Receipt from Folio
  const executeCheckout = async () => {
    if (!selectedStayId || !folio) return;

    setProcessingCheckout(true);
    setFeedback(null);

    try {
      const headers = await getAuthHeaders(true);
      const res = await fetch(`/api/folio/${selectedStayId}/checkout`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          paymentMethod,
          processedBy: 'Front Desk Cashier',
          paymentReference: checkoutPaymentRef.trim() || undefined,
        }),
      });

      const json = await res.json();
      setConfirmCheckoutOpen(false);
      if (res.ok && json.success) {
        setFeedback({
          type: 'success',
          text: json.already_checked_out
            ? `Stay already checked out. Receipt #${json.receipt_number || ''} loaded.`
            : `Checkout complete! Receipt #${json.receipt_number} generated from folio.`,
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
      setConfirmCheckoutOpen(false);
      setFeedback({ type: 'error', text: 'Network error executing checkout.' });
    } finally {
      setProcessingCheckout(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F0E6] px-4 py-8 md:px-8 text-[#1A1A1A]">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E6DFD1] pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#163D32] text-[#C5A46D] shadow-md">
              <FileText className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7A5A27]">
                Front Desk Operations
              </p>
              <h1 className="font-display text-3xl font-semibold text-[#163D32]">
                Guest Folio &amp; Checkout Engine
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('folio')}
              className={`rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition ${activeTab === 'folio'
                  ? 'bg-[#163D32] text-[#C5A46D] shadow-md'
                  : 'bg-white text-[#163D32] hover:bg-[#163D32]/5 border border-[#E6DFD1]'
                }`}
            >
              Active Guest Folios ({checkedInStays.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('receipts')}
              className={`rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition ${activeTab === 'receipts'
                  ? 'bg-[#163D32] text-[#C5A46D] shadow-md'
                  : 'bg-white text-[#163D32] hover:bg-[#163D32]/5 border border-[#E6DFD1]'
                }`}
            >
              Receipts Archive ({receipts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('verify')}
              className={`rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 ${activeTab === 'verify'
                  ? 'bg-[#0F2D24] text-[#C5A46D] shadow-md'
                  : 'bg-white text-[#163D32] hover:bg-emerald-50 border border-[#163D32]/20'
                }`}
            >
              <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Verify.ET Bank Verifier
            </button>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {feedback && (
          <div
            role={feedback.type === 'error' ? 'alert' : 'status'}
            className={`rounded-2xl p-4 text-xs font-bold flex items-center justify-between ${feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
          >
            <span>{feedback.text}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              aria-label="Dismiss notification"
              className="text-[#52645D] hover:text-[#163D32] px-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* ─── TAB 1: ACTIVE FOLIOS & CHECKOUT ─── */}
        {activeTab === 'folio' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Checked-in guest list */}
            <div className="lg:col-span-4 space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#163D32]">
                  Checked-In Guests
                </span>
                <span className="text-xs text-[#52645D] font-bold">
                  {checkedInStays.length} active
                </span>
              </div>

              {checkedInStays.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-[#E6DFD1] bg-white p-8 text-center space-y-2">
                  <BedDouble className="mx-auto h-8 w-8 text-[#7A5A27]/40" aria-hidden="true" />
                  <p className="font-bold text-sm text-[#163D32]">No Checked-In Guests</p>
                  <p className="text-xs text-[#52645D]">
                    Check in a reservation from the Reservations dashboard to manage their live folio.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
                  {checkedInStays.map((stay) => {
                    const isSelected = selectedStayId === stay.id;
                    return (
                      <button
                        type="button"
                        key={stay.id}
                        onClick={() => setSelectedStayId(stay.id)}
                        className={`w-full text-left rounded-2xl p-4 transition border ${isSelected
                            ? 'bg-[#163D32] text-white border-[#163D32] shadow-md ring-2 ring-[#163D32]/20'
                            : 'bg-white text-[#1A1A1A] border-[#E6DFD1] hover:border-[#C5A46D]'
                          }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${isSelected ? 'bg-white/15 text-[#C5A46D]' : 'bg-[#F5F0E6] text-[#163D32]'
                            }`}>
                            {stay.booking_number}
                          </span>
                          <span className={`text-[11px] ${isSelected ? 'text-[#F5F0E6]/80' : 'text-[#52645D]'}`}>
                            {stay.check_in} — {stay.check_out}
                          </span>
                        </div>
                        <h2 className="font-extrabold text-base mt-2">{stay.guest_name}</h2>
                        <p className={`text-xs mt-0.5 ${isSelected ? 'text-[#F5F0E6]/80' : 'text-[#52645D]'}`}>
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
                <div className="rounded-3xl bg-white p-16 text-center border border-[#E6DFD1]">
                  <div className="h-8 w-8 mx-auto rounded-full border-4 border-[#163D32] border-t-transparent animate-spin mb-3" />
                  <p className="text-xs font-bold text-[#52645D] uppercase tracking-widest">
                    Loading guest folio from server...
                  </p>
                </div>
              ) : !folio ? (
                <div className="rounded-3xl bg-white p-16 text-center border border-[#E6DFD1] space-y-3">
                  <ReceiptIcon className="mx-auto h-12 w-12 text-[#7A5A27]/35" aria-hidden="true" />
                  <h2 className="font-display text-xl font-semibold text-[#163D32]">Select a Stay to View Folio</h2>
                  <p className="text-xs text-[#52645D] max-w-sm mx-auto">
                    Select any checked-in guest on the left to inspect charges, add incidentals, and calculate taxes.
                  </p>
                </div>
              ) : (
                <div className="rounded-3xl bg-white p-6 md:p-8 shadow-sm border border-[#E6DFD1] space-y-6">
                  {/* Folio Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6DFD1] pb-5">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-[#7A5A27]">
                        Live Folio Summary
                      </span>
                      <h2 className="font-display text-2xl font-semibold text-[#163D32] mt-1">
                        {folio.stay.guest_name}
                      </h2>
                      <p className="text-xs text-[#52645D]">
                        {folio.stay.room_name} • Booking: <span className="font-mono font-bold text-[#163D32]">{folio.stay.booking_number}</span>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                      <button
                        type="button"
                        onClick={() => {
                          const prepaid = Number(folio.prepaid_amount ?? 0);
                          const balanceDue = Number(folio.balance_due ?? Math.max(0, folio.total - prepaid));
                          triggerScopedPrint({
                            id: `folio-${folio.stay.id}`,
                            receipt_number: `PROFORMA-${folio.stay.booking_number}`,
                            reservation_id: folio.stay.id,
                            guest_name: folio.stay.guest_name,
                            room_number: folio.stay.room_name,
                            subtotal: folio.subtotal,
                            service_charge_percent: folio.service_charge_percent,
                            service_charge: folio.service_charge,
                            tax_percent: folio.tax_percent,
                            tax: folio.tax,
                            total: folio.total,
                            prepaid_amount: prepaid,
                            balance_due: balanceDue,
                            currency: folio.currency,
                            payment_method: paymentMethod,
                            payment_reference: checkoutPaymentRef.trim() || null,
                            processed_by: 'Front Desk Preview',
                            created_at: new Date().toISOString(),
                          });
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#E6DFD1] bg-white px-3 py-1.5 text-xs font-bold text-[#163D32] hover:bg-[#F5F0E6]"
                      >
                        <Printer className="w-3.5 h-3.5" aria-hidden="true" /> Print Proforma
                      </button>
                      <button
                        type="button"
                        onClick={() => selectedStayId && loadFolio(selectedStayId)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#E6DFD1] bg-[#F5F0E6] px-3 py-1.5 text-xs font-bold text-[#163D32] hover:bg-[#E6DFD1]"
                      >
                        <RotateCw className="w-3.5 h-3.5" aria-hidden="true" /> Refresh Folio
                      </button>
                    </div>
                  </div>

                  {/* Charges Table */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#163D32]">
                      Itemized Charges ({folio.charges.length})
                    </p>
                    <div className="overflow-x-auto rounded-2xl border border-[#E6DFD1]">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#F5F0E6] text-[#163D32] font-bold border-b border-[#E6DFD1]">
                          <tr>
                            <th className="p-3">Source</th>
                            <th className="p-3">Description</th>
                            <th className="p-3 text-right">Qty</th>
                            <th className="p-3 text-right">Unit Price</th>
                            <th className="p-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E6DFD1]">
                          {folio.charges.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-4 text-center text-[#52645D]">
                                No charges posted to this stay yet.
                              </td>
                            </tr>
                          ) : (
                            folio.charges.map((c) => (
                              <tr key={c.id} className="hover:bg-[#F5F0E6]/40">
                                <td className="p-3">
                                  <span className="capitalize rounded-md bg-[#F5F0E6] border border-[#E6DFD1] px-2 py-0.5 text-[11px] font-bold text-[#163D32]">
                                    {c.source_type}
                                  </span>
                                </td>
                                <td className="p-3 font-semibold text-[#1A1A1A]">{c.description}</td>
                                <td className="p-3 text-right text-[#52645D]">{c.quantity}</td>
                                <td className="p-3 text-right text-[#52645D]">{Number(c.unit_price).toLocaleString()}</td>
                                <td className="p-3 text-right font-black text-[#163D32]">{Number(c.amount).toLocaleString()} ETB</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Add Manual Charge Box */}
                  <form onSubmit={handleAddCharge} className="rounded-2xl bg-[#F5F0E6] p-4 border border-[#E6DFD1] space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label htmlFor={chargeDescId} className="text-xs font-bold uppercase tracking-wider text-[#163D32]">
                        Add Manual / Incidental Charge
                      </label>
                      {Number(chargeAmount) > 0 && Number(chargeQty) >= 1 && (
                        <span className="text-xs font-bold text-[#7A5A27]">
                          Line Total: {(Math.round(Number(chargeAmount) * Number(chargeQty) * 100) / 100).toLocaleString()} {folio.currency}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-6 gap-2">
                      <div className="sm:col-span-2">
                        <input
                          id={chargeDescId}
                          required
                          type="text"
                          placeholder="Description (e.g. Minibar, Laundry)"
                          value={chargeDesc}
                          onChange={(e) => setChargeDesc(e.target.value)}
                          className="w-full rounded-xl border border-[#E6DFD1] bg-white px-3 py-2 text-xs font-medium outline-none focus:border-[#C5A46D]"
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <label htmlFor={chargeQtyId} className="sr-only">Charge quantity</label>
                        <input
                          id={chargeQtyId}
                          required
                          type="number"
                          min="1"
                          max="1000"
                          step="1"
                          placeholder="Qty"
                          value={chargeQty}
                          onChange={(e) => setChargeQty(e.target.value)}
                          className="w-full rounded-xl border border-[#E6DFD1] bg-white px-3 py-2 text-xs font-medium outline-none focus:border-[#C5A46D]"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor={chargeAmountId} className="sr-only">Unit price in ETB</label>
                        <input
                          id={chargeAmountId}
                          required
                          type="number"
                          min="1"
                          step="0.01"
                          placeholder="Unit Price (ETB)"
                          value={chargeAmount}
                          onChange={(e) => setChargeAmount(e.target.value)}
                          className="w-full rounded-xl border border-[#E6DFD1] bg-white px-3 py-2 text-xs font-medium outline-none focus:border-[#C5A46D]"
                        />
                      </div>
                      <button
                        disabled={addingCharge}
                        type="submit"
                        className="sm:col-span-1 rounded-xl bg-[#163D32] px-4 py-2 text-xs font-bold text-[#C5A46D] hover:bg-[#0F2D24] transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                        {addingCharge ? 'Adding...' : 'Post Charge'}
                      </button>
                    </div>
                  </form>

                  {/* Server Calculation Totals Card */}
                  {(() => {
                    const prepaid = Number(folio.prepaid_amount ?? 0);
                    const balanceDue = Number(folio.balance_due ?? Math.max(0, folio.total - prepaid));
                    return (
                      <>
                        <div className="rounded-2xl bg-gradient-to-br from-[#163D32] to-[#0F2D24] text-white p-6 space-y-3 shadow-lg">
                          <div className="flex justify-between text-xs font-medium text-[#F5F0E6]/85">
                            <span>Charges Subtotal:</span>
                            <span className="font-mono">{folio.subtotal.toLocaleString()} {folio.currency}</span>
                          </div>
                          <div className="flex justify-between text-xs font-medium text-[#F5F0E6]/85">
                            <span>Resort Service Charge ({folio.service_charge_percent}%):</span>
                            <span className="font-mono">{folio.service_charge.toLocaleString()} {folio.currency}</span>
                          </div>
                          <div className="flex justify-between text-xs font-medium text-[#F5F0E6]/85 border-b border-white/10 pb-3">
                            <span>Government Tax / VAT ({folio.tax_percent}%):</span>
                            <span className="font-mono">{folio.tax.toLocaleString()} {folio.currency}</span>
                          </div>
                          {prepaid > 0 && (
                            <>
                              <div className="flex justify-between text-xs font-semibold text-white">
                                <span>Total Stay Charges:</span>
                                <span className="font-mono">{folio.total.toLocaleString()} {folio.currency}</span>
                              </div>
                              <div className="flex justify-between text-xs font-bold text-emerald-300 border-b border-white/10 pb-3">
                                <span>Already Paid (Online Booking Deposit):</span>
                                <span className="font-mono">- {prepaid.toLocaleString()} {folio.currency}</span>
                              </div>
                            </>
                          )}
                          <div className="flex justify-between text-lg font-black pt-1">
                            <span className="text-[#C5A46D]">{prepaid > 0 ? 'Balance Due at Checkout:' : 'Grand Total Due:'}</span>
                            <span className="text-[#C5A46D] font-mono">{balanceDue.toLocaleString()} {folio.currency}</span>
                          </div>
                        </div>

                        {/* Checkout Action Console */}
                        <div className="rounded-2xl border border-[#E6DFD1] p-5 space-y-4 bg-[#F5F0E6]/45">
                          <p className="text-xs font-bold uppercase tracking-wider text-[#163D32]">
                            Complete Guest Checkout
                          </p>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <label htmlFor={paymentMethodId} className="text-xs font-bold text-[#163D32]">Payment Method:</label>
                              <select
                                id={paymentMethodId}
                                value={paymentMethod}
                                onChange={(e) => {
                                  setPaymentMethod(e.target.value);
                                  setCheckoutVerification(null);
                                }}
                                className="rounded-xl border border-[#E6DFD1] bg-white px-3 py-2 text-xs font-semibold text-[#163D32] outline-none focus:border-[#C5A46D]"
                              >
                                <option value="pay_at_resort">Cash / POS Card at Resort</option>
                                <option value="telebirr">Telebirr Mobile Money</option>
                                <option value="cbe_birr">CBE Birr</option>
                                <option value="bank_transfer">Direct Bank Transfer</option>
                              </select>
                            </div>

                            <button
                              type="button"
                              disabled={processingCheckout || (folio.charges.length === 0 && folio.total <= 0)}
                              onClick={() => setConfirmCheckoutOpen(true)}
                              className="rounded-xl bg-[#163D32] hover:bg-[#0F2D24] px-6 py-3 text-xs font-bold uppercase tracking-wider text-[#C5A46D] shadow-lg shadow-[#163D32]/20 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <CreditCard className="w-4 h-4" aria-hidden="true" />
                              {processingCheckout
                                ? 'Generating Receipt...'
                                : balanceDue <= 0
                                  ? `Complete Check Out (${balanceDue.toLocaleString()} ${folio.currency} Due)`
                                  : `Mark Paid & Check Out (${balanceDue.toLocaleString()} ${folio.currency})`}
                            </button>
                          </div>

                          {/* Verify.ET Transaction Verification Console for Digital Payments */}
                          {paymentMethod !== 'pay_at_resort' && balanceDue > 0 && (
                            <div className="pt-3 border-t border-[#E6DFD1] space-y-2.5">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                                <div className="flex-1 w-full">
                                  <label htmlFor={checkoutRefId} className="block text-[11px] font-bold uppercase tracking-wider text-[#52645D] mb-1">
                                    Payment Transaction Reference (CBE FT Code / Telebirr Txn ID):
                                  </label>
                                  <input
                                    id={checkoutRefId}
                                    type="text"
                                    placeholder={paymentMethod === 'telebirr' ? 'e.g. 5HB892JKS1' : 'e.g. FT26144SG2ST'}
                                    value={checkoutPaymentRef}
                                    onChange={(e) => {
                                      setCheckoutPaymentRef(e.target.value);
                                      if (checkoutVerification) setCheckoutVerification(null);
                                    }}
                                    className="w-full rounded-xl border border-[#E6DFD1] bg-white px-3 py-2 text-xs font-mono font-bold text-[#163D32] placeholder:font-sans placeholder:font-normal placeholder:text-[#52645D]/70 focus:border-[#163D32] focus:outline-none"
                                  />
                                </div>

                                <button
                                  type="button"
                                  onClick={handleVerifyCheckoutPayment}
                                  disabled={verifyingCheckout || !checkoutPaymentRef.trim()}
                                  className="mt-2 sm:mt-5 rounded-xl bg-[#163D32] hover:bg-[#0F2D24] px-4 py-2.5 text-xs font-bold text-[#C5A46D] transition disabled:opacity-50 flex items-center gap-1.5 shrink-0 cursor-pointer"
                                >
                                  {verifyingCheckout ? (
                                    <>
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                                      Verifying...
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                                      Verify with Verify.ET
                                    </>
                                  )}
                                </button>
                              </div>

                              {checkoutVerification && (
                                <div
                                  role="status"
                                  className={`rounded-xl p-3 text-xs border ${checkoutVerification.verified
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                      : 'bg-rose-50 border-rose-200 text-rose-900'
                                    }`}
                                >
                                  <div className="flex items-start gap-2">
                                    {checkoutVerification.verified ? (
                                      <CheckCircle className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
                                    ) : (
                                      <AlertTriangle className="h-4 w-4 text-rose-700 shrink-0 mt-0.5" aria-hidden="true" />
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
                                          <span className="text-emerald-800">Replay Protection: <strong>Passed</strong></span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 2: RECEIPTS ARCHIVE ─── */}
        {activeTab === 'receipts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#163D32]">
                Official Generated Receipts Archive
              </span>
              <span className="text-xs text-[#52645D] font-bold">{receipts.length} total receipts</span>
            </div>

            <div className="overflow-x-auto rounded-[2rem] bg-white border border-[#E6DFD1] shadow-sm">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-[#163D32] text-[#F5F0E6]">
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
                <tbody className="divide-y divide-[#E6DFD1]">
                  {receipts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-[#52645D]">
                        No receipts generated yet. Receipts will automatically appear here once guests check out.
                      </td>
                    </tr>
                  ) : (
                    receipts.map((r) => (
                      <tr key={r.id} className="hover:bg-[#F5F0E6]/45">
                        <td className="p-4 font-bold text-[#163D32] font-mono">{r.receipt_number}</td>
                        <td className="p-4">
                          <span className="font-extrabold text-[#1A1A1A]">{r.guest_name}</span>
                          {r.room_number && (
                            <span className="block text-xs text-[#52645D]">{r.room_number}</span>
                          )}
                        </td>
                        <td className="p-4 text-right font-medium text-[#1A1A1A]">{Number(r.subtotal).toLocaleString()} {r.currency}</td>
                        <td className="p-4 text-right text-[#52645D] text-xs">
                          {(Number(r.service_charge) + Number(r.tax)).toLocaleString()} {r.currency}
                        </td>
                        <td className="p-4 text-right font-black text-[#163D32]">
                          {Number(r.total).toLocaleString()} {r.currency}
                        </td>
                        <td className="p-4 capitalize">
                          <span className="rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-xs font-bold block w-fit">
                            {r.payment_method.replaceAll('_', ' ')}
                          </span>
                          {r.payment_reference && (
                            <span className="mt-1 block text-[11px] font-mono text-[#52645D] font-bold">
                              Ref: {r.payment_reference}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-xs text-[#52645D]">
                          {new Date(r.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            type="button"
                            onClick={() => triggerScopedPrint(r)}
                            className="rounded-lg bg-[#F5F0E6] border border-[#E6DFD1] p-2 hover:bg-[#163D32]/10 transition"
                            aria-label={`Print receipt ${r.receipt_number}`}
                            title="Print Receipt"
                          >
                            <Printer className="h-4 w-4 text-[#163D32]" aria-hidden="true" />
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
            <div className="rounded-3xl border border-[#E6DFD1] bg-white p-6 shadow-sm space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E6DFD1] pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#163D32] text-[#C5A46D] shadow-md">
                    <ShieldCheck className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-semibold text-[#163D32]">
                      Verify.ET Automated Bank Payment Verifier
                    </h2>
                    <p className="text-xs text-[#52645D]">
                      Instantly verify customer bank transfers, Telebirr mobile money, and CBE receipts without fake screenshots.
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                  Live API Connected
                </span>
              </div>

              {/* Official Accounts Quick Reference for Staff */}
              <div className="rounded-2xl bg-[#F5F0E6]/75 p-4 border border-[#E6DFD1] space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#52645D]">
                    Official Resort Settlement Accounts • Beneficiary: <strong className="text-[#163D32]">{beneficiaryName}</strong>
                  </span>
                  <span className="text-[11px] text-[#7A5A27] font-bold">Auto-Linked to Verify.ET</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-[11px] font-mono">
                  {settlementAccounts.map((acc) => (
                    <div key={acc.code} className="bg-white p-2.5 rounded-xl border border-[#E6DFD1]">
                      <span className="text-[10px] text-[#52645D] font-sans block font-bold truncate">{acc.name}</span>
                      <span className="font-bold text-[#163D32]">{acc.accountNumber}</span>
                    </div>
                  ))}
                </div>
              </div>

              <form onSubmit={handleRunStandaloneVerification} className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-5">
                  <label htmlFor={testRefId} className="block text-xs font-bold text-[#163D32] mb-1">
                    Transaction Reference / Receipt Code *
                  </label>
                  <input
                    id={testRefId}
                    type="text"
                    required
                    placeholder="e.g. FT26144SG2ST or Telebirr Txn Number"
                    value={testRef}
                    onChange={(e) => setTestRef(e.target.value)}
                    className="w-full rounded-xl border border-[#E6DFD1] bg-white px-3.5 py-2.5 text-xs font-mono font-bold text-[#163D32] focus:border-[#163D32] focus:outline-none"
                  />
                  <p className="text-[11px] text-[#52645D] mt-1">
                    Supports FT numbers, Telebirr SMS codes, or CBE receipt URLs.
                  </p>
                </div>

                <div className="md:col-span-3">
                  <label htmlFor={testBankId} className="block text-xs font-bold text-[#163D32] mb-1">
                    Bank / Wallet Provider
                  </label>
                  <select
                    id={testBankId}
                    value={testBank}
                    onChange={(e) => setTestBank(e.target.value)}
                    className="w-full rounded-xl border border-[#E6DFD1] bg-white px-3 py-2.5 text-xs font-semibold text-[#163D32] focus:border-[#163D32] focus:outline-none"
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
                  <label htmlFor={testAmountId} className="block text-xs font-bold text-[#163D32] mb-1">
                    Expected Amount (ETB)
                  </label>
                  <input
                    id={testAmountId}
                    type="number"
                    step="any"
                    placeholder="e.g. 1500"
                    value={testAmount}
                    onChange={(e) => setTestAmount(e.target.value)}
                    className="w-full rounded-xl border border-[#E6DFD1] bg-white px-3.5 py-2.5 text-xs text-[#163D32] focus:border-[#163D32] focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2 flex items-end">
                  <button
                    type="submit"
                    disabled={testingPayment || !testRef.trim()}
                    className="w-full rounded-xl bg-[#163D32] hover:bg-[#0F2D24] py-2.5 text-xs font-bold uppercase tracking-wider text-[#C5A46D] transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                  >
                    {testingPayment ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4" aria-hidden="true" />
                        Verify
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Standalone Verification Result Display */}
              {testResult && (
                <div
                  role="status"
                  className={`rounded-2xl p-5 border animate-in fade-in-50 duration-200 ${testResult.verified
                      ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                      : 'bg-rose-50/70 border-rose-200 text-rose-950'
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white font-black ${testResult.verified ? 'bg-emerald-700' : 'bg-rose-700'
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
                          className={`rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-wider ${testResult.verified
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
                            <span className="text-[#52645D] block text-[10px] uppercase font-bold">Transaction Reference</span>
                            <span className="font-mono font-black text-[#163D32]">{testResult.transactionNumber}</span>
                          </div>
                          <div>
                            <span className="text-[#52645D] block text-[10px] uppercase font-bold">Verified Amount</span>
                            <span className="font-black text-[#163D32] text-sm">
                              {testResult.amount ? Number(testResult.amount).toLocaleString() : '—'} {testResult.currency || 'ETB'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#52645D] block text-[10px] uppercase font-bold">Payer / Account Holder</span>
                            <span className="font-bold text-[#163D32]">{testResult.payerName || 'Verified Customer'}</span>
                          </div>
                          <div>
                            <span className="text-[#52645D] block text-[10px] uppercase font-bold">Replay / Duplicate</span>
                            <span className="font-bold text-emerald-800">
                              {testResult.alreadyRecorded ? 'Already Recorded in Resort Folio' : '✓ Unique (Not Reused)'}
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

      {/* Dedicated Printable Folio Receipt (Visible only when body.printing-folio-receipt is set during print) */}
      {printingReceipt && (
        <div id="printable-folio-receipt" className="hidden print:block font-sans">
          <div className="border-b-2 border-[#163D32] pb-4 mb-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7A5A27]">
                Tule Resort &amp; Spa • Hawassa
              </p>
              <h2 className="font-display text-2xl font-bold text-[#163D32] mt-1">
                Official Folio Receipt
              </h2>
              <p className="text-xs text-[#52645D]">Lake Hawassa Shorefront • Sidama Region, Ethiopia</p>
            </div>
            <div className="text-right text-xs">
              <p className="font-mono font-bold text-[#163D32]">{printingReceipt.receipt_number}</p>
              <p className="text-[#52645D]">{new Date(printingReceipt.created_at).toLocaleString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-xl bg-[#F5F0E6] p-4 mb-5 text-xs border border-[#E6DFD1]">
            <div>
              <p className="text-[10px] uppercase font-bold text-[#52645D]">Guest Name</p>
              <p className="font-bold text-[#163D32]">{printingReceipt.guest_name}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-[#52645D]">Room / Villa</p>
              <p className="font-bold text-[#163D32]">{printingReceipt.room_number || 'Resort Stay'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-[#52645D]">Payment Method</p>
              <p className="font-bold capitalize text-[#163D32]">{printingReceipt.payment_method.replaceAll('_', ' ')}</p>
            </div>
            {printingReceipt.payment_reference && (
              <div>
                <p className="text-[10px] uppercase font-bold text-[#52645D]">Transaction Ref</p>
                <p className="font-mono font-bold text-[#163D32]">{printingReceipt.payment_reference}</p>
              </div>
            )}
          </div>

          <div className="space-y-2 border-t border-b border-[#E6DFD1] py-4 text-xs">
            <div className="flex justify-between">
              <span>Charges Subtotal</span>
              <span className="font-mono">{Number(printingReceipt.subtotal).toLocaleString()} {printingReceipt.currency}</span>
            </div>
            <div className="flex justify-between">
              <span>Resort Service Charge ({printingReceipt.service_charge_percent}%)</span>
              <span className="font-mono">{Number(printingReceipt.service_charge).toLocaleString()} {printingReceipt.currency}</span>
            </div>
            <div className="flex justify-between">
              <span>Government Tax / VAT ({printingReceipt.tax_percent}%)</span>
              <span className="font-mono">{Number(printingReceipt.tax).toLocaleString()} {printingReceipt.currency}</span>
            </div>
            <div className="flex justify-between font-black text-base text-[#163D32] pt-2 border-t border-[#E6DFD1]">
              <span>Grand Total</span>
              <span className="font-mono">{Number(printingReceipt.total).toLocaleString()} {printingReceipt.currency}</span>
            </div>
            {Number(printingReceipt.prepaid_amount ?? 0) > 0 && (
              <>
                <div className="flex justify-between text-emerald-800 font-bold">
                  <span>Prepaid Online</span>
                  <span className="font-mono">- {Number(printingReceipt.prepaid_amount).toLocaleString()} {printingReceipt.currency}</span>
                </div>
                <div className="flex justify-between font-bold text-[#163D32]">
                  <span>Balance Settled at Checkout</span>
                  <span className="font-mono">{Number(printingReceipt.balance_due ?? 0).toLocaleString()} {printingReceipt.currency}</span>
                </div>
              </>
            )}
          </div>

          <p className="mt-5 text-[11px] text-[#52645D] text-center">
            Processed by {printingReceipt.processed_by || 'Front Desk Cashier'} • Thank you for staying at Tule Resort &amp; Spa.
          </p>
        </div>
      )}

      <ConfirmDialog
        open={confirmCheckoutOpen && Boolean(folio)}
        title="Confirm Guest Checkout?"
        description={
          folio
            ? `Generate an official receipt and check out ${folio.stay.guest_name} (${folio.stay.room_name})? Balance due: ${Number(folio.balance_due ?? Math.max(0, folio.total - Number(folio.prepaid_amount ?? 0))).toLocaleString()} ${folio.currency}.`
            : ''
        }
        confirmLabel="Confirm & Check Out"
        tone="primary"
        busy={processingCheckout}
        onConfirm={() => void executeCheckout()}
        onCancel={() => {
          if (!processingCheckout) setConfirmCheckoutOpen(false);
        }}
      />
    </div>
  );
}
