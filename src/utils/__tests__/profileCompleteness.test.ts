import { profileMissingFields, type ProfileMissingField } from '../profileCompleteness';
import type { BackendProfile } from '../../types/Auth';

const complete: Partial<BackendProfile> = {
  firstName: 'Aibek',
  lastName: 'Tursunov',
  phone: '+996554525410',
  whatsapp: '+996554525410',
  telegram: '@aibek_tur',
};

describe('profileMissingFields (client mirror)', () => {
  test('complete profile → []', () => {
    expect(profileMissingFields(complete)).toEqual([]);
  });

  test('null/undefined → all 4 missing', () => {
    const expected: ProfileMissingField[] = ['firstName', 'lastName', 'phone', 'messagingChannel'];
    expect(profileMissingFields(null)).toEqual(expected);
    expect(profileMissingFields(undefined)).toEqual(expected);
  });

  test('blank firstName → ["firstName"]', () => {
    expect(profileMissingFields({ ...complete, firstName: '' })).toEqual(['firstName']);
  });

  test('whitespace-only lastName → ["lastName"]', () => {
    expect(profileMissingFields({ ...complete, lastName: '   ' })).toEqual(['lastName']);
  });

  test('whatsapp only is enough', () => {
    expect(profileMissingFields({ ...complete, telegram: '' })).toEqual([]);
  });

  test('telegram only is enough', () => {
    expect(profileMissingFields({ ...complete, whatsapp: '' })).toEqual([]);
  });

  test('both channels blank → ["messagingChannel"]', () => {
    expect(profileMissingFields({ ...complete, whatsapp: '', telegram: '' })).toEqual(['messagingChannel']);
  });

  test('canonical order across all-missing', () => {
    expect(profileMissingFields({})).toEqual(['firstName', 'lastName', 'phone', 'messagingChannel']);
  });

  test('empty object {} → all 4 missing (mirror of backend empty-object case)', () => {
    expect(profileMissingFields({})).toEqual(['firstName', 'lastName', 'phone', 'messagingChannel']);
  });
});
