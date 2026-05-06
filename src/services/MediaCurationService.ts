/**
 * Phase 3 Plan 03-05 — Media Curation Service.
 *
 * Wraps the Plan 03-02 backend endpoints for the dedicated mod-only
 * MediaCurationScreen:
 *   POST   /api/moderation/listings/:id/media       (upload photos/videos/tourUrl)
 *   DELETE /api/moderation/listings/:id/media       (idempotent $pull on a single asset)
 *
 * Auth: consumes the existing apiClient (Bearer interceptor + 401/403
 * single-flight refresh from M2 ROLE-09). Both methods perform a
 * belt-and-suspenders capability check via canFromUser BEFORE any network
 * call — non-mods get a synchronous PermissionDeniedError throw, no HTTP
 * round-trip (T-04 mitigation; backend role check is the authoritative gate).
 *
 * Pattern source: src/services/PropertyService.ts:355-397 (canFromUser gate
 * shape) + src/services/LandlordApplicationService.ts (FormData service shape).
 */

import { apiClient } from './apiClient';
import { AuthService } from './AuthService';
import { canFromUser, PermissionDeniedError } from '../hooks/useRole';

export interface PendingAsset {
  uri: string;
  type?: string;
  fileName?: string;
}

/**
 * Belt-and-suspenders capability gate. Throws PermissionDeniedError BEFORE
 * any network call when the local user data lacks the 'approveListings'
 * capability. Backend enforces too (route is mounted under
 * requireModerator middleware) — this is purely client-side hygiene to
 * avoid a wasted 403 round-trip and to surface the same
 * PermissionDeniedError shape that PropertyService throws.
 */
async function assertModCapability(): Promise<void> {
  const userData = await AuthService.getUserData();
  if (!canFromUser(userData, 'approveListings')) {
    console.error(
      '[MediaCurationService] permission denied — non-mod attempted media curation',
      { userId: userData?.localId },
    );
    throw new PermissionDeniedError();
  }
}

export const MediaCurationService = {
  /**
   * Upload photos / videos / tourUrl to a listing.
   *
   * Backend (Plan 03-02) appends to existing media arrays — server caps at
   * 40 photos / 5 videos total; client should also cap pre-pick to avoid the
   * server-side 400 MEDIA_TOO_MANY_FILES round-trip.
   *
   * Field shape (matches multer upload.fields shape on the backend):
   *   - photos[]   — multipart files
   *   - videos[]   — multipart files
   *   - tourUrl    — string (https:// only; backend validates protocol)
   *
   * Returns the updated Property document (server-shape; _id, media.{...}).
   * 409 ALREADY_MODERATED bubbles up unchanged for the caller to surface as
   * the moderation.race.toast.
   */
  uploadMedia: async (
    listingId: string,
    photos: PendingAsset[],
    videos: PendingAsset[],
    tourUrl?: string,
  ): Promise<any> => {
    await assertModCapability();

    const formData = new FormData();
    photos.forEach((p, i) => {
      formData.append('photos', {
        uri: p.uri,
        type: p.type || 'image/jpeg',
        name: p.fileName || `photo-${Date.now()}-${i}.jpg`,
      } as any);
    });
    videos.forEach((v, i) => {
      formData.append('videos', {
        uri: v.uri,
        type: v.type || 'video/mp4',
        name: v.fileName || `video-${Date.now()}-${i}.mp4`,
      } as any);
    });
    if (tourUrl) formData.append('tourUrl', tourUrl);

    // apiClient auto-detects FormData and lets RN's fetch shim set the
    // Content-Type with the multipart boundary — same pattern as
    // LandlordApplicationService.submit (which works in production).
    const response = await apiClient.post(
      `/moderation/listings/${listingId}/media`,
      formData,
    );
    return response.data;
  },

  /**
   * Delete a single asset from a listing's media. Idempotent ($pull
   * semantics on the backend — removing a non-member URL is a no-op 200).
   *
   * URL is sent as a query string parameter; encodeURIComponent ensures
   * embedded slashes / colons / query-strings in the S3 URL survive routing.
   * `kind` distinguishes which media subarray to pull from.
   */
  deleteMediaAsset: async (
    listingId: string,
    url: string,
    kind: 'photo' | 'video',
  ): Promise<any> => {
    await assertModCapability();

    const encoded = encodeURIComponent(url);
    const response = await apiClient.delete(
      `/moderation/listings/${listingId}/media?url=${encoded}&kind=${kind}`,
    );
    return response.data;
  },
};
