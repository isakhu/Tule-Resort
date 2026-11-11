export interface PricingBreakdown {
  subtotal: number;
  serviceChargePercent: number;
  serviceCharge: number;
  taxPercent: number;
  tax: number;
  grandTotal: number;
}

/**
 * Round monetary quantities cleanly to two decimal places matching PostgreSQL ROUND(..., 2).
 */
export function roundCurrency(value: number): number {
  const safe = Number.isFinite(value) ? value : 0;
  return Math.round((safe + Number.EPSILON) * 100) / 100;
}

/**
 * Single authoritative pricing formula shared across booking UI, reservation RPC,
 * Verify.ET expected-amount validation, folio calculation, and final checkout receipt.
 * Matches calculate_folio(): service charge applies on subtotal, then tax on (subtotal + serviceCharge).
 */
export function calculateResortPricingBreakdown(
  subtotal: number,
  serviceChargePercent = 0,
  taxPercent = 0,
): PricingBreakdown {
  const cleanSubtotal = roundCurrency(Math.max(0, Number(subtotal) || 0));
  const cleanServicePct = Math.min(100, Math.max(0, Number(serviceChargePercent) || 0));
  const cleanTaxPct = Math.min(100, Math.max(0, Number(taxPercent) || 0));

  const serviceCharge = roundCurrency(cleanSubtotal * (cleanServicePct / 100));
  const tax = roundCurrency((cleanSubtotal + serviceCharge) * (cleanTaxPct / 100));
  const grandTotal = roundCurrency(cleanSubtotal + serviceCharge + tax);

  return {
    subtotal: cleanSubtotal,
    serviceChargePercent: cleanServicePct,
    serviceCharge,
    taxPercent: cleanTaxPct,
    tax,
    grandTotal,
  };
}

