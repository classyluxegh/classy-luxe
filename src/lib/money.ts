export const CURRENCY = 'GH₵';

/** 9000 pesewas -> "GH₵ 90" */
export function money(pesewas: number): string {
  const cedis = pesewas / 100;
  return `${CURRENCY} ${cedis.toLocaleString('en-GH', { minimumFractionDigits: cedis % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

/** "90" | "90.50" -> 9050 */
export function cedisToPesewas(input: string | number): number {
  const n = typeof input === 'number' ? input : Number(String(input).replace(/[^0-9.]/g, ''));
  return Math.round(n * 100);
}
