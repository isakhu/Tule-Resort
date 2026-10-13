/**
 * Requests a standards-compliant SVG QR image for a public table URL.
 *
 * The URL contains only the public table QR link, not guest or payment data.
 * For a fully self-hosted production deployment, replace this URL-based adapter
 * with a locally bundled QR encoder dependency.
 */
export function generateQrCodeImageUrl(text: string, size = 256): string {
  const params = new URLSearchParams({
    size: `${Math.max(128, Math.min(1024, Math.floor(size)))}x${Math.max(128, Math.min(1024, Math.floor(size)))}`,
    format: 'svg',
    qzone: '2',
    data: text,
  });
  return `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`;
}
