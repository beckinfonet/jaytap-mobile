/**
 * M1 admin allowlist — emails of users granted admin role client-side.
 *
 * TODO(M2): replace allowlist with role-based implementation — server-verified
 * `customClaims.role === 'admin'` via Firebase ID token + firebase-admin SDK on the
 * Railway backend (tracked as M2 requirements ROLE-01 through ROLE-04).
 *
 * Security posture: emails here ARE bundle-visible; obfuscation is not security.
 * The real trust boundary is the Railway backend, which MUST independently verify
 * admin status before accepting PATCH /verifications or PUT /properties with
 * tours/matterportUrl/panoramicPhotosUrl payloads. See PITFALLS.md §Pitfall 5.
 */
export const ALLOWLIST = ['beckprograms@gmail.com'] as const;

export type AllowlistedEmail = typeof ALLOWLIST[number];

/**
 * Returns true if `email` (case-insensitive, trimmed) matches an entry in ALLOWLIST.
 * Returns false for null/undefined/empty input — guards the unauthenticated path.
 */
export function isAllowlistedAdmin(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return (ALLOWLIST as readonly string[]).includes(normalized);
}
