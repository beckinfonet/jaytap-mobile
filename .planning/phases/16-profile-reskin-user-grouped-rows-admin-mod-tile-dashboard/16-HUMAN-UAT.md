---
status: partial
phase: 16-profile-reskin-user-grouped-rows-admin-mod-tile-dashboard
source: [16-VERIFICATION.md]
started: 2026-05-31T00:00:00Z
updated: 2026-05-31T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Golden-path cell 1 — iPhone 15 Pro Max × Light × EN × Regular user
expected: IdentityCard renders avatar circle + email + accent-soft 'Account settings ›' pill. ACTIVITY card has Favorites + Appointments rows with 38px chips + chevrons + sub-labels. HOSTING card has My Listings row. Create Listing accent-pink row renders. OutlinedLogoutPill centered at bottom. All 6 navigation taps route correctly (Account Settings, Favorites, Appointments, My Listings, Create Listing, Log Out → Alert with Cancel returning + confirming dismissing back).
result: [pending]

### 2. Golden-path cell 2 — iPhone 15 Pro Max × Dark × RU × Admin
expected: IdentityCard has 'АДМИН' accent-soft pill with Shield icon below name. MY ACTIVITY 2x2 grid with 4 tiles (4th 'Создать объявление' is accent-pink filled). ADMIN TOOLS section label with 'ПЕРСОНАЛ' pill on the right. 3 tool tiles (Landlord Apps, Moderation Queue with pendingCount badge if any pending, Role Management). Role Management tile is FULL-WIDTH (not half-width with empty space). Each of the 9 handler taps routes correctly.
result: [pending]

### 3. Golden-path cell 3 — Moto G XT2513V × Light × EN × Moderator
expected: IdentityCard has 'MODERATOR' accent-soft pill. ADMIN TOOLS has ONLY 2 tiles (Landlord Apps + Moderation Queue — NO Role Management). 2-tile grid is clean half-width tiles each (no full-width override fires for even-count). Moderation Queue pendingCount badge renders if any pending listings exist.
result: [pending]

### 4. Golden-path cell 4 — Moto G XT2513V × Dark × RU × Regular user
expected: All visual primitives in Russian. LandlordApplicationStatusBanner renders correctly with the green-tinted Phase 12 landlordGreen token (#35c98f) for approved state, warning token for submitted, destructiveRed for rejected. Banner self-suppresses when signed in as admin/moderator (regression check). OutlinedLogoutPill has clear contrast against dark background.
result: [pending]

### 5. Sampling cell — A.1.E.m (iPhone × Light × EN × Moderator) — Pitfall 5 contrast
expected: Light-mode 'MODERATOR' role-pill text is readable against the accent-soft (rgba accent at 16% opacity) background. If illegible, falls back to colors.text foreground per planner discretion at QA time. Visually confirm legibility.
result: [pending]

### 6. Sampling cell — A.1.E.a (iPhone × Light × EN × Admin) — Role Management wide tile
expected: When admin shows 3 admin tools, the 3rd (Role Management) renders width:'100%' (full row), with the gap visually consistent above and below. This is the D-05 odd-tile-wide rule that survived 2 milestones of plan-checker scrutiny.
result: [pending]

### 7. Sampling cell — B.1.R.a (Moto × Light × RU × Admin) — Cyrillic admin tools
expected: Russian admin-tools labels ('Заявки арендодателей', 'Очередь модерации', 'Управление ролями') fit inside tile geometry without truncation/clipping. Sub-labels ('Ожидают проверки', 'Объявления на проверку', 'Персонал и права') fit on a single line at 12pt.
result: [pending]

### 8. Sampling cell — A.2.E.u (iPhone × Dark × EN × User) — accent-pink Create Listing row
expected: Create Listing row renders with M6 pink (#ff5a6f) background fill, white onAccent foreground for icon/title, semi-transparent white rgba(255,255,255,0.85) for sub. ChevronRight is onAccent. Tappable area is the full row (38px+gap+title region). No iOS-blue residual (Pitfall 1).
result: [pending]

### 9. AppState cooldown ref behavior (Pitfall 3)
expected: Sign into a moderator account. Background the app for >60s, return to ProfileScreen. Moderation Queue pendingCount badge SHOULD refresh once (one network call to /properties/moderation-count). Do NOT see multiple rapid calls (cooldown broken) or stale count (listener broken). Wait <60s and return → NO refresh fires (cooldown blocks).
result: [pending]

### 10. Logout flow end-to-end
expected: Tap Log Out outlined pill → Alert with two buttons (localized Cancel + Log Out). Tap Log Out → logout(true) fires silent path (no D-11 'Session expired' toast) → onBack() returns to home. Tap Cancel → Alert dismisses, no state change.
result: [pending]

### 11. Landlord application banner — applicable user state
expected: Sign into a user account WITH a pending landlord application. Banner appears between IdentityCard and ACTIVITY card with the appropriate Phase 12 palette accent (submitted=warning yellow, approved=landlordGreen, rejected=destructiveRed). Tap banner → routes to LandlordApplicationScreen.
result: [pending]

### 12. Pre-existing test failures regression check
expected: Run `npx jest -x` full suite. 8 pre-existing failures remain in src/hooks/__tests__/useRole.test.ts (1), src/services/__tests__/PropertyService.test.ts (2), src/components/__tests__/PropertyCard.test.tsx (5). None caused by Phase 16. Verified by stash-and-rerun per deferred-items.md. Confirm no NEW regression introduced by the rewrite.
result: [pending]

## Summary

total: 12
passed: 0
issues: 0
pending: 12
skipped: 0
blocked: 0

## Gaps
