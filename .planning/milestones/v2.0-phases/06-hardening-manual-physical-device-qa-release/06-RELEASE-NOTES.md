---
phase: 06-hardening-manual-physical-device-qa-release
plan: 03
type: release-notes
created: 2026-05-05
target_stores: [App Store Connect, Google Play Console]
target_version: 2.0.0
walk_disposition: pending  # flips to APPROVED after Plan 06 manual QA matrix
bug_fix_loop_triggered: pending  # flips after Plan 06 walk completes
walked_against_sha: pending  # flips after Plan 05 atomic bump
languages: [en, ru]
binding_length_limit: 500 chars per locale (Play Console)
asc_length_limit: 4000 chars per locale
paste_only: true
m1_template: .planning/milestones/v1.0.4-phases/08-release-and-store-submission/08-RELEASE-NOTES.md
---

# JayTap v2.0.0 — Release Notes

Bilingual draft for App Store Connect (per-locale "What's New in This Version") and
Google Play Console (per-language "Release notes" / "What's new"). Paste at submission
time in Plan 06-07; do not commit changes back from the ASC / Play Console UI into
this file (per M1 D-11 precedent — paste-only artifact, not preserved as in-app i18n).

Both bodies cover the same content in the same order: **What's new → Improvements →
Bug fixes**. The "Bug fixes" reduces to a single "minor refinements" line per M1 D-10
catch-all phrasing — specific fixes are NOT fabricated. If Plan 06's QA matrix walk
surfaces a release-blocking defect that should be called out, this file is updated
after that walk completes (the M1 v1.0.4 walk surfaced zero defects, so the closer
line was retained as-is; the same default applies here).

Each language body fits Google Play Console's binding 500-character-per-locale limit;
App Store Connect's 4000-character limit is non-binding for these notes.

---

## EN

What's new
- Listings are now reviewed before going public, so what you see is more trustworthy.
- Owners get a clearer status flow: Live, Pending, Rejected, or Archived — with a reason note when a listing is sent back for edits.

Improvements
- Stronger account security and sign-in checks.
- More reliable session handling — you stay signed in across the app.

Minor stability and polish refinements.

---

## RU

Что нового
- Объявления теперь проходят модерацию перед публикацией — то, что вы видите, надёжнее.
- У владельцев появился прозрачный статус: Опубликовано, На модерации, Отклонено, Снято с публикации — с причиной возврата на доработку.

Улучшения
- Усилена защита аккаунта и проверка входа.
- Сессии работают стабильнее — вы остаётесь в системе по всему приложению.

Мелкие исправления и шлифовка интерфейса.

---

## Submission instructions

For Plan 06-07 (archive + ASC / Play Console upload). Both stores render the pasted body
as plain text — no Markdown rendering — so the bullets above ship as-is, including the
leading `- ` prefix.

**App Store Connect (per-locale "What's New in This Version"):** App Store Connect →
JayTap → version 2.0.0 → "What's New in This Version". Default localization is English
(US): paste the EN body above (everything between `## EN` and `---`, excluding those
structural markers). Add the Russian (Russia) localization and paste the RU body.
Both fit comfortably under ASC's 4000-char-per-locale limit.

**Google Play Console (per-language "Release notes"):** Production track → Create new
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
| EN       | 403             | 500                      | YES   | 97       |
| RU       | 409             | 500                      | YES   | 91       |

Verification commands (re-runnable at paste time to confirm no drift):

```bash
# EN body
awk '/^## EN$/{flag=1; next} /^---$/{if(flag){flag=0}} flag' .planning/phases/06-hardening-manual-physical-device-qa-release/06-RELEASE-NOTES.md | sed '1{/^$/d;}' | sed '${/^$/d;}' | wc -m

# RU body
awk '/^## RU$/{flag=1; next} /^---$/{if(flag){flag=0}} flag' .planning/phases/06-hardening-manual-physical-device-qa-release/06-RELEASE-NOTES.md | sed '1{/^$/d;}' | sed '${/^$/d;}' | wc -m
```

If either count climbs over 500 after edits, trim per the priority listed in Step 1
of Plan 06-03's action block:
1. Drop the "Minor stability..." closer first.
2. Drop the second Improvements bullet.
3. Trim the descriptive tail of the longest What's new bullet.
Preserve EN ↔ RU parity (same content, same order, same number of bullets).

---

*Draft authored: 2026-05-05 (Plan 06-03, Wave 1 of Phase 6)*
*To be walked against build-identity SHA from Plan 06-05 (atomic v2.0.0 bump)*
*QA disposition pending — flips when Plan 06-06 closes*
*Per M1 D-11: paste-only artifact — not preserved as in-app i18n keys*
