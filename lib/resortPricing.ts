import supabaseServer from './supabaseServer';

export interface ResortPricingSettings {
  serviceChargePercent: number;
  taxPercent: number;
  currency: string;
}

const DEFAULT_PRICING_SETTINGS: ResortPricingSettings = {
  serviceChargePercent: 0,
  taxPercent: 0,
  currency: 'ETB',
};

/**
 * Load active service charge & tax configuration from public.resort_settings.
 * Uses server service-role client because resort_settings RLS is restricted to authenticated staff.
 */
export async function getResortPricingSettings(): Promise<ResortPricingSettings> {
  try {
    const { data, error } = await supabaseServer
      .from('resort_settings')
      .select('service_charge_percent, tax_percent, default_currency')
      .eq('id', true)
      .maybeSingle();

    if (error || !data) {
      return DEFAULT_PRICING_SETTINGS;
    }

    return {
      serviceChargePercent: Math.min(100, Math.max(0, Number(data.service_charge_percent ?? 0))),
      taxPercent: Math.min(100, Math.max(0, Number(data.tax_percent ?? 0))),
      currency: String(data.default_currency || 'ETB').trim() || 'ETB',
    };
  } catch {
    return DEFAULT_PRICING_SETTINGS;
  }
}

