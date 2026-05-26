---
phase: 260525-x8l
plan: 01
type: execute
wave: 1
status: code-complete-pending-on-device-qa
requirements:
  - QUICK-260525-x8l
files_modified:
  - src/components/ContextualListingFlow/index.tsx
  - src/components/ContextualListingFlow/__tests__/integration.test.tsx
commits:
  - hash: d990ad7
    type: fix
    scope: 260525-x8l
    message: photo-gate Step 6 submit + inline warning for edit-mod
duration_seconds: 1500
completed_date: 2026-05-26
---

# Quick 260525-x8l Summary — Fix Edit-on-Behalf Stepper Photo-Gate

One-liner: Defense-in-depth photo-gate on Step 6 of `<ContextualListingFlow>` for `mode='edit-mod'` — disables the "Save and approve" submit button + renders an inline `moderation.needsMediaBanner` warning when the listing has zero photos. Reuses existing i18n keys; no new strings, deps, or backend changes.

## Result

- Code: COMPLETE (commit `d990ad7`).
- Tests: 8/8 in `integration.test.tsx` (3 existing + 5 new Cases A-E); 137/137 across all `ContextualListingFlow/` suites.
- i18n parity gate: GREEN (`scripts/check-i18n-parity.sh` exit 0).
- KBD-02 grep gate: STAYS AT 0 (`grep -rE 'keyboardVerticalOffset' src/`).
- `tsc --noEmit`: 0 NEW errors in `ContextualListingFlow/` (the 20 pre-existing unrelated errors — ChatScreen/ScheduleViewingScreen `Property.title`, TourSelectionScreen `Property.tours`, ThemeContext `ColorSchemeName`, etc. — are untouched).
- On-device QA (Task 2 blocking checkpoint): **NOT YET RUN** — pending human verification per `<resume-signal>`.

## What Was Built

### `src/components/ContextualListingFlow/index.tsx` (5 surgical edits)

1. **`photoCount` derivation** (after `useState` block, near line 60):
   ```ts
   const photoCount =
     mode === 'edit-mod' ? props.initialListing?.media?.photos?.length ?? 0 : Infinity;
   ```
   `Infinity` for create/edit-owner means the downstream `photoCount === 0` check is always false for those modes — single derivation, no per-use-site mode guard.

2. **`isFinalSubmitBlocked` derivation** (next to `submitLabel`, near line 240):
   ```ts
   const isFinalSubmitBlocked =
     currentStep === TOTAL_STEPS && mode === 'edit-mod' && photoCount === 0;
   ```

3. **`handleNext` defense-in-depth early-return** (in the Step 6 `else` branch, before `setIsSubmitting(true)`):
   ```ts
   if (mode === 'edit-mod' && photoCount === 0) { return; }
   ```
   Mitigates threat T-x8l-04 (Android long-press race bypassing the disabled prop). Added `photoCount` to the `useCallback` dependency array.

4. **Submit button disabled + visual opacity** (line ~395):
   ```tsx
   disabled={isSubmitting || isFinalSubmitBlocked}
   style={[
     commonStyles.footerButton,
     { backgroundColor: colors.primary },
     isFinalSubmitBlocked ? { opacity: 0.5 } : null,
   ]}
   ```

5. **Inline warning row** (above the footer, conditional render):
   ```tsx
   {isFinalSubmitBlocked ? (
     <View
       style={[commonStyles.modContextBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}
       testID="contextual-listing-photo-gate-warning"
     >
       <View style={[commonStyles.modContextStripe, { backgroundColor: colors.warning }]} />
       <View style={commonStyles.modContextBody}>
         <Text style={[commonStyles.modContextTitle, { color: colors.text }]}>
           {t('moderation.needsMediaBanner.title')}
         </Text>
         <Text style={[commonStyles.modContextSubtitle, { color: colors.textSecondary }]} numberOfLines={3}>
           {t('moderation.needsMediaBanner.body')}
         </Text>
       </View>
     </View>
   ) : null}
   ```
   Reuses `commonStyles.modContextBanner` / `modContextStripe` / `modContextBody` / `modContextTitle` / `modContextSubtitle` from `styles.ts` — same accent-stripe + title + body visual contract as `<NeedsMediaBanner>` without the "Add photos" CTA (stepper has no in-flow photo-add affordance; photos are managed via MediaCurationScreen reached from PropertyDetailsScreen). Stripe uses `colors.warning` to match `NeedsMediaBanner.tsx:42`.

### `src/components/ContextualListingFlow/__tests__/integration.test.tsx`

Appended a new `describe('ContextualListingFlow photo-gate on Step 6 for edit-mod (quick 260525-x8l)')` block with 5 cases:

- **Case A** (gate fires): `mode='edit-mod'` + `media.photos = []` → at Step 6, `next.props.disabled === true`, `contextual-listing-photo-gate-warning` testID present and contains `moderation.needsMediaBanner.title`, and tapping the disabled button does NOT call `PropertyService.editAsModerator`.
- **Case B** (gate skipped): `mode='edit-mod'` + `media.photos = ['https://example.com/a.jpg']` → button enabled, warning absent.
- **Case C** (gate skipped, wrong mode): `mode='edit-owner'` + zero photos → button enabled, warning absent.
- **Case D** (gate skipped, create): `mode='create'` walked through Steps 1-6 manually → button enabled, warning absent.
- **Case E** (gate scoped to Step 6): `mode='edit-mod'` + zero photos → at Step 1 button shows `common.next` and is enabled; same at Step 3. Only Step 6 activates.

Helpers: `buildListing(photos: string[])` builds a Step 1-5-valid Property mock; `advanceToStep6(root)` taps Next 5x. All 5 cases use the existing `findByTestID` / `tryFindByTestID` / `findAllTextNodesContaining` helpers already in the file. Note: corrected `media.photos` shape from the PLAN's example (`[{ url, isPrimary }]`) to plain string array (`['https://...']`) to match the actual `Property.media.photos: string[]` type at `src/types/Property.ts:80-85`.

## Test Delta

| Suite | Pre-fix | Post-fix |
|---|---|---|
| `ContextualListingFlow/__tests__/integration.test.tsx` | 3 (INT-1, INT-2, INT-3) | 8 (+ Cases A-E) |
| `ContextualListingFlow/__tests__/` (all 9 suites) | 132 | 137 |

## Trust Boundary Verification

Per PLAN action step 6 — backend boundaries verified untouched:

```bash
$ grep -rn "MEDIA_REQUIRED" src/
src/screens/ModerationQueueScreen.tsx:333    # comment reference
src/screens/PropertyDetailsScreen.tsx:232    # comment reference
src/screens/MediaCurationScreen.tsx:365      # backend rejection catch (LIVE)
src/components/ContextualListingFlow/index.tsx:64  # NEW comment ref (this fix)
src/components/ContextualListingFlow/__tests__/integration.test.tsx:431  # NEW comment ref (this fix)
```

- `MediaCurationScreen.tsx:365` `if (code === 'MEDIA_REQUIRED')` catch is INTACT — backend `/approve` MEDIA_REQUIRED rejection per quick 260514-rk1 still fires when a mod tries to approve a zero-photo listing through the canonical Approve path.
- `PUT /moderation/listings/:id` continues to be field-only per quick 260511-cog (backend strips 21 forbidden keys; cannot flip status to 'live' regardless of what the stepper dispatches). This RN-client fix does NOT change backend trust boundaries; it adds UX guidance that mirrors the PropertyDetailsScreen NeedsMediaBanner pattern, closing the misleading "Save and approve" label parity gap for the Edit-on-Behalf entry point.

## Theme + i18n Audit

- Zero hex / rgba literals introduced. All colors via `useTheme()` tokens: `colors.warning` (stripe), `colors.surface` (background), `colors.border`, `colors.text` (title), `colors.textSecondary` (body).
- Zero new i18n keys. Reused `moderation.needsMediaBanner.title` (EN: "Photos required before approval" / RU: "Перед одобрением требуются фото") and `moderation.needsMediaBanner.body` (EN: "Add at least one photo before this listing can go live." / RU: "Добавьте хотя бы одно фото, чтобы это объявление стало активным.") — both already at `en.ts:792-793` / `ru.ts:783-784`.
- Zero new dependencies.
- `scripts/check-i18n-parity.sh`: PASS (key sets identical between en.ts and ru.ts).

## Process Note: Worktree cwd-drift Encountered (#3097)

During execution, the initial Edit calls landed in the **main repo** (`/Users/beckmaldinVL/development/mobileApps/JayTap/src/...`) instead of the worktree (`/Users/beckmaldinVL/development/mobileApps/JayTap/.claude/worktrees/agent-ae3d14049bc4f6de3/src/...`). This is the documented cwd-drift gotcha referenced in the system prompt — the Edit tool resolved absolute paths from prior `pwd` snapshots taken in the main-repo context rather than the worktree. Recovery procedure executed cleanly:

1. Captured the working-tree diff from the main repo into `/tmp/x8l-fix.patch` (398 lines).
2. `git apply` to the worktree (clean apply).
3. `git checkout --` on the main repo to restore its files to pristine HEAD.
4. Re-ran tests from inside the worktree (no `cd` prefix into the main repo path) — all 8/8 green.
5. Pre-commit HEAD assertion passed (`worktree-agent-ae3d14049bc4f6de3` namespace) and commit `d990ad7` landed on the per-agent branch.

Same pattern was noted in quick 260525-i2i (memory: ROADMAP.md row mentions "first executor Edit hit the main repo path instead of the worktree"). Worth a recurring tag for future M4 quick-task hotfixes.

## Deviations from Plan

None. The single content-shape correction (`media.photos` is `string[]` per `Property.ts`, not `[{ url, isPrimary }]` as written in the PLAN's Case B example) was a test-data fix during RED-phase test authoring, not a deviation from the plan's behavioral spec.

## On-Device QA (Task 2 — pending)

The plan's Task 2 is a `checkpoint:human-verify` blocking gate requiring iPhone 15 Pro Max + Moto G XT2513V QA per `CLAUDE.md` M1 manual-QA convention. Test matrix (9 steps × 2 devices × 2 languages = pending matrix):

| Device | Lang | Status |
|---|---|---|
| iPhone 15 Pro Max | EN | PENDING |
| iPhone 15 Pro Max | RU | PENDING |
| Moto G XT2513V | EN | PENDING |
| Moto G XT2513V | RU | PENDING |

Verification steps per device/lang (from PLAN `<how-to-verify>`):
1. ModerationQueue → zero-photo pending listing tap → PropertyDetailsScreen shows existing NeedsMediaBanner (260514-rk1 baseline).
2. Tap "Edit on behalf" → stepper opens at Step 1 → Next enabled, NO photo-gate warning.
3. Walk through Steps 2-5 → Next enabled at each, NO warning.
4. Step 6 → submit button label is "Save and approve" / "Сохранить и одобрить" AND visibly disabled (opacity 0.5) AND inline warning row appears with the moderation.needsMediaBanner.{title,body} strings.
5. Tap disabled button → unresponsive (no network, no Alert).
6. Back to Step 1, X to discard → discard-confirm dialog appears.
7. Add one photo via PropertyDetailsScreen NeedsMediaBanner → MediaCurationScreen → upload → back. NeedsMediaBanner now gone.
8. "Edit on behalf" again → walk to Step 6 → submit button ENABLED, no warning. Tap submit → PUT dispatches, stepper closes.
9. Repeat with language toggled to RU for the same listing.

Resume signal: user types "approved" once all 4 matrix cells × 9 steps pass.

## Latent Issues / M4 Backlog Candidates

None surfaced during the code change itself. On-device QA may surface additional findings worth seeding (note that the related-area memory `central-asia-rooms-vs-bedrooms-convention.md` already captures an M4 candidate that the M4 planner is aware of — unrelated to this fix but adjacent in surface).

## Self-Check: PASSED

- File `src/components/ContextualListingFlow/index.tsx`: FOUND (5 `isFinalSubmitBlocked` occurrences confirmed in worktree).
- File `src/components/ContextualListingFlow/__tests__/integration.test.tsx`: FOUND (new `describe` block with Cases A-E present).
- Commit `d990ad7`: FOUND on branch `worktree-agent-ae3d14049bc4f6de3`.
- Tests: 8/8 in integration.test.tsx, 137/137 across ContextualListingFlow/.
- i18n parity: PASS; KBD-02 grep: 0; tsc new errors in fix scope: 0.
