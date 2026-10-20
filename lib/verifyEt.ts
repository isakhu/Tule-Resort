import supabaseServer from './supabaseServer';
import { RESORT_BANK_ACCOUNTS } from './resortAccounts';

export interface VerifyPaymentInput {
  reference: string;
  bank?: string;
  accountNumber?: string;
  expectedAmount?: number;
  expectedCurrency?: string;
  checkDuplicate?: boolean;
  waitMs?: number;
}

export interface VerifyPaymentOutput {
  success: boolean;
  verified: boolean;
  bank: string;
  bankName: string;
  transactionNumber: string;
  amount?: number;
  currency?: string;
  payerName?: string;
  receiverName?: string;
  transactionDate?: string;
  message: string;
  amountMatches?: boolean;
  amountDifference?: number;
  alreadyRecorded?: boolean;
  existingEntity?: {
    type: string;
    id: string;
  } | null;
  raw?: any;
}

const BANK_NAMES: Record<string, string> = {
  cbe: 'Commercial Bank of Ethiopia (CBE)',
  cbebirr: 'CBE Birr',
  cbe_birr: 'CBE Birr',
  telebirr: 'Telebirr (Ethio Telecom)',
  boa: 'Bank of Abyssinia',
  dashen: 'Dashen Bank',
  awash: 'Awash Bank',
  mpesa: 'Safaricom M-Pesa',
  siinqee: 'Siinqee Bank',
  zemen: 'Zemen Bank',
  coop: 'Cooperative Bank of Oromia (Coopay)',
  bank_transfer: 'Bank Transfer',
  pay_at_resort: 'Front Desk / Cash',
};

export function getFriendlyBankName(code?: string): string {
  if (!code) return 'Ethiopian Banking / Wallet';
  const clean = code.toLowerCase().trim();
  return BANK_NAMES[clean] || code.toUpperCase();
}

/**
 * Standardize and verify an Ethiopian bank or mobile money transaction via Verify.ET API
 */
export async function verifyBankPayment(input: VerifyPaymentInput): Promise<VerifyPaymentOutput> {
  const rawRef = String(input.reference ?? '').trim();
  const normalizedRef = rawRef.toUpperCase();

  if (!rawRef) {
    return {
      success: false,
      verified: false,
      bank: input.bank || 'unknown',
      bankName: getFriendlyBankName(input.bank),
      transactionNumber: '',
      message: 'Transaction reference or receipt code is required.',
    };
  }

  // 1. Check duplicate anti-replay protection in Supabase
  let alreadyRecorded = false;
  let existingEntity: { type: string; id: string } | null = null;

  if (input.checkDuplicate !== false) {
    try {
      const { data: existingRef } = await supabaseServer
        .from('used_payment_references')
        .select('id, entity_type, entity_id, amount, currency, created_at')
        .eq('normalized_reference', normalizedRef)
        .maybeSingle();

      if (existingRef) {
        alreadyRecorded = true;
        existingEntity = {
          type: existingRef.entity_type,
          id: existingRef.entity_id,
        };
      }
    } catch (dbErr) {
      console.warn('Verify.ET Supabase duplicate check warning:', dbErr);
    }
  }

  if (alreadyRecorded) {
    return {
      success: false,
      verified: false,
      alreadyRecorded: true,
      existingEntity,
      bank: input.bank || 'unknown',
      bankName: getFriendlyBankName(input.bank),
      transactionNumber: normalizedRef,
      message: `Transaction reference "${normalizedRef}" has already been verified and recorded for ${existingEntity?.type || 'another booking'}. Double-spending is prevented.`,
    };
  }

  const apiKey = process.env.VERIFY_ET_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      verified: false,
      bank: input.bank || 'unknown',
      bankName: getFriendlyBankName(input.bank),
      transactionNumber: normalizedRef,
      message: 'Verify.ET API key is not configured on the server. Please check VERIFY_ET_API_KEY environment variable.',
    };
  }

  // 2. Build the Verify.ET payload
  const cleanBank = input.bank ? input.bank.toLowerCase().trim() : '';
  const waitMs = input.waitMs ?? 7000;

  // Build payload with bank-specific fields for maximum reliability
  const payload: Record<string, any> = {
    reference: rawRef,
  };

  if (cleanBank && cleanBank !== 'all' && cleanBank !== 'bank_transfer') {
    payload.bank = cleanBank;
    if (cleanBank === 'cbe') {
      payload.receiptNumber = rawRef;
      payload.referenceNumber = rawRef;
      payload.accountNumber = input.accountNumber || RESORT_BANK_ACCOUNTS.cbe.accountNumber;
      payload.accountSuffix = (input.accountNumber || RESORT_BANK_ACCOUNTS.cbe.accountNumber).slice(-5);
    } else if (cleanBank === 'cbebirr' || cleanBank === 'cbe_birr') {
      payload.receiptNumber = rawRef;
      payload.referenceNumber = rawRef;
      payload.phone = input.accountNumber || RESORT_BANK_ACCOUNTS.cbebirr.accountNumber;
      payload.phoneNumber = input.accountNumber || RESORT_BANK_ACCOUNTS.cbebirr.accountNumber;
    } else if (cleanBank === 'boa') {
      payload.referenceNumber = rawRef;
      payload.accountNumber = input.accountNumber || RESORT_BANK_ACCOUNTS.boa.accountNumber;
      payload.accountSuffix = (input.accountNumber || RESORT_BANK_ACCOUNTS.boa.accountNumber).slice(-5);
    } else if (cleanBank === 'telebirr') {
      payload.transactionNumber = rawRef;
      payload.phone = input.accountNumber || RESORT_BANK_ACCOUNTS.telebirr.accountNumber;
      payload.receiverName = 'Yishak Tule Karesso';
    } else if (cleanBank === 'mpesa') {
      payload.transactionNumber = rawRef;
      payload.phone = input.accountNumber || RESORT_BANK_ACCOUNTS.mpesa.accountNumber;
    } else if (cleanBank === 'awash') {
      payload.referenceNumber = rawRef;
      payload.accountNumber = input.accountNumber || RESORT_BANK_ACCOUNTS.awash.accountNumber;
    } else if (cleanBank === 'dashen') {
      payload.referenceNumber = rawRef;
    }
  } else {
    // Universal verification: also pass aliases and default settlement account suffix
    payload.receiptNumber = rawRef;
    payload.transactionNumber = rawRef;
    payload.accountSuffix = RESORT_BANK_ACCOUNTS.cbe.accountSuffix;
  }

  try {
    const endpoint = `https://verify.et/api/verify?waitMs=${encodeURIComponent(waitMs)}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    let resJson: any = null;
    try {
      resJson = await response.json();
    } catch {
      return {
        success: false,
        verified: false,
        bank: cleanBank || 'unknown',
        bankName: getFriendlyBankName(cleanBank),
        transactionNumber: normalizedRef,
        message: `Verify.ET returned HTTP ${response.status} with non-JSON response.`,
      };
    }

    // Handle queued/asynchronous processing with polling if needed
    let finalData = resJson;
    const isQueued =
      finalData?.verification?.processingStatus === 'queued' ||
      finalData?.message === 'Verification queued.';
    const requestId = finalData?.requestId || finalData?.verification?.requestId;

    if (isQueued && requestId) {
      const pollUrl = `https://verify.et/api/verify/${requestId}`;
      // Poll up to 3 times, 600ms apart
      for (let i = 0; i < 3; i++) {
        await new Promise((res) => setTimeout(res, 600));
        try {
          const pollRes = await fetch(pollUrl, {
            method: 'GET',
            headers: { 'x-api-key': apiKey },
            cache: 'no-store',
          });
          const pollJson = await pollRes.json();
          if (pollJson?.data?.processingStatus === 'completed' || pollJson?.verification?.processingStatus === 'completed') {
            finalData = pollJson;
            break;
          }
        } catch {
          // ignore polling network errors, fallback to initial response
        }
      }
    }

    // 3. Extract transaction details from the response
    const vObj = finalData?.verification || {};
    const vResult = vObj.result || {};
    const dArray = Array.isArray(finalData?.data) ? finalData.data[0] || {} : finalData?.data || {};

    const isVerified = Boolean(
      vObj.verified === true ||
      vResult.verified === true ||
      dArray.verified === true ||
      vObj.status === 'completed' ||
      vResult.status === 'completed' ||
      dArray.status === 'completed' ||
      dArray.receipt?.status === 'completed'
    );

    const detectedBank =
      vObj.bank ||
      vResult.bank ||
      dArray.bank ||
      dArray.bank_name ||
      cleanBank ||
      'bank_transfer';

    const detectedTxNumber =
      vResult.transactionNumber ||
      vResult.receiptNumber ||
      dArray.transactionNumber ||
      dArray.receiptNumber ||
      dArray.transaction_number ||
      normalizedRef;

    const detectedAmount = Number(
      vResult.amount ??
      dArray.amount ??
      dArray.receipt?.amount ??
      dArray.total ??
      0
    );

    const detectedCurrency =
      vResult.currency ||
      dArray.currency ||
      dArray.receipt?.currency ||
      'ETB';

    const payerName =
      vResult.payerName ||
      vResult.sender ||
      dArray.payerName ||
      dArray.payer_name ||
      dArray.sender_name ||
      dArray.receipt?.payer_name ||
      undefined;

    const receiverName =
      vResult.receiverName ||
      vResult.receiver ||
      dArray.receiverName ||
      dArray.receiver_name ||
      dArray.receipt?.receiver_name ||
      undefined;

    const transactionDate =
      vResult.transactionDate ||
      dArray.transactionDate ||
      dArray.receipt?.transaction_date ||
      finalData?.completedAt ||
      undefined;

    // Compare with expected amount if specified
    let amountMatches = true;
    let amountDifference: number | undefined = undefined;

    if (isVerified && input.expectedAmount && detectedAmount > 0) {
      amountDifference = Math.round((detectedAmount - input.expectedAmount) * 100) / 100;
      // Allow +/- 1 ETB tolerance for rounding differences
      if (Math.abs(amountDifference) > 1.0) {
        amountMatches = false;
      }
    }

    let resultMessage = '';
    if (isVerified) {
      resultMessage = `Payment of ${detectedAmount ? detectedAmount.toLocaleString() : ''} ${detectedCurrency} verified successfully via ${getFriendlyBankName(detectedBank)}.`;
      if (!amountMatches && input.expectedAmount) {
        resultMessage += ` WARNING: Verified amount (${detectedAmount.toLocaleString()} ${detectedCurrency}) does not match expected amount (${input.expectedAmount.toLocaleString()} ${input.expectedCurrency || 'ETB'}).`;
      }
    } else {
      resultMessage =
        finalData?.errorMessage ||
        finalData?.error?.message ||
        finalData?.message ||
        'Transaction could not be verified on the bank network. Please verify the reference and try again.';
    }

    return {
      success: true,
      verified: isVerified,
      bank: detectedBank,
      bankName: getFriendlyBankName(detectedBank),
      transactionNumber: detectedTxNumber,
      amount: detectedAmount > 0 ? detectedAmount : undefined,
      currency: detectedCurrency,
      payerName,
      receiverName,
      transactionDate,
      message: resultMessage,
      amountMatches,
      amountDifference,
      raw: finalData,
    };
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Network error verifying payment.';
    return {
      success: false,
      verified: false,
      bank: cleanBank || 'unknown',
      bankName: getFriendlyBankName(cleanBank),
      transactionNumber: normalizedRef,
      message: `Failed to contact Verify.ET service: ${errMessage}`,
    };
  }
}
