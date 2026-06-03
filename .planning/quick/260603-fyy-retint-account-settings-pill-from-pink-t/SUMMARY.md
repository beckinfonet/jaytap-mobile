---
quick_id: 260603-fyy
slug: retint-account-settings-pill-from-pink-t
date: 2026-06-03
status: complete
commit: PENDING
---

# Summary: Retint the "Account Settings" pill from pink to landlord-green

## Request

On My Profile, the "Account Settings ›" pill in the identity card used the brand
pink (`colors.accent`). User wants it to match the teal/green left-accent of the
"You're a Landlord ✓" banner.

## Where the green comes from

`LandlordApplicationStatusBanner.tsx:109` — the approved ("You're a Landlord")
state uses `accent = colors.landlordGreen` (`#35c98f`).

## Change

- `src/theme/colors.ts` — added `landlordGreenSoft: 'rgba(53,201,143,0.16)'` to
  `MODE_INDEPENDENT_PALETTE` (mirrors the `accent → accentSoft` pair; identical in
  light + dark by construction). `#35c98f` = rgb(53,201,143) at 0.16 alpha.
- `src/components/profile/IdentityCard.tsx` — the pill now uses
  `backgroundColor: colors.landlordGreenSoft` + text `color: colors.landlordGreen`
  (was `accentSoft` / `accent`).
- `src/components/profile/__tests__/IdentityCard.test.tsx` — added the two green
  tokens to the mocked theme colors.

Only the pill changed. The back arrow and other accent surfaces stay brand pink.

## Verification

- `tsc --noEmit`: 0 errors in touched files (baseline 17 elsewhere preserved).
- `jest IdentityCard.test.tsx`: 3/3.
- No new deps, no i18n changes; new token is mode-independent (light/dark parity by
  construction via the shared palette spread).

## Pending USER on-device QA

- My Profile: "Account Settings ›" pill now renders green (`#35c98f`) on a soft
  green fill, matching the landlord banner accent; light + dark.
