export interface TimeSlot {
  date: string; // YYYY-MM-DD
  startTime: string; // "09:00"
  endTime: string;   // "09:30" or "10:00"
}

export interface Appointment {
  id: string;
  propertyId: string;
  listingOwnerUid: string;
  participantUid: string;
  initiatorUid: string;
  status: 'pending' | 'confirmed' | 'declined';
  requestedSlot: TimeSlot;
  suggestedSlot?: TimeSlot;
  confirmedSlot?: TimeSlot;
  property?: { id: string; title: string; address: string; images?: string[]; imageUrl?: string; listingId?: string };
  otherUser?: { uid: string; firstName?: string; lastName?: string; email?: string };
  displaySlot?: TimeSlot;
  isOwner?: boolean;
  isInitiator?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AvailabilityResponse {
  blockSize: '30min' | '60min';
  startHour: number;
  endHour: number;
  available: TimeSlot[];
}

export interface OwnerSettings {
  blockSize: '30min' | '60min';
  startHour: number;
  endHour: number;
}
