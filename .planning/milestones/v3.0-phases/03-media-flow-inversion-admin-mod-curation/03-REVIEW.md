---
status: issues
issues_total: 13
critical: 0
high: 1
medium: 4
low: 4
info: 4
phase: 03-media-flow-inversion-admin-mod-curation
generated: 2026-05-06T20:40:00Z
reviewer: gsd-code-reviewer
paired_with: 03-VERIFICATION.md (gsd-verifier human_needed)
note: Reviewer initially returned findings inline citing a system-reminder constraint; orchestrator persisted the report to this file for the audit trail. Content verbatim from reviewer.
---

# Phase 3 Code Review — Media Flow Inversion (Admin/Mod Curation)

**Review date:** 2026-05-06
**Depth:** deep (cross-file, both repos, paired-gate posture per memory `gsd-verifier-misses-regressions.md`)
**Scope:** Backend commits 239de75..339c8ce + RN client commits ac3303a..1b0e6c7

## Summary

Phase 3 lands cleanly on the load-bearing security/race-safety axes:

- **D-15 anti-spoofing intact** — `actorUid` sourced from `req.firebaseUid` only; sentinel grep returns zero matches; tests at `moderationRoutes.test.js:1416` and `:233` actively send body `actorUid: 'attacker-uid'` and assert the JWKS sub wins.
- **D-13 atomic-break clean** — `propertyRoutes.js` has zero `multer|upload\.array|multerS3` matches; sentinel sourced into `npm test` chain.
- **MEDIA_REQUIRED two-surface gate verified** — `/approve` (line 101-105) and edit-on-behalf flip (line 870-875) both 400 with `code: 'MEDIA_REQUIRED'` BEFORE the atomic update; both supertested with negative invariants (status stays pending, NO orphan audit row).
- **Race-safety preserved** — atomic `findOneAndUpdate` filters retain status checks (`{$in: ['pending','rejected']}` on POST media + edit-on-behalf; `'pending'` on /approve). Promise.all race tests ship.
- **i18n parity** — 32 keys per locale (EN+RU) lockstep.
- **W6 zero-hex** — new components (`MediaCurationScreen`, `NeedsMediaBanner`) use `useTheme()` tokens (`onAccent`, `scrim`) added in both palettes.
- **Cross-phase regression checks** — M2 MOD-14 21-key mass-assignment strip preserved; M2 ROLE-09 single-flight refresh untouched in apiClient (verified by `MediaCurationService` consuming `apiClient` not raw axios); Phase 1 nested-shape `GET /api/properties/:id` preserved; Phase 2 `ContextualListingFlow` zero-media-affordance preserved (no media imports introduced).

One HIGH finding (React Hooks rules violation — see HG-01), four MEDIUM, four LOW, four INFO. Nothing CRITICAL.

---

## HIGH

### HG-01: React Hooks rules-of-hooks violation in `MediaCurationScreen`

- **File:** `/Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/MediaCurationScreen.tsx:108-149`
- **Category:** Bug — React runtime invariant (regression risk)
- **Issue:** The conditional `if (!can('approveListings')) return null;` at line 108 sits BEFORE the `useMemo` (line 118), `useEffect` (line 127), and four `useCallback` invocations later in the function. The 9 `useState` calls at lines 91-99 happen FIRST, then the conditional return. On initial render with `can() === true`, the runtime calls `useState x9 + useMemo + useEffect + useCallback x N` (~20 hooks). If `useRole()` flips to `false` mid-session — plausible via M2 ROLE-09 single-flight 401/403 refresh demoting the user, or `AuthContext.refreshRole` returning a freshly-demoted profile — the next render calls only `useState x9` then returns null. React enforces a strict invariant that hook count must be stable across renders; the mismatch will throw `Invariant Violation: Rendered fewer hooks than expected`.
- **Why this matters:** Memory `gsd-verifier-misses-regressions.md` specifically flags downstream regression class. M2 Phase 6 carry-forward `ROLE-11 mid-action 403 popup-recovery` is exactly the scenario where role demotes mid-action — and this screen is the most likely surface for that scenario (mod opens MediaCuration → admin demotes them in another session → next render crashes the app).
- **Existing test (`MediaCurationScreen.test.tsx:196`) does NOT cover this path** — it only tests `can() = false` from the FIRST render (which works because hook count is consistent across that render's lifecycle). It does not exercise the role-flip-mid-session path.
- **Fix:** Move the early return AFTER all hooks, gating the JSX render instead. Pattern:
  ```tsx
  // ALL hooks first — useState x9, useMemo, useEffect, useCallback x N
  // (move lines 118-449 above the conditional)

  // ...then the gate, after every hook:
  if (!can('approveListings')) {
    console.error('[MediaCurationScreen] mounted by non-mod...');
    return null;
  }

  return (
    <SafeAreaView ...>
      ...
    </SafeAreaView>
  );
  ```
  Equivalent alternative: keep the role check at the parent (App.tsx) and unmount the screen entirely when role changes. The simplest in-file fix is reordering.
- **Severity rationale:** HIGH not CRITICAL because (a) the App.tsx mount conditional `!!user && isMediaCurationOpen` provides a reasonable guard against the typical case, and (b) the M2 ROLE-09 demote path is uncommon in normal operation. But it IS a real bug class that paired-gate review must catch.

---

## MEDIUM

### MD-01: User-facing i18n string conflates file size with file count

- **Files:**
  - `/Users/beckmaldinVL/development/mobileApps/JayTap/src/locales/en.ts:744`
  - `/Users/beckmaldinVL/development/mobileApps/JayTap/src/locales/ru.ts:738`
- **Category:** Code quality / UX
- **Issue:** `'moderation.mediaCuration.error.tooLarge': 'File too large. Max 25 MB per file, 45 MB total.'` (RU mirror: `'Файл слишком большой. Максимум 25 МБ на файл, 45 МБ всего.'`). The backend's actual config is `fileSize: 25 * 1024 * 1024` (per-file 25MB) AND `files: 45` (count of files, NOT bytes). There is no 45MB byte-total cap. The string will mislead a mod who hits `LIMIT_FILE_COUNT` into thinking they've hit a byte ceiling.
- **Fix:**
  - EN: `'File too large. Max 25 MB per file, up to 45 files per upload.'`
  - RU: `'Файл слишком большой. Максимум 25 МБ на файл, до 45 файлов за загрузку.'`
  - Or split into two distinct keys (`error.tooLarge` for `LIMIT_FILE_SIZE` and `error.tooManyFiles` for `LIMIT_FILE_COUNT`) and dispatch on `code` in `MediaCurationScreen.tsx:334-341` (where currently both codes share the same string).

### MD-02: `MEDIA_FILE_TOO_LARGE` server message says "25MB" but the locale says "25 MB" — and the per-file cap is documented as 10 MB elsewhere

- **Files:**
  - `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/moderationRoutes.js:197, 317` (server-side message: "File exceeds 25MB")
  - `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/moderationRoutes.js:23` (comment claims "10MB/file cap" — stale)
- **Category:** Code quality / documentation drift
- **Issue:** The factory at `s3Upload.js` is invoked with `fileSizeBytes: 25 * 1024 * 1024` for `mediaUpload` (correct, 25MB). But the comment at `moderationRoutes.js:23` says "Behavior preserved verbatim: 10MB/file cap + 40-file count + properties/${ts}-${name} key strategy." That comment refers to the `upload` (legacy edit-on-behalf) instance which uses `10 * 1024 * 1024` — but it's misleading inside a comment block adjacent to `mediaUpload`. The new mediaUpload differs.
- **Fix:** Disambiguate the comment at moderationRoutes.js:21-28 to distinguish the two uploaders' configurations explicitly. Low-effort.

### MD-03: DELETE handler has no role-test for "what happens with malformed `:id`"

- **File:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/moderationRoutes.js:345-404`
- **Category:** Code quality / error handling
- **Issue:** `DELETE /listings/:id/media` calls `Property.findById(req.params.id)`. A malformed ObjectId (e.g., `:id = 'banana'`) throws a Mongoose `CastError`, which gets caught at line 400 and returned as a 500 with `err.message`. The 500 leaks the Mongoose error message verbatim. Other endpoints in the same file (`POST /listings/:id/media`, `POST /properties/:id/approve`) have the same shape — but this is a defensive pattern that should ideally normalize CastError → 400 BAD_REQUEST.
- **Fix:** Add a CastError catch in the route's error handler, or pre-validate `mongoose.isValidObjectId(req.params.id)` and return 400 if invalid. Optional — existing M2 routes have the same shape.

### MD-04: Sentinel grep regex is fragile to comment-text edits

- **File:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/scripts/check-property-routes-media-stripped.sh:8`
- **Category:** Code quality / maintenance
- **Issue:** `grep -nE "upload\.array|multer|multerS3"` matches the substring "multer" anywhere in the file — including inside JSDoc/inline comments. Today's propertyRoutes.js intentionally uses "multipart" / "file-upload" / "S3 upload" instead of the literal "multer" word in comments to keep the sentinel green. Future maintainers may not realize this and add a comment like `// the multer pipeline is gone` — tripping the sentinel. The intent was: forbid multer **imports/uses**, not the word.
- **Fix:** Tighten regex to e.g. `grep -nE "require\(['\"]multer|from ['\"]multer|upload\.array|multerS3"` (only matches actual imports + the canonical multer API surface). Cheap.

---

## LOW

### LW-01: Hardcoded hex colors in PropertyDetailsScreen mod action footer (existing; not new in Phase 3)

- **File:** `/Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/PropertyDetailsScreen.tsx:1555, 1576`
- **Category:** Code quality / theme adherence
- **Issue:** `backgroundColor: '#059669' /* success green */` and `backgroundColor: '#DC2626' /* error red */` are M2-era hex literals (NOT introduced in Phase 3). Phase 3 wired the new `isApproveEnabled` opacity overlay onto them but did not migrate them to `colors.success` / `colors.error`. CLAUDE.md mandates `useTheme()` tokens.
- **Fix:** `backgroundColor: colors.success` / `backgroundColor: colors.error`. Out-of-scope for Phase 3, but flagging because Phase 3 *touched* this exact JSX block (added the opacity overlay).

### LW-02: `ActivityIndicator color="#FFF"` hex in ModerationQueueScreen

- **File:** `/Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/ModerationQueueScreen.tsx:352, 501, 834, 889`
- **Category:** Code quality / theme adherence
- **Issue:** Multiple `color="#FFF"` hex literals on `ActivityIndicator` and inside `actionBtnText: { color: '#FFF', ... }`. Phase 3 added/modified the surrounding code (filter chips, conditional row tap, action buttons) but kept these hex literals. Phase 3 introduced `colors.onAccent` exactly for this case.
- **Fix:** Use `color={colors.onAccent}` — `'#FFF'` matches `onAccent` in both palettes.

### LW-03: `MediaCurationScreen` `loadingBackdrop` is non-blocking

- **File:** `/Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/MediaCurationScreen.tsx:809-820`
- **Category:** Bug — UX subtlety
- **Issue:** The loading backdrop renders ABOVE the screen body (good) but does NOT block touch interaction with the underlying buttons. A user could tap the Approve button while a Save is in flight — `submittingApprove` doesn't block tap, only `submittingSave` triggers the backdrop. The button is wrapped in `disabled={!isApproveEnabled}` (which is `!submittingApprove && photos>0`), but `submittingSave` does not gate Approve. So while save is uploading, mod could double-fire approve and trigger a 400 MEDIA_REQUIRED race against the in-flight upload (eventually consistent — re-tap succeeds, but UX is jittery).
- **Fix:** Either add `pointerEvents: 'auto'` to the loading backdrop and let it intercept taps, or add `submittingSave` to the `isApproveEnabled` calculation. Low-impact — the `Pitfall 2 race-acceptance` is documented and tests verify the false-negative is recoverable.

### LW-04: ModerationLog.action enum reuse for delete operations is implicit (D-8 discretion, but logged as `'media-upload-delete'` in the orphan log)

- **File:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/moderationRoutes.js:391-392`
- **Category:** Audit observability / consistency
- **Issue:** Per Discretion #8, both POST and DELETE write `action: 'media-upload'` (consistent enum). The audit row is fine. BUT the orphan-fallback `console.error` at line 392 logs `action: 'media-upload-delete'` — a synthetic value that isn't in the enum. This is purely log-channel observability (NOT in the DB), so it doesn't violate the schema, but it's inconsistent with the audit row. A Splunk/Datadog grep for `action: 'media-upload'` will miss the delete-orphan diagnostic.
- **Fix:** Standardize the orphan log's `action` to `'media-upload'` and add a separate `op: 'delete'` field to disambiguate, or accept the divergence as documented. Low-effort cosmetic.

---

## INFO

### IN-01: `useState<any | null>(null)` for `listing` is a reasonable pragmatic choice

- **File:** `/Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/MediaCurationScreen.tsx:91`
- **Category:** Code quality
- **Note:** The `Property` type in this codebase is large and nested-shape-heavy. Other screens (PropertyDetailsScreen, RenterListingsScreen) also use `any` here. Not flagging as MEDIUM because it matches existing convention. Memory `phase06-m3-carry-forward.md` lists "TS strict tightening" as M3+ carry-forward — this is part of that backlog, not a Phase 3 regression.

### IN-02: Comment at `s3Upload.js:11` references `MOD-14 edit-on-behalf was moved off memory storage to multer-s3` but the propertyRoutes.js sentinel hint says comment must avoid the word "multer"

- **File:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/middleware/s3Upload.js:11`
- **Category:** Documentation drift
- **Note:** s3Upload.js is NOT in the sentinel scope (sentinel only scans `propertyRoutes.js`). The comment is fine. Just noting the asymmetry to ease future maintenance.

### IN-03: PropertyDetailsHost passthrough for `onOpenMediaCuration` is correct

- **File:** `/Users/beckmaldinVL/development/mobileApps/JayTap/src/components/PropertyDetailsHost.tsx:43, 82`
- **Category:** No issue; observation
- **Note:** Pure prop forwarding. The optional shape (`onOpenMediaCuration?: ...`) keeps existing call sites tsc-green — good incremental rollout.

### IN-04: Test coverage for `Pitfall 2` race acceptance is correctly scoped

- **File:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/moderationRoutes.test.js:1342-1361`
- **Category:** Test coverage observation
- **Note:** The race test at line 1342 only asserts SHAPE — `expect([200, 409]).toContain(r2.status)`. It does not assert the false-negative MEDIA_REQUIRED race window from CONTEXT.md Pitfall 2 (where a media-upload lands between fetch and update). Per the docs, this is acceptable (worst case: re-tap succeeds). The test is correctly scoped to D-09's documented behavior. Just noting — no action needed.

---

## Cross-phase regression spot-checks (PASS)

- **M2 MOD-14 atomic findOneAndUpdate filter integrity** — `moderationRoutes.js:911-915` retains `status: { $in: ['pending', 'rejected'] }`.
- **M2 MOD-14 21-key mass-assignment strip** — `moderationRoutes.js:732-755` retains all 21 forbidden keys. Test at `moderationRoutes.test.js:687` exercises the entire attacker payload.
- **M2 ROLE-09 single-flight 401/403 refresh** — `MediaCurationService` consumes `apiClient` (`MediaCurationService.ts:19`); no raw axios instances; no auth code touched.
- **Phase 1 nested-shape `GET /api/properties/:id`** — `propertyRoutes.js:257-310` preserved (location/basics/content/media nested + top-level audit). The new tourUrl Mongoose validator at `Property.js:91-105` correctly accepts `undefined`/`null`/`''` so legacy listings with no tourUrl don't fail validation on save.
- **Phase 2 ContextualListingFlow zero-media affordance** — git diff in `JayTap/src/screens/ContextualListingFlow/` shows zero modifications in Phase 3.
- **D-15 anti-spoofing actorUid** — both new endpoints (POST + DELETE media) use `req.firebaseUid`; sentinel `check-no-actoruid-spoofing.sh` returns 0 hits; tests at `moderationRoutes.test.js:1416, 233, 827` actively probe spoof attempts.
- **Audit row "no orphan on rejected pre-flight"** — `moderationRoutes.test.js:1635, 1700` asserts `ModerationLog.find({}) → 0` when the gate returns 400.
- **`canFromUser` belt-and-suspenders before network** — `MediaCurationService.ts:37-46` throws `PermissionDeniedError` synchronously before any HTTP call (T-04 mitigation).

---

## Recommendation

**Status:** `issues` (not `clean`, not `critical`).

Phase 3 ships with:
- 1 HIGH (HG-01: hooks rules violation in MediaCurationScreen) — should fix before phase close to satisfy the paired-gate posture per memory `gsd-verifier-misses-regressions.md`. The existing test does not catch the role-flip-mid-session path; consider adding a regression test that switches the `useRole` mock between renders.
- 4 MEDIUM (i18n drift, doc drift, error normalization, sentinel regex tightening) — defer to a Phase 3 polish commit OR the M3 carry-forward bucket; none block the phase.
- 4 LOW + 4 INFO — nice-to-haves; defer.

No CRITICAL issues. Trust boundaries (D-13 atomic-break, D-15 anti-spoofing, MEDIA_REQUIRED two-surface gate, M2 race-safety) are intact.

---

## Fix Status

_Appended 2026-05-06 after the targeted HG-01 fix. Frontmatter `status: issues` is intentionally preserved — the 4 MEDIUM findings (MD-01..MD-04), 4 LOW, and 4 INFO findings are deferred and will land separately._

### HG-01 — FIXED in commit `c16ac9b`

- **Source change:** `src/screens/MediaCurationScreen.tsx` — relocated the `if (!can('approveListings')) return null;` block from line 108 (above `useMemo`/`useEffect`/`useCallback`) to AFTER every hook in the component (now sits between the last `useCallback` and the derived-counts block). Every existing hook order, dep array, and `console.error` log shape is preserved verbatim. The App.tsx outer mount conditional `!!user && isMediaCurationOpen` is untouched — the in-file gate remains the inner belt-and-suspenders layer.
- **Regression test added:** `src/screens/__tests__/MediaCurationScreen.test.tsx` — `does not violate React hooks rules when role flips false mid-session (HG-01 regression)`. Mounts with `can() = true`, flips the `useRole` mock to `can() = false`, then asserts the rerender does NOT throw `Invariant Violation: Rendered fewer hooks than expected` and the tree collapses to null.
- **`tsc --noEmit` baseline:** 17 → 17 errors (preserved; zero new errors, zero MediaCurationScreen errors).
- **RTL test count:** 4/4 → 5/5 (the new HG-01 regression test is the addition; all 5 pass).

### Deferred (M3 carry-forward bucket or Phase 3 polish commit)

- **MD-01..MD-04** (i18n drift, doc drift, error normalization, sentinel regex tightening) — none block the phase; will land in a follow-up commit.
- **LW-01..LW-04** + **IN-01..IN-04** — nice-to-haves; deferred per reviewer recommendation.
