---
phase: 05-hardening-manual-qa-release-v3
plan: 04
subsystem: release
tags: [release-notes, en-ru-parity, play-console-500-char-limit, m1-d-10-content-order, paste-only-artifact, kg-kz-uz-scope, no-bishkek-only-phrasing]

# Dependency graph
requires:
  - phase: 02-6-step-contextual-listing-flow-client
    provides: 6-step contextual listing creation flow + KG/KZ/UZ city dictionary (the headline "What's new" content)
  - phase: 03-media-flow-inversion-admin-mod-curation
    provides: mod media-curation surface (the "photos and 3D tours reviewed by our team" content)
  - phase: 04-m2-carry-forward-bug-fixes
    provides: CARRY-01 + CARRY-02 carry-forward fixes (folded into the catch-all closer line per M1 D-10)
  - phase: 999.1-contextual-listing-flow-m3-anchor
    provides: M3 SPEC v2 — anchor for v3.0.0 framing
  - phase: M2 Phase 6 (06-hardening-manual-physical-device-qa-release)
    provides: 06-RELEASE-NOTES.md structural template (frontmatter + ## EN/RU sections + submission instructions + character-counts table + verification commands)

provides:
  - 05-RELEASE-NOTES.md — bilingual EN+RU paste-only artifact for ASC + Play Console release-notes fields
  - EN body 489 chars (11-char headroom under Play Console's 500-char binding limit)
  - RU body 492 chars (8-char headroom)
  - re-runnable awk slice + wc -m verification commands for paste-time drift check (Plan 05-07)

affects:
  - Plan 05-07 (dual-store submission) — reads ## EN and ## RU body slices via documented awk commands and pastes into ASC + Play Console at submission
  - Plan 05-05 (QA matrix walk) — if walk surfaces a release-blocking defect, this file gets a re-walk + re-measure pass before 05-07 paste

# Tech tracking
tech-stack:
  added: []  # documentation-only plan; no source/library changes
  patterns:
    - paste-only release notes artifact (M1 D-11 precedent — not preserved as in-app i18n)
    - M1 D-10 content order (What's new → Improvements → Bug fixes catch-all)
    - awk-slice + wc -m verification idiom for character-count drift detection at paste time

key-files:
  created:
    - .planning/phases/05-hardening-manual-qa-release-v3/05-RELEASE-NOTES.md
  modified: []

key-decisions:
  - "Lead with new features (6-step contextual listing flow + KG/KZ/UZ enabler hint + mod media curation) per CONTEXT.md Claude's Discretion — internal-testing audience benefits from knowing what to walk."
  - "Closer line in RU is 'Прочие улучшения стабильности и полировка.' instead of M2's literal 'Мелкие исправления и шлифовка интерфейса.' — the acceptance grep `исправлен[а-я]* [а-я]+` is over-broad and matches the M1-D-10-sanctioned generic 'исправления' root; the rephrased closer preserves the same catch-all intent without tripping the binding criterion."
  - "Geographic copy uses 'Locations menu now covers cities in Kyrgyzstan, Kazakhstan, and Uzbekistan, ready as we expand' country-level phrasing per memory `geographic-scope.md` — no 'Bishkek' / 'Бишкек' anywhere in the file (including meta prose), satisfying the literal `grep -ic 'bishkek\\|бишкек'` = 0 acceptance criterion."

patterns-established:
  - "M3 v3.0.0 release notes structural reuse of M2 v2.0.0 template — frontmatter shape, ## EN / ## RU section structure, Submission instructions block, Character counts table, and re-runnable awk-slice verification commands all preserved verbatim with v2→v3 + 06→05 path/version substitutions."
  - "Plan-level acceptance grep tests can over-match when generic-allowed phrasing shares a stem with specific-bug phrasing (Russian morphology — `исправлен` root covers both 'исправления' (generic) and 'исправлены ошибки' (specific)). When a binding regex over-rejects an M1-D-10-sanctioned generic closer, prefer rephrasing to a synonymous catch-all that does not stem-match (e.g., 'Прочие улучшения стабильности и полировка') over relaxing the criterion."

requirements-completed: [REL-04]

# Metrics
duration: 13min
completed: 2026-05-07
---

# Phase 5 Plan 4: Release Notes (EN+RU, v3.0.0) Summary

**Bilingual paste-only release notes artifact at 489 EN / 492 RU chars (under Play Console's 500-char binding limit), leading with the 6-step contextual listing flow + KG/KZ/UZ city dictionary + mod media curation per M1 D-10 content order.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-05-07T17:17Z (approx — orchestrator-set phase start)
- **Completed:** 2026-05-07T17:30:37Z
- **Tasks:** 1 of 1
- **Files modified:** 1 created, 0 modified

## Accomplishments

- Drafted `05-RELEASE-NOTES.md` matching M2 Phase 6 `06-RELEASE-NOTES.md` structure with v3.0.0 content.
- EN body = 489 chars (11-char headroom); RU body = 492 chars (8-char headroom). Both bodies measured with the documented `awk` slice + `wc -m` pipeline (re-runnable at Plan 05-07 paste time).
- M1 D-10 content order honored: **What's new** (6-step flow + KG/KZ/UZ enabler + mod media curation) → **Improvements** (smoother session handling/recovery) → **Bug fixes** catch-all closer (no fabricated specific-fix names).
- Geographic invariant per memory `geographic-scope.md` honored: zero `Bishkek` / `Бишкек` matches in the entire file (user-facing bodies + meta-prose).
- EN ↔ RU parity preserved: same content, same order, same number of bullets per section.

## Task Commits

Each task was committed atomically:

1. **Task 1: Draft EN + RU v3.0.0 release notes within 500-char Play Console limit per locale** — `309e8ba` (docs)

_Note: this plan is documentation-only (paste-only artifact per M1 D-11), so no separate SUMMARY metadata commit is added by the executor — STATE.md / ROADMAP.md / SUMMARY.md will land in the executor's standard final-metadata commit._

## Files Created/Modified

- `.planning/phases/05-hardening-manual-qa-release-v3/05-RELEASE-NOTES.md` (created, 145 lines) — bilingual EN+RU release notes for v3.0.0 with frontmatter, submission instructions, character-counts table (with actual integers, not placeholders), re-runnable verification commands, re-open conditions, and cross-references.

## Decisions Made

1. **Closer-line rephrasing for RU (not in M2 precedent).** The acceptance criterion `grep -icE 'fixed [a-z]+|исправлен[а-я]* [а-я]+'` over-matches M2's verbatim closer "Мелкие исправления и шлифовка интерфейса." because the Russian root `исправлен` is the same stem in both the generic ("исправления") and specific ("исправлена ошибка") senses. Rather than relax the binding criterion, the closer was rephrased to "Прочие улучшения стабильности и полировка." — synonymous catch-all, M1-D-10-aligned, doesn't stem-match the over-broad regex. EN closer "Minor stability and polish refinements." was retained verbatim from M2 since the equivalent EN regex `fixed [a-z]+` doesn't match it.

2. **Meta-prose Bishkek mentions removed.** The criterion `grep -ic 'bishkek\|бишкек'` = 0 is file-wide, not body-only. The first draft retained M2-style meta-prose mentioning "no Bishkek-only phrasing" as a guardrail comment, which tripped the literal grep at 3 matches. Rephrased to "no single-city anchor in user-facing copy" / "Geographic invariant per memory `geographic-scope.md`" so the file passes the literal criterion. Intent is preserved (the prose still documents the scope-discipline rule); just doesn't use the trigger token to do so.

3. **3D tours called out separately in the headline-feature bullet.** Plan suggested "Photos and tour links" — chose "Listing photos and 3D tours" (EN) / "Фото и 3D-туры" (RU) because Matterport 3D tours are JayTap's stated differentiator per `.planning/PROJECT.md` (line 5: "curated 3D Matterport tours and panoramic imagery as a differentiator for hostels, hotels, and premium listings"). Internal-testing audience seeing "3D tours" in the notes will know to walk the mod-curated tour-link surface specifically.

4. **"Locations menu now covers cities in Kyrgyzstan, Kazakhstan, and Uzbekistan, ready as we expand"** instead of plan suggestion "ready for expansion as we grow" — same intent, 9 chars shorter, gave EN body more headroom for the 6-step flow descriptor.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] First-draft EN body measured 501 chars (1 over the 500-char binding limit) and RU body measured 522 chars (22 over).**
- **Found during:** Task 1, character-count verification step before file write.
- **Issue:** Plan-suggested draft was over-budget. Plan's deviation_protocol explicitly anticipates this (the "Trim priority list" — drop closer, drop second improvements bullet, trim descriptive tail). EN was 1-over; RU was 22-over.
- **Fix:** Trimmed both bodies per the plan's documented trim priority. EN: shortened the third What's new bullet ("more trustworthy at a glance" instead of "what you see is more trustworthy"), shortened Improvements bullet ("Smoother session handling and recovery" instead of "Smoother session handling and recovery flows"). RU: equivalent parity-preserving trims (dropped "вашему" before "типу недвижимости", switched "то, что вы видите, надёжнее" to "надёжнее с первого взгляда", trimmed Improvements bullet symmetrically).
- **Files modified:** `.planning/phases/05-hardening-manual-qa-release-v3/05-RELEASE-NOTES.md` (final state).
- **Verification:** `awk '/^## EN$/{flag=1; next} /^---$/{if(flag){flag=0}} flag' ... | wc -m` returned 489 EN; equivalent RU returned 492.
- **Committed in:** `309e8ba` (Task 1 commit — final trimmed state).

**2. [Rule 1 - Bug] Acceptance grep `грекс -icE 'исправлен[а-я]* [а-я]+'` over-matched the M1-D-10-sanctioned generic RU closer "Мелкие исправления и полировка интерфейса.".**
- **Found during:** Task 1, post-write acceptance-criteria run.
- **Issue:** The Russian root `исправлен` is shared between the generic ("исправления", "fixes/refinements") and specific ("исправлены ошибки", "fixed bugs") senses. The literal regex doesn't distinguish, so the M2-style closer trips it as a "specific named bug fix" — false positive against the criterion's intent (which is to forbid fabricated specifics, not the generic catch-all).
- **Fix:** Rephrased the RU closer to "Прочие улучшения стабильности и полировка." — synonymous catch-all, no `исправлен` stem, M1-D-10 spirit preserved. Rebalanced char count (492 final, well under 500).
- **Files modified:** `.planning/phases/05-hardening-manual-qa-release-v3/05-RELEASE-NOTES.md`.
- **Verification:** `grep -icE 'fixed [a-z]+|исправлен[а-я]* [а-я]+'` returned 0 (PASS); EN+RU char counts unchanged at 489/492.
- **Committed in:** `309e8ba` (Task 1 commit — final state).

**3. [Rule 1 - Bug] Initial draft's meta-prose tripped the literal `grep -ic 'bishkek\|бишкек'` = 0 criterion with 3 matches.**
- **Found during:** Task 1, post-write acceptance-criteria run.
- **Issue:** The first draft's meta-prose included three references to "Bishkek-only" as guardrail callouts (header comment + Cross-references entry). The acceptance criterion `grep -ic 'bishkek\|бишкек'` is file-wide and binding at 0, not "0 in user-facing bodies".
- **Fix:** Rephrased meta-prose to avoid the trigger token while preserving the rule statement ("no single-city anchor in user-facing copy" / "Geographic invariant per memory `geographic-scope.md`" — see Decisions Made #2).
- **Files modified:** `.planning/phases/05-hardening-manual-qa-release-v3/05-RELEASE-NOTES.md`.
- **Verification:** `grep -ic 'bishkek\|бишкек'` returned 0 (PASS).
- **Committed in:** `309e8ba` (Task 1 commit — final state).

---

**Total deviations:** 3 auto-fixed (all Rule 1 — over-budget length / regex over-match / criterion-violating meta-prose), all folded into the single Task 1 atomic commit.
**Impact on plan:** All three were anticipated by the plan body (deviation_protocol enumerates the trim-priority list; criterion language signals the intent the regexes try to enforce). No scope creep — the artifact remains the binary one-file deliverable described in `<output>`.

## Issues Encountered

- None beyond the three auto-fixed deviations above. The Bash tool's `&&` chain short-circuited on the first acceptance-criterion failure, which masked subsequent passing checks; switched to `;`-separated `echo "$(...)"` invocations to surface all 17 criteria in a single pass.

## Authentication Gates

None — pure documentation task. No external services touched.

## Output (per `<output>` directive)

- **Actual character counts (per `wc -m` via awk slice):** EN = 489; RU = 492.
- **Language scope:** EN + RU only (no Kyrgyz, no Uzbek per memory `geographic-scope.md` — RU is the only non-EN locale at v3.0.0).
- **Bishkek-only-phrasing check result:** 0 file-wide matches (`grep -ic 'bishkek\|бишкек' 05-RELEASE-NOTES.md` = 0).
- **M1 D-10 disposition:** **Catch-all closer retained** — pending Plan 05-05 QA outcome. RU closer rephrased from M2-verbatim "Мелкие исправления и шлифовка интерфейса." to "Прочие улучшения стабильности и полировка." to satisfy a binding acceptance regex (see Decisions #1 + Deviation #2). EN closer "Minor stability and polish refinements." retained verbatim from M2.

## Threat Surface Scan

No new threat surface introduced — this plan is documentation-only and the artifact is paste-only (M1 D-11 precedent). The plan's `<threat_model>` register (T-05-24..T-05-28) is fully addressed:
- T-05-24 (fabricated bug-fix specifics): mitigated — closer is generic in both bodies; specific-fix grep returns 0.
- T-05-25 (SDK names leaking): mitigated — `firebase` / `@react-native-firebase` not present in user-facing copy.
- T-05-26 (length-budget overflow): mitigated — both bodies under 500 chars with documented trim priority for paste-time drift.
- T-05-27 (Bishkek-only spoofing): mitigated — `grep -ic 'bishkek\|бишкек'` = 0 file-wide.
- T-05-28 (mid-flight content shift): accepted — Plan 05-07 paste step uses the documented awk slice for deterministic byte-for-byte extraction.

## Self-Check: PASSED

**File existence:**
- FOUND: `.planning/phases/05-hardening-manual-qa-release-v3/05-RELEASE-NOTES.md`
- FOUND: `.planning/phases/05-hardening-manual-qa-release-v3/05-04-SUMMARY.md` (this file)

**Commit existence:**
- FOUND: `309e8ba` (Task 1 — release notes draft)

**All 17 plan acceptance criteria PASS** (recorded in execution transcript):
1. file exists: PASS
2. EN body chars = 489 (≤500): PASS
3. RU body chars = 492 (≤500): PASS
4. ## EN heading present: PASS
5. ## RU heading present: PASS
6. 6-step refs = 2 (≥2): PASS
7. KG/KZ/UZ refs = 3 (≥2): PASS
8. Bishkek refs = 0 (must=0): PASS
9. SDK names = 0 (must=0): PASS
10. specific-named-bug-fix grep = 0 (must=0): PASS
11. EN row integer in counts table: PASS
12. RU row integer in counts table: PASS
13. target_version = 3.0.0: PASS
14. paste_only = true: PASS
15. languages = [en, ru]: PASS
16. Re-open conditions section present: PASS
17. Cross-references section present: PASS

**Plan-level `<verify><automated>` gate:** PASS (all conjunctions satisfied).

## Next Phase Readiness

- `05-RELEASE-NOTES.md` is ready for Plan 05-07's paste step. The two `awk` slice commands documented in the file's "Verification commands" subsection extract EN + RU bodies deterministically for ASC + Play Console paste.
- Re-open conditions are documented: if Plan 05-05's QA matrix walk surfaces a release-blocking defect that requires explicit user-facing acknowledgment, this file gets re-edited (and re-measured) before 05-07 paste.
- Frontmatter status flags (`walk_disposition: pending`, `bug_fix_loop_triggered: pending`, `walked_against_sha: pending`) are placeholders that flip when Plan 05-03 (atomic version bump) and Plan 05-05 (QA matrix walk) close. They are passive markers — not blocking gates for the artifact's correctness.
- Wave 1 is otherwise still in progress (Plan 05-01 pre-flight + Plan 05-02 store-history capture run alongside this); Wave 2 (Plan 05-03 atomic version bump) gates on Wave 1 close.

---
*Phase: 05-hardening-manual-qa-release-v3*
*Plan: 04 — Release Notes (EN+RU, v3.0.0)*
*Completed: 2026-05-07*
*Executor: claude-opus-4-7[1m] (sequential — main working tree, Wave 1)*
