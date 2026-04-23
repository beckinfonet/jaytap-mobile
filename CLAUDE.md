# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## Project

**JayTap** — React Native 0.84 (New Architecture) real-estate app for Bishkek. iOS + Android. Brownfield.

**Core value:** Prospective renters and buyers can reliably browse, filter, and inquire about Bishkek properties on a phone without UI blockers.

## GSD Planning

This project uses **GSD (Get Shit Done)** for planned work. Artifacts live under `.planning/`:

| File | Purpose |
|------|---------|
| `.planning/PROJECT.md` | Living project context (core value, requirements, decisions, constraints) |
| `.planning/REQUIREMENTS.md` | REQ-IDs with v1 (M1) and v2 (M2) scope |
| `.planning/ROADMAP.md` | Phase structure — each phase maps to REQ-IDs |
| `.planning/STATE.md` | Project memory / current focus |
| `.planning/config.json` | GSD workflow config (mode, granularity, models) |
| `.planning/research/` | Project-level research (STACK, FEATURES, ARCHITECTURE, PITFALLS, SUMMARY) |
| `.planning/codebase/` | Codebase map (ARCHITECTURE, STACK, CONVENTIONS, STRUCTURE, INTEGRATIONS, CONCERNS, TESTING) |

**Always read these first** when starting work: `.planning/STATE.md` → `.planning/PROJECT.md` → the relevant phase's plan.

## Current Milestone

**M1 "Polish + Hospitality" (v1.0.4)** — ship ASAP to iOS App Store + Google Play.

Build order (all four research docs agree — load-bearing):

1. **Nav reliability** → 2. **Universal keyboard** → 3. **Role gating precursor** → 4. **Listing form taxonomy** → 5. **Listing form validation** → 6. **Hospitality rendering** → 7. **Alignment pass** → 8. **Release & submission**

Next action: `/gsd-plan-phase 1`

**M2 "Roles & Moderation"** is captured in `ROADMAP.md` for visibility but will be fully planned after M1 ships.

## Key Conventions (from `.planning/codebase/CONVENTIONS.md`)

- Navigation: **custom `App.tsx` state machine** — no `react-navigation`, no navigation library migration in scope
- State: React Context providers (`ThemeProvider` → `LanguageProvider` → `AuthProvider`), local `useState` for components
- HTTP: `axios` to Railway backend + Firebase Identity Toolkit REST
- i18n: EN + RU parity required for every new UI string (`src/locales/en.json`, `src/locales/ru.json`)
- Theme: use `useTheme()` tokens — no hardcoded colors; dark/light parity required
- Testing bar: manual physical-device QA for M1 (iOS + Android)

## Stack Decisions (from `.planning/research/STACK.md`)

- **Keyboard:** `react-native-keyboard-controller@1.21+` (requires `react-native-reanimated` peer — install gate)
- **Forms (if adopted):** `react-hook-form@7.73+` + `zod@^3.24` (NOT v4 — RHF/RN bug)
- **Roles (M1):** library-free `useRole()` hook + hardcoded email allowlist → swap to server-verified roles in M2

## Working with This Project

- For planned work: use `/gsd-*` commands (see `.planning/STATE.md` for status)
- For ad-hoc fixes: keep the three-category taxonomy and role-gating API shape intact — out-of-scope additions belong in `PROJECT.md` → `Out of Scope`
- Never rewrite navigation to `react-navigation` — explicitly out of scope
- Never add per-night pricing or booking calendars to Hospitality — explicitly out of scope (showcase-only by design)
