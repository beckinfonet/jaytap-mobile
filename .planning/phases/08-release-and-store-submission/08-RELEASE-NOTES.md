---
phase: 08-release-and-store-submission
plan: 04
type: release-notes
created: 2026-04-28
target_stores: [App Store Connect, Google Play Console]
target_version: 1.0.4
walk_disposition: APPROVED
bug_fix_loop_triggered: false
walked_against_sha: de4ff0a
languages: [en, ru]
binding_length_limit: 500 chars per locale (Play Console)
asc_length_limit: 4000 chars per locale
paste_only: true
---

# JayTap v1.0.4 — Release Notes

Bilingual draft for App Store Connect (per-locale "What's New in This Version") and Google Play Console (per-language "Release notes" / "What's new"). Paste at submission time in Plan 08-05; do not commit changes back from the ASC / Play Console UI into this file (per D-11, this is a paste-only artifact, not preserved as in-app i18n).

Both bodies cover the same content in the same order: **What's new → Improvements → Bug fixes**. The "Bug fixes" block reduces to a single "minor refinements" line because the D-08 regression QA loop in Plan 08-03 was NOT triggered (zero defects surfaced on either device; zero `999.x` deferrals filed). Specific fixes are NOT fabricated.

Each language body fits Google Play Console's binding 500-character-per-locale limit; App Store Connect's 4000-character limit is non-binding for these notes.

---

## EN

What's new
- Hospitality: Hostels and Hotels are now first-class, with tour-first cards and 3D tour discovery for places that offer a virtual walkthrough. Enquiries go straight to the host.

Improvements
- Forms keep your text visible above the keyboard on every screen.
- Bottom navigation responds reliably after closing any overlay.
- The new listing form adapts to the category — Residential, Commercial, or Hospitality.

Minor stability and polish refinements.

---

## RU

Что нового
- Раздел «Гостиничные»: хостелы и отели теперь отдельная категория с акцентом на 3D-туры и поиск объектов с виртуальной прогулкой. Заявки идут напрямую владельцу.

Улучшения
- Клавиатура больше не закрывает поля ввода ни на одном экране.
- Нижнее меню стабильно работает после закрытия любых наложений.
- Обновлённая форма объявления подстраивается под категорию: Жильё, Коммерческое или Гостиничные.

Мелкие исправления и шлифовка интерфейса.

---

## Submission instructions

For Plan 08-05 (archive + ASC / Play Console upload). Both stores render the pasted body as plain text — no Markdown rendering — so the bullets above ship as-is, including the leading `- ` prefix.

**App Store Connect (per-locale "What's New in This Version"):** App Store Connect → JayTap → version 1.0.4 → "What's New in This Version". Default localization is English (US): paste the EN body above (everything between `## EN` and `---`, excluding those structural markers). Add the Russian (Russia) localization and paste the RU body. Both fit comfortably under ASC's 4000-char-per-locale limit.

**Google Play Console (per-language "Release notes"):** Production track → Create new release → Release notes section → tap "Add language" or "Edit release notes per language". For `en-US` paste the EN body; for `ru-RU` paste the RU body. Both bodies are pre-trimmed to fit Play Console's 500-char-per-locale binding limit.

Do NOT include the `## EN` / `## RU` headings or the `---` separators when pasting — those are file-structure markers for this draft, not part of the user-facing notes.

---

## Character counts

Measured with `wc -m` (character count, not byte count — Play Console caps on characters). Both languages fit Play Console's 500-character-per-locale binding limit with headroom.

| Language | Body characters | Play Console limit (500) | Fits? | Headroom |
| -------- | --------------- | ------------------------ | ----- | -------- |
| EN       | 465             | 500                      | YES   | 35       |
| RU       | 454             | 500                      | YES   | 46       |

Verification commands (re-runnable at paste time to confirm no drift):

```bash
# EN body (everything between '## EN' and the next '---', excluding those markers + surrounding blank lines)
awk '/^## EN$/{flag=1; next} /^---$/{if(flag){flag=0}} flag' .planning/phases/08-release-and-store-submission/08-RELEASE-NOTES.md | sed '1{/^$/d;}' | sed '${/^$/d;}' | wc -m

# RU body (same shape, between '## RU' and the next '---')
awk '/^## RU$/{flag=1; next} /^---$/{if(flag){flag=0}} flag' .planning/phases/08-release-and-store-submission/08-RELEASE-NOTES.md | sed '1{/^$/d;}' | sed '${/^$/d;}' | wc -m
```

If either count climbs over 500 after edits, trim a bullet — the "minor refinements" closer is the first to drop, then the third Improvements bullet, then the descriptive tail of the What's new bullet. Preserve EN + RU parity (both bodies cover the same content in the same order).

---

*Draft authored: 2026-04-28 (Plan 08-04, Wave 3 of Phase 8)*
*Walked against build-identity SHA: `de4ff0a` (Plan 08-02 atomic v1.0.4 bump)*
*QA disposition: APPROVED (Plan 08-03, 136 walked PASS / 0 FAIL across iPhone 15 Pro Max / iOS 26.x + Moto G XT2513V / Android 16 Fabric)*
*Per D-11: paste-only artifact — not preserved as in-app i18n keys; not deployed to `src/locales/`*
