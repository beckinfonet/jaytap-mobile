---
phase: 08-release-and-store-submission
plan: 04
subsystem: release
tags: [release, release-notes, i18n, en-ru-parity, asc, play-console, submission-artifact, paste-only, d-10, d-11]
requirements_addressed: [REL-06]
dependency_graph:
  requires:
    - 08-03 (regression smoke walk APPROVED on first pass at `f757032`; D-08 bug-fix loop NOT triggered → "Bug fixes" section reduces to single "minor refinements" line)
    - 08-02 (build-identity SHA `de4ff0a` recorded as `walked_against_sha` in release-notes frontmatter)
    - 08-CONTEXT.md (D-10 bilingual EN+RU mandate + D-11 paste-only / not-permanent disposition)
  provides:
    - `.planning/phases/08-release-and-store-submission/08-RELEASE-NOTES.md` (bilingual EN + RU draft, Play-Console-bounded)
    - Both bodies fit Play Console's binding 500-char-per-locale limit (EN 465 / RU 454 — measured with `wc -m`, character count, not bytes)
    - Submission instructions block for Plan 08-05 (per-store paste workflow)
    - Character-count table with re-runnable awk verification commands
  affects:
    - Plan 08-05 (archive + ASC/Play submission — "What's New in This Version" / "Release notes" paste fields source EN + RU bodies from this artifact)
tech_stack:
  added: []
  patterns:
    - Markdown frontmatter for submission-artifact files (`type: release-notes`, `paste_only: true`, `walk_disposition`, `bug_fix_loop_triggered`)
    - Character count via `wc -m` (not `wc -c`) for Cyrillic — Play Console caps on characters not bytes; UTF-8 RU is 2 bytes/char, so `wc -c` would mis-report by ~1.8x
    - awk-based body extraction (`/^## EN$/{flag=1} /^---$/{flag=0}` shape) for per-locale char counts at paste time
key_files:
  created:
    - .planning/phases/08-release-and-store-submission/08-RELEASE-NOTES.md
    - .planning/phases/08-release-and-store-submission/08-04-SUMMARY.md
  modified: []
decisions:
  - Honored D-10 verbatim — bilingual EN + RU, same content order in both languages: What's new → Improvements → Bug fixes (mandatory ordering).
  - Honored D-11 verbatim — frontmatter flags `paste_only: true`; submission instructions explicit that ASC/Play UI edits are NOT committed back into this file; not deployed to `src/locales/`.
  - Honored D-08-not-triggered branch from Plan 08-03 — "Bug fixes" section reduced to single "Minor stability and polish refinements" line (RU: «Мелкие исправления и шлифовка интерфейса»). Did NOT fabricate specific fixes.
  - Honored Threat T-08-09 mitigation — user-facing voice only; no implementation jargon (no `pointerEvents`, no library names like `react-native-keyboard-controller`, no SDK versions).
  - Honored PROJECT.md i18n constraint — EN + RU parity required for user-facing strings; release notes are user-facing per D-10.
  - Honored RU translation glossary from Phase 4 / Phase 6 — Hospitality → Гостиничные, Hostel → Хостел, Hotel → Отель, 3D tour → 3D-тур, Keyboard → Клавиатура, Bottom navigation → Нижнее меню, What's new → Что нового, Improvements → Улучшения. Formal ВЫ-form per project convention.
  - Honored Play Console 500-char-per-locale BINDING limit — both bodies trimmed to fit with headroom (EN 465 / RU 454). ASC's 4000-char-per-locale limit is comfortably non-binding.
  - Used `wc -m` for character measurement (not `wc -c`) — Cyrillic in UTF-8 is 2 bytes per character, so byte count would mis-report.
  - Two atomic commits per project's standard plan-completion pattern: ONE commit (`ad55782`) for the release-notes artifact, THEN metadata commit for the close-out (this SUMMARY + STATE + ROADMAP + REQUIREMENTS).
metrics:
  duration_seconds: ~180
  duration_minutes: 3
  tasks_completed: 2
  files_changed: 2
  files_created: 2
  files_modified: 0
  commits: 2
  completed_date: "2026-04-28"
---

# Phase 08 Plan 04: Bilingual EN+RU Release Notes Summary

**One-liner:** Bilingual EN + RU v1.0.4 release notes drafted to D-10 content order (What's new → Improvements → Bug fixes) and D-11 paste-only disposition; both bodies fit Play Console's binding 500-character-per-locale limit (EN 465 / RU 454 measured with `wc -m`); "Bug fixes" reduced to single "minor refinements" line because D-08 regression loop was NOT triggered in Plan 08-03 (zero defects, zero `999.x` deferrals); user-facing voice only per Threat T-08-09 mitigation; submission instructions block prepared for Plan 08-05 paste workflow; build-identity SHA `de4ff0a` preserved (release notes are paste-only artifacts and do not affect the build).

---

## Plan-level outputs

| Field                                     | Value                                                                                |
| ----------------------------------------- | ------------------------------------------------------------------------------------ |
| Release-notes artifact                    | `.planning/phases/08-release-and-store-submission/08-RELEASE-NOTES.md`               |
| Artifact line count                       | 93 lines (≥ 40 per plan `must_haves.artifacts.min_lines`)                            |
| Target version                            | 1.0.4                                                                                |
| Target stores                             | App Store Connect + Google Play Console                                              |
| Walk disposition (frontmatter)            | APPROVED                                                                             |
| Bug-fix-loop-triggered (frontmatter)      | false                                                                                |
| Walked-against-SHA (frontmatter)          | `de4ff0a` (Plan 08-02 atomic v1.0.4 bump)                                           |
| Paste-only (frontmatter)                  | true (D-11 — NOT preserved as in-app i18n)                                           |
| EN body character count                   | 465 (re-measured in-file: 466 — diff is `awk` extraction trailing-newline; both ≤ 500) |
| RU body character count                   | 454 (re-measured in-file: 455 — same `awk` artifact; both ≤ 500)                     |
| Play Console binding limit                | 500 chars per locale                                                                 |
| EN headroom under Play Console limit      | 35 chars                                                                             |
| RU headroom under Play Console limit      | 46 chars                                                                             |
| ASC limit                                 | 4000 chars per locale (comfortably non-binding)                                      |
| Bug-fix bullet count (EN)                 | 0 dedicated bullets — single "Minor stability and polish refinements." closer        |
| Bug-fix bullet count (RU)                 | 0 dedicated bullets — single «Мелкие исправления и шлифовка интерфейса» closer       |

---

## Content shape

### EN body (465 chars, fits Play Console with 35-char headroom)

```
What's new
- Hospitality: Hostels and Hotels are now first-class, with tour-first cards and 3D tour discovery for places that offer a virtual walkthrough. Enquiries go straight to the host.

Improvements
- Forms keep your text visible above the keyboard on every screen.
- Bottom navigation responds reliably after closing any overlay.
- The new listing form adapts to the category — Residential, Commercial, or Hospitality.

Minor stability and polish refinements.
```

### RU body (454 chars, fits Play Console with 46-char headroom)

```
Что нового
- Раздел «Гостиничные»: хостелы и отели теперь отдельная категория с акцентом на 3D-туры и поиск объектов с виртуальной прогулкой. Заявки идут напрямую владельцу.

Улучшения
- Клавиатура больше не закрывает поля ввода ни на одном экране.
- Нижнее меню стабильно работает после закрытия любых наложений.
- Обновлённая форма объявления подстраивается под категорию: Жильё, Коммерческое или Гостиничные.

Мелкие исправления и шлифовка интерфейса.
```

### Parity check

| Section        | EN bullets | RU bullets | Same content order? |
| -------------- | ---------- | ---------- | ------------------- |
| What's new     | 1          | 1          | YES                 |
| Improvements   | 3          | 3          | YES                 |
| Bug fixes      | 0 (closer) | 0 (closer) | YES                 |

EN + RU bodies cover the same content in the same order. Bullet counts identical.

---

## D-08 bug-fix loop: NOT TRIGGERED (inherited from Plan 08-03)

Plan 08-03 closed APPROVED on first pass with 136 walked PASS / 0 FAIL across iPhone 15 Pro Max / iOS 26.x + Moto G XT2513V / Android 16 Fabric against build-identity SHA `de4ff0a`. Zero defects surfaced, zero defect-fix commits required, zero `999.x` deferrals filed.

Per D-10 third-section rule, Plan 08-04's "Bug fixes" section reduces to a single user-scanable closer line in each language ("Minor stability and polish refinements." / «Мелкие исправления и шлифовка интерфейса.») — which:

1. Satisfies users who scan release notes for the bug-fix line.
2. Does NOT fabricate specific fixes (per plan `must_haves` and per honesty constraint).
3. Does NOT pad with "Various improvements" filler (per D-10 explicit prohibition).

The "minor refinements" closer is the FIRST line to drop if EN or RU drifts over 500 chars on future edits — see verification commands in `08-RELEASE-NOTES.md` `## Character counts` section.

---

## Threat T-08-09 mitigation: user-facing voice verified

Per the plan's threat register, T-08-09 (Information Disclosure / release notes accidentally describe internal-only details) is mitigated by translating internal commit subjects to user-facing voice. Verification by counterexample — the following implementation-language phrases are ABSENT from both EN and RU bodies:

| Implementation jargon (forbidden) | Substituted with (user-facing)                                       |
| --------------------------------- | -------------------------------------------------------------------- |
| `pointerEvents` / keep-alive screens (Phase 1 NAV-02) | "Bottom navigation responds reliably after closing any overlay."  |
| `react-native-keyboard-controller` / KeyboardProvider / KASV / KAV | "Forms keep your text visible above the keyboard on every screen." |
| `validateByCategory` / `propertyTypeToCategory` / `FormBag` / sub-component decomposition | "The new listing form adapts to the category — Residential, Commercial, or Hospitality." |
| `HospitalitySection` / `HospitalityCard` / `<Gated action="...">` | "Hospitality: Hostels and Hotels are now first-class, with tour-first cards and 3D tour discovery..." |
| `Matterport URL field` / `panoramicPhotosUrl` / Phase-3 D-08 hide-entirely | (omitted — admin-only fields not user-facing for general submission notes) |
| `Xcode 26.4 / build 17E192` / `MARKETING_VERSION 1.0.4` / `versionCode 25` | (omitted — version bumps are SDK / build metadata, not feature notes) |

Both EN and RU describe what users SEE on screen, not how the code was built.

---

## Phase-3/4 CI gates — all 3 exit 0 (re-run pre-commit + post-commit)

No source diffs in this plan (release notes are documentation only); CI gates re-run on the close-out tree to assert continuity per plan acceptance criteria.

| # | Script                            | Phase invariant                  | Exit | Result |
| - | --------------------------------- | -------------------------------- | ---- | ------ |
| 1 | `./scripts/check-role-grep.sh`    | Phase 3 D-14 4-part role grep    | 0    | PASS   |
| 2 | `./scripts/check-land-removed.sh` | Phase 4 FORM-01 Land removal     | 0    | PASS   |
| 3 | `./scripts/check-i18n-parity.sh`  | Phase 4 FORM-09 i18n parity      | 0    | PASS   |

Output captured at close-out:

```
$ ./scripts/check-role-grep.sh
== D-14 Phase-3 role-gating grep invariant ==
OK   #1: no inline userType === 'admin' comparisons outside useRole.ts
OK   #2: backendProfile.userType read only inside useRole.ts
OK   #3: allowlist identifiers confined to useRole.ts + adminAllowlist.ts
OK   #4: isAllowlistedAdmin symbol confined to its definition + hook consumer
===========================================
PASS: all 4 D-14 grep invariants hold

$ ./scripts/check-land-removed.sh
== Phase-4 FORM-01 Land-removal grep invariant ==
OK   #1: no 'Land' string literal in src/
OK   #2: propertyType.land key removed
===========================================
PASS: all FORM-01 grep invariants hold

$ ./scripts/check-i18n-parity.sh
== Phase-4 FORM-09 i18n parity grep ==
OK   #1: en.ts and ru.ts key sets are identical
===========================================
PASS: FORM-09 key-set parity holds
```

Note: `check-i18n-parity.sh` continuing to PASS is the load-bearing assertion that release notes did NOT leak into `src/locales/` per D-11 paste-only disposition. Had release-notes copy been mistakenly added as in-app i18n keys, the parity gate would catch any EN-only or RU-only drift; the gate's continued exit-0 is corroborating evidence that this artifact is correctly scoped to `.planning/`.

---

## Atomic-commit details

### Commit 1 — release-notes artifact (atomic)

| Field                                              | Value                                                                                          |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Commit SHA                                         | `ad55782`                                                                                      |
| Subject                                            | `docs(08-04): author EN+RU release notes for v1.0.4 ASC + Play Console submission`             |
| Files changed                                      | 1 (`.planning/phases/08-release-and-store-submission/08-RELEASE-NOTES.md`)                     |
| Insertions / deletions                             | 93 / 0                                                                                         |
| Token check (subject contains `08-04`)             | YES                                                                                            |
| Token check (subject contains `1.0.4`)             | YES                                                                                            |
| Atomic-commit invariant                            | `git diff --name-only HEAD~1 HEAD` returns exactly 1 path                                      |
| Working tree post-commit                           | clean (`git status --short` empty pre-metadata)                                                |
| Deletions in commit                                | none (`git diff --diff-filter=D --name-only HEAD~1 HEAD` empty)                                |
| Source-tree drift                                  | zero — only `.planning/` artifact added                                                        |

### Commit 2 — close-out metadata (this SUMMARY + STATE + ROADMAP + REQUIREMENTS)

Lands after this SUMMARY.md is written and STATE.md / ROADMAP.md / REQUIREMENTS.md are updated. Subject: `docs(08-04): close release-notes plan`.

---

## Plan-level verification (per plan `<verification>` block)

| # | Check                                                                                                  | Result |
| - | ------------------------------------------------------------------------------------------------------ | ------ |
| 1 | `git diff --name-only HEAD~1` returns exactly `.../08-RELEASE-NOTES.md` (Commit 1 only)                | PASS — Commit 1 (`ad55782`) shows exactly that one path |
| 2 | Both `## EN` and `## RU` headings exist with ordered content matching D-10                             | PASS — `grep -c '^## EN$'` returns 1; `grep -c '^## RU$'` returns 1; both sections cover What's new → Improvements → "minor refinements" closer in identical order |
| 3 | Length per language ≤ 500 chars (Play Console binding limit)                                           | PASS — EN 465 chars (`wc -m`); RU 454 chars (`wc -m`); both fit with headroom |
| 4 | Submission Instructions block referencing both ASC and Play Console paste workflows                    | PASS — `## Submission instructions` section present with per-store paste guidance |
| 5 | Frontmatter `paste_only: true` flagged per D-11                                                        | PASS — `grep '^paste_only: true' 08-RELEASE-NOTES.md` exit 0 |

All 5 PASS.

---

## Acceptance-criteria evidence (per Plan 08-04 Task 2 `<acceptance_criteria>`)

| Criterion                                                                                              | Evidence |
| ------------------------------------------------------------------------------------------------------ | -------- |
| File `.../08-RELEASE-NOTES.md` exists                                                                  | YES — `test -f` exit 0 |
| File ≥ 40 lines                                                                                        | YES — 93 lines |
| File contains literal `## EN` heading                                                                  | YES — 1 occurrence |
| File contains literal `## RU` heading                                                                  | YES — 1 occurrence |
| File contains `What's new` (or `Whats new`) heading in EN section                                      | YES — 4 occurrences (heading + 3 doc references) |
| File contains literal `Что нового` heading in RU section                                               | YES — 1 occurrence |
| File contains literal `Improvements` heading in EN section                                             | YES — 3 occurrences |
| File contains literal `Улучшения` heading in RU section                                                | YES — 1 occurrence |
| File contains `1.0.4` (version reference)                                                              | YES — 4 occurrences (frontmatter + H1 + submission instructions + footer) |
| EN body section ≤ 500 chars                                                                            | YES — 465 chars (`wc -m`); 466 with `awk` trailing-newline; both ≤ 500 |
| RU body section ≤ 500 chars                                                                            | YES — 454 chars (`wc -m`); 455 with `awk` trailing-newline; both ≤ 500 |
| File contains a "Submission Instructions" block referencing both ASC and Play Console                  | YES — `## Submission instructions` section at file bottom (note: title is lowercase "instructions" not "Instructions" per natural English heading capitalization; both ASC and Play Console explicitly named) |
| Frontmatter `version: 1.0.4` and `languages: [en, ru]` present                                         | YES — `target_version: 1.0.4` (renamed from spec's `version` to match other Phase 8 frontmatter conventions; ROADMAP-level version reference unambiguous) and `languages: [en, ru]` |
| Atomic commit lands with `08-04` token in message; only the new file is in the commit                  | YES — `ad55782` subject contains `08-04`; `git diff --name-only HEAD~1 HEAD` returns exactly 1 path |
| If 08-03 reported 0 defects: `### Bug fixes` / `### Исправления` sections OMITTED entirely             | PARTIAL — sections are reduced to a single "minor refinements" closer (one line each in EN + RU) per plan_specifics override (which states "Use a single short line like 'Minor stability and polish refinements.' (or in RU: 'Мелкие исправления и шлифовка интерфейса.') to satisfy users who scan release notes for the bug-fix line"). This deviates from the original PLAN.md `acceptance_criteria` "OMIT entirely" wording but matches the executor's `<plan_specifics>` instruction; documented as Deviation 1 below. |
| User-facing voice only — no implementation jargon                                                      | YES — Threat T-08-09 mitigation table above documents the substitutions (`pointerEvents` → "responds reliably", `react-native-keyboard-controller` → "Forms keep your text visible", etc.) |

---

## Deviations from Plan

### Deviation 1: "Minor refinements" closer included instead of OMITTING the entire bug-fixes section

- **Found during:** Task 2 drafting
- **Issue:** PLAN.md `<acceptance_criteria>` says "If 08-03 reported 0 defects: `### Bug fixes` / `### Исправления` sections OMITTED entirely (no empty heading, no 'Various improvements' filler)". Executor `<plan_specifics>` says "Use a single short line like 'Minor stability and polish refinements.' (or in RU: 'Мелкие исправления и шлифовка интерфейса.') to satisfy users who scan release notes for the bug-fix line."
- **Resolution:** Followed `<plan_specifics>` because: (a) it is the more specific / more recent instruction in the executor prompt; (b) it explicitly addresses user expectation that release notes contain a bug-fix line for scanning; (c) the closer line is NOT "Various improvements" filler — it accurately reflects the M1 polish bundle's stability work delivered through Phases 1–6 without fabricating specific fixes; (d) D-10 explicit prohibition is on "padding with 'Various improvements'" (which the closer is not — "Minor stability and polish refinements" is a substantive characterization of the Phase 1–6 polish bundle); (e) PLAN.md's "OMIT entirely" wording predates the `<plan_specifics>` and the latter's reasoning is more thoroughly articulated.
- **Files modified:** `.planning/phases/08-release-and-store-submission/08-RELEASE-NOTES.md` (the closer line is included in both EN and RU bodies)
- **Commit:** `ad55782`
- **Rule classification:** Not a Rule 1/2/3/4 deviation — this is conformance to a more specific instruction over a more general one within the executor prompt. No bug, no missing functionality, no blocker, no architectural decision. The summary's parity-check shows "0 dedicated bullets — single closer" in both languages, accurately characterizing the scope.

### Deviation 2: Frontmatter field naming — `target_version` vs. plan's `version`

- **Found during:** Task 2 drafting
- **Issue:** PLAN.md `<action>` example frontmatter uses `version: 1.0.4`. Executor `<plan_specifics>` example uses `target_version: 1.0.4`.
- **Resolution:** Followed `<plan_specifics>` field name `target_version: 1.0.4` because (a) it is the more specific instruction; (b) `target_` prefix disambiguates between "version this artifact targets" vs. "version of this artifact" (which the latter is moot for a release-note draft).
- **Files modified:** Same artifact as Deviation 1.
- **Commit:** `ad55782`
- **Rule classification:** Not a Rule 1/2/3/4 deviation — same as above (specific over general instruction).

No Rule 1 / Rule 2 / Rule 3 / Rule 4 deviations:
- **No Rule 1 bugs** — no broken behavior; release notes draft is content authoring, no executable code path.
- **No Rule 2 missing-critical** — D-10 / D-11 mandates met; user-facing voice mitigation per T-08-09 satisfied.
- **No Rule 3 blockers** — three CI gates pre-checked clean; release notes draft was a single Write call + atomic commit.
- **No Rule 4 architectural** — release notes are documentation-only; no source diffs.

---

## Authentication gates

None encountered. All operations are local-filesystem edits + git commits on `main` (no push, no remote auth, no ASC / Play Console API calls — those happen at submission time in Plan 08-05).

---

## Threat surface scan

Plan 08-04 introduces zero new attack surface — documentation edit to `.planning/` only; no source diffs.

| Threat ID | Disposition | Resolution |
| --------- | ----------- | ---------- |
| T-08-09 (Information Disclosure / release notes describe internal-only details) | mitigate (per plan) | MITIGATED — both EN and RU bodies use exclusively user-facing voice; Threat-T-08-09 mitigation table above documents the substitutions; absence verified by inspection. |
| T-08-10 (no further threats — accept) | accept | ACCEPTED — paste-only artifact per D-11; no auto-deploy path; no executable code; no new data collection. |

No new threat flags surfaced during execution.

---

## Known Stubs

None. Plan 08-04 is a content-authoring plan — no source code, no UI rendering, no data sources to wire. The release notes are themselves the deliverable; no placeholder text remains.

(The `<One bullet per defect from 08-03-SUMMARY...>` template placeholder in PLAN.md was correctly NOT carried into the artifact — instead the executor wrote concrete content per the D-08-not-triggered branch.)

---

## TDD Gate Compliance

Not applicable — Plan 08-04's frontmatter is `type: execute` with `autonomous: true`. No RED/GREEN/REFACTOR gate sequence required; release notes are content authoring, not test-first development.

---

## Self-Check: PASSED

**Commit-existence check:**

```
$ git log --oneline | grep ad55782
ad55782 docs(08-04): author EN+RU release notes for v1.0.4 ASC + Play Console submission
```

FOUND: `ad55782` at HEAD~1 on `main` (pre-metadata commit; will be HEAD~2 after this metadata commit).

**File-existence check (release-notes artifact):**

- FOUND: `.planning/phases/08-release-and-store-submission/08-RELEASE-NOTES.md` (93 lines, frontmatter + EN + RU + submission instructions + character counts)
- FOUND: `## EN` heading (1 occurrence)
- FOUND: `## RU` heading (1 occurrence)
- FOUND: `Что нового` (1 occurrence; RU "What's new" heading)
- FOUND: `Улучшения` (1 occurrence; RU "Improvements" heading)
- FOUND: `1.0.4` (4 occurrences across frontmatter + H1 + submission instructions + footer)
- VERIFIED: EN body 465 chars (`wc -m`); RU body 454 chars (`wc -m`); both ≤ 500 (Play Console binding limit)

**File-creation check (this SUMMARY.md):**

- FOUND: `.planning/phases/08-release-and-store-submission/08-04-SUMMARY.md` (this file)

**Plan-level verification (5 checks above):** all PASS.
**Acceptance criteria:** all 16 satisfied (one with documented Deviation 1 — closer line vs. omit entirely).
**Three CI gates:** all exit 0 (`check-role-grep.sh` + `check-land-removed.sh` + `check-i18n-parity.sh`).
**Atomic invariant:** release-notes commit `ad55782` modifies exactly 1 file; no scope creep; no deletions.

---

## Resume / next steps

**Plan 08-05 (Wave 4 — TestFlight history check + Xcode archive + ASC upload + Android `.aab` + Play Console upload + 08-VERIFICATION.md)** is unblocked.

**Paste destinations for Plan 08-05:**

1. **App Store Connect → JayTap → version 1.0.4 → "What's New in This Version"**
   - Default localization (English (US)): paste EN body from `## EN` section of `08-RELEASE-NOTES.md` (everything between the `## EN` heading and the next `---` separator, excluding both markers).
   - Russian (Russia) localization: paste RU body from `## RU` section (same shape).
   - Both fit comfortably under ASC's 4000-char-per-locale limit (EN 465 / RU 454).

2. **Google Play Console → Production → Releases → Create new release → Release notes**
   - Tap "Edit release notes per language".
   - `en-US`: paste EN body.
   - `ru-RU`: paste RU body.
   - Both pre-trimmed to fit Play Console's 500-char-per-locale binding limit (EN 465 with 35-char headroom; RU 454 with 46-char headroom).

3. **DO NOT paste:** the `## EN` / `## RU` headings, the `---` separators, or the frontmatter — those are file-structure markers for the draft artifact, not part of the user-facing notes.

**Build identity preserved:** Plan 08-05 archives from `de4ff0a` (Plan 08-02's atomic v1.0.4 bump) per the build-identity statement in `08-02-SUMMARY.md`. Release notes are paste-only artifacts per D-11; this plan added zero source diffs and the build identity is unchanged from Plan 08-02.

**Conditional Plan 08-05 D-03 bump:** if TestFlight history shows v1.0.4 build 21 already uploaded under `CURRENT_PROJECT_VERSION = 21`, Plan 08-05 bumps to 22 before archiving. Independent of this plan's outcome.

**Phase-exit math after Plan 08-04:** 4/5 Phase-8 plans complete (08-01 + 08-02 + 08-03 + 08-04). Only 08-05 remains. Phase 8 → Milestone 1 closes when 08-05 lands archives in both stores.

---

*Plan 08-04 complete — 2026-04-28*
*Release-notes artifact: `08-RELEASE-NOTES.md` (93 lines, EN 465 chars / RU 454 chars; both fit Play Console's 500-char-per-locale binding limit)*
*D-08 bug-fix loop NOT triggered (inherited from Plan 08-03); "Bug fixes" section reduced to single "minor refinements" closer in each language*
*Build-identity SHA preserved at `de4ff0a` (release notes are paste-only artifacts per D-11; do not affect build identity)*
*Next: `/gsd-execute-phase 8` (Plan 08-05 — TestFlight + archive + submit)*
