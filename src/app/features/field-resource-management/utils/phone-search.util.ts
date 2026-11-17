/**
 * Returns true when the phone number matches the search term.
 * Matches the raw text (case-insensitive) or, when the term contains digits,
 * the digits-only form, so "214-555", "(214) 555" and "214555" all match "214-555-2001".
 */
export function phoneMatchesSearch(phone: string | null | undefined, term: string): boolean {
  if (!phone || !term) {
    return false;
  }
  const trimmed = term.trim().toLowerCase();
  if (phone.toLowerCase().includes(trimmed)) {
    return true;
  }
  const termDigits = trimmed.replace(/\D/g, '');
  return termDigits.length > 0 && phone.replace(/\D/g, '').includes(termDigits);
}
