---
slug: whatsapp-no-editor-surface
status: resolved
trigger: |
  DATA_START
  check where whatsapp number is added for the user. I cannot find it to edit. Also, I wanted to add a whatsapp number to my own profile, I dont see that option. But there are some listings that offer ways to contect the owner via whatsapp(this option shows up only if whatsapp number is listed) and selecting whatsapp actually opens the whatsapp application.
  DATA_END
created: 2026-05-01T06:52:32Z
updated: 2026-05-01T07:14:00Z
---

# WhatsApp number — no editor surface anywhere

## Symptoms

- **Read side works**: `PropertyDetailsScreen` contact section shows a WhatsApp button on SOME listings; tapping it opens the WhatsApp app (deep-link integration confirmed working). The conditional rendering implies a field/value is present for those listings only.
- **Write side missing on all surfaces**: User looked in
  - `ProfileScreen` / Account settings
  - `EditProfile` / Edit Account form
  - `CreateListingScreen` / Edit Listing form
  
  …and found no field for adding a WhatsApp number anywhere.
- **User account context**: User is logged in as the M1 hardcoded admin (`beckprograms@gmail.com`, now server-resolved to `userType: 'admin'` post-Phase 1). Their own profile has no WhatsApp value; they want to add one.
- **Frequency**: 100% — no editor exists.
- **Goal**: investigate + apply the fix (build the missing editor surface).

## Project context (load-bearing)

- **Two repos** for any fix:
  - RN client: `/Users/beckmaldinVL/development/mobileApps/JayTap` (this repo)
  - Backend: `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services` (separate repo, owned by same user; M2 phases touch both)
- **Per `MEMORY.md` (`identity-vs-user-store.md`)**: Firebase = identity proof; **MongoDB = enriched user store** holding `userType` and arbitrary user profile fields. The WhatsApp number, if it lives on the user, lives in MongoDB — not Firebase claims.
- **Per `MEMORY.md` (`backend-node-version.md`)**: Backend requires `nvm use 24` (Node ≥22.12) before any npm/node commands. RN client unaffected.
- **Per `MEMORY.md` (`no-firebase-sdk.md`)**: NO Firebase SDK in either repo. Don't propose `firebase` / `@react-native-firebase/*` packages.
- **i18n parity required**: every new UI string must have EN+RU pairs in `src/locales/en.json` AND `src/locales/ru.json`. Apply if the fix introduces labels.
- **Theme**: `useTheme()` tokens, no hardcoded colors. Dark/light parity required.
- **Geographic scope**: KG/KZ/UZ — phone/WhatsApp number formatting should not assume Bishkek-only; +996 / +7 / +998 are all in scope.
- **HF-01 precedent (Phase 1)**: Property Mongoose schema previously dropped `rooms` / `maxGuests` / `amenities` silently because the schema didn't include them. **Same shape as this bug, possibly** — verify whether `whatsappNumber` is in the schema(s) at all, or if it's a client-only field that the read path resolves from an owner lookup.

## Initial hypotheses (to test, not assume)

1. **H1 — `whatsappNumber` lives on the User document in Mongo, populated on the listing card via owner-lookup.** Some legacy users (seeded or imported) have a value; new self-service signups don't. There's no editor because the field was added schema-side but never given a form. **Fix scope**: add the field to `EditProfileScreen` (or equivalent), wire it through `AuthService` / backend `users` route, validate format.
2. **H2 — `whatsappNumber` lives on the Property document directly (per-listing).** The read path is just `property.whatsappNumber`. Editor missing because `CreateListingScreen` / Edit Listing was built without it. **Fix scope**: add the field to the listing form, wire it through `propertyRoutes`, default to owner's user-level value if present.
3. **H3 — Hybrid: field is read with a fallback chain (`property.whatsappNumber ?? owner.whatsappNumber ?? null`).** Editor missing on both surfaces. **Fix scope**: add to both forms (per-listing override + per-user default).
4. **H4 — Field name is something other than `whatsappNumber` (e.g., `whatsapp`, `whatsappContact`, repurposed `phoneNumber`).** Have to confirm the actual field name first via grep on `PropertyDetailsScreen` before searching for editors.
5. **H5 — Owner phone number IS the WhatsApp number** (no separate field; WhatsApp deep-link uses the owner's `phoneNumber` directly, gated by a "uses WhatsApp" boolean or formatted-as-international check). User can't find a "WhatsApp number" option because there isn't one — they need to set their phone number, and the WhatsApp button derives from that.

## Current Focus

```yaml
hypothesis: H4-then-H1/H2/H3/H5 — first establish the actual field name and which document it lives on, then route to the matching editor-missing hypothesis.
test: |
  Step 1 — grep RN client for WhatsApp / whatsapp references to find:
    a) The PropertyDetailsScreen render site (confirms field name and source object — property vs owner).
    b) The deep-link helper (Linking.openURL with wa.me / whatsapp:// scheme).
    c) Any existing form fields for the value (rules out "editor exists, user missed it").
  Step 2 — read the PropertyDetailsScreen render path top-down: what populates `property.X` or `owner.X`?
  Step 3 — read the backend Property and User Mongoose schemas to confirm where the field is declared (or whether it's missing entirely).
  Step 4 — based on findings, route to one of H1 / H2 / H3 / H5 and propose the minimal editor surface that fits the existing schema.
expecting: |
  Most likely H5 (phone number IS the WhatsApp number) given Bishkek mobile-carrier patterns
  where everyone uses WhatsApp on their primary phone number. If H5, the fix is much smaller:
  ensure phone number editor exists and renders the WhatsApp button conditionally on a
  format-validity check, not on a separate field. Second most likely is H1 (per-user field).
next_action: |
  Spawn an investigator to:
    1. grep -ri 'whatsapp\|wa\.me\|whatsapp://' src/ to locate read-side and deep-link
    2. Read PropertyDetailsScreen contact section
    3. Read backend Property + User Mongoose schemas
    4. Cross-check CreateListingScreen + EditProfileScreen (if exists) for any whatsapp-related field
    5. Report root hypothesis (H1-H5) with evidence before proposing the fix
specialist_hint: react-native
reasoning_checkpoint: null
tdd_checkpoint: null
```

## Evidence

- timestamp: 2026-05-01T07:05:00Z
  source: grep -rni 'whatsapp\|wa\.me\|whatsapp://' src/
  finding: |
    10 RN client files reference WhatsApp. Editor-relevant hits:
      - src/screens/AccountSettingsScreen.tsx (state, load, save — but NO render row)
      - src/screens/CreateListingScreen.tsx (read-only, hydrated from profile.whatsapp)
      - src/types/Auth.ts:20  → whatsapp?: string on User
      - src/types/Property.ts:55 → owner.whatsapp on Property
- timestamp: 2026-05-01T07:06:00Z
  source: src/screens/PropertyDetailsScreen.tsx
  finding: |
    Read path: const hasWhatsApp = !!owner?.whatsapp; (line 198)
    Deep link: whatsapp://send?phone=<digits>&text=<msg> (line 270)
    Source object: owner (NOT property root) — confirms field lives on User, surfaced
    via owner-projection by the backend. Field name is exactly "whatsapp".
- timestamp: 2026-05-01T07:07:00Z
  source: src/screens/AccountSettingsScreen.tsx
  finding: |
    State (line 63): const [whatsapp, setWhatsapp] = useState('');
    Load  (line 94): setWhatsapp(profile.whatsapp || '');
    Save  (line 122): { firstName, lastName, phone, whatsapp, telegram }
    Render (lines 190–198): rows for firstName, lastName, phoneNumber, telegram —
    NO renderInfoRow for whatsapp. The row was simply never added.
- timestamp: 2026-05-01T07:08:00Z
  source: backend-services/JayTap-services/src/models/User.js:22
  finding: |
    whatsapp: String (User schema). authRoutes.js:29,41,68,80 accept and persist it.
    propertyRoutes.js:316 projects owner.whatsapp onto property responses.
    Backend pipeline is fully complete — no schema/route work needed.
- timestamp: 2026-05-01T07:09:00Z
  source: src/screens/CreateListingScreen.tsx:737-743
  finding: |
    contactWhatsapp TextInput is editable={false} and hydrated from profile.whatsapp.
    Confirms the design intent: WhatsApp is a per-user field; CreateListingScreen
    only surfaces it read-only. The single source of truth IS AccountSettingsScreen.
- timestamp: 2026-05-01T07:10:00Z
  source: src/locales/en.ts and src/locales/ru.ts (greps for accountSettings.whatsapp)
  finding: |
    Pre-fix: no accountSettings.whatsapp / accountSettings.placeholderWhatsapp keys
    existed in either locale file. Confirms the row was never added at any layer.

## Eliminated

- H2 (per-listing whatsappNumber on Property doc) — eliminated. Source object in
  PropertyDetailsScreen is owner.whatsapp, not property.whatsapp; backend Property.js
  has no whatsapp field; CreateListingScreen contactWhatsapp is hydrated from
  profile.whatsapp (read-only).
- H3 (hybrid fallback chain) — eliminated. Single source of truth on User.
- H4 (different field name) — eliminated. Field name is exactly "whatsapp" across
  Auth.ts, Property.ts, User.js, authRoutes.js, propertyRoutes.js, AccountSettingsScreen,
  CreateListingScreen, and PropertyDetailsScreen.
- H5 (phone IS WhatsApp) — eliminated. Distinct fields: phone, whatsapp, telegram.
  WhatsApp button gate reads owner.whatsapp ONLY (no fallback to owner.phone).

## Resolution

root_cause: |
  AccountSettingsScreen.tsx is missing a renderInfoRow JSX entry for the whatsapp
  field, even though the field is fully wired in state (line 63), backend hydration
  (line 94), and save payload (line 122). Same shape as the HF-01 silent-omission
  bug, but inverted: state/save logic exists, only the JSX render row was forgotten.
  Backend (User.js / authRoutes.js / propertyRoutes.js) is correct; CreateListingScreen
  intentionally treats this field read-only and points back to Account Settings.
hypothesis_resolved: H1 (variant — User-doc field, partial editor: state/load/save
  present, JSX render row missing).
fix: |
  Pure UI-only patch in the RN client. Three edits:
    1. src/screens/AccountSettingsScreen.tsx — added a renderInfoRow for whatsapp
       between the phone row and telegram row, mirroring the phone row's pattern
       (keyboardType="phone-pad", isValidPhone() validation, placeholderWhatsapp).
    2. src/screens/AccountSettingsScreen.tsx — added a guard in handleSave() that
       Alerts on invalid whatsapp values before calling createBackendUser.
    3. src/locales/en.ts + src/locales/ru.ts — added 'accountSettings.whatsapp':
       'WhatsApp' and 'accountSettings.placeholderWhatsapp': '+996...' in both
       locales (EN+RU parity).
  No schema, route, service, or backend changes. No new dependencies.
verification:
  - tsc --noEmit run on full project: only pre-existing src/theme/ThemeContext.tsx
    errors (unrelated). No new TS errors introduced.
  - All 5 expected whatsapp references now present in AccountSettingsScreen:
    state (63), load (94), validate (115), save (126), render (201).
  - i18n parity verified via grep across en.ts and ru.ts.
specialist_review: |
  react-native hint applied informally. The fix mirrors the existing phone row
  pattern exactly (keyboardType, validator reuse, placeholder shape). Phone-number
  format constraint satisfied — isValidPhone() already accepts +996 (KG), +7 (KZ),
  +998 (UZ); no hardcoding. Theme tokens via useTheme() — no hardcoded colors.
  Dark/light parity unchanged (uses themeStyles.text / themeStyles.textSecondary).
status_after: User can now see and edit a WhatsApp Number field in Account Settings.
  Once they save a value, the WhatsApp deep-link button will appear on their own
  listings (gated by owner?.whatsapp in PropertyDetailsScreen).

## Constraints on the fix

- **Goal is investigate + apply** — but checkpoint with the user before adding a NEW field to a Mongoose schema, since that touches the backend repo and changes the data contract. Field already exists → just wire the editor → safe to apply directly. Field doesn't exist → checkpoint first.
- **EN+RU locale parity** is mandatory for any new UI string.
- **No new dependencies** — everything needed (TextInput, Linking, validation) already exists in the codebase.
- **Phone-number format**: must accept KG (+996), KZ (+7), UZ (+998) and probably others — don't hardcode +996.
- **Backend repo** is at `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`. If the fix needs schema changes there, agent must `nvm use 24` before any node/npm.
- **Don't add Firebase SDK** to either repo (memory rule).
