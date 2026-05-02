/**
 * @format
 */

import { canFromUser } from '../useRole';

/**
 * ROLE-07 / Plan 01-13:
 *   - The M1 email allowlist (Branch 3 of deriveRole) and the M1 admin-emails
 *     constants module are DELETED.
 *   - Backend `userType` (Mongo-resolved, post Plan 08 migration) is the SOLE Branch 2 path.
 *   - Branch 1 (`backendProfile.customClaims.role`) remains as forward-compat for ROLE-01.
 *   - Branch 4 (signed-out → 'guest', authenticated → 'user') is preserved.
 *
 * Post Plan 09 enum cutover: the legacy renter userType no longer exists in Mongo.
 * The client `manageListings` gate (formerly admin OR legacy renter userType) is
 * REMOVED — any authenticated user with a backendProfile is permitted on the client;
 * ownership + server-side role authority are the real boundaries (mirrors
 * propertyRoutes.js cleanup in Plan 06).
 */

describe('canFromUser priority ladder (post-allowlist deletion)', () => {
  const admin = { email: 'admin@foo.com', backendProfile: { userType: 'admin' } };
  const moderator = { email: 'm@foo.com', backendProfile: { userType: 'moderator' } };
  const plainUser = { email: 'u@foo.com', backendProfile: { userType: 'user' } };

  test('userType=admin grants editVerifications (Branch 2)', () => {
    expect(canFromUser(admin, 'editVerifications')).toBe(true);
  });

  test('formerly-allowlisted email NO LONGER grants admin if backend userType is "user"', () => {
    // Pre-Plan-13 this returned true via Branch 3. Post-Plan-13 the allowlist is gone:
    // an email-only signal cannot promote to admin.
    const formerlyAllowlisted = {
      email: 'beckprograms@gmail.com',
      backendProfile: { userType: 'user' },
    };
    expect(canFromUser(formerlyAllowlisted, 'editVerifications')).toBe(false);
  });

  test('formerly-allowlisted email is admin only because Plan 08 set userType="admin" in Mongo', () => {
    // The maintainer (`beckprograms@gmail.com`) remains admin in production because the
    // Plan 08 `migrate-roles-m2.js --verify=PASS` upserted their Mongo record to
    // userType: 'admin'. The client now learns this from backendProfile, NOT from email.
    const maintainerWithMigratedAdmin = {
      email: 'beckprograms@gmail.com',
      backendProfile: { userType: 'admin' },
    };
    expect(canFromUser(maintainerWithMigratedAdmin, 'editVerifications')).toBe(true);
  });

  test('case-variant former-allowlist email does NOT grant admin (allowlist gone)', () => {
    const upper = { email: 'BECKPROGRAMS@GMAIL.COM', backendProfile: { userType: 'user' } };
    expect(canFromUser(upper, 'editVerifications')).toBe(false);
  });

  test('whitespace-padded former-allowlist email does NOT grant admin (allowlist gone)', () => {
    const padded = { email: '  beckprograms@gmail.com  ', backendProfile: { userType: 'user' } };
    expect(canFromUser(padded, 'editVerifications')).toBe(false);
  });

  test('non-admin plain user cannot editVerifications', () => {
    expect(canFromUser(plainUser, 'editVerifications')).toBe(false);
  });

  test('null user (guest) cannot editVerifications', () => {
    expect(canFromUser(null, 'editVerifications')).toBe(false);
  });

  test('Branch 1 forward-compat: customClaims.role === "admin" wins over backend userType', () => {
    const customClaimAdmin = {
      email: 'cc@foo.com',
      backendProfile: {
        userType: 'user',
        customClaims: { role: 'admin' },
      },
    };
    expect(canFromUser(customClaimAdmin, 'editVerifications')).toBe(true);
  });

  test('Branch 1 forward-compat: customClaims.role === "moderator"', () => {
    const customClaimMod = {
      email: 'cc@foo.com',
      backendProfile: {
        userType: 'user',
        customClaims: { role: 'moderator' },
      },
    };
    expect(canFromUser(customClaimMod, 'editAnyListing')).toBe(true);
    expect(canFromUser(customClaimMod, 'editVerifications')).toBe(false);
  });

  test('moderator can editAnyListing + approveListings but not editVerifications', () => {
    expect(canFromUser(moderator, 'editAnyListing')).toBe(true);
    expect(canFromUser(moderator, 'approveListings')).toBe(true);
    expect(canFromUser(moderator, 'editVerifications')).toBe(false);
    expect(canFromUser(moderator, 'promoteToModerator')).toBe(false);
  });

  test('manageListings (post-cutover): any authenticated user with a backendProfile is permitted', () => {
    // Plan 09 enum cutover removed legacy 'renter'. Plan 06 backend removed the analogous
    // role gate from propertyRoutes.js. Client mirrors: gate is by authentication +
    // ownership (enforced elsewhere), not by userType.
    expect(canFromUser(admin, 'manageListings')).toBe(true);
    expect(canFromUser(moderator, 'manageListings')).toBe(true);
    expect(canFromUser(plainUser, 'manageListings')).toBe(true);
  });

  test('manageListings: guest (null user) is NOT permitted', () => {
    expect(canFromUser(null, 'manageListings')).toBe(false);
  });

  test('editMatterportUrl and editPanoramicUrl are admin-only (no allowlist bypass)', () => {
    expect(canFromUser(admin, 'editMatterportUrl')).toBe(true);
    expect(canFromUser(admin, 'editPanoramicUrl')).toBe(true);
    expect(canFromUser(plainUser, 'editMatterportUrl')).toBe(false);
    expect(canFromUser(moderator, 'editPanoramicUrl')).toBe(false);
    // Critical post-allowlist assertion: email-only signal doesn't bypass.
    const formerlyAllowlisted = {
      email: 'beckprograms@gmail.com',
      backendProfile: { userType: 'user' },
    };
    expect(canFromUser(formerlyAllowlisted, 'editMatterportUrl')).toBe(false);
    expect(canFromUser(formerlyAllowlisted, 'editPanoramicUrl')).toBe(false);
  });

  test('promoteToModerator is admin-only (no moderator self-promotion + no allowlist bypass)', () => {
    expect(canFromUser(admin, 'promoteToModerator')).toBe(true);
    expect(canFromUser(moderator, 'promoteToModerator')).toBe(false);
    expect(canFromUser(plainUser, 'promoteToModerator')).toBe(false);
    const formerlyAllowlisted = {
      email: 'beckprograms@gmail.com',
      backendProfile: { userType: 'user' },
    };
    expect(canFromUser(formerlyAllowlisted, 'promoteToModerator')).toBe(false);
  });
});

describe('viewModerationQueue (Phase 3 / MOD-10 / D-03)', () => {
  test('moderator can view moderation queue', () => {
    const user = { backendProfile: { userType: 'moderator' } };
    expect(canFromUser(user, 'viewModerationQueue')).toBe(true);
  });

  test('admin can view moderation queue', () => {
    const user = { backendProfile: { userType: 'admin' } };
    expect(canFromUser(user, 'viewModerationQueue')).toBe(true);
  });

  test('plain user cannot view moderation queue', () => {
    const user = { backendProfile: { userType: 'user' } };
    expect(canFromUser(user, 'viewModerationQueue')).toBe(false);
  });

  test('guest cannot view moderation queue', () => {
    expect(canFromUser(null, 'viewModerationQueue')).toBe(false);
  });
});
