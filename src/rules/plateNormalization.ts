/**
 * Officer-entered plate text (Option 1) — canonical form for storage / dedup signatures
 * vs display-friendly form for UI and PDF.
 */

export const PLATE_NORMALIZATION_RULES_SUMMARY =
  'Plates are normalized for storage: Latin letters A–Z and digits 0–9 only, uppercased, with spaces and punctuation removed. Display form keeps a single space between tokens when the officer types spaces.';

/** Canonical plate for dedup / Firestore compare (no spaces, no punctuation). */
export function normalizePlateCanonical(raw: string): string {
  return raw.normalize('NFKC').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Display / PDF line: trim, NFKC, uppercase, hyphen-like dashes → space, collapse spaces,
 * strip characters that are not A–Z, 0–9, or space.
 */
export function normalizePlateForDisplay(raw: string): string {
  let s = raw.normalize('NFKC').trim().toUpperCase();
  s = s.replace(/[-–—]/g, ' ');
  s = s.replace(/\s+/g, ' ');
  s = s.replace(/[^A-Z0-9 ]/g, '');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}
