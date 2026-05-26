# Landlord Application — Applicant Context (Profile Gate + Enriched Admin Review)

**Date:** 2026-05-26
**Status:** Design approved, pending implementation plan
**Surfaces touched:** RN client (3 screens, 1 new) + backend (1 route file, 1 utility)

## 1. Problem

The admin Landlord Applications queue (`LandlordApplicationQueueScreen`) shows almost nothing about who is applying — just a raw Firebase `uid`, an ID photo, an application-form phone number, intent flags, and an optional free-text note. Admins cannot see the applicant's name, email, profile phone, or messaging channels (WhatsApp / Telegram), and there is no way to drill in for more context. Reviewing an application means deciding on partial information.

Two contributing causes:

1. **The submit flow does not require a complete profile.** Users with blank `firstName` / `lastName` / `phone` and no messaging channel can submit applications today. The admin queue then has nothing to enrich with.
2. **The admin queue API returns only the `LandlordApplication` document.** Even when the applicant *has* filled out their profile, the queue endpoint never joins the `User` record, so the screen could not render that data even if it wanted to.

## 2. Goal

Admins reviewing a landlord application can see — at a glance on the queue, with a tap-through for full detail — the applicant's name, email, profile phone, WhatsApp, Telegram, and account age, and trust that those fields are present because submission was gated on profile completeness.

Concretely:

- A user cannot submit a landlord application unless their profile has `firstName`, `lastName`, `phone`, AND at least one of `whatsapp` / `telegram`.
- The admin queue card shows the applicant's display name + email in its header and links to a read-only Applicant Profile screen with full contact and application details.
- The applicant can self-serve the gate (tap "Open settings" → fill in missing fields → return → submit).

## 3. Non-goals (Out of Scope)

- Bulk approve/reject actions (already deferred to M4+ per STATE.md candidate list)
- Edit-applicant-profile-on-behalf (Applicant Profile is strictly read-only for admin)
- Real-estate document verification beyond the existing ID-photo upload (the M4+ "Avito-style ownership proof" backlog item)
- Push or email notifications when an applicant updates their profile
- Migration of existing in-queue applications — the queue join handles missing fields naturally with `(not provided)` rendering; admin uses the existing `incomplete-info` reject reason at their discretion

## 4. Design

### 4.1 Data contract

#### 4.1.1 Profile-completeness predicate (single source of truth)

New utility: `src/utils/profileCompleteness.js` (backend) — used by both the submit gate and the queue join's `profileComplete` flag.

```js
const REQUIRED_STRING_FIELDS = ['firstName', 'lastName', 'phone'];
const MESSAGING_CHANNELS = ['whatsapp', 'telegram'];

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function profileMissingFields(user) {
  if (!user) return [...REQUIRED_STRING_FIELDS, 'messagingChannel'];
  const missing = REQUIRED_STRING_FIELDS.filter((f) => !isNonEmptyString(user[f]));
  const hasChannel = MESSAGING_CHANNELS.some((f) => isNonEmptyString(user[f]));
  if (!hasChannel) missing.push('messagingChannel');
  return missing;
}

module.exports = { profileMissingFields, isNonEmptyString };
```

**Invariants:**

- Whitespace-only strings (`'   '`) are treated as missing.
- Email is NOT in the required set — Firebase signup already enforces it (see `User.js` schema: `email` is `required: true, unique: true`).
- `messagingChannel` is a synthetic field name surfaced in the missing list when neither `whatsapp` nor `telegram` is set; the RN client maps it to a human-readable label in i18n.

#### 4.1.2 Submit route — `POST /api/landlord-applications`

In `src/routes/landlordApplicationRoutes.js`, add a profile-completeness check BEFORE the existing `existingActive` and `ALREADY_APPROVED` checks (so an incomplete-profile retry doesn't get a misleading 409):

```js
const user = await User.findOne({ uid: req.firebaseUid }).lean();
const missing = profileMissingFields(user);
if (missing.length) {
  return res.status(400).json({
    code: 'PROFILE_INCOMPLETE',
    message: 'Complete your profile before applying.',
    missingFields: missing,
  });
}
```

Response shape on the failure path:

```json
{
  "code": "PROFILE_INCOMPLETE",
  "message": "Complete your profile before applying.",
  "missingFields": ["firstName", "phone", "messagingChannel"]
}
```

`missingFields` values are one of: `firstName`, `lastName`, `phone`, `messagingChannel`.

#### 4.1.3 Admin queue route — `GET /api/admin/landlord-applications` (mounted at `/admin/queue`)

Currently returns `LandlordApplication[]`. Refactor to:

1. Run the existing `LandlordApplication.find(filter).sort({ submittedAt: 1 })` query.
2. Collect the distinct `uid` values from the result.
3. `User.find({ uid: { $in: uids } }).lean()` → build a `Map<uid, User>`.
4. Merge an `applicant` block into each row.

Response shape per row:

```ts
type AdminQueueRow = LandlordApplication & {
  applicant: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    profilePhone: string | null;       // distinct from application.phone
    whatsapp: string | null;
    telegram: string | null;
    createdAt: string | null;           // ISO 8601, for account-age display
    profileComplete: boolean;           // from profileMissingFields(user).length === 0
  } | null;                              // null only when the User row is missing (data drift)
};
```

**Implementation notes:**

- No `populate` — `LandlordApplication.uid` is a string Firebase uid, not an ObjectId reference.
- One `User.find` query per request (not N+1).
- Empty-string fields normalize to `null` in the JSON response so the RN client can use `applicant.firstName ?? t('applicantProfile.notProvided')` without an extra `isNonEmptyString` check.
- `applicant` itself is `null` (NOT `{}`) when no `User` document exists for the uid — defensive against data drift. The RN client renders the full card as "(not provided)" in that case and still allows reject.

### 4.2 RN client

#### 4.2.1 `src/services/LandlordApplicationService.ts`

Extend the existing `LandlordApplication` type with the new `applicant` block. No new methods — `getAdminQueue` already returns the joined payload after the backend change.

```ts
export interface LandlordApplicationApplicant {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  profilePhone: string | null;
  whatsapp: string | null;
  telegram: string | null;
  createdAt: string | null;
  profileComplete: boolean;
}

export interface LandlordApplication {
  // ...existing fields...
  applicant?: LandlordApplicationApplicant | null;   // optional for back-compat with /mine response
}
```

On `submit()`, catch a 400 with `code: 'PROFILE_INCOMPLETE'` and surface `missingFields` to the caller (re-throw a typed `ProfileIncompleteError` so the screen can render the gate banner without re-parsing the axios error). The user-facing `LandlordApplicationScreen` handles it; the service is just a passthrough.

#### 4.2.2 New screen — `src/screens/ApplicantProfileScreen.tsx`

Read-only. Receives the full `LandlordApplication` (including the joined `applicant`) as a prop — does not refetch. Sections, top to bottom:

1. **Header** — `firstName lastName` (or `(not provided)`) + email + `Joined <date>` in `colors.textSecondary`. Back chevron in the leading position (matches existing detail screens).
2. **Contact** — tappable rows for `profilePhone` (→ `tel:`), `whatsapp` (→ `https://wa.me/<digits-only>`), `telegram` (→ `https://t.me/<handle-stripped-of-@>`). Each row renders `(not provided)` (untappable, `colors.textSecondary`) when null. Tap handler uses `Linking.openURL`, wrapped in `try/catch` with no user-facing alert on failure (silently fall back; admin can tap a different channel).
3. **Application** — application phone (only rendered when it differs from `profilePhone`), `listingTypeIntents` joined, ID photo (tap to zoom — reuse the existing `ImageZoom` wrapper used in `PropertyDetailsScreen` per the 260515-djv quick), `applicantNote` (only rendered when non-empty), submitted date.
4. **Action footer** — Approve / Reject buttons. Same handlers as the queue card (lifted into a shared `useLandlordApplicationDecisions(applicationId)` hook or accepted as props). Reject opens the same modal already in `LandlordApplicationQueueScreen`.

Wired into `App.tsx`'s state machine via a new overlay flag mirroring the existing landlord-application admin queue pattern (`isApplicantProfileOpen` + `selectedApplication`). Closing the screen returns to the queue without losing scroll position (same keep-alive pattern as the moderation queue uses for `PropertyDetailsScreen` — per the 260514-rk1 quick).

#### 4.2.3 `src/screens/LandlordApplicationQueueScreen.tsx` — card refactor

Mockup-approved Option B:

- **Drop** the inline `Phone` / `Intent` rows currently rendered on the card.
- **Add** a tappable header row at the top of each card:

  ```
  ┌─────────────────────────────────────────┐
  │  Aibek Tursunov                  View › │
  │  aibek.tur@gmail.com · joined Apr 12    │
  │  [⚠ Profile incomplete] (chip, if applicable) │
  └─────────────────────────────────────────┘
  ```

  Background `colors.surface` with `colors.border`. Tapping anywhere on the row fires the `onOpenApplicantProfile(application)` prop.
- Missing `firstName` / `lastName` → card header shows `(not provided)` (`colors.textSecondary`).
- Missing `email` → also `(not provided)`.
- `applicant === null` (no User row) → header shows the raw `uid` as a fallback identifier in `colors.textSecondary`, plus the incomplete-profile chip.
- **Chip rendering rule:** render the `Profile incomplete` chip when `applicant === null || applicant.profileComplete === false`. The two failure modes (missing User row vs. User row with blank fields) collapse into the same visual treatment.
- ID photo, applicant note, Approve / Reject footer stay where they are.

#### 4.2.4 `src/screens/LandlordApplicationScreen.tsx` — soft-prompt gate

On mount, derive `missingFields` from the current `AuthContext` user (`firstName`, `lastName`, `phone`, `whatsapp`, `telegram`) using a client-side mirror of `profileMissingFields`.

- **If `missingFields.length === 0`:** render the existing application form unchanged.
- **If `missingFields.length > 0`:** render a banner panel in place of the form:

  ```
  ┌──────────────────────────────────────────┐
  │  Add your details first                  │
  │                                          │
  │  Admins need this info to approve you:   │
  │   • Last name                            │
  │   • Phone number                         │
  │   • WhatsApp or Telegram                 │
  │                                          │
  │  [ Open settings ]                       │
  └──────────────────────────────────────────┘
  ```

  The "Open settings" button calls a new prop `onOpenAccountSettings` (App.tsx wires it to the same route the Profile screen already uses).

- **Backstop:** on `LandlordApplicationService.submit()` 400 with `PROFILE_INCOMPLETE`, render the same banner (in case the user mutated their profile between mount and submit). The `missingFields` from the server response take precedence.

- **Re-evaluation:** the banner is a `useMemo` on the `AuthContext` user object, so returning from `AccountSettingsScreen` (which updates `AuthContext` on save) re-renders without a manual refresh.

### 4.3 i18n keys (EN + RU)

New keys under two namespaces. All values must land in BOTH `src/locales/en.ts` and `src/locales/ru.ts` to satisfy `scripts/check-i18n-parity.sh`.

```
applicantProfile.title                          "Applicant profile" / "Профиль заявителя"
applicantProfile.contact                        "Contact" / "Контакты"
applicantProfile.application                    "Application" / "Заявка"
applicantProfile.joined                         "Joined {{date}}" / "Зарегистрирован: {{date}}"
applicantProfile.notProvided                    "(not provided)" / "(не указано)"
applicantProfile.profileIncomplete              "Profile incomplete" / "Профиль неполный"
applicantProfile.profilePhone                   "Phone (profile)" / "Телефон (профиль)"
applicantProfile.appPhone                       "Phone (application)" / "Телефон (в заявке)"
applicantProfile.whatsapp                       "WhatsApp" / "WhatsApp"
applicantProfile.telegram                       "Telegram" / "Telegram"
applicantProfile.idPhoto                        "ID photo" / "Фото документа"
applicantProfile.intent                         "Plans to list" / "Планирует размещать"
applicantProfile.submittedAt                    "Submitted {{date}}" / "Отправлено: {{date}}"

landlordApp.gateTitle                           "Add your details first" / "Сначала укажите данные"
landlordApp.gateBody                            "Admins need this info to approve you:" / "Эта информация нужна модераторам для одобрения:"
landlordApp.gateMissing.firstName               "First name" / "Имя"
landlordApp.gateMissing.lastName                "Last name" / "Фамилия"
landlordApp.gateMissing.phone                   "Phone number" / "Номер телефона"
landlordApp.gateMissing.messagingChannel        "WhatsApp or Telegram" / "WhatsApp или Telegram"
landlordApp.gateOpenSettings                    "Open settings" / "Открыть настройки"
```

The existing `landlordApp.rejectReason.incomplete-info` covers the admin-side reject path for legacy queue items — no new key needed there.

### 4.4 Theme / styling

- All new surfaces consume `useTheme()` tokens — no hardcoded hex.
- Tappable contact rows: row text `colors.text`, launch icon `colors.accent`, divider `colors.border`.
- `(not provided)` placeholders render in `colors.textSecondary`.
- `Profile incomplete` chip: background tinted `colors.surface`, border `colors.warning` (or `colors.accent` if `colors.warning` is absent — verify against the current `ThemeContext` palette during implementation), text `colors.text`.
- KBD-02 invariant preserved: no `keyboardVerticalOffset` introduced in `src/` (grep gate must stay 0).

### 4.5 Navigation wiring (`App.tsx`)

The `LandlordApplicationQueueScreen` is already mounted as an overlay over `ProfileScreen`. Add:

- `isApplicantProfileOpen: boolean` + `selectedApplication: LandlordApplication | null` state on the App component.
- New overlay slot for `<ApplicantProfileScreen>` rendered above the queue (so closing it returns to the queue with scroll preserved — same `display: 'none'` keep-alive trick as the moderation queue uses).
- New prop `onOpenAccountSettings` passed into `LandlordApplicationScreen` — wires to the existing `AccountSettingsScreen` route.

No new navigation library. The custom App.tsx state machine stays — explicit non-goal per CLAUDE.md.

## 5. Testing

### 5.1 Backend (`JayTap-services` / jest)

New cases in `src/__tests__/landlordApplicationRoutes.test.js`:

| # | Case | Expected |
|---|------|----------|
| B1 | Submit with blank firstName | 400 `PROFILE_INCOMPLETE`, missingFields includes `firstName` |
| B2 | Submit with whitespace-only lastName (`'   '`) | 400 `PROFILE_INCOMPLETE`, missingFields includes `lastName` |
| B3 | Submit with all required fields blank | 400 `PROFILE_INCOMPLETE`, missingFields = `['firstName', 'lastName', 'phone', 'messagingChannel']` |
| B4 | Submit with `whatsapp` set, `telegram` blank | 200 (one channel is enough) |
| B5 | Submit with both `whatsapp` and `telegram` blank | 400 `PROFILE_INCOMPLETE`, missingFields includes `messagingChannel` |
| B6 | Submit when profile is complete | 200 (existing happy path, unchanged) |
| B7 | Submit with complete profile but `existingActive` already exists | 409 `ACTIVE_APPLICATION_EXISTS` (gate check does not steal the 409 path) |
| B8 | Admin queue join: User exists | row has `applicant.firstName`, `email`, etc. populated |
| B9 | Admin queue join: User missing | row has `applicant: null` |
| B10 | Admin queue join: `profileComplete` matches the same predicate as the submit gate (parametric over B1–B5 fixtures) |

Unit tests for `profileCompleteness.js` covering the same matrix at the function level (so the predicate has direct coverage independent of HTTP plumbing).

### 5.2 RN client (jest + React Testing Library)

| # | Case | Expected |
|---|------|----------|
| F1 | `LandlordApplicationQueueScreen` renders name + email in card header | name + email visible; old phone/intent rows absent |
| F2 | Missing `firstName` → header shows `(not provided)` | matches i18n key value |
| F3 | `applicant: null` → header shows raw uid as fallback | uid visible in `textSecondary` |
| F4 | `profileComplete: false` → chip rendered | chip text matches `applicantProfile.profileIncomplete` |
| F5 | Tap card header → `onOpenApplicantProfile` called with the row | one call, with the right LandlordApplication |
| F6 | `LandlordApplicationScreen` with incomplete profile → gate banner rendered, form hidden | banner heading matches `landlordApp.gateTitle` |
| F7 | `LandlordApplicationScreen` with complete profile → form rendered, banner hidden | existing happy path preserved |
| F8 | Service throws `ProfileIncompleteError` on submit → gate banner renders with server's missingFields | server fields take precedence over client snapshot |
| F9 | `ApplicantProfileScreen` renders all contact rows; `(not provided)` for null fields | rows present with correct styling |
| F10 | Tap WhatsApp row → `Linking.openURL` called with `https://wa.me/<digits>` | digits-only normalization applied |
| F11 | Tap Telegram row with `@handle` → URL is `https://t.me/handle` (no `@`) | leading `@` stripped |
| F12 | i18n parity: every new key has both EN and RU values | `check-i18n-parity.sh` passes |

### 5.3 Manual physical-device QA

Two-device, two-language, two-theme matrix (M4 convention — iPhone 15 Pro Max + Moto G XT2513V × EN + RU × light/dark, 16 cells):

1. Apply flow when profile is incomplete → settings → return → submit (gate disappears).
2. Apply flow when profile is already complete → submit (no gate appears).
3. Admin queue card for application with full profile → tap header → ApplicantProfileScreen → tap phone (dialer opens) → tap WhatsApp (WhatsApp opens or Play/App Store on devices without it).
4. Admin queue card for application with partial profile → `(not provided)` placeholders + `Profile incomplete` chip visible.
5. Admin queue card for legacy application where `User` row is missing → uid fallback in header + chip visible.
6. Reject from ApplicantProfileScreen using `incomplete-info` → returns to queue, app removed.
7. Approve from ApplicantProfileScreen → returns to queue, app removed.

## 6. Implementation Order

1. **Backend** — `profileCompleteness.js` utility + jest matrix (B1–B10) + submit-route gate + queue-route join. Atomic commits per logical change.
2. **RN client types + service** — extend `LandlordApplication` interface with `applicant`; add `ProfileIncompleteError` mapping.
3. **i18n keys** — EN + RU, parity-checked.
4. **Gate banner** in `LandlordApplicationScreen` (uses existing AuthContext data).
5. **Card refactor** in `LandlordApplicationQueueScreen` (uses the new `applicant` payload).
6. **New `ApplicantProfileScreen`** — pure presentation + lift Approve/Reject handlers.
7. **`App.tsx` wiring** for the new overlay + the `onOpenAccountSettings` prop.
8. **Manual QA** on both devices, both languages, both themes.

## 7. Risks / Open Questions

| Risk | Mitigation |
|------|------------|
| `colors.warning` token may not exist in the current theme palette | Implementer verifies during step 1; falls back to `colors.accent` for the chip border. Mark as Claude's Discretion. |
| RU translations for new strings may need editorial review | Strings shipped here are working translations consistent with existing keys; native-speaker review can land as a follow-up patch without blocking release. |
| Existing queue rows reference uids whose User row was already deleted | Defensive `applicant: null` path renders uid fallback + chip; admin can still reject. No data migration needed. |
| Backend test fixtures (`landlordApplicationRoutes.test.js`) currently bypass the profile-completeness check by not creating a `User` row | All new fixtures must create the `User` first; happy-path B6 retrofit needed for existing test cases that POST to `/landlord-applications`. |

## 8. Claude's Discretion items

Minor implementation calls deliberately left to the implementer per the user's `feedback-discuss-phase-detail-level` preference:

- Gate UX style — soft prompt at the top of `LandlordApplicationScreen` (chosen) vs. hard-disabled button on `ProfileScreen` (rejected — less discoverable, splits the source of truth).
- Existing in-flight applications — no migration; the join handles missing fields naturally and the existing `incomplete-info` reject code already covers admin intent.
- Contact tap behavior — `tel:` for phone, `https://wa.me/<digits>` for WhatsApp (digits-only), `https://t.me/<handle>` for Telegram (strip leading `@`). Silent fallback on `Linking.openURL` failure.
- `Profile incomplete` chip styling — bordered chip in warning/accent tone; exact token chosen at implementation time against the current palette.
- Whether the Approve/Reject handlers live in a shared hook vs. duplicated across two screens — implementer's call based on file size after refactor.

## 9. References

- Existing screen: `src/screens/LandlordApplicationQueueScreen.tsx`
- Existing screen: `src/screens/LandlordApplicationScreen.tsx`
- Existing screen: `src/screens/AccountSettingsScreen.tsx` (already edits the required fields)
- Existing service: `src/services/LandlordApplicationService.ts`
- Backend route: `JayTap-services/src/routes/landlordApplicationRoutes.js`
- Backend model: `JayTap-services/src/models/User.js`
- CLAUDE.md — `firstName/lastName/phone/whatsapp/telegram` are existing optional fields on `User`; `email` is already required at signup.
- Memory: `identity-vs-user-store.md` — Firebase = identity proof, MongoDB = authoritative user record (so the profile gate must read from Mongo, not the Firebase token).
- Memory: `gsd-verifier-misses-regressions.md` — paired-gate testing (verifier + code review) for the queue route refactor.
- Memory: `subagent-cwd-drift-recurring.md` — implementer should prepend `cd <worktree> && ` to every Bash command in subagent prompt templates.
