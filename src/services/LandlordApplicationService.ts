// Phase 4.5 — Landlord application client service.
// Mirrors PropertyService conventions: Authorization Bearer header is owned by apiClient.
import { apiClient } from './apiClient';

export type LandlordApplicationStatus = 'submitted' | 'approved' | 'rejected' | 'withdrawn';
export type ListingTypeIntent = 'residential' | 'commercial' | 'hospitality';
export type RejectionReasonCode = 'incomplete-info' | 'invalid-id' | 'duplicate' | 'other';

export interface LandlordApplication {
  _id: string;
  uid: string;
  status: LandlordApplicationStatus;
  phone: string;
  idPhotoUrl: string;
  listingTypeIntents: ListingTypeIntent[];
  applicantNote?: string | null;
  submittedAt: string;
  decidedAt?: string | null;
  decidedByUid?: string | null;
  rejectionReasonCode?: RejectionReasonCode | null;
  rejectionReasonNote?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubmitInput {
  phone: string;
  listingTypeIntents: ListingTypeIntent[];
  applicantNote?: string;
  idPhoto: { uri: string; type?: string; name?: string }; // local file picked via ImagePicker
}

export const LandlordApplicationService = {
  /** Submit a new application. One active (status='submitted') per user; throws on duplicate. */
  submit: async (input: SubmitInput): Promise<LandlordApplication> => {
    const formData = new FormData();
    formData.append('phone', input.phone);
    // Multer parses JSON-stringified arrays via the route's parsing branch.
    formData.append('listingTypeIntents', JSON.stringify(input.listingTypeIntents));
    if (input.applicantNote) formData.append('applicantNote', input.applicantNote);
    formData.append('idPhoto', {
      uri: input.idPhoto.uri,
      type: input.idPhoto.type || 'image/jpeg',
      name: input.idPhoto.name || `id-${Date.now()}.jpg`,
    } as any);

    const response = await apiClient.post('/landlord-applications', formData);
    return response.data;
  },

  /** Current user's application history, newest first. */
  getMine: async (): Promise<LandlordApplication[]> => {
    const response = await apiClient.get('/landlord-applications/mine');
    return response.data;
  },

  /** Withdraw an active application. Server rejects if status !== 'submitted'. */
  withdraw: async (applicationId: string): Promise<LandlordApplication> => {
    const response = await apiClient.delete(`/landlord-applications/${applicationId}`);
    return response.data;
  },

  /** Admin queue. Defaults to status='submitted' (FIFO by submittedAt). */
  getAdminQueue: async (status: LandlordApplicationStatus | 'all' = 'submitted'): Promise<LandlordApplication[]> => {
    const response = await apiClient.get('/landlord-applications/admin/queue', { params: { status } });
    return response.data;
  },

  /** Admin: approve. Flips applicant's User.canListProperties=true server-side. */
  approve: async (applicationId: string): Promise<LandlordApplication> => {
    const response = await apiClient.post(`/landlord-applications/admin/${applicationId}/decide`, {
      decision: 'approve',
    });
    return response.data;
  },

  /** Admin: reject. reasonCode required; reasonNote optional. */
  reject: async (
    applicationId: string,
    reasonCode: RejectionReasonCode,
    reasonNote?: string
  ): Promise<LandlordApplication> => {
    const response = await apiClient.post(`/landlord-applications/admin/${applicationId}/decide`, {
      decision: 'reject',
      reasonCode,
      reasonNote,
    });
    return response.data;
  },
};
