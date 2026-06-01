---
phase: 16
slug: profile-reskin-user-grouped-rows-admin-mod-tile-dashboard
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-01
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x via `@testing-library/react-native` |
| **Config file** | `jest.config.js` (root) |
| **Quick run command** | `npm test -- --testPathPattern="ProfileScreen\|ProfileRow\|ProfileTile\|IdentityCard\|RoleBadge"` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | quick: ~3s · full: ~5–8s |

---

## Sampling Rate

- **After every task commit:** Run quick command (Phase 16 test pattern only)
- **After every plan wave:** Run full suite + `bash scripts/check-i18n-parity.sh`
- **Before `/gsd-verify-work`:** Full suite must be green; i18n parity must exit 0; KBD-02 grep must remain 0; `tsc --noEmit` must produce no new errors in changed files
- **Max feedback latency:** ~5 seconds (quick) / ~10 seconds (full)

---

## Per-Task Verification Map

> Filled in by the planner. Each PLAN.md task gets a row referencing its requirement (PROF-01 / PROF-02 / PROF-03) and the automated command that proves it.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 16-01-XX | 01 | 1 | PROF-01 / PROF-02 / PROF-03 | — | N/A (visual reskin, no auth/data surface) | unit | `npm test -- --testPathPattern="…"` | ❌ W0 | ⬜ pending |
| 16-02-XX | 02 | 2 | PROF-01 / PROF-02 / PROF-03 | — | N/A | unit + manual | `npm test -- --testPathPattern="ProfileScreen"` + on-device walk | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/screens/__tests__/ProfileScreen.test.tsx` — covers role gating (user layout when not admin/mod, admin layout when isAdmin, moderator layout when isModerator with Role Management hidden), all 9 nav handler call-throughs, landlord-banner gate
- [ ] `src/components/profile/__tests__/*.test.tsx` (only if planner extracts primitives) — covers ProfileRow / ProfileTile / IdentityCard / RoleBadge structural rendering
- [ ] No new framework install — existing jest + @testing-library/react-native infrastructure already in place

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| User layout renders correctly on physical device | PROF-01 | Visual reskin — token rendering, light/dark contrast, font weights, icon-chip sizing | iPhone 15 Pro Max + Moto G XT2513V × EN/RU × light/dark; tap each of the 4 row CTAs; verify chevrons + sub-labels + spacing |
| Admin/Mod layout renders correctly on physical device | PROF-02 | Visual reskin — tile geometry, badge contrast, role-pill styling, full-width Role Management tile | iPhone + Moto × EN/RU × light/dark; admin account first, then moderator account (verify Role Management hidden for moderator); tap each tile; verify Moderation Queue pendingCount badge displays + invalidates after seeding a pending listing |
| Landlord banner gate preserved | PROF-01 | Visual + behavioral parity with existing implementation | User account flagged with pending application: banner appears between identity card and ACTIVITY card; user account without application: no banner; admin account: no banner regardless |
| All 9 nav handlers fire | PROF-03 | Tap-through call-through proves App.tsx wiring unchanged | Click each: Account Settings → Settings screen; Favorites → Favorites; Appointments → Appointments; My Listings → My Listings; Create Listing → flow; Apply Landlord → flow (when applicable); Landlord Applications → admin queue (admin/mod); Moderation Queue → mod queue (admin/mod); Role Management → role mgmt (admin only) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s (full suite)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
