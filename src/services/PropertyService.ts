import { apiClient } from './apiClient';
import { AuthService } from './AuthService';
import { canFromUser, PermissionDeniedError } from '../hooks/useRole';

// Phase 1 Plan 11 (ROLE-05): all backend HTTP migrated to the shared apiClient.
// baseURL + Authorization: Bearer header are owned by `apiClient` (see Plan 10).
// Per plan: AuthService stays on direct axios because it talks to Firebase
// Identity Toolkit, not the JayTap backend.

export const PropertyService = {
  getAllProperties: async () => {
    try {
      const response = await apiClient.get('/properties');
      // Map _id to id for frontend compatibility
      const mapped = response.data.map((p: any) => ({ ...p, id: p._id }));
      return mapped;
    } catch (error: any) {
      console.error('Error fetching properties:', error?.message);
      throw error;
    }
  },

  getPropertyById: async (id: string) => {
    try {
      const response = await apiClient.get(`/properties/${id}`);
      return { ...response.data, id: response.data._id };
    } catch (error: any) {
      console.error('Error fetching property:', error?.message);
      throw error;
    }
  },

  getUserProperties: async (firebaseUid: string) => {
    try {
      const response = await apiClient.get(`/properties/user/${firebaseUid}`);
      // Map _id to id for frontend compatibility
      return response.data.map((p: any) => ({ ...p, id: p._id }));
    } catch (error: any) {
      console.error('Error fetching user properties:', error?.message);
      throw error;
    }
  },

  // Phase 1 cutover (commit 6f815f5) + Phase 3 multer strip (commit 2be38d3): backend POST
  // /properties expects a JSON body in nested shape (`content.title`, `location.coordinates`,
  // `basics.price`, etc.). `propertyData` is the SPEC payload from
  // ContextualListingFlow/adapters.ts `formBagToPropertyPayload` — already shaped correctly.
  // Phase 3 D-13: user-side media write disabled. Mod uploads via /api/moderation/listings/:id/media.
  // ownerUid derived server-side from req.firebaseUid (HF-03 anti-spoofing — memory
  // phase45-landlord-application-uid-mismatch-bug.md).
  createProperty: async (propertyData: any) => {
    try {
      const userData = await AuthService.getUserData();
      if (!userData?.localId) {
        throw new Error('User not authenticated');
      }
      const response = await apiClient.post('/properties', propertyData);
      return { ...response.data, id: response.data._id };
    } catch (error: any) {
      console.error('Error creating property:', error);
      throw error;
    }
  },

  // Phase 1 cutover + Phase 3 multer strip: backend PUT /properties/:id expects JSON nested-shape
  // body. Server-side M2 D-22 sanitizer + atomic rejected→pending auto-flip remain. Phase 3 D-13:
  // user-side media write disabled — mod uploads via /api/moderation/listings/:id/media.
  // See createProperty for full rationale.
  updateProperty: async (propertyId: string, propertyData: any) => {
    try {
      const userData = await AuthService.getUserData();
      if (!userData?.localId) {
        throw new Error('User not authenticated');
      }
      const response = await apiClient.put(`/properties/${propertyId}`, propertyData);
      return { ...response.data, id: response.data._id };
    } catch (error: any) {
      console.error('Error updating property:', error);
      throw error;
    }
  },

  /** Admin only: update verification flags on any listing */
  patchPlatformVerifications: async (
    propertyId: string,
    platformVerifications: {
      ownershipDocuments: boolean;
      ownerIdentityVerified: boolean;
      stateIssuedDocumentsVerified: boolean;
    }
  ) => {
    const userData = await AuthService.getUserData();
    if (!userData?.localId) {
      throw new Error('User not authenticated');
    }
    if (!canFromUser(userData, 'editVerifications')) {
      console.error('[PropertyService.patchPlatformVerifications] permission denied', { userId: userData?.localId });
      throw new PermissionDeniedError();
    }
    const response = await apiClient.patch(
      `/properties/${propertyId}/verifications`,
      // Legacy body field — see createProperty note. Backend dual-accepts.
      { firebaseUid: userData.localId, platformVerifications }
    );
    return { ...response.data, id: response.data._id };
  },

  // Phase 4 D-09 + D-Claude-Discretion — owner archives own listing via dedicated POST route (Plan 04-02).
  // Belt-and-suspenders: client UI gate (Plan 07 <Gated>) → service layer canFromUser → backend ownership check.
  // REPLACES the broken Phase 2 archiveProperty stub (PUT body-status was no-op'd by D-22 sanitizer).
  archiveOwnListing: async (propertyId: string): Promise<any> => {
    try {
      const userData = await AuthService.getUserData();
      if (!canFromUser(userData, 'archiveOwnListing')) {
        console.error('[PropertyService.archiveOwnListing] permission denied', { userId: userData?.localId });
        throw new PermissionDeniedError();
      }
      const response = await apiClient.post(`/properties/${propertyId}/archive`);
      return { ...response.data, id: response.data._id };
    } catch (error: any) {
      console.error('Error owner-archiving listing:', error?.message);
      throw error;
    }
  },

  // Phase 4 D-08 + D-Claude-Discretion — mod/admin archives any listing with structured reasonCode + optional reasonNote.
  // Backend Plan 04-03 validates reasonCode against VALID_REJECT_CODES allowlist; mismatches return 400.
  archiveAnyListing: async (
    propertyId: string,
    reasonCode: 'incomplete-info' | 'prohibited-content' | 'out-of-service-area' | 'other',
    reasonNote?: string,
  ): Promise<any> => {
    try {
      const userData = await AuthService.getUserData();
      if (!canFromUser(userData, 'archiveAnyListing')) {
        console.error('[PropertyService.archiveAnyListing] permission denied', { userId: userData?.localId });
        throw new PermissionDeniedError();
      }
      const body: any = { reasonCode };
      if (reasonNote && reasonNote.trim()) body.reasonNote = reasonNote.trim();
      const response = await apiClient.post(`/moderation/properties/${propertyId}/archive`, body);
      return { ...response.data, id: response.data._id };
    } catch (error: any) {
      console.error('Error mod-archiving listing:', error?.message);
      throw error;
    }
  },

  // Phase 4 D-12 + D-Claude-Discretion — restore archived listing → status 'pending'.
  // ARCH-04: restore is available to whoever has rights to archive (owner for self-archived; mod/admin for any).
  // Single method routes by role at call time: mod/admin → /moderation/properties/:id/restore (Plan 04-03);
  // any other authenticated user → /properties/:id/unarchive (Plan 04-02 — backend D-13 ownership-gates).
  // REPLACES the broken Phase 2 unarchiveProperty stub (PUT body-status 'draft' had no enum value).
  restoreListing: async (propertyId: string): Promise<any> => {
    try {
      const userData = await AuthService.getUserData();
      const isMod = canFromUser(userData, 'archiveAnyListing');
      if (!isMod && !canFromUser(userData, 'archiveOwnListing')) {
        console.error('[PropertyService.restoreListing] permission denied', { userId: userData?.localId });
        throw new PermissionDeniedError();
      }
      const url = isMod
        ? `/moderation/properties/${propertyId}/restore`
        : `/properties/${propertyId}/unarchive`;
      const response = await apiClient.post(url);
      return { ...response.data, id: response.data._id };
    } catch (error: any) {
      console.error('Error restoring listing:', error?.message);
      throw error;
    }
  },

  // Phase 4 D-04 + D-Claude-Discretion — admin hard-delete (apiClient.delete path unchanged; backend Plan 04-04 tightens auth).
  // Action union member: 'hardDeleteListing' (admin only). Pre-condition: listing must be 'archived' first
  // (HARD_DELETE_REQUIRES_ARCHIVED 400 from backend if not). The legacy `deleteProperty` backwards-compat alias
  // was removed in Phase 4 review-fix WR-01 — grep confirmed zero callers across src/ + App.tsx.
  hardDeleteListing: async (propertyId: string): Promise<any> => {
    try {
      const userData = await AuthService.getUserData();
      if (!canFromUser(userData, 'hardDeleteListing')) {
        console.error('[PropertyService.hardDeleteListing] permission denied', { userId: userData?.localId });
        throw new PermissionDeniedError();
      }
      const response = await apiClient.delete(`/properties/${propertyId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error hard-deleting listing:', error?.message);
      if (error.response?.data?.message) throw new Error(error.response.data.message);
      throw error;
    }
  },

  // ===== PHASE 3 — Moderation queue + actions (MOD-10..MOD-17) =====

  /**
   * Moderator: list pending listings FIFO. Returns {items, totalCount}.
   * D-03 piggyback strategy: the same endpoint serves both the queue render and
   * the Profile entry-point pending-count badge — saves a 5th endpoint.
   * Belt-and-suspenders permission guard via canFromUser (Phase 1 ROLE-12 pattern);
   * server-side requireMinRole('moderator') is the authoritative gate.
   */
  getModerationQueue: async (): Promise<{ items: any[]; totalCount: number }> => {
    try {
      const userData = await AuthService.getUserData();
      if (!canFromUser(userData, 'approveListings')) {
        console.error('[PropertyService.getModerationQueue] permission denied', { userId: userData?.localId });
        throw new PermissionDeniedError();
      }
      const response = await apiClient.get('/moderation/queue');
      // WR-03 fix — defensively coerce _id to String so keyExtractor consumers always
      // receive a string, even if a future backend change uses .lean() without toJSON
      // (in which case _id would arrive as an ObjectId-shaped object instead of the
      // serialized string).
      return {
        items: (response.data.items || []).map((p: any) => ({ ...p, id: String(p._id) })),
        totalCount: response.data.totalCount,
      };
    } catch (error: any) {
      console.error('Error fetching moderation queue:', error?.message);
      throw error;
    }
  },

  /**
   * Moderator: get the pending-count badge value (D-03).
   * Implementation: piggybacks on getModerationQueue() — fetches the full list and returns totalCount.
   * If M3+ scales the queue past ~50 listings, swap to a dedicated GET /moderation/queue/count endpoint.
   */
  getModerationQueueCount: async (): Promise<number> => {
    try {
      const { totalCount } = await PropertyService.getModerationQueue();
      return totalCount;
    } catch (error: any) {
      // WR-04 fix — distinguish "transient network error" from "permission denied".
      // The 403 / 401 case is already handled by apiClient interceptor (banner / hard
      // logout), but consumers that opt-in to handling it (e.g. ModerationQueueScreen.load
      // via WR-06) need the error surface preserved. Network blips still resolve to 0
      // so the Profile badge silently stays at 0.
      if (error instanceof PermissionDeniedError) throw error;
      console.error('Error fetching moderation queue count:', error?.message);
      return 0;
    }
  },

  /**
   * Moderator: approve a pending listing. Backend uses race-safe atomic findOneAndUpdate.
   * Returns 409 with code: 'ALREADY_MODERATED' if another moderator beat us — caller surfaces toast (D-08).
   */
  approveListing: async (propertyId: string): Promise<any> => {
    try {
      const userData = await AuthService.getUserData();
      if (!canFromUser(userData, 'approveListings')) {
        console.error('[PropertyService.approveListing] permission denied', { userId: userData?.localId });
        throw new PermissionDeniedError();
      }
      const response = await apiClient.post(`/moderation/properties/${propertyId}/approve`);
      return { ...response.data, id: response.data._id };
    } catch (error: any) {
      // 409 ALREADY_MODERATED bubbles up; UI consumer (Plan 04 + Plan 06) detects status===409 and surfaces the verbatim toast.
      console.error('Error approving listing:', error?.message);
      throw error;
    }
  },

  /**
   * Moderator: reject a pending listing with structured reasonCode + optional note (MOD-12, MOD-13).
   * Same race-safe + 409 contract as approveListing.
   */
  rejectListing: async (
    propertyId: string,
    reasonCode: 'incomplete-info' | 'prohibited-content' | 'out-of-service-area' | 'other',
    reasonNote?: string,
  ): Promise<any> => {
    try {
      const userData = await AuthService.getUserData();
      if (!canFromUser(userData, 'approveListings')) {
        console.error('[PropertyService.rejectListing] permission denied', { userId: userData?.localId });
        throw new PermissionDeniedError();
      }
      const body: any = { reasonCode };
      if (reasonNote && reasonNote.trim()) body.reasonNote = reasonNote.trim();
      const response = await apiClient.post(`/moderation/properties/${propertyId}/reject`, body);
      return { ...response.data, id: response.data._id };
    } catch (error: any) {
      console.error('Error rejecting listing:', error?.message);
      throw error;
    }
  },

  /**
   * Moderator: edit listing on behalf of owner (MOD-14). Multipart for image uploads.
   * Backend strips ownerUid + status defensively; client also avoids sending them.
   * Backend flips status to 'live' on save (D-12 sub-decision recommendation) and writes audit log.
   * NOTE: must NOT include ownerUid in the FormData — auto-memory phase45-landlord-application-uid-mismatch-bug.md
   */
  editAsModerator: async (
    propertyId: string,
    propertyData: any,
    images: any[] = [],
    reason?: string,
  ): Promise<any> => {
    try {
      const userData = await AuthService.getUserData();
      if (!canFromUser(userData, 'editAnyListing')) {
        console.error('[PropertyService.editAsModerator] permission denied', { userId: userData?.localId });
        throw new PermissionDeniedError();
      }
      const formData = new FormData();
      // Mirror updateProperty's FormData shape, but defensively strip identity + status fields.
      // CRITICAL: do NOT append ownerUid or status to the FormData — backend strips defensively
      // (MOD-14) but client-side hygiene avoids sending them in the first place.
      Object.keys(propertyData || {}).forEach((key) => {
        if (key === 'ownerUid' || key === 'status' || key === 'id' || key === '_id') return;
        const value = (propertyData as any)[key];
        if (value === undefined || value === null) return;
        if (Array.isArray(value) || (typeof value === 'object' && !(value as any).uri)) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      });
      if (reason) formData.append('reason', reason);
      images.forEach((image, index) => {
        formData.append('images', {
          uri: image.uri,
          type: image.type || 'image/jpeg',
          name: image.name || `image-${index}.jpg`,
        } as any);
      });
      const response = await apiClient.put(`/moderation/listings/${propertyId}`, formData);
      return { ...response.data, id: response.data._id };
    } catch (error: any) {
      console.error('Error editing as moderator:', error?.message);
      throw error;
    }
  },
};
