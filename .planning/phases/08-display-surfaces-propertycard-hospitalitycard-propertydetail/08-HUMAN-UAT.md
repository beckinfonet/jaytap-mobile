---
status: partial
phase: 08-display-surfaces-propertycard-hospitalitycard-propertydetail
source: [08-VERIFICATION.md]
started: 2026-05-26T02:11:00Z
updated: 2026-05-26T02:11:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. PropertyCard residential — RU locale on physical device
expected: Column-stacked cell anatomy — icon top / numeric value middle / localized label ('Спальни' for apartments, 'Ванные' for baths). Falls back to '-' when value absent. Real backend data renders cleanly.
result: [pending]

### 2. HospitalityCard bathroomCount fragment — both states
expected: HospitalityCard meta line shows '4 Rooms · 2 Bathrooms · 8 Max Guests' when bathroomCount is present, and '4 Rooms · 8 Max Guests' (no orphan separator, no 'Bathrooms' fragment) when bathroomCount is absent. Truncation under `numberOfLines={1}` looks clean at narrow widths.
result: [pending]

### 3. PropertyDetailsScreen specs-row label flip (hospitality gate lifted)
expected: Residential listing (apartment/house) shows Beds | Baths | m² specs row with 'Bedrooms' / 'Спальни'. Hotel/hostel listing now shows the same specs row with 'Rooms' / 'Комнаты' on the Beds cell. No conflicting duplicate data visible.
result: [pending]

### 4. PropertyDetailsScreen office/commercial — Beds cell hidden
expected: Office/commercial detail page renders a 2-cell specs row: Baths and m² only. No 'Bedrooms: -' or 'Rooms: -' cell, no ghost whitespace, no layout artifact.
result: [pending]

### 5. RU locale end-to-end — no raw English on any new surface
expected: PropertyCard Beds = 'Спальни' / Baths = 'Ванные'. HospitalityCard bathrooms fragment = 'Ванные'. PropertyDetailsScreen residential Beds = 'Спальни', hospitality Beds = 'Комнаты', Baths = 'Ванные'. No raw English visible on any of the four surfaces.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
