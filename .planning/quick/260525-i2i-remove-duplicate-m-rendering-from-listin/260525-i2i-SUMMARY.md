---
id: 260525-i2i
type: quick
status: complete
phase: quick/260525-i2i
files_modified:
  - src/components/ListingMetaTable.tsx
commits:
  - 15f1010
duration_minutes: ~5
completed: 2026-05-25
---

# Quick Task 260525-i2i: Remove Duplicate m² Render from ListingMetaTable — SUMMARY

**One-liner:** Deleted the duplicate `{areaSqm} m²` JSX block from `ListingMetaTable.tsx` extrasGrid so the canonical 📐 specs row in `PropertyDetailsScreen.tsx` is the single source of truth for property area.

## What Changed

- **`src/components/ListingMetaTable.tsx`** — removed the 5-line block at old lines 177–181:

  ```tsx
  {areaSqm != null && (
    <Text style={[styles.extraText, { color: colors.text, fontSize: valueSize }]} numberOfLines={1}>
      {areaSqm} m²
    </Text>
  )}
  ```

- Kept the `areaSqm` destructure (line 70) and its reference inside `hasExtras` (line 81) — both still load-bearing per planner verification (they preserve the extras-grid gating semantics so the grid still shows/hides correctly based on whether any extras data exists).

## What Was NOT Changed

- `src/screens/PropertyDetailsScreen.tsx` — byte-identical. Canonical 📐 m² render remains at line 1073.
- All other extras-grid rows in `ListingMetaTable.tsx` (rooms, bathroom, condition, furnished, minTerm, deposit, prepaymentMonths, negotiable) — unchanged.
- No styles, imports, comments, or other files touched.

## Verification

| Check | Result |
|---|---|
| `grep -n "m²" src/components/ListingMetaTable.tsx` | 0 matches (was 1) ✓ |
| `grep -n "m²" src/screens/PropertyDetailsScreen.tsx` | 1 match at line 1073 (canonical specs row, unchanged) ✓ |
| `grep -rn "keyboardVerticalOffset" src/` | 0 matches (M1 KBD-02 invariant intact) ✓ |
| `npx tsc --noEmit` | 0 net new errors attributable to `ListingMetaTable.tsx` (pre-existing errors in App.tsx, ChatScreen, ThemeContext etc. unchanged) ✓ |
| `git diff --stat` | exactly 1 file changed, 5 deletions ✓ |
| `git diff src/screens/PropertyDetailsScreen.tsx` | empty ✓ |

## Deviations from Plan

None — plan executed exactly as written. Single task, single deletion, single commit.

## Process Note (cwd-drift recovery, not a plan deviation)

Initial Edit tool call landed in the **main repo path** rather than the worktree path because the file path used did not include the worktree prefix. Detected via inconsistent grep/diff outputs (worktree `git diff` empty while on-disk grep still found `m²`). Recovery: `git checkout -- src/components/ListingMetaTable.tsx` in the main repo to restore it to its tracked state, then re-applied the Edit using the explicit worktree absolute path. Final state verified: main repo unchanged, worktree commit `15f1010` carries the deletion as intended. No data lost; no other files affected.

## Manual QA (carry-forward for orchestrator)

On PropertyDetailsScreen for any property with a non-null `basics.areaSqm`, the area value must render **exactly once** — inside the dedicated 🛏 | 🚿 | 📐 specs row below the ID/Available pill. The previously-visible second instance near the pill area should be gone. PropertyCard (listings page) should be visually unchanged since it doesn't pass `property` to `ListingMetaTable` and the extras grid never rendered there anyway.

## Self-Check: PASSED

- File exists: `src/components/ListingMetaTable.tsx` ✓
- Commit exists: `15f1010` (`git log --oneline | grep 15f1010`) ✓
- No `m²` literal remains in `src/components/ListingMetaTable.tsx` ✓
- Canonical m² render preserved at `src/screens/PropertyDetailsScreen.tsx:1073` ✓
