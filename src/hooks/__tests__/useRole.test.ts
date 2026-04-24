/**
 * @format
 */

import { canFromUser } from '../useRole';

describe('canFromUser priority ladder', () => {
  const admin = { email: 'admin@foo.com', backendProfile: { userType: 'admin' } };
  const allowlisted = { email: 'beckprograms@gmail.com', backendProfile: {} };
  const renter = { email: 'r@foo.com', backendProfile: { userType: 'renter' } };
  const plainUser = { email: 'u@foo.com', backendProfile: { userType: 'user' } };

  test('userType=admin grants editVerifications (branch 2)', () => {
    expect(canFromUser(admin, 'editVerifications')).toBe(true);
  });

  test('allowlisted email grants editVerifications (M1 branch 3 — D-03)', () => {
    expect(canFromUser(allowlisted, 'editVerifications')).toBe(true);
  });

  test('allowlist email comparison is case-insensitive (D-06)', () => {
    const upper = { email: 'BECKPROGRAMS@GMAIL.COM', backendProfile: {} };
    expect(canFromUser(upper, 'editVerifications')).toBe(true);
  });

  test('allowlist email comparison trims whitespace (D-06)', () => {
    const padded = { email: '  beckprograms@gmail.com  ', backendProfile: {} };
    expect(canFromUser(padded, 'editVerifications')).toBe(true);
  });

  test('non-allowlisted plain user cannot editVerifications', () => {
    expect(canFromUser(plainUser, 'editVerifications')).toBe(false);
  });

  test('null user (guest) cannot editVerifications', () => {
    expect(canFromUser(null, 'editVerifications')).toBe(false);
  });

  test('manageListings (D-12) true for admin OR renter userType', () => {
    expect(canFromUser(admin, 'manageListings')).toBe(true);
    expect(canFromUser(renter, 'manageListings')).toBe(true);
    expect(canFromUser(plainUser, 'manageListings')).toBe(false);
  });

  test('editMatterportUrl and editPanoramicUrl are admin-only', () => {
    expect(canFromUser(admin, 'editMatterportUrl')).toBe(true);
    expect(canFromUser(admin, 'editPanoramicUrl')).toBe(true);
    expect(canFromUser(allowlisted, 'editMatterportUrl')).toBe(true);
    expect(canFromUser(plainUser, 'editMatterportUrl')).toBe(false);
    expect(canFromUser(renter, 'editPanoramicUrl')).toBe(false);
  });
});
