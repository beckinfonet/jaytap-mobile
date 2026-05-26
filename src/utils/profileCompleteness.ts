// Client-side mirror of the backend gate predicate
// (JayTap-services/src/utils/profileCompleteness.js).
//
// Used by:
//   - <LandlordApplicationScreen> to render the soft-prompt gate banner
//   - <LandlordApplicationQueueScreen> indirectly via the backend's
//     `applicant.profileComplete` flag (no client recomputation needed there)
//
// Keep this file in lockstep with the backend implementation. The unit test
// suite is the contract — if the backend changes the predicate, mirror it here
// AND update both test files together.

import type { BackendProfile } from '../types/Auth';

export type ProfileMissingField = 'firstName' | 'lastName' | 'phone' | 'messagingChannel';

const REQUIRED_STRING_FIELDS: Array<'firstName' | 'lastName' | 'phone'> = [
  'firstName',
  'lastName',
  'phone',
];
const MESSAGING_CHANNELS: Array<'whatsapp' | 'telegram'> = ['whatsapp', 'telegram'];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function profileMissingFields(
  user: Partial<BackendProfile> | null | undefined
): ProfileMissingField[] {
  if (!user) return [...REQUIRED_STRING_FIELDS, 'messagingChannel'];
  const missing: ProfileMissingField[] = REQUIRED_STRING_FIELDS.filter(
    (f) => !isNonEmptyString(user[f])
  );
  const hasChannel = MESSAGING_CHANNELS.some((f) => isNonEmptyString(user[f]));
  if (!hasChannel) missing.push('messagingChannel');
  return missing;
}
