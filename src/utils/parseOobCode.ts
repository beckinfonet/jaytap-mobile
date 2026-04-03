/**
 * Extract Firebase password-reset oobCode from a pasted reset URL or raw code.
 */
export function parseOobCodeFromResetInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const tryDecode = (s: string) => {
    try {
      return decodeURIComponent(s.replace(/\+/g, '%20'));
    } catch {
      return s;
    }
  };

  const candidates = [trimmed, tryDecode(trimmed)];
  for (const s of candidates) {
    const match = s.match(/[?&#]oobCode=([^&]+)/);
    if (match) {
      return tryDecode(match[1]);
    }
  }

  // Plain oob code (no URL) — Firebase codes are long opaque strings
  if (!/\s/.test(trimmed) && trimmed.length >= 10) {
    return trimmed;
  }

  return null;
}
