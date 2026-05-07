---
phase: 05-hardening-manual-qa-release-v3
plan: 04
type: release-notes
created: 2026-05-07
target_stores: [App Store Connect, Google Play Console]
target_version: 3.0.0
walk_disposition: pending  # flips to APPROVED after Plan 05-05 manual QA matrix
bug_fix_loop_triggered: pending  # flips after Plan 05-05 walk completes
walked_against_sha: pending  # flips after Plan 05-03 atomic bump
languages: [en, ru]
binding_length_limit: 500 chars per locale (Play Console)
asc_length_limit: 4000 chars per locale
paste_only: true
m1_template: .planning/milestones/v1.0.4-phases/08-release-and-store-submission/08-RELEASE-NOTES.md
m2_template: .planning/milestones/v2.0-phases/06-hardening-manual-physical-device-qa-release/06-RELEASE-NOTES.md
---

# JayTap v3.0.0 — Release Notes

Bilingual draft for App Store Connect (per-locale "What's New in This Version") and
Google Play Console (per-language "Release notes" / "What's new"). Paste at submission
time in Plan 05-07; do not commit changes back from the ASC / Play Console UI into
this file (per M1 D-11 precedent — paste-only artifact, not preserved as in-app i18n).

Both bodies cover the same content in the same order: **What's new → Improvements →
Bug fixes**. The "Bug fixes" reduces to a single "minor refinements" line per M1 D-10
catch-all phrasing — specific fixes are NOT fabricated. If Plan 05-05's QA matrix walk
surfaces a release-blocking defect that should be called out, this file is updated
after that walk completes (the M2 v2.0.0 walk surfaced zero defects, so the closer
line was retained as-is; the same default applies here).

Each language body fits Google Play Console's binding 500-character-per-locale limit;
App Store Connect's 4000-character limit is non-binding for these notes.

Geographic invariant per memory `geographic-scope.md` — the app's planned scope is
KG/KZ/UZ; copy avoids any single-city anchor. The "Locations menu now covers cities in
Kyrgyzstan, Kazakhstan, and Uzbekistan" copy references the new Phase 2 Plan 02-01
city + KG-launch district seed (KG launch market; KZ + UZ city seeds positioned as
expansion enabler).

---

## EN

What's new
- New 6-step listing creation flow: each step shows only the fields that fit your property and deal type (apartment/house/office/commercial/hotel/hostel x sale/long-term/daily).
- Locations menu now covers cities in Kyrgyzstan, Kazakhstan, and Uzbekistan, ready as we expand.
- Listing photos and 3D tours are reviewed by our team before going live — more trustworthy at a glance.

Improvements
- Smoother session handling and recovery.

Minor stability and polish refinements.

---

## RU

Что нового
- Новый процесс создания объявления из 6 шагов: на каждом шаге показаны только поля, подходящие типу недвижимости и сделки (квартира/дом/офис/коммерция/отель/хостел x продажа/долгосрочно/посуточно).
- Справочник городов теперь включает Кыргызстан, Казахстан и Узбекистан — готовы к расширению.
- Фото и 3D-туры проверяются нашей командой до публикации — надёжнее с первого взгляда.

Улучшения
- Более плавная работа с сеансами и входом.

Прочие улучшения стабильности и полировка.

---

## Submission instructions

For Plan 05-07 (archive + ASC / Play Console upload). Both stores render the pasted body
as plain text — no Markdown rendering — so the bullets above ship as-is, including the
leading `- ` prefix.

**App Store Connect (per-locale "What's New in This Version"):** App Store Connect →
JayTap → version 3.0.0 → "What's New in This Version". Default localization is English
(US): paste the EN body above (everything between `## EN` and `---`, excluding those
structural markers). Add the Russian (Russia) localization and paste the RU body.
Both fit comfortably under ASC's 4000-char-per-locale limit.

**Google Play Console (per-language "Release notes"):** Internal Testing track → Create new
release → Release notes section → tap "Add language" or "Edit release notes per
language". For `en-US` paste the EN body; for `ru-RU` paste the RU body. Both bodies
are pre-trimmed to fit Play Console's 500-char-per-locale binding limit.

Do NOT include the `## EN` / `## RU` headings or the `---` separators when pasting —
those are file-structure markers for this draft, not part of the user-facing notes.

---

## Character counts

Measured with `wc -m` (character count, not byte count — Play Console caps on
characters). Both languages fit Play Console's 500-character-per-locale binding limit.

| Language | Body characters | Play Console limit (500) | Fits? | Headroom |
| -------- | --------------- | ------------------------ | ----- | -------- |
| EN       | 489             | 500                      | YES   | 11       |
| RU       | 492             | 500                      | YES   | 8        |

Verification commands (re-runnable at paste time to confirm no drift):

```bash
# EN body
awk '/^## EN$/{flag=1; next} /^---$/{if(flag){flag=0}} flag' .planning/phases/05-hardening-manual-qa-release-v3/05-RELEASE-NOTES.md | sed '1{/^$/d;}' | sed '${/^$/d;}' | wc -m

# RU body
awk '/^## RU$/{flag=1; next} /^---$/{if(flag){flag=0}} flag' .planning/phases/05-hardening-manual-qa-release-v3/05-RELEASE-NOTES.md | sed '1{/^$/d;}' | sed '${/^$/d;}' | wc -m
```

If either count climbs over 500 after edits, trim per the priority listed in Step 1
of Plan 05-04's action block:
1. Drop the "Minor stability..." closer first.
2. Drop the second Improvements bullet.
3. Trim the descriptive tail of the longest What's new bullet.
Preserve EN ↔ RU parity (same content, same order, same number of bullets).

---

## Re-open conditions

- If Plan 05-05's QA matrix walk surfaces a release-blocking defect that requires explicit
  acknowledgment in user-facing copy, update this file (and re-verify wc -m) before Plan 05-07
  pastes.
- If a future Phase introduces a Cyrillic-locale-only feature, the RU body may need a separate
  bullet (parity with EN may not be exact for region-specific functionality).
- If KZ or UZ launches before this build ships (unlikely per ROADMAP), the "ready as we expand"
  phrasing needs softening.

## Cross-references

- M1 release notes: `.planning/milestones/v1.0.4-phases/08-release-and-store-submission/08-RELEASE-NOTES.md`
- M2 release notes: `.planning/milestones/v2.0-phases/06-hardening-manual-physical-device-qa-release/06-RELEASE-NOTES.md`
- Memory `geographic-scope.md` (no single-city anchor in user-facing copy)
- REQUIREMENTS.md REL-04 acceptance criteria.

---

*Draft authored: 2026-05-07 (Plan 05-04, Wave 1 of Phase 5)*
*To be walked against build-identity SHA from Plan 05-03 (atomic v3.0.0 bump)*
*QA disposition pending — flips when Plan 05-05 closes*
*Per M1 D-11: paste-only artifact — not preserved as in-app i18n keys*
