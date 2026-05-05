---
phase: 06-hardening-manual-physical-device-qa-release
plan: 02
type: inheritance-audit
audited_at: 2026-05-05T19:17:54Z
v104_baseline_sha: de4ff0a
v104_baseline_commit_subject: "chore(08-02): bump version to 1.0.4 (REL-01 + REL-02 iOS marketing)"
v200_audit_sha: c7966bd801edc35c8026fb3cacba0aff95713dc3
v200_audit_commit_subject: "chore(06): bump iOS CURRENT_PROJECT_VERSION 25→26 for archive script"
commits_since_baseline: 199
package_json_commits_since_baseline: 0

package_json_diff:
  added: []
  removed: []
  changed: []
  added_dev: []
  removed_dev: []
  changed_dev: []

classification:
  firebase_sdk_violations: []
  new_network_data_collecting: []
  new_network_no_data_collection: []
  new_no_network: []

inheritance_dispositions:
  ios_privacy_info_xcprivacy:
    disposition: INHERIT
    rationale: "M1 D-13 — live in production with v1.0.3, accepted by Apple; v2.0.0 RN client adds zero new data-collecting deps per package_json_diff classification (199 commits since v1.0.4 baseline, zero touched package.json)"
    re_open_conditions:
      - "Apple flags the manifest at a future submission as missing required NSPrivacyCollectedDataTypes entries"
      - "A future M3+ phase introduces a new data-collecting SDK"
      - "ios/JayTap/PrivacyInfo.xcprivacy is modified in any future commit"

  asc_app_privacy_questionnaire:
    disposition: INHERIT
    rationale: "M1 D-13 — answers submitted under v1.0.3 / v1.0.4, accepted; v2.0.0 collects no new data types (zero RN client dep mutations between v1.0.4 baseline and HEAD)"
    re_open_conditions:
      - "Apple's automated privacy scan flags a discrepancy in v2.0.0 binary"
      - "A future M3+ phase introduces a new data-collecting SDK or new auth provider"
      - "Backend adds a new data type collection that is exposed to the RN client"

  play_console_data_safety:
    disposition: INHERIT
    rationale: "M1 D-13 — declarations submitted under v1.0.3 / v1.0.4, accepted; v2.0.0 changes no data flows (zero RN client dep mutations between v1.0.4 baseline and HEAD)"
    re_open_conditions:
      - "Google flags Data Safety drift on a future submission"
      - "M3+ adds a new SDK with declared data collection"
      - "android/app/build.gradle adds a new dependency that triggers a Play Data Safety category"

  store_listing_copy:
    disposition: INHERIT
    rationale: "M2 added internal admin/moderation surfaces only — no consumer-facing screen redesigns affect the store-listing assets (icon, screenshots, category, descriptions). Phase 1 (auth migration), Phase 2 (status field), Phase 3 (moderation queue), Phase 4 (archive lifecycle), Phase 5 (admin role mgmt) are all internal/admin/moderator-facing; renter and landlord-facing flows remain visually unchanged from v1.0.4."
    re_open_conditions:
      - "M3+ phase changes consumer-visible UI in a way that diverges from current screenshots"
      - "User decides to refresh marketing copy independently of a feature change"
      - "Major branding refresh (logo / color tokens / typography)"

  app_icon_screenshots_category:
    disposition: INHERIT
    rationale: "Same as store_listing_copy — M2 surfaces are internal admin/moderation, not represented in store screenshots. App icon and category unchanged."
    re_open_conditions:
      - "M3+ phase changes consumer-visible UI in a way that diverges from current screenshots"
      - "User decides to refresh marketing copy independently of a feature change"
      - "Apple/Google deprecate the current category or screenshot dimensions"

  maps_api_key_restrictions:
    disposition: INHERIT
    rationale: "M1 D-13 — restrictions configured for v1.0.3 / v1.0.4; v2.0.0 keeps the same package name (com.jaytap) + keystore + bundle ID. No change to react-native-maps version (1.27.1 unchanged in both v1.0.4 and v2.0.0)."
    re_open_conditions:
      - "Release keystore SHA-1 changes"
      - "Bundle ID / package name changes"
      - "react-native-maps major version upgrade that requires a new key scope"

  applinks_entitlement:
    disposition: INHERIT
    rationale: "M1 D-13 — both applinks entries (moveinplatform.com, bizdinkonush.com) shipped under v1.0.3 / v1.0.4 review without rejection; v2.0.0 doesn't change deep-link handling. App.tsx Linking deep-link handler untouched in M2."
    re_open_conditions:
      - "moveinplatform.com or bizdinkonush.com domain control changes"
      - "M3+ adds a new deep-link host"
      - "ios/JayTap/JayTap.entitlements is modified to add or remove an applinks entry"

plan_07_disposition_signal:
  proceed_with_inheritance: true
  flagged_red_items: []
  summary: "All seven inheritance items dispositioned as INHERIT. Plan 07 (Wave 4 — store submission) SKIPS re-authoring privacy + store-listing assets and submits the v2.0.0 binary under v1.0.4's inherited declarations per M1 D-13 / Key Lesson #2."
---

# Phase 6 — Inheritance Audit (M1 D-13 / Key Lesson #2 application)

Authored by Plan 06-02 to apply M1 Key Lesson #2 (RETROSPECTIVE.md). v2.0.0 is an UPDATE
submission on top of an already-approved v1.0.4 (TestFlight build 22 + Play Console
versionCode 28). The privacy declarations + store-listing assets are already accepted by
both stores. Re-touching them under Apple's automated privacy scan + Play Console's Data
Safety questionnaire would be churn without a defect to fix — IF the M2 RN client adds
no new data-collecting dependencies. This plan VERIFIES that empirically and records the
inheritance disposition.

## Audit Methodology

1. Resolve the v1.0.4 release SHA from `.planning/milestones/v1.0.4-phases/08-release-and-store-submission/08-RELEASE-NOTES.md` frontmatter (`walked_against_sha: de4ff0a`). Verified `de4ff0a` corresponds to the M1 atomic version-bump commit: `chore(08-02): bump version to 1.0.4 (REL-01 + REL-02 iOS marketing)`.
2. Diff `git show de4ff0a:package.json` against current `package.json` at HEAD (`c7966bd`).
3. Classify every added / removed / changed dep on three dimensions: `network`, `collects_pii`, `firebase_sdk_violation`.
4. Cross-check repo rule: `grep -E '"(firebase|@react-native-firebase/[^"]+)"' package.json` returns 0 lines per CLAUDE.md "Stack Decisions" + auto-memory `no-firebase-sdk.md`.
5. Disposition each of the seven inherited items as INHERIT or RE-AUTHOR with explicit re-open conditions.
6. Emit a binding `proceed_with_inheritance: true|false` boolean for Plan 07.

## RN client package.json diff (v1.0.4 → v2.0.0)

**Baseline:** `de4ff0a` (v1.0.4 atomic version-bump commit, 2026-04-28)
**HEAD:** `c7966bd` (current — Phase 6 pre-archive iOS build-number bump, 2026-05-05)
**Commits between baseline and HEAD:** 199
**Commits touching `package.json` between baseline and HEAD:** 0

```bash
$ git log de4ff0a..HEAD --oneline -- package.json | wc -l
0
```

### Added dependencies

None.

### Removed dependencies

None.

### Changed dependency versions

None.

### Added devDependencies

None.

### Removed devDependencies

None.

### Changed devDependency versions

None.

### Diff confirmation

```bash
$ git diff de4ff0a HEAD -- package.json
(empty — no diff)
```

**Empirical conclusion:** The RN client `package.json` is **byte-for-byte identical** between v1.0.4 (`de4ff0a`) and HEAD (`c7966bd`). All 199 M2 commits implemented their features against the existing dependency graph (axios for HTTP, lucide-react-native for icons, react-native-keyboard-controller for input handling, etc.). No new SDKs, no new transports, no new analytics, no new crash reporters, no new ad networks were introduced.

This is the strongest possible empirical basis for inheritance: the binding evidence
is that the data-collection surface as represented by external dependencies has not
changed at all between the v1.0.4 production state and the v2.0.0 candidate.

## Repo-rule check: no-firebase-sdk

```bash
$ grep -E '"(firebase|@react-native-firebase/[^"]+)"' package.json
(no output)
$ echo $?
1
```

Expected: 0 lines (no Firebase SDK packages in the RN client per CLAUDE.md "Stack Decisions" + auto-memory `no-firebase-sdk.md`).

**Result:** PASS. Zero Firebase SDK packages in the RN client. The repo rule is honored. Auth continues to flow through Firebase Identity Toolkit REST + axios + the existing AuthService pattern; the backend (separate repo at `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`) handles JWKS verification of Firebase ID tokens via `jose` — also REST-only, zero `firebase-admin` SDK in the client.

This audit also confirms — by virtue of the empty diff above — that no future contributor accidentally re-introduced Firebase SDK in M2.

## Inheritance dispositions

All seven items below are dispositioned per the frontmatter table. INHERIT means Plan 07
SKIPS re-authoring the asset and submits v2.0.0 under v1.0.4's declarations.

### iOS `PrivacyInfo.xcprivacy` (INHERIT per M1 D-13)

**Rationale:** Live in production with v1.0.3, re-shipped unchanged with v1.0.4 (TestFlight build 22, accepted by Apple). v2.0.0 RN client adds zero new data-collecting deps per the empty `package.json_diff` classification.

**Re-open conditions:**
- Apple flags the manifest at a future submission as missing required `NSPrivacyCollectedDataTypes` entries.
- A future M3+ phase introduces a new data-collecting SDK.
- `ios/JayTap/PrivacyInfo.xcprivacy` is modified in any future commit (a modification implies re-evaluation).

### ASC App Privacy questionnaire (INHERIT per M1 D-13)

**Rationale:** Answers submitted under v1.0.3, re-confirmed under v1.0.4 review without rejection. v2.0.0 collects no new data types (zero RN client dep mutations between v1.0.4 baseline and HEAD per the empirical diff above).

**Re-open conditions:**
- Apple's automated privacy scan flags a discrepancy in v2.0.0 binary.
- A future M3+ phase introduces a new data-collecting SDK or new auth provider.
- Backend adds a new data type collection that is exposed to the RN client (cross-repo gate; this audit is RN-client-only).

### Play Console Data Safety (INHERIT per M1 D-13)

**Rationale:** Declarations submitted under v1.0.3, re-confirmed under v1.0.4 (Play Console versionCode 28, accepted). v2.0.0 changes no data flows.

**Re-open conditions:**
- Google flags Data Safety drift on a future submission.
- M3+ adds a new SDK with declared data collection.
- `android/app/build.gradle` adds a new dependency that triggers a Play Data Safety category (this audit covers the JS dep graph; native Gradle deps would re-open this item).

### Store listing copy + screenshots + app icon + category (INHERIT)

**Rationale:** M2 added internal admin/moderation surfaces only — no consumer-facing screen redesigns. The five M2 phases shipped:
- **Phase 1** — backend auth migration + iOS hotfix bundle (no consumer-visible UI change).
- **Phase 2** — listing-status field absorption (admin-/owner-visible only; renter still sees published listings the same).
- **Phase 3** — moderation queue + edit-on-behalf (moderator role, not visible to renters).
- **Phase 4** — archive lifecycle (owner/moderator/admin actions, archive states not surfaced to renters).
- **Phase 5** — admin role management UI (admin-only, gated entry-point row in ProfileScreen).

None of these change the screenshots a renter or landlord would see in the store listing, nor the description text, app icon, or category.

**Re-open conditions:**
- M3+ phase changes consumer-visible UI in a way that diverges from current screenshots.
- User decides to refresh marketing copy independently of a feature change.
- Major branding refresh (logo / color tokens / typography).

### Maps API key restrictions (INHERIT per M1 D-13)

**Rationale:** Restrictions configured for v1.0.3 / v1.0.4; v2.0.0 keeps the same package name (`com.jaytap`) + keystore + bundle ID. `react-native-maps` version is `1.27.1` in both `de4ff0a` and HEAD — unchanged.

**Re-open conditions:**
- Release keystore SHA-1 changes.
- Bundle ID / package name changes.
- `react-native-maps` major version upgrade that requires a new key scope.

### applinks entitlement (INHERIT per M1 D-13)

**Rationale:** Both applinks entries (`applinks:moveinplatform.com`, `applinks:bizdinkonush.com`) shipped under v1.0.3 / v1.0.4 review without rejection. v2.0.0 doesn't change deep-link handling — `App.tsx` Linking deep-link handler is untouched in all 199 M2 commits.

**Re-open conditions:**
- `moveinplatform.com` or `bizdinkonush.com` domain control changes.
- M3+ adds a new deep-link host.
- `ios/JayTap/JayTap.entitlements` is modified to add or remove an applinks entry.

## Plan 07 disposition signal

`proceed_with_inheritance: true`

**Flagged red items:** none.

**Summary:** All seven inheritance items dispositioned as INHERIT. Plan 07 (Wave 4 — store submission) SKIPS re-authoring privacy + store-listing assets and submits the v2.0.0 binary under v1.0.4's inherited declarations per M1 D-13 / Key Lesson #2. The empirical basis is the empty `package.json` diff between `de4ff0a` (v1.0.4 baseline) and `c7966bd` (HEAD): no new external dependencies, no new transports, no new data-collecting SDKs, no Firebase SDK reintroduction.

## Re-open audit trail

Each inheritance disposition's `re_open_conditions` block above is the future events that would invalidate the inheritance. They're documented inline so a future Phase-N audit can re-evaluate without re-deriving the rationale from scratch.

The most likely future trigger across all seven items is the introduction of a new external SDK (analytics, crash reporting, ad attribution, push notifications) in an M3+ phase. Any such addition will:
1. Show up in the next inheritance audit's `package_json_diff` as a non-empty `added` list.
2. Require classification on the three dimensions (`network`, `collects_pii`, `firebase_sdk_violation`).
3. Likely flip at least one of the three privacy items (PrivacyInfo, ASC App Privacy, Play Data Safety) from INHERIT to RE-AUTHOR — the others may still inherit if the new SDK doesn't affect screenshots, applinks, or Maps key scope.

The convention recorded here for future re-audit: re-run this plan's three-step diff + classification + disposition flow against the next baseline (v2.0.0 release SHA) at the start of the next release phase.

## Cross-references

- **M1 Key Lesson #2** — `.planning/RETROSPECTIVE.md` line 43: "Descope-by-inheritance saves enormous churn on update submissions."
- **M1 D-13 (the descope record)** — `.planning/milestones/v1.0.4-phases/08-release-and-store-submission/08-CONTEXT.md` lines 190–198.
- **CLAUDE.md repo rule** — "Stack Decisions" section (no Firebase SDK in RN client; backend uses `jose`).
- **Auto-memory** — `no-firebase-sdk.md` (Firebase is identity provider via Identity Toolkit REST only; no SDK).
- **Backend repo separation** — auto-memory `backend-repo-location.md` (backend at `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`; out of scope for this RN-client audit).
- **Plan 07** reads `proceed_with_inheritance: true` from this artifact and SKIPS privacy / store-listing re-authoring.

---

*Authored by Plan 06-02 on 2026-05-05. Single source of truth for v2.0.0 inheritance dispositions.*
