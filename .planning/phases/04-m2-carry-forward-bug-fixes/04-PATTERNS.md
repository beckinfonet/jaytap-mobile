# Phase 4: M2 Carry-Forward Bug Fixes — Pattern Map

**Mapped:** 2026-05-06
**Files analyzed:** 18 (10 new + 8 modified across two repos)
**Analogs found:** 18 / 18 (every file has a strong in-tree analog)

> Two repos. RN client paths are relative to `/Users/beckmaldinVL/development/mobileApps/JayTap`. Backend paths are relative to `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`. Each row's "Analog" column makes the repo explicit.

---

## File Classification

| New/Modified file | Repo | Role | Data Flow | Closest analog | Match quality |
|-------------------|------|------|-----------|----------------|---------------|
| `src/hooks/useModActionGuard.ts` (NEW) | RN | hook | event-driven (error recovery) | `src/hooks/useRole.ts` (helper class + hook in one file) | role + flow exact |
| `src/hooks/__tests__/useModActionGuard.test.tsx` (NEW) | RN | test | unit + RTL | `src/hooks/__tests__/useRole.test.ts` (pure helper) + `src/components/__tests__/Gated.test.tsx` (RTL scaffold) | role + flow exact |
| `src/screens/ModerationQueueScreen.tsx` (MODIFY) | RN | screen | request-response + recovery | itself, lines 209-270 (existing 409 catch) — graft 403 branch IN PLACE | self-pattern (graft) |
| `src/screens/PropertyDetailsScreen.tsx` (MODIFY) | RN | screen | request-response + recovery | `src/screens/RoleManagementScreen.tsx:135-177` (canonical client-side `PermissionDeniedError` catch) + own existing 409 catches | role + flow exact |
| `src/screens/RoleManagementScreen.tsx` (MODIFY) | RN | screen | request-response + recovery | itself, lines 135-177 (refactor through new hook; preserve existing handling for `LAST_ADMIN_LOCKOUT` / `SELF_MUTATION` / `ROLE_ALREADY_CHANGED` etc.) | self-pattern |
| `src/components/RejectListingModal.tsx` (NO-EDIT*) | RN | component | presentational | n/a — RESEARCH §Surface Map confirms parent-owned catch; **no edits in modal file** | flagged for skip |
| `src/components/ArchiveListingModal.tsx` (NO-EDIT*) | RN | component | presentational | n/a (same) | flagged for skip |
| `src/components/DeleteListingModal.tsx` (NO-EDIT*) | RN | component | presentational | n/a (same) | flagged for skip |
| `src/locales/en.ts:744` + `src/locales/ru.ts:738` (MODIFY — MD-01) | RN | i18n | static | sibling keys at lines 742-748 (RU 736-742) — same `moderation.mediaCuration.error.*` namespace | namespace exact |
| `JayTap-services/scripts/check-no-landlord-uid-spoofing.sh` (NEW — D-07) | BE | sentinel/CI | build-time invariant | `scripts/check-no-actoruid-spoofing.sh` (15 LOC twin) | role + flow exact |
| `JayTap-services/src/scripts/migrate-landlord-app-uid-mismatch.js` (NEW — D-09/D-11)* | BE | migration | one-shot batch + DB CRUD | `src/scripts/migrate-listings-m3.js` (`--dry-run` / `--verify=PASS` / Node-version guard / pure-helper export pattern) + `src/scripts/migrate-landlord-capability.js` (sibling LandlordApplication-touching migration) | role + flow exact |
| `JayTap-services/src/__tests__/migrate-landlord-app-uid-mismatch.test.js` (NEW) | BE | test | spawn-integration + unit | `src/__tests__/migrate-listings-m3.test.js` (env stub + JWKS mock + spawn child + idempotency assert) | role + flow exact |
| `JayTap-services/src/__tests__/landlordApplicationRoutes.test.js` (NEW — D-08) | BE | test | supertest request-response | `src/__tests__/moderationRoutes.test.js` (env + JWKS mock + multer-s3 mock Recipe A + `buildToken` fixture + `Promise.all` race tests) | role + flow exact |
| `JayTap-services/src/routes/landlordApplicationRoutes.js:111-123` (DELETE — D-06) | BE | route | request-response | own surrounding lines (95-145) — strip diagnostic block in place | self-pattern |
| `JayTap-services/src/routes/moderationRoutes.js:21-43` (MODIFY — D-14 / MD-02) | BE | route | comment doc-drift | n/a (comment-only edit; the surrounding `upload` + `mediaUpload` declarations ARE the source of truth) | self-pattern |
| `JayTap-services/src/routes/moderationRoutes.js:345` DELETE handler (MODIFY — D-15 / MD-03) | BE | route | request-response | `src/routes/favoriteRoutes.js:90` (`mongoose.Types.ObjectId.isValid` form — established repo convention) | role + flow exact |
| `JayTap-services/src/models/LandlordApplication.js:11` (MODIFY — D-10) | BE | model | schema | itself (one-line enum string add) | self-pattern |
| `JayTap-services/src/models/LandlordApplicationAuditLog.js:12` (MODIFY — Discretion) | BE | model | schema | itself (two enum string adds) | self-pattern |
| `JayTap-services/scripts/check-property-routes-media-stripped.sh:8` (MODIFY — D-16 / MD-04) | BE | sentinel/CI | build-time invariant | `scripts/check-no-actoruid-spoofing.sh` (regex form `<token>:\s*req\.<thing>` — uses anchored canonical-API form) | flow exact |
| `JayTap-services/package.json:10` (MODIFY) | BE | config | npm test chain | itself (existing two-sentinel chain — append the third) | self-pattern |

\* The 3 modal files (`RejectListingModal`, `ArchiveListingModal`, `DeleteListingModal`) are presentational. RESEARCH.md §Surface Map verified: error catches live in the parents (`PropertyDetailsScreen` + `ModerationQueueScreen`). Listed here only to make the "no-edit" discovery explicit for the planner — no analog needed.

---

## Pattern Assignments

### `src/hooks/useModActionGuard.ts` (NEW — hook + helper)

**Analog:** `src/hooks/useRole.ts` — colocates a `class PermissionDeniedError extends Error` (lines 33-38), pure helpers (`canFromUser` lines 78-108), and a thin React hook (`useRole` lines 122-135) in one file. Same shape applies here.

**Imports pattern** (`useRole.ts:1-2`):
```typescript
import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
```

For `useModActionGuard.ts`, swap to:
```typescript
import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { PermissionDeniedError } from './useRole';
```

**Helper-export pattern** (`useRole.ts:78-108` — pure, no hooks, importable from services):
```typescript
export function canFromUser(user: any, action: Action): boolean {
  const role = deriveRole(user);
  switch (action) {
    case 'editVerifications':
    // ...
  }
}
```

For the new `is403PermissionError(err)` helper, follow the same shape — pure function, no hook deps, exported alongside the hook so screen-level catches can import it without instantiating the hook (matches CONTEXT D-02 API).

**Hook pattern** (`useRole.ts:122-135` — useMemo over `useAuth().user`):
```typescript
export function useRole(): UseRoleResult {
  const { user } = useAuth();
  return useMemo(() => {
    const role = deriveRole(user);
    return {
      role,
      // ...
      can: (action: Action) => canFromUser(user, action),
    };
  }, [user]);
}
```

For `useModActionGuard`, swap `useMemo` → `useCallback`-wrapped object (the consumed function is `onPermissionDenied` — a stable callback closing over `refreshRole`). Per CONTEXT D-02:
```typescript
export const useModActionGuard = () => {
  const { refreshRole } = useAuth();
  const onPermissionDenied = useCallback(async ({ closeModal, resetLoading }: {
    closeModal: () => void;
    resetLoading: () => void;
  }) => {
    resetLoading();
    closeModal();
    await refreshRole();
  }, [refreshRole]);
  return { is403PermissionError, onPermissionDenied };
};
```

**Detection-criteria pattern** (CONTEXT D-03 — combines two existing throw paths):
- Client-side: `err instanceof PermissionDeniedError || err?.message === 'E_PERMISSION_DENIED'` — exact form already used in `RoleManagementScreen.tsx:147`.
- In-flight: `err?.response?.status === 403` — unifies `code: 'role-revoked'` (auto-handled by `apiClient.ts:159`) and `code: 'insufficient-role'` (NOT auto-handled — flows to caller). Per RESEARCH §"Five things the planner needs to internalize" #2.

---

### `src/hooks/__tests__/useModActionGuard.test.tsx` (NEW)

**Primary analog (helper unit tests):** `src/hooks/__tests__/useRole.test.ts:1-120`

Pure-function unit-test pattern (no hooks needed for `is403PermissionError`):
```typescript
import { canFromUser } from '../useRole';

describe('canFromUser priority ladder (post-allowlist deletion)', () => {
  test('userType=admin grants editVerifications (Branch 2)', () => {
    expect(canFromUser(admin, 'editVerifications')).toBe(true);
  });
  test('null user (guest) cannot editVerifications', () => {
    expect(canFromUser(null, 'editVerifications')).toBe(false);
  });
});
```

For `is403PermissionError`, mirror the same shape:
```typescript
test('returns true for PermissionDeniedError instance', () => {
  expect(is403PermissionError(new PermissionDeniedError())).toBe(true);
});
test('returns true for {response: {status: 403}} axios error', () => {
  expect(is403PermissionError({ response: { status: 403 } })).toBe(true);
});
test('returns false for 409 race-conflict', () => {
  expect(is403PermissionError({ response: { status: 409 } })).toBe(false);
});
test('returns false for null/undefined', () => {
  expect(is403PermissionError(null)).toBe(false);
  expect(is403PermissionError(undefined)).toBe(false);
});
```

**Secondary analog (RTL hook scaffolding):** `src/components/__tests__/Gated.test.tsx:1-72` — uses `react-test-renderer` + `jest.mock('../../hooks/useRole')` (NOT `@testing-library/react-native`, which is not in dev deps per repo precedent). The hook test should mock `useAuth` the same way:
```typescript
jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));
const { useAuth } = require('../../context/AuthContext');

beforeEach(() => {
  (useAuth as jest.Mock).mockReturnValue({
    refreshRole: jest.fn().mockResolvedValue(undefined),
  });
});
```

Per VALIDATION.md row 4-fe-02 + 4-fe-03, the canonical RTL surface is `PropertyDetailsScreen.handleRejectSubmit`. Follow `src/screens/__tests__/ModerationQueueScreen.test.tsx:23-108` for the deep-mock recipe (PropertyService + locationService + useRole + ThemeContext + LanguageContext + safe-area-context + lucide-react-native + PropertyCard all mocked). Re-export the real `PermissionDeniedError` so `instanceof` keeps working — verbatim form at lines 39-52 of that file:
```typescript
jest.mock('../../hooks/useRole', () => {
  const actual = jest.requireActual('../../hooks/useRole');
  return {
    ...actual,
    useRole: () => ({ /* …override fields… */ }),
  };
});
```

---

### `src/screens/ModerationQueueScreen.tsx` (MODIFY — 4 handlers)

**Analog:** itself, lines 209-241 + 243-270. The existing 409-only catch is the structural parallel; graft a 403 branch ABOVE the 409 branch.

**Existing catch shape** (lines 224-237 verbatim — `handleApprove`):
```typescript
} catch (err: any) {
  if (err?.response?.status === 409) {
    await handleRaceConflict();
    return;
  }
  // WR-01 fix — generic translated fallback prevents empty-Alert UX.
  Alert.alert(
    t('common.error'),
    err?.response?.data?.message || err?.message || t('common.errorGeneric'),
  );
} finally {
  setActingId(null);
}
```

**Pattern to apply** (insert ABOVE the 409 branch — preserves precedence: 403 > 409 > generic):
```typescript
} catch (err: any) {
  if (is403PermissionError(err)) {
    await onPermissionDenied({
      closeModal: () => { /* state reset specific to handler */ },
      resetLoading: () => setActingId(null),
    });
    return;
  }
  if (err?.response?.status === 409) {
    await handleRaceConflict();
    return;
  }
  Alert.alert(/* …existing generic fallback… */);
} finally {
  setActingId(null);
}
```

**Per-handler `closeModal` mapping** (RESEARCH §Surface Map row 1-4 + the existing setter calls already in tree):
- `handleApprove` (209-241): `closeModal` is no-op (Alert.alert is the popup, no modal state to close — RN closes it).
- `handleRejectSubmit` (243-270): `closeModal` = `() => setRejectTarget(null)` (line 256 already does this on success).
- `handleApproveLocation` (391-427): same Alert.alert pattern as `handleApprove` — `closeModal` no-op.
- `submitLocationReject` (429-464): same pattern as `handleRejectSubmit` — `closeModal` = whatever sets the locations-tab reject target back to null.

---

### `src/screens/PropertyDetailsScreen.tsx` (MODIFY — 5 handlers)

**Analog:** existing 409 catches in same file (RESEARCH lines 5-9: handlers at 336-367, 369-389, 398-417, 423-453, 458-476). Same graft pattern as ModerationQueueScreen.

**Per-handler `closeModal` mapping** (RESEARCH §Surface Map):
- `handleApprove` (336-367): mod footer — close any open modal, reset acting state.
- `handleRejectSubmit` (369-389): parent of `<RejectListingModal onSubmit={...}>` (line 1672) — `closeModal` closes the RejectListingModal.
- `handleModArchiveSubmit` (398-417): parent of `<ArchiveListingModal onSubmit={...}>` (line 1680).
- `handleRestore` (423-453): mod-archive restore.
- `confirmHardDelete` (458-476): parent of `<DeleteListingModal onConfirm={...}>` (line 1689). NO existing 409 branch (admin-only path) — still graft 403; preserve current generic fallback.

---

### `src/screens/RoleManagementScreen.tsx` (MODIFY — `handleRoleSubmit` 135-177)

**Analog:** itself. This is the canonical client-side `PermissionDeniedError` catch in the codebase — refactor THROUGH the new hook so all 10 handlers share one detection + recovery path, preserving the surrounding bespoke handling for `LAST_ADMIN_LOCKOUT` / `SELF_MUTATION` / `ROLE_ALREADY_CHANGED` / `USER_NOT_FOUND` / 404.

**Existing catch shape** (lines 143-176 verbatim — note `Alert.alert` + `onBack()` are NOT load-bearing for the 403 branch; `RoleRefreshBanner` replaces the alert per CONTEXT D-04):
```typescript
} catch (err: any) {
  if (err instanceof PermissionDeniedError || err?.message === 'E_PERMISSION_DENIED') {
    setSelectedUser(null);
    setModalErrorCode(null);
    Alert.alert(t('common.error'), t('errors.permissionDenied'));
    onBack();
    return;
  }
  const code = err?.response?.data?.code as string | undefined;
  // …code-specific branches: LAST_ADMIN_LOCKOUT, SELF_MUTATION, ROLE_ALREADY_CHANGED…
} finally {
  setSubmittingRole(false);
}
```

**Pattern to apply** (replace ONLY the `PermissionDeniedError` branch; leave all other code-specific branches and the `finally` untouched):
```typescript
} catch (err: any) {
  if (is403PermissionError(err)) {
    await onPermissionDenied({
      closeModal: () => { setSelectedUser(null); setModalErrorCode(null); },
      resetLoading: () => setSubmittingRole(false),
    });
    return;
  }
  // Preserve LAST_ADMIN_LOCKOUT / SELF_MUTATION / ROLE_ALREADY_CHANGED / USER_NOT_FOUND
  // / 404 / NETWORK branches verbatim (lines 154-173).
} finally {
  setSubmittingRole(false);
}
```

**Departure from current behavior (intentional, per CONTEXT D-04):** the existing branch fires `Alert.alert(t('common.error'), t('errors.permissionDenied'))` + `onBack()`. The new path is silent close + `RoleRefreshBanner` auto-surface — no Alert, no manual `onBack()`. Banner handles the user-facing message; no doubled-up signaling. This is the deliberate UX shift in D-04 and applies to all 10 handlers.

---

### `src/locales/en.ts:744` + `src/locales/ru.ts:738` (MD-01 — D-13)

**Analog:** sibling keys in the same `moderation.mediaCuration.error.*` namespace (en.ts:742-748, ru.ts:736-742). The split-key shape (CONTEXT recommends) follows the same naming convention as siblings:

**EN current** (line 744):
```typescript
'moderation.mediaCuration.error.tooLarge': 'File too large. Max 25 MB per file, 45 MB total.',
```

**EN proposed** (split — recommended in CONTEXT D-13):
```typescript
'moderation.mediaCuration.error.tooLarge': 'File too large. Max 25 MB per file.',
'moderation.mediaCuration.error.tooManyFiles': 'Too many files. Max 45 files per upload.',
```

**RU current** (line 738):
```typescript
'moderation.mediaCuration.error.tooLarge': 'Файл слишком большой. Максимум 25 МБ на файл, 45 МБ всего.',
```

**RU proposed** (split):
```typescript
'moderation.mediaCuration.error.tooLarge': 'Файл слишком большой. Максимум 25 МБ на файл.',
'moderation.mediaCuration.error.tooManyFiles': 'Слишком много файлов. Максимум 45 файлов за загрузку.',
```

**Dispatch site** (RESEARCH lines 158-172 — `MediaCurationScreen.tsx:325-333`):
```typescript
if (errorCode === 'LIMIT_FILE_SIZE') {
  Alert.alert(t('common.error'), t('moderation.mediaCuration.error.tooLarge'));
} else if (errorCode === 'LIMIT_FILE_COUNT') {
  Alert.alert(t('common.error'), t('moderation.mediaCuration.error.tooManyFiles'));
} else { ... }
```

**Parity gate:** `bash scripts/check-i18n-parity.sh` exit 0 (VALIDATION row 4-fe-05).

---

### `JayTap-services/scripts/check-no-landlord-uid-spoofing.sh` (NEW — D-07)

**Analog:** `JayTap-services/scripts/check-no-actoruid-spoofing.sh` (15 LOC, verbatim above).

**Imports / shebang / cwd block** (lines 1-3 — copy verbatim):
```bash
#!/usr/bin/env bash
set -u
cd "$(dirname "$0")/.."
```

**Sentinel core** (lines 5-14 — adapt the 4 strings: header echo, grep pattern, fail-message, ok-message):
```bash
echo "== Phase-4 D-07 anti-spoofing sentinel — uid in landlordApplicationRoutes.js =="

hits=$(grep -nE "uid:\s*req\.(body|headers)" src/routes/landlordApplicationRoutes.js 2>/dev/null || true)
if [ -n "$hits" ]; then
  echo "FAIL CARRY-02: uid sourced from req.body or req.headers in landlordApplicationRoutes.js:"
  echo "$hits"
  exit 1
fi
echo "OK CARRY-02: landlord-application uid sourced exclusively from req.firebaseUid"
exit 0
```

**Total LOC change** ≈ 4 strings differ from the actorUid sentinel; everything else is identical.

**Chain into `npm test`** (`package.json:10` — append between the two existing sentinels and `jest`):
```json
"test": "bash scripts/check-no-actoruid-spoofing.sh && bash scripts/check-no-landlord-uid-spoofing.sh && bash scripts/check-property-routes-media-stripped.sh && jest --config jest.config.cjs",
```

---

### `JayTap-services/src/scripts/migrate-landlord-app-uid-mismatch.js` (NEW — D-09 + D-11)

**Primary analog:** `JayTap-services/src/scripts/migrate-listings-m3.js` (387 LOC). NOTE: file lives under `src/scripts/`, NOT top-level `scripts/`. CONTEXT.md and VALIDATION.md both say `scripts/migrate-...` — the planner should land it at `src/scripts/migrate-landlord-app-uid-mismatch.js` to match the established convention; the npm-script alias goes in `package.json` next to `migrate:listings-m3`.

**Imports + dotenv pattern** (`migrate-listings-m3.js:36-41`):
```javascript
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Property = require('../models/Property');
const connectDB = require('../config/db');

dotenv.config();
```

For the new migration, swap models to:
```javascript
const LandlordApplication = require('../models/LandlordApplication');
const LandlordApplicationAuditLog = require('../models/LandlordApplicationAuditLog');
const User = require('../models/User');
```

**Node-version guard** (`migrate-listings-m3.js:43-48` — copy verbatim; per memory `backend-node-version.md` the backend requires Node ≥22.12):
```javascript
if (Number(process.versions.node.split('.')[0]) < 22) {
  console.error('FATAL: Node ≥22.12 required (run `nvm use 24`)');
  process.exit(2);
}
```

**Args parsing + misuse guard** (`migrate-listings-m3.js:50-59` — copy verbatim):
```javascript
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isVerify = args.includes('--verify=PASS');

if (args.includes('--verify') && !args.includes('--verify=PASS')) {
  console.error('FATAL: `--verify` requires the `=PASS` suffix.');
  process.exit(2);
}
```

**Pure-helper export pattern** (`migrate-listings-m3.js:65-170` + `:370-378` — for unit testability):
```javascript
function buildNestedShape(doc) { /* pure transform */ }
// …
module.exports = {
  mapDealType,
  mapRooms,
  mapCurrency,
  buildNestedShape,
  LEGACY_FLAT_FIELDS_TO_UNSET,
};
```

For the new migration the analog pure helper is `classifyRow(application, candidateUsers)` returning one of `{kind: 'hit-skip'}`, `{kind: 'phone-match-flip', newUid}`, `{kind: 'orphan-mark', reason: 'no-match' | 'ambiguous'}`. Export it for unit testing per VALIDATION row 4-be-04.

**Live-run cursor + per-doc updateOne** (`migrate-listings-m3.js:291-301` — load-bearing `.lean()` + `strict: false` are NOT needed here because the LandlordApplication schema is fully Mongoose-managed — no legacy non-schema fields to preserve. Drop the `strict: false` flag; KEEP the cursor-based per-doc transform):
```javascript
const cursor = LandlordApplication.find(filter).cursor();
let flipped = 0, orphaned = 0, skipped = 0;
for await (const app of cursor) {
  const decision = await classifyRow(app); // queries User by uid + phone
  if (decision.kind === 'hit-skip') { skipped++; continue; }
  if (decision.kind === 'phone-match-flip') {
    await LandlordApplication.updateOne({ _id: app._id }, { $set: { uid: decision.newUid } });
    await LandlordApplicationAuditLog.create({
      applicationId: app._id,
      applicantUid: decision.newUid,
      actorUid: 'system-migration',
      action: 'uid-repair', // CONTEXT D-09 + Discretion
      before: { uid: app.uid },
      after: { uid: decision.newUid },
      at: new Date(),
    });
    flipped++;
    continue;
  }
  // orphan-mark
  await LandlordApplication.updateOne({ _id: app._id }, { $set: { status: 'orphaned' } });
  await LandlordApplicationAuditLog.create({
    applicationId: app._id,
    applicantUid: app.uid,
    actorUid: 'system-migration',
    action: 'uid-orphan-mark',
    before: { status: app.status },
    after: { status: 'orphaned' },
    reasonNote: decision.reason,
    at: new Date(),
  });
  orphaned++;
}
```

**Verify-mode acceptance check** (`migrate-listings-m3.js:211-222`):
```javascript
if (isVerify) {
  const remaining = await LandlordApplication.countDocuments({ /* invariant probe */ });
  // …
  if (remaining === 0) { /* PASS */ process.exit(0); } else { process.exit(1); }
}
```

For the landlord migration, the invariant is "no `submitted` row whose uid does not resolve in `Users`". The verify probe: aggregate-lookup against `users` and count non-matches. Idempotency filter: `{ status: { $ne: 'orphaned' } }` AND no existing `LandlordApplicationAuditLog` row with `action: 'uid-repair'` matching current uid (CONTEXT D-09 step 3).

**main() guard** (`migrate-listings-m3.js:380-386` — copy verbatim):
```javascript
if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
```

**Sibling reference:** `JayTap-services/src/scripts/migrate-landlord-capability.js` — sibling Phase 4.5 migration that also walks `LandlordApplication` rows. Worth a read-through for landlord-specific data idioms even though the M3 script is the pattern source.

---

### `JayTap-services/src/__tests__/migrate-landlord-app-uid-mismatch.test.js` (NEW)

**Analog:** `JayTap-services/src/__tests__/migrate-listings-m3.test.js` (full pattern reference).

**Env stub + JWKS mock** (lines 18-32 — copy verbatim; required because LandlordApplication models load transitively through routes that import the firebase config):
```javascript
process.env.FIREBASE_PROJECT_ID = 'jaytap-test-project';
process.env.AWS_REGION = process.env.AWS_REGION || 'us-east-1';
// …all 5 AWS env vars per moderationRoutes.test.js:26-30…

jest.mock('../config/firebase', () => {
  const { importJWK } = require('jose');
  const { getKeys, TEST_ISSUER, TEST_FIREBASE_PROJECT_ID } = require('./fixtures/jwks-tokens');
  const JWKS = async () => {
    const { publicJwk } = await getKeys();
    return await importJWK(publicJwk, 'RS256');
  };
  return { JWKS, ISSUER: TEST_ISSUER, FIREBASE_PROJECT_ID: TEST_FIREBASE_PROJECT_ID };
});
```

**Spawn helper** (`migrate-listings-m3.test.js:107-127` — copy structurally; swap SCRIPT_PATH):
```javascript
const SCRIPT_PATH = path.resolve(__dirname, '../scripts/migrate-landlord-app-uid-mismatch.js');

function runMigrationScript(args) {
  return new Promise((resolve) => {
    const host = mongoose.connection.host;
    const port = mongoose.connection.port;
    const MONGO_URI = `mongodb://${host}:${port}/bizdinkonush`;
    const child = spawn('node', [SCRIPT_PATH, ...args], {
      env: { ...process.env, MONGO_URI },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '', stderr = '';
    child.stdout.on('data', d => stdout += d.toString());
    child.stderr.on('data', d => stderr += d.toString());
    child.on('exit', code => resolve({ code, stdout, stderr }));
  });
}
```

**Two-database trick** (`migrate-listings-m3.test.js:78-105` — load-bearing because `connectDB` hardcodes `dbName: 'bizdinkonush'` while jest's `setup.js` connects to `jaytap-test`). Copy the `txnDb` + alt-connection model rebind verbatim:
```javascript
let txnDb, TxnLandlordApplication;

beforeAll(async () => {
  txnDb = mongoose.connection.useDb('bizdinkonush', { useCache: true });
  TxnLandlordApplication = txnDb.model(
    'LandlordApplication',
    LandlordApplication.schema,
    'landlord_applications',
  );
});

afterEach(async () => {
  if (txnDb) {
    const cols = await txnDb.db.collections();
    for (const c of cols) await c.deleteMany({});
  }
});
```

**Branch coverage required by VALIDATION rows 4-be-04..09** (Envelope B in 04-VALIDATION.md):
- `--dry-run` writes 0 rows (assert via post-spawn `LandlordApplication.countDocuments` unchanged).
- hit-skip: row uid resolves to a User → no audit row, status unchanged.
- phone-match-flip: 1 unique User by phone → audit row `action: 'uid-repair'` + uid flipped.
- orphan-mark (no match): 0 Users by phone → status=`'orphaned'` + audit row `action: 'uid-orphan-mark'`.
- ambiguous-phone (2+ matches): same orphan-mark output, audit-row `reasonNote` captures ambiguity.
- idempotency: 2nd consecutive run → 0 audit-row inserts; status table unchanged.

---

### `JayTap-services/src/__tests__/landlordApplicationRoutes.test.js` (NEW — D-08)

**Analog:** `JayTap-services/src/__tests__/moderationRoutes.test.js` (full pattern reference for env + JWKS + multer-s3 + supertest scaffold).

**Env stub + JWKS mock** (`moderationRoutes.test.js:25-44` — copy verbatim).

**Multer-s3 mock Recipe A** (`moderationRoutes.test.js:53-75` — REQUIRED because `landlordApplicationRoutes.js:31-43` instantiates `multer({storage: multerS3({...})})`, which would attempt real S3 PutObject without the mock):
```javascript
jest.mock('multer-s3', () => {
  return jest.fn(() => ({
    _handleFile: (req, file, cb) => {
      let size = 0;
      file.stream.on('data', (chunk) => { size += chunk.length; });
      file.stream.on('end', () => {
        cb(null, {
          location: `https://stub-s3.test/${file.fieldname}/${Date.now()}-${file.originalname}`,
          key: `${file.fieldname}/${Date.now()}-${file.originalname}`,
          bucket: 'stub-bucket',
          mimetype: file.mimetype,
          size,
        });
      });
      file.stream.on('error', (err) => cb(err));
    },
    _removeFile: (req, file, cb) => cb(null),
  }));
});
```

**App scaffold** (`moderationRoutes.test.js:85-90` — adapt mount path):
```javascript
const request = require('supertest');
const express = require('express');
const router = require('../routes/landlordApplicationRoutes');
const LandlordApplication = require('../models/LandlordApplication');
const LandlordApplicationAuditLog = require('../models/LandlordApplicationAuditLog');
const User = require('../models/User');
const { buildToken } = require('./fixtures/jwks-tokens');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/landlord-applications', router);
  return app;
}
```

**Token-signing pattern** (`moderationRoutes.test.js:167-168` — `buildToken` provides RS256-signed JWTs against the test keypair):
```javascript
const token = await buildToken({ sub: 'mod-a-uid', role: 'moderator', kind: 'valid' });
// …
.set('Authorization', `Bearer ${token}`)
```

**3 mandatory test cases per VALIDATION row 4-be-02** (CONTEXT D-08):
1. POST with body `{uid: 'someone-else'}` + valid Bearer → row created with `uid === payload.sub`, NOT body uid.
2. POST without `Authorization` header → 401 `{code: 'missing-token'}` (the `requireBearer` guard at `landlordApplicationRoutes.js:54-59`).
3. POST with valid Bearer + happy body → 201 with `uid === payload.sub`.

For the body-spoof test, attach the multipart fields the way moderationRoutes does its `.attach()` calls (file upload required because `upload.single('idPhoto')` runs in the route).

---

### `JayTap-services/src/routes/landlordApplicationRoutes.js:111-123` (DELETE — D-06)

**Pattern:** straight deletion. The 7-field block (`evt: 'landlord_application_submit'` + `bearerPresent` + `bodyFirebaseUid` + `legacyHeaderUid` + `reqFirebaseUid` + `reqUserEmail` + `ts`) is removed verbatim. Block is delimited at lines 111-123 (per RESEARCH); the surrounding `existingActive` 409-check (above) and `LandlordApplication.create({...})` (below) stay untouched.

**Sentinel after removal:** `bash scripts/check-no-landlord-uid-spoofing.sh` exits 0 (it greps for `uid:\s*req\.(body|headers)`, which never matches the create-site even with the log present, but removing the log is required by D-06 and verified by VALIDATION row 4-be-03 grep `evt: 'landlord_application_submit'` expects no match).

---

### `JayTap-services/src/routes/moderationRoutes.js:21-43` (MD-02 — D-14)

**Pattern:** comment-only doc-drift fix. The two `makeUploader({...})` calls at lines 29-33 (legacy `upload`: 10MB×40) and 39-43 (new `mediaUpload`: 25MB×45) are correct in code; the comment block at 21-28 was written when only the legacy uploader existed and now reads ambiguously.

**Existing comment** (lines 21-28 — the misleading section):
```javascript
// Phase 3 Plan 01 — S3Client + multer-s3 setup extracted to ../middleware/s3Upload.js
// (factory consumed by both moderationRoutes and propertyRoutes). Behavior preserved
// verbatim: 10MB/file cap + 40-file count + properties/${ts}-${name} key strategy.
```

**Pattern to apply** (rewrite to disambiguate; the proposed text is provided in CONTEXT D-14 — distinguish legacy `upload` (10MB×40, edit-on-behalf) from new `mediaUpload` (25MB×45, mod media curation)):
```javascript
// Phase 3 Plan 01 + 03-02 — TWO uploader instances from the s3Upload.js factory:
//   `upload`      — legacy edit-on-behalf path. 10MB/file × 40 files. PHOTO_MIMES only.
//   `mediaUpload` — new mod media-curation endpoints. 25MB/file × 45 files. PHOTO_MIMES + VIDEO_MIMES.
// Both share the same S3Client + bucket; they diverge ONLY in the makeUploader options.
```

**Acceptance grep** (VALIDATION row 4-be-12):
```bash
grep -nE "10MB|25MB" src/routes/moderationRoutes.js  # expects both
```

---

### `JayTap-services/src/routes/moderationRoutes.js:345` DELETE handler (MD-03 — D-15)

**Analog:** `JayTap-services/src/routes/favoriteRoutes.js:90` — established repo convention uses `mongoose.Types.ObjectId.isValid` (NOT `mongoose.isValidObjectId`, even though both work — RESEARCH §"Five things" #5).

**Existing favoriteRoutes pattern** (lines 88-96):
```javascript
try {
  const idStr = fav && fav.toString ? fav.toString() : String(fav);
  if (mongoose.Types.ObjectId.isValid(idStr)) {
    return new mongoose.Types.ObjectId(idStr);
  }
  return null;
} catch (e) { return null; }
```

**Pattern to apply** (insert at top of `DELETE /listings/:id/media` handler — `moderationRoutes.js:346`, before any `Property.findById` call):
```javascript
router.delete('/listings/:id/media', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        code: 'INVALID_ID',
        message: 'id must be a 24-character hex ObjectId',
      });
    }
    const { url, kind } = req.query;
    // …rest of existing handler…
```

**Import** (top of file — verify mongoose is already required; if not add `const mongoose = require('mongoose');`):
```javascript
const mongoose = require('mongoose');
```

**400 response shape** (`code: 'INVALID_ID'`) — matches existing 400 codes used in the same file (e.g., `code: 'BAD_REQUEST'` at line 350 verbatim), and keeps a stable code consumers can branch on.

---

### `JayTap-services/src/models/LandlordApplication.js:11` (D-10)

**Pattern:** one-line enum extension. Existing line 11:
```javascript
enum: ['submitted', 'approved', 'rejected', 'withdrawn'],
```

Pattern to apply (append `'orphaned'`):
```javascript
enum: ['submitted', 'approved', 'rejected', 'withdrawn', 'orphaned'],
```

**Defensive comment** for `getMine` line 157 + admin queue lines 212-216 in `landlordApplicationRoutes.js`: the existing filters (`{uid: req.firebaseUid}` and default `?status=submitted`) naturally exclude `'orphaned'` rows. CONTEXT D-10 explicitly says "no filter change" — comment-only audit is the maximum permitted scope here.

---

### `JayTap-services/src/models/LandlordApplicationAuditLog.js:12` (Discretion)

**Pattern:** two-string enum extension. Existing line 12:
```javascript
enum: ['submit', 'approve', 'reject', 'withdraw'],
```

Pattern to apply (CONTEXT D-09 recommended; planner picks):
```javascript
enum: ['submit', 'approve', 'reject', 'withdraw', 'uid-repair', 'uid-orphan-mark'],
```

---

### `JayTap-services/scripts/check-property-routes-media-stripped.sh:8` (MD-04 — D-16)

**Analog:** the sibling `check-no-actoruid-spoofing.sh:7` form (`grep -nE "actorUid:\s*req\.(body|headers)"`) is anchored on canonical-API surface (the `:` colon and `req.body|req.headers` form), not on the substring of the package name. Same shape applies here.

**Existing line 8:**
```bash
hits=$(grep -nE "upload\.array|multer|multerS3" src/routes/propertyRoutes.js 2>/dev/null || true)
```

**Pattern to apply** (CONTEXT D-16 verbatim — anchor on actual `require()` / `from` import shapes plus canonical multer API surface; never the bare substring `multer`):
```bash
hits=$(grep -nE "require\(['\"]multer|from ['\"]multer|upload\.array|multerS3" src/routes/propertyRoutes.js 2>/dev/null || true)
```

**Acceptance** (VALIDATION row 4-be-11): exit 0 against post-fix tree (RESEARCH §"Five things" #4 — verified safe); exit 1 if `require('multer')` is re-introduced (Envelope C synthetic regression check).

---

### `JayTap-services/package.json:10` (npm test chain extension — D-07)

**Existing line:**
```json
"test": "bash scripts/check-no-actoruid-spoofing.sh && bash scripts/check-property-routes-media-stripped.sh && jest --config jest.config.cjs",
```

**Pattern to apply:**
```json
"test": "bash scripts/check-no-actoruid-spoofing.sh && bash scripts/check-no-landlord-uid-spoofing.sh && bash scripts/check-property-routes-media-stripped.sh && jest --config jest.config.cjs",
```

**Optional alias scripts** (RESEARCH lines 14-17 — match the existing `check:actoruid` + `check:media-stripped` aliases):
```json
"check:landlord-uid": "bash scripts/check-no-landlord-uid-spoofing.sh",
"migrate:landlord-app-uid-mismatch": "node src/scripts/migrate-landlord-app-uid-mismatch.js",
```

---

## Shared Patterns

### Pattern A — Anti-spoofing sentinel shape (build-time invariant)

**Source:** `JayTap-services/scripts/check-no-actoruid-spoofing.sh` (15 LOC, full file shown earlier in this doc).

**Apply to:**
- New `check-no-landlord-uid-spoofing.sh` (D-07) — twin sentinel.
- Tightened `check-property-routes-media-stripped.sh:8` (D-16) — different grep target, same regex anchor philosophy.

**Recurring shape:**
```bash
#!/usr/bin/env bash
set -u
cd "$(dirname "$0")/.."
echo "== <phase>-<id> sentinel — <description> =="
hits=$(grep -nE "<anchored-pattern>" <target-file> 2>/dev/null || true)
if [ -n "$hits" ]; then
  echo "FAIL <id>: <human-message>"; echo "$hits"; exit 1
fi
echo "OK <id>: <invariant-description>"
exit 0
```

The anchor uses `\s*req\.(body|headers)` form (sentinel A) or `require\(['"]<pkg>` form (sentinel C) — both anchor on punctuation that only appears in the malicious/regressed shape, not in legitimate comments.

### Pattern B — `is403PermissionError(err)` matcher detection (RN client recovery)

**Sources:**
- Client-side throw: `src/services/PropertyService.ts:207` (and 9 other lines) + `src/services/UserService.ts:45,74` — `throw new PermissionDeniedError()` after `canFromUser` pre-check.
- In-flight axios 403: `src/services/api/apiClient.ts:159` (auto-handles `code: 'role-revoked'` only) + per-route `requireMinRole` returns `code: 'insufficient-role'` (NOT auto-handled — flows to caller).

**Apply to:** all 10 parent handlers across `ModerationQueueScreen.tsx`, `PropertyDetailsScreen.tsx`, `RoleManagementScreen.tsx`.

**Detection criteria** (from CONTEXT D-03):
```typescript
export const is403PermissionError = (err: any): boolean =>
  err instanceof PermissionDeniedError ||
  err?.message === 'E_PERMISSION_DENIED' ||
  err?.response?.status === 403;
```

**Why `err?.response?.status === 403` is the right matcher (not `code === 'insufficient-role'`):** RESEARCH §"Five things" #2 — apiClient interceptor handles `role-revoked` 403s itself; `insufficient-role` flows through to the caller. Matching on the status code unifies both code paths and covers any future 403 codes the backend grows. The matcher is intentionally code-agnostic.

### Pattern C — Recovery UX (popup-close + RoleRefreshBanner auto-surface)

**Source:** `src/components/RoleRefreshBanner.tsx:34-83` (full file shown earlier). Mounted globally at App.tsx root; auto-surfaces from AuthContext user-role changes; tap fires confirming `refreshRole()`.

**Apply to:** all 10 parent handlers via `useModActionGuard().onPermissionDenied({closeModal, resetLoading})`.

**Recurring shape (caller side):**
```typescript
} catch (err: any) {
  if (is403PermissionError(err)) {
    await onPermissionDenied({
      closeModal: () => { /* per-handler state reset */ },
      resetLoading: () => setSubmittingX(false),
    });
    return;
  }
  // fall through to existing 409 / generic-error branches…
}
```

**Banner-driven UX vs Alert.alert:** CONTEXT D-04 chooses banner (silent close + auto-surface) over Alert. The existing `RoleManagementScreen.tsx:147-152` Alert pattern is replaced — see PropertyDetailsScreen vs RoleManagementScreen sections above.

### Pattern D — Operator-supervised migration (`--dry-run` + `--verify=PASS`)

**Source:** `JayTap-services/src/scripts/migrate-listings-m3.js` (387 LOC). 5 load-bearing scaffolding parts: header comment with usage examples, Node-version guard, args parsing + misuse guard, pure-helper export for unit-testing, `if (require.main === module) main()` guard.

**Apply to:** new `migrate-landlord-app-uid-mismatch.js`.

**Differences from M3:**
- No `strict: false` flag on `updateOne` (LandlordApplication has no legacy non-schema fields).
- Idempotency invariant is "row's uid resolves in Users OR row.status === 'orphaned' OR audit-log has uid-repair row matching current uid" (CONTEXT D-09 step 3) — not the single $exists filter the M3 script uses.
- Pure helper: `classifyRow(application, candidateUsers)` not `buildNestedShape(doc)`.

### Pattern E — Backend test scaffold (env + JWKS mock + multer-s3 mock + supertest)

**Source:** `JayTap-services/src/__tests__/moderationRoutes.test.js:25-90`.

**Apply to:**
- `landlordApplicationRoutes.test.js` (NEW — D-08): all 4 scaffolding blocks (env / JWKS / multer-s3 / app-mount) needed.
- `migrate-landlord-app-uid-mismatch.test.js` (NEW): env + JWKS only (no supertest); plus the `txnDb` two-database trick from `migrate-listings-m3.test.js:78-105`.

**Setup auto-load:** `src/__tests__/setup.js` is loaded via `jest.config.cjs setupFilesAfterEach`; per-test mongo cleanup is automatic. The new tests do NOT need to manage mongo connection lifecycle — only the `txnDb` alt-connection rebind for spawn-based migration tests.

### Pattern F — i18n parity (EN+RU lockstep)

**Source:** project convention per `CLAUDE.md` ("EN + RU parity required for every new UI string") + existing `bash scripts/check-i18n-parity.sh` gate.

**Apply to:** D-13 / MD-01 i18n key change. If split-key shape is chosen, add `'tooManyFiles'` to BOTH `en.ts` AND `ru.ts` in the same commit.

**Acceptance:** VALIDATION row 4-fe-05 — `bash scripts/check-i18n-parity.sh; echo $?` expects `0`.

---

## No Analog Found

None. All 18 files have an in-tree analog of strong-or-better quality. The phase is mechanical — every pattern is established and verified.

---

## Metadata

**Analog search scope:**
- RN client: `src/hooks/`, `src/screens/`, `src/components/`, `src/services/`, `src/context/`, `src/locales/`
- Backend: `JayTap-services/scripts/`, `JayTap-services/src/scripts/`, `JayTap-services/src/__tests__/`, `JayTap-services/src/routes/`, `JayTap-services/src/models/`

**Files scanned (key analogs read):**
- `src/hooks/useRole.ts`
- `src/hooks/__tests__/useRole.test.ts`
- `src/screens/RoleManagementScreen.tsx` (lines 120-210)
- `src/screens/ModerationQueueScreen.tsx` (lines 209-280)
- `src/screens/__tests__/ModerationQueueScreen.test.tsx` (lines 1-120)
- `src/components/RoleRefreshBanner.tsx`
- `src/components/__tests__/Gated.test.tsx`
- `src/context/AuthContext.tsx` (lines 175-235)
- `src/services/PropertyService.ts` (lines 200-240)
- `src/locales/en.ts:740-750` + `src/locales/ru.ts:735-745`
- `JayTap-services/scripts/check-no-actoruid-spoofing.sh` (full)
- `JayTap-services/scripts/check-property-routes-media-stripped.sh` (full)
- `JayTap-services/src/scripts/migrate-listings-m3.js` (lines 1-200, 200-387)
- `JayTap-services/src/__tests__/migrate-listings-m3.test.js` (lines 1-200)
- `JayTap-services/src/__tests__/moderationRoutes.test.js` (lines 1-200)
- `JayTap-services/src/routes/landlordApplicationRoutes.js` (lines 1-230)
- `JayTap-services/src/routes/moderationRoutes.js` (lines 1-80, 340-410)
- `JayTap-services/src/routes/favoriteRoutes.js:80-105`
- `JayTap-services/src/models/LandlordApplication.js`
- `JayTap-services/src/models/LandlordApplicationAuditLog.js`

**Pattern extraction date:** 2026-05-06
