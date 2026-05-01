import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * The set of roles a JayTap user can have.
 * M1 only uses 'admin' / 'user' / 'guest'; 'moderator' is defined for M2 forward-compat.
 */
export type Role = 'admin' | 'moderator' | 'user' | 'guest';

/**
 * Action union — the single gating primitive. D-04.
 * Adding an action is additive (safe); removing one requires grep of call sites.
 */
export type Action =
  | 'editVerifications'              // M1 — admin only
  | 'editMatterportUrl'              // M1 — admin only
  | 'editPanoramicUrl'               // M1 — admin only
  | 'manageListings'                 // M2 Phase 4.5 — admin/moderator implicit; user requires backendProfile.canListProperties
  | 'editAnyListing'                 // M2 forward-compat — moderator + admin
  | 'approveListings'                // M2 forward-compat — moderator + admin
  | 'promoteToModerator'             // M2 forward-compat — admin only
  | 'reviewLandlordApplications';    // M2 Phase 4.5 — admin only

/**
 * Thrown by service-layer guards when the authenticated user is not permitted
 * to perform the requested action. Callers catch by `error.message === 'E_PERMISSION_DENIED'`
 * and translate via `t('errors.permissionDenied')`. D-17, D-18.
 */
export class PermissionDeniedError extends Error {
  constructor(message = 'E_PERMISSION_DENIED') {
    super(message);
    this.name = 'PermissionDeniedError';
  }
}

/**
 * Derive the current user's role using the D-03 priority ladder
 * (post Plan 01-13 / ROLE-07 — M1 email allowlist branch removed):
 *   1. customClaims.role (M2 forward-compat — server-verified; undefined today)
 *   2. backendProfile.userType === 'admin' | 'moderator' (Mongo-resolved; SOLE source of truth)
 *   3. authenticated → 'user'; else 'guest'
 */
function deriveRole(user: any): Role {
  if (!user) {
    return 'guest';
  }

  // Branch 1 (M2 forward-compat): server-verified custom claim. Currently undefined.
  // TODO(M2): activate once ROLE-01 ships (custom claims on Firebase token).
  const claimRole = user?.backendProfile?.customClaims?.role as Role | undefined;
  if (claimRole === 'admin' || claimRole === 'moderator' || claimRole === 'user') {
    return claimRole;
  }

  // Branch 2: backend userType (Mongo-resolved). Sole authority post Plan 08 migration
  // (`migrate-roles-m2.js --verify=PASS` upserted M1 admins to userType='admin').
  if (user?.backendProfile?.userType === 'admin') {
    return 'admin';
  }
  if (user?.backendProfile?.userType === 'moderator') {
    return 'moderator';
  }

  // Branch 3: authenticated but unprivileged.
  return 'user';
}

/**
 * Pure permission check — D-16. Imported by services to preserve the
 * "services don't depend on React" convention (CONVENTIONS.md).
 * Input: a user-shaped object (or null/undefined) + an action.
 * Output: boolean. No side effects, no hooks.
 */
export function canFromUser(user: any, action: Action): boolean {
  const role = deriveRole(user);
  switch (action) {
    case 'editVerifications':
    case 'editMatterportUrl':
    case 'editPanoramicUrl':
    case 'promoteToModerator':
    case 'reviewLandlordApplications':
      return role === 'admin';
    case 'editAnyListing':
    case 'approveListings':
      return role === 'admin' || role === 'moderator';
    case 'manageListings':
      // Phase 4.5 capability gate: admins and moderators are implicit; plain users (role==='user')
      // require an admin-approved LandlordApplication, surfaced as backendProfile.canListProperties.
      // Mirrors the backend's requireListingCapability in propertyRoutes.js (server enforces too).
      // Editing one's own existing listing is intentionally NOT gated (server PUT route allows
      // owner edits regardless of capability — see Phase 4.5 plan note).
      if (role === 'admin' || role === 'moderator') return true;
      if (role === 'user') return user?.backendProfile?.canListProperties === true;
      return false;
  }
}

export interface UseRoleResult {
  role: Role;
  isAdmin: boolean;
  isModerator: boolean;
  isAuthenticated: boolean;
  can: (action: Action) => boolean;
}

/**
 * React hook: pure read-only selector over `useAuth()`. Returns a memoized role
 * snapshot. Consumers call `can(action)` — NOT `isAdmin` — for gating. D-03, D-05.
 */
export function useRole(): UseRoleResult {
  const { user } = useAuth();

  return useMemo(() => {
    const role = deriveRole(user);
    return {
      role,
      isAdmin: role === 'admin',
      isModerator: role === 'moderator',
      isAuthenticated: role !== 'guest',
      can: (action: Action) => canFromUser(user, action),
    };
  }, [user]);
}
