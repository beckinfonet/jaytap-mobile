# Phase 8: Release & Store Submission - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-28
**Phase:** 08-release-and-store-submission
**Areas discussed:** Privacy manifest scope, Universal Links / applinks entitlement disposition, **mid-discussion scope correction (descope to update-submission essentials)**

---

## Gray Area Selection

**Question:** "Which gray areas do you want to discuss for Phase 8 (Release & Store Submission)?" (multiSelect)

| Option | Description | Selected |
|--------|-------------|----------|
| Privacy manifest scope (Recommended) | Locks NSPrivacyCollectedDataTypes entries + Linked/Tracking/Purposes per type, AND how to reconcile against ASC App Privacy answers. | ✓ |
| applinks entitlement disposition | Both `applinks:www.moveinplatform.com` AND `applinks:www.bizdinkonush.com` are declared in JayTap.entitlements. Keep both, drop one, or keep with rationale. | ✓ |
| Regression test scope (REL-05) | Which screens/categories/role permutations are blocking-vs-spot-check on each physical device. | |
| Release notes + submission gating | Release notes content (EN+RU? bullet structure?) AND submission flow. | |

---

## Privacy manifest scope

### Question 1 — Identity types

**Question:** "Which identity-related data types should be declared in NSPrivacyCollectedDataTypes?" (multiSelect)

| Option | Description | Selected |
|--------|-------------|----------|
| Email Address (Recommended) | Captured at signup via Firebase Identity Toolkit. NSPrivacyCollectedDataTypeEmailAddress. | ✓ |
| Name (Recommended) | Display name captured at signup + shown as listing owner identity. | (initial: skipped) |
| Phone Number (Recommended) | Captured on owner profile + used as listing contact. | (initial: skipped) |
| Other User Contact Info (Recommended) | WhatsApp / Telegram handles captured on owner profile. | (initial: skipped) |

**User's choice (initial):** Email Address only.

**Notes:** Claude reflected the omissions back, flagged that ASC App Privacy treats Name / Phone / Other Contact Info as separate categories under Contact Info, and that the manifest must match the live ASC answers. Concrete codebase sites surfaced: display name at `AuthService.ts` Firebase signup, phone at `PropertyDetailsScreen.tsx:268` `tel:` fallback, WhatsApp/Telegram on owner profile consumed by Phase 6 D-16 contact bar.

### Question 1b — Confirmation reflection

**Question:** "You declared Email + Photos + Physical Address but NOT Name / Phone / Other Contact Info. The app does collect all three… Confirm or revise?"

| Option | Description | Selected |
|--------|-------------|----------|
| Revise — add Name, Phone, Other Contact Info (Recommended) | Adds 3 more entries. Final 6 declared types. Matches ASC App Privacy answers exactly. | ✓ |
| Keep as-is — only Email + Photos + Physical Address | 3 declared types only. | |
| Revise — add Phone + Other Contact Info only (skip Name) | 5 declared types. | |

**User's choice (revised):** Add Name + Phone + Other Contact Info. Final identity-types list = Email + Name + Phone + Other Contact Info.

### Question 2 — Content types

**Question:** "Which content-related data types should be declared?" (multiSelect)

| Option | Description | Selected |
|--------|-------------|----------|
| Photos or Videos (Recommended) | User uploads listing photos via react-native-image-picker. | ✓ |
| Physical Address (Recommended) | User types city / district / street into listings. NSPrivacyCollectedDataTypePhysicalAddress. | ✓ |

**User's choice:** Both.

### Question 3 — Linkage

**Question:** "Are any of the declared types NOT linked to the user's identity?"

| Option | Description | Selected |
|--------|-------------|----------|
| All Linked to identity (Recommended) | Everything tied to Railway backend account (uid). Linked = true on every entry. | ✓ |
| Some not linked (you specify) | Pick which entries to mark Linked = false. | |

**User's choice:** All Linked to identity.

### Question 4 — Tracking + Purpose

**Question:** "Tracking flag and purpose declaration — which combination?"

| Option | Description | Selected |
|--------|-------------|----------|
| No tracking + App Functionality only (Recommended) | NSPrivacyTracking = false; every entry: Tracking = false, Purposes = [AppFunctionality]. | ✓ |
| No tracking + App Functionality + Analytics | Add Analytics purpose. | |
| No tracking + App Functionality + Product Personalization | Add Personalization purpose. | |

**User's choice:** No tracking + App Functionality only.

### Area gate

**Question:** "Privacy manifest scope is locked. More questions about it, or move to applinks entitlement?"

| Option | Description | Selected |
|--------|-------------|----------|
| Next area: applinks entitlement | Move on. | ✓ |
| More questions about manifest | Audit Required Reason API entries, ASC mapping format, manifest commit ordering. | |

**User's choice:** Next area.

**Outcome at this point:** 6-entry manifest plan locked (Email, Name, Phone, OtherContactInfo, Photos/Videos, PhysicalAddress; all Linked, all AppFunctionality, all Tracking false). Subsequently overridden by the mid-discussion scope correction (see "Mid-discussion scope correction" section below) — REL-03 descoped, manifest plan moved to deferred D-13.

---

## Universal Links / applinks entitlement disposition

### Question 1 — moveinplatform domain (initial framing)

**Question:** "Disposition for `applinks:www.moveinplatform.com` (the original / legacy domain)?"

| Option | Description | Selected |
|--------|-------------|----------|
| Drop — remove from entitlements (Recommended) | Domain appears legacy / unused. | |
| Keep — still in use | Verify AASA before submission. | |
| Keep with rationale documented | Keep + document in PROJECT.md Key Decisions. | |

**User's response (free text):** "www.bizdinkonush.com is not working, we can remove that. Do we need to remove www.moveinplatform.com as well? Is that what you are recommending?"

**Notes:** This response inverted Claude's premise — moveinplatform was assumed legacy; user implied bizdinkonush is non-functional in production. Claude re-probed.

### Question 2 — bizdinkonush domain (initial framing)

**Question:** "Disposition for `applinks:www.bizdinkonush.com` (the active domain — App.tsx deep-link handler matches this)?"

| Option | Description | Selected |
|--------|-------------|----------|
| Keep + verify AASA (Recommended) | App.tsx already handles bizdinkonush deep links. | ✓ |
| Drop — deep links not needed for v1.0.4 | Remove entitlement + handler. | |
| Keep without verification | Trust existing setup. | |

**User's choice:** Keep + verify AASA. (Note: contradicts the free-text on Q1 — Claude flagged the contradiction and re-probed live.)

### Question 1b — Re-framed Universal Links disposition (rejected by user, requested clarification)

**Question:** "Universal Links disposition — given bizdinkonush.com isn't currently working in production, which path?"

Options offered: Drop both / Keep bizdinkonush, drop moveinplatform, fix AASA / Keep bizdinkonush, drop moveinplatform, defer AASA fix.

**User's response (free text rejecting question):** "you need to check JayTap-services repo, there is an endpoint '.well-known/apple-app-site-association'. I dont want to remove anything if it breaks links that users share. The shared links must open the app with a specific listing"

**Action taken:** Claude read `~/development/mobileApps/backend-services/JayTap-services/index.js:35-48` and confirmed the AASA route serves `appID: M3W6Y259JR.com.jaytap.app` + `paths: ['/property/*']`. Verified iOS bundle ID `com.jaytap.app` + Team ID `M3W6Y259JR` match. Found Railway production URL at `https://jaytap-services-production.up.railway.app/api`.

### User-supplied evidence

**User shared a working production link:** `https://www.moveinplatform.com/property/6987ab8b698816d4875ec37a`

This inverted Claude's earlier read: moveinplatform is the **active, working** domain, not the legacy. App.tsx:127 comment confirms (`Parse URL: https://www.moveinplatform.com/property/{id} (also supports legacy bizdinkonush.com links)`).

### Live probes (executed 2026-04-28)

- `curl -sI https://www.moveinplatform.com/.well-known/apple-app-site-association` → HTTP 200, `Content-Type: application/json`, served by **Vercel**, body `{"applinks":{"apps":[],"details":[{"appID":"M3W6Y259JR.com.jaytap.app","paths":["/property/*"]}]}}`. ✓ Live and working.
- `curl -sI https://www.bizdinkonush.com/.well-known/apple-app-site-association` → empty headers, empty body, 10s timeout. Domain unresolvable.
- `curl -sI https://www.moveinplatform.com/property/test` → HTTP 200, `text/html` (Vercel web fallback). ✓ Web fallback works for non-app users.

### Question 1c — Re-framed Universal Links disposition (corrected)

**Question:** "Universal Links disposition for v1.0.4 — corrected with live probe data: moveinplatform.com AASA serves valid JSON on Vercel (working); bizdinkonush.com doesn't resolve (dead). How should Phase 8 handle this?"

| Option | Description | Selected |
|--------|-------------|----------|
| Keep moveinplatform, drop bizdinkonush, verify AASA pre-archive (Recommended) | Edit JayTap.entitlements: remove the bizdinkonush line only. App.tsx unchanged. Pre-archive curl assertion. | ✓ |
| Keep both — leave bizdinkonush in entitlements as 'reserved' | Document in PROJECT.md Key Decisions. | |
| Keep moveinplatform only + remove bizdinkonush handling from App.tsx comment too | Tighten App.tsx:127 comment too. | |

**User's choice:** Keep moveinplatform, drop bizdinkonush, verify AASA pre-archive.

**Notes:** Decision lasted only until the mid-discussion scope correction below — the entitlement edit was descoped along with the manifest expansion (D-13).

### Wrap-up

**Question:** "We've discussed Privacy manifest scope and Universal Links / applinks. Which gray areas remain unclear?"

| Option | Description | Selected |
|--------|-------------|----------|
| I'm ready for context (Recommended) | Lock decisions to CONTEXT.md. | ✓ |
| Explore more gray areas | Surface 2-4 additional areas. | |

**User's choice:** I'm ready for context.

---

## Mid-discussion scope correction

After the wrap-up, while Claude was writing the first draft of CONTEXT.md, the user sent a clarifying message:

> "i have answered a lot of the privacy related questions on apple and google play market console, both apps are on prod and can be downloaded. We should be mostly fixing bugs, adding improvements. Not sure why we are touching on some old configuration."

This surfaced that v1.0.3 is **already live in production** on both stores, with ASC App Privacy + Play Console Data Safety answers already submitted and accepted. Phase 8 is therefore an **update submission** on a shipping app, not a first-time submission. Claude over-scoped by treating the ROADMAP success criteria as if they applied to a fresh submission.

### Re-scope question

**Question:** "Re-scope Phase 8 to update-submission essentials only (descope the live-config items)?"

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — descope to bumps + regression QA + release notes (Recommended) | In-scope: package.json + iOS MARKETING_VERSION bumps, physical-device regression QA, EN+RU release notes, submit. Descope: privacy manifest expansion, applinks cleanup, Maps key re-verification, ASC questionnaire re-answering. Mark REL-03 + REL-04 + applinks-review as 'satisfied by v1.0.3 production state'. | ✓ |
| Partial descope — keep applinks cleanup, drop manifest expansion | Drop manifest, keep one-line bizdinkonush removal as cosmetic cleanup. | |
| Keep full ROADMAP scope as written | Treat REL-01..REL-06 literally. | |

**User's choice:** Yes — descope to bumps + regression QA + release notes.

**Effect on prior decisions:**
- The 6-entry privacy manifest plan (Email + Name + Phone + OtherContactInfo + Photos/Videos + PhysicalAddress) is **descoped** — not applied to PrivacyInfo.xcprivacy in Phase 8. v1.0.3's empty `NSPrivacyCollectedDataTypes` ships forward into v1.0.4 since Apple already accepted it.
- The applinks entitlement edit (drop bizdinkonush, keep moveinplatform) is **descoped** — JayTap.entitlements ships unchanged in v1.0.4. The bizdinkonush entry is decorative but not actively harmful.
- Pre-archive AASA curl verification is **descoped** as a release-blocking gate. The regression QA in D-07 may opportunistically test a shared link, but the Vercel-hosted AASA is already known-good for v1.0.3 and v1.0.4 introduces no related changes.
- The ASC App Privacy questionnaire is **descoped** — answers inherited from v1.0.3.
- Maps key restriction audit is **descoped** — restrictions configured for v1.0.3 still apply.
- Xcode 26 SDK gate stays as a one-shot verify-only assertion at archive time (already cleared per PROJECT.md row 129).

The descope is recorded as a single deferred entry **D-13** in CONTEXT.md, with explicit re-open conditions so future submissions can revive the in-scope work if Apple's enforcement changes.

---

## Claude's Discretion

Captured in CONTEXT.md `### Claude's Discretion`:
- Wave structure (suggested: 0 verifications, 1 bumps, 2 regression QA, 3 release notes, 4 archive + submit).
- Atomic vs split commits for the version bumps.
- Capture of regression QA evidence (videos/ vs inline cells).
- Release notes authoring timing (early draft vs after QA).
- Pre-flight tasks (screenshots / store listing edits) — default = unchanged from v1.0.3.

---

## Deferred Ideas

Captured in CONTEXT.md `<deferred>`:
- **D-13** — privacy manifest population, applinks cleanup, Maps key audit, ASC App Privacy reconciliation: all "satisfied by v1.0.3 production state". Re-open conditions documented.
- App Privacy questionnaire automation.
- Universal Links on Android (App Links via `intent-filter` + `android:autoVerify="true"` + DAL JSON).
- TestFlight external-tester distribution.
- Permanent release-notes archive in repo.
