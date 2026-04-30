/**
 * AuthUser + BackendProfile contracts.
 *
 * Phase 1 (M2 "Roles & Moderation"): introduced to replace the long-standing
 * `user: any` in AuthContext (CONCERNS.md "Auth user type is `any`"). The
 * canonical user-type union is the 3-role system; the legacy
 * 'renter' | 'owner' | 'agent' values are migrated away in Plan 03 / Plan 09.
 *
 * No barrel re-export from `src/types/index.ts` (no such file exists today —
 * each consumer imports directly: `import { AuthUser } from '../types/Auth';`).
 */

export interface BackendProfile {
  uid: string;
  email: string;
  userType: 'user' | 'moderator' | 'admin';
  firstName?: string;
  lastName?: string;
  phone?: string;
  whatsapp?: string;
  telegram?: string;
  instagramUrl?: string;
  isRenterApplicant?: boolean;
  favorites?: string[];
  availabilitySettings?: {
    blockSize: '30min' | '60min';
    startHour: number;
    endHour: number;
  };
  isLocked?: boolean;
  /** ISO date string when the account was soft-deleted, or null if active. */
  deletedAt?: string | null;
  /** ISO date string when the user's role was last revoked / changed. */
  roleRevokedAt?: string | null;
  /** Forward-compat for M2+ Firebase custom-claims branch in `useRole.ts`. */
  customClaims?: { role?: 'admin' | 'moderator' | 'user' };
}

export interface AuthUser {
  /** Firebase Identity Toolkit `localId` — the canonical Firebase uid. */
  localId: string;
  email: string;
  /** Long-lived Firebase refresh token, persisted alongside the id_token. */
  refreshToken?: string;
  /** Hydrated from `GET /api/auth/me`; absent until the first refresh succeeds. */
  backendProfile?: BackendProfile;
}
