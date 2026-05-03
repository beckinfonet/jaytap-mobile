// src/services/UserService.ts
// Phase 5 — Admin user-management HTTP client (ADMIN-01 + ADMIN-02 + ADMIN-07).
//
// Source pattern: PropertyService.ts approveListing/rejectListing (Phase 3) —
// apiClient + canFromUser belt-and-suspenders + PermissionDeniedError + try/catch.
//
// Layer 2 of the 3-layer belt-and-suspenders stack:
//   1. Client `<Gated action="manageRoles">` — UX (hides Profile entry-point row)
//   2. Service `canFromUser` pre-HTTP gate — THIS file
//   3. Backend `requireMinRole('admin')` router-level mount — adminRoutes.js
//
// All 401/403/role-revoked retries are inherited from apiClient interceptors.
// On error envelopes (LAST_ADMIN_LOCKOUT 409 / SELF_MUTATION 403 /
// ROLE_ALREADY_CHANGED 409 / USER_NOT_FOUND 404) the caller (RoleChangeModal in
// Plan 04) destructures `error.response.data.code` and maps to localized copy.

import { apiClient } from './apiClient';
import { AuthService } from './AuthService';
import { canFromUser, PermissionDeniedError } from '../hooks/useRole';

export type UserRole = 'user' | 'moderator' | 'admin';

export interface AdminUserListItem {
  _id: string;
  uid: string;
  email: string;
  firstName?: string;
  lastName?: string;
  userType: UserRole;
  roleRevokedAt?: string | null;
}

export const UserService = {
  /**
   * Admin: search users by email substring (ADMIN-01 + ADMIN-07).
   * Backend caps at limit=50 and returns {items: User[]}.
   * D-03 pre-search state: caller may pass empty query; backend short-circuits
   * to {items: []} without a DB scan, so the round-trip cost is minimal.
   */
  searchUsers: async (query: string): Promise<{ items: AdminUserListItem[] }> => {
    try {
      const userData = await AuthService.getUserData();
      if (!canFromUser(userData, 'manageRoles')) {
        console.error('[UserService.searchUsers] permission denied', { userId: userData?.localId });
        throw new PermissionDeniedError();
      }
      const response = await apiClient.get('/admin/users', {
        params: { query, limit: 50 },
      });
      return { items: response.data?.items || [] };
    } catch (error: any) {
      if (error instanceof PermissionDeniedError) throw error;
      console.error('Error searching users:', error?.message);
      throw error;
    }
  },

  /**
   * Admin: change a user's userType (ADMIN-02 + ADMIN-04 + ADMIN-07).
   * Backend handles all guardrails (race-safe atomic, last-admin lockout,
   * self-mutation 403, audit-row write). Returns the full updated User doc.
   *
   * Error envelopes that bubble up to the caller (RoleChangeModal in Plan 04):
   *   - 403 SELF_MUTATION         — admin tried to mutate their own role
   *   - 409 LAST_ADMIN_LOCKOUT    — would result in zero admins
   *   - 409 ROLE_ALREADY_CHANGED  — concurrent role change race
   *   - 404 USER_NOT_FOUND        — target uid not in Mongo
   */
  setUserRole: async (uid: string, userType: UserRole): Promise<AdminUserListItem> => {
    try {
      const userData = await AuthService.getUserData();
      if (!canFromUser(userData, 'manageRoles')) {
        console.error('[UserService.setUserRole] permission denied', { userId: userData?.localId });
        throw new PermissionDeniedError();
      }
      const response = await apiClient.patch(`/admin/users/${uid}/role`, { userType });
      return response.data as AdminUserListItem;
    } catch (error: any) {
      if (error instanceof PermissionDeniedError) throw error;
      console.error('Error setting user role:', error?.message);
      throw error;
    }
  },
};
