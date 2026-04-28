---
phase: 07-alignment-pass
plan: 01
type: execute
wave: 1
screen: PropertyDetailsScreen
mode: retro
depends_on: []
files_modified:
  - src/screens/PropertyDetailsScreen.tsx
  - src/utils/formatPrice.ts
autonomous: true
requirements: [ALIGN-01, ALIGN-02]
requirements_addressed: [ALIGN-01, ALIGN-02]
tags: [screen, detail, alignment, hospitality-dark, retro-plan]

must_haves:
  truths:
    - "Address text in the listingInfoCard truncates within the card's right padding on smallest supported iPhone width — no visual ellipsis past the card boundary (Issue 1, ALIGN-01)"
    - "Amenity feature cells in the non-Hospitality features grid render with icon and first text line on a single baseline regardless of whether the label wraps; long labels truncate with ellipsis instead of wrapping to multiple lines (Issue 2, ALIGN-01)"
    - "USD prices render as `$<amount>` (symbol prefix, no space, no `USD` ISO code) — never `$USD <amount>` — across PropertyDetailsScreen sticky bottom price bar, PropertyCard, and PropertyMap (Issue 3, ALIGN-01)"
    - "All three fixes use existing `useTheme()` color tokens only — no new hardcoded colors introduced (ALIGN-02)"
    - "Dark and light modes both render the three fixed surfaces correctly — verified per D-08 cadence (geometry-only fixes for Issues 1+2 walked single-mode; formatPrice text-only fix is mode-agnostic) and confirmed at phase-exit cross-device sweep (D-07)"
    - "EN+RU label parity preserved on the touched surfaces — no UI strings added or modified by these fixes"
    - "PropertyCard renders zero visual diff on the address row and amenity grid (Phase 6 D-07 / Pitfall 7 invariant — Issues 1+2 fixes are confined to PropertyDetailsScreen.tsx)"
    - "check-role-grep.sh exits 0 — no new inline `userType === 'admin'` introduced"
    - "check-i18n-parity.sh exits 0 — no parity regression"
  artifacts:
    - path: "src/screens/PropertyDetailsScreen.tsx"
      provides: "Address-row truncation fix (Issue 1) at the addressRow render site, and amenity-cell first-line baseline alignment (Issue 2) in the non-Hospitality features grid + featureItemText style"
      contains: "ellipsizeMode=\"tail\""
    - path: "src/utils/formatPrice.ts"
      provides: "Single-label USD output (`$<amount>`) replacing the prior `$USD <amount>` double-label (Issue 3)"
      contains: "priceDisplay = `$${formattedNumber}`"
  key_links:
    - from: "src/screens/PropertyDetailsScreen.tsx (addressRow at :592-597)"
      to: "src/screens/PropertyDetailsScreen.tsx (styles.address at :1227)"
      via: "inline `flex: 1` on the address Text + numberOfLines={1} + ellipsizeMode=\"tail\""
      pattern: "ellipsizeMode=\"tail\""
    - from: "src/screens/PropertyDetailsScreen.tsx (non-Hospitality features.map at :669-679)"
      to: "src/screens/PropertyDetailsScreen.tsx (styles.featureItemText at :1355-1359)"
      via: "numberOfLines={1} + ellipsizeMode=\"tail\" on Text + flex/lineHeight on style — matches Hospitality branch's existing single-line treatment"
      pattern: "lineHeight: 20"
    - from: "src/screens/PropertyDetailsScreen.tsx (sticky bottom price bar at :823) + src/components/PropertyCard.tsx + src/components/PropertyMap.tsx"
      to: "src/utils/formatPrice.ts"
      via: "formatPrice(property, t('property.perMonth')) call — fix lands in shared utility, all three callers benefit"
      pattern: "priceDisplay = `\\$\\$\\{formattedNumber\\}`"

shipped_commits:
  - hash: cd181da
    issue: 1
    summary: "fix(07): address row truncates within card padding (Issue 1)"
  - hash: 575212d
    issue: 2
    summary: "fix(07): amenity cell icon aligns to first text line (Issue 2)"
  - hash: a8d6dd7
    issue: 3
    summary: "fix(07): drop \"USD\" alongside \"$\" in formatPrice (Issue 3)"
---

<objective>
Retroactive PLAN for Phase 7 screen 01 (`PropertyDetailsScreen`, hospitality-dark variant). Captures the three user-flagged alignment issues from `07-01-property-details-ISSUES.md` (Issue 1: address row overflow; Issue 2: amenity cell first-line misalignment; Issue 3: `$USD` currency-symbol duplication) and the fixes that have already shipped as commits `cd181da`, `575212d`, `a8d6dd7`.

This PLAN is generated AFTER implementation in accordance with CONTEXT.md D-01 (per-screen PLAN as the persistent record) — the chat-described issues were captured into `07-01-property-details-ISSUES.md` first, fixed in three atomic commits per D-02, and folded into this PLAN at planning time. Tasks 1–3 document already-shipped work with grep-verifiable acceptance criteria so the retro-PLAN reads as the canonical source of truth for what was changed and why. Task 4 is the remaining open work: the per-screen device walk (D-06) closing the screen-PLAN.

The phase-exit cross-device sweep (D-07, OTHER device + both modes) is owned by a phase-level matrix file (`07-QA-MATRIX.md`) and is NOT in this plan's scope — that gates phase exit, not this individual screen-PLAN.

Output: 2 files modified (already on `main`); per-screen device walk pending.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/phases/07-alignment-pass/07-CONTEXT.md
@.planning/phases/07-alignment-pass/07-01-property-details-ISSUES.md
@.planning/phases/07-alignment-pass/screenshots/property-details-hospitality-dark-address-overflow.jpg
@.planning/phases/07-alignment-pass/screenshots/property-details-hospitality-dark-amenity-misalign.jpg
@src/screens/PropertyDetailsScreen.tsx
@src/utils/formatPrice.ts

<interfaces>
**Address row** (`PropertyDetailsScreen.tsx:592-597`) — the `View style={styles.addressRow}` containing `<MapPin size={16}>` + `<Text style={styles.address}>{property.address}</Text>`. Resides inside `listingInfoCard` (the card with title + ID line). Pre-fix: the address Text had `numberOfLines={1}` but no `flex: 1`, so its intrinsic content width could exceed the parent and the ellipsis rendered visually outside the card's right padding on smaller iPhones.

**Non-Hospitality features grid** (`PropertyDetailsScreen.tsx:665-680`) — the `else` branch of the `isHospitality ? : ` ternary at the section "Что предлагает это место" (`property.whatThisPlaceOffers`). Renders `property.features.map(...)` into `<View style={styles.featuresGrid}>` with each cell as `<View style={styles.featureItem}>` containing `<IconComponent size={20}>` + `<Text style={styles.featureItemText}>`. Pre-fix: the Text had no `numberOfLines` cap, so long labels (e.g., "Хороший персонал") wrapped to two lines while sibling cells stayed single-line, breaking baseline alignment across the grid. The Hospitality branch at `:635-661` already used `numberOfLines={1}` on its amenity chips — this fix mirrors that treatment.

**Sticky bottom price bar** (`PropertyDetailsScreen.tsx:823`) — `<Text style={styles.footerPrice}>{formatPrice(property, t('property.perMonth'))}</Text>`. Pre-fix: `formatPrice` produced `"$USD 1,399"` for USD listings (per its JSDoc) — both symbol AND ISO code emitted. Same utility is also called from `PropertyCard.tsx:63,169` and `PropertyMap.tsx:63`, so the fix in the shared util benefits all three surfaces with a single change.

**Hospitality variants are unaffected** — Hospitality detail (the original screenshot intent) omits the price block entirely per Phase 6 D-15, so Issue 3's fix only manifests on Residential/Commercial listings. Issue 3 was flagged on a listing whose `propertyType` is stored as `"Apartment"` (data-entry error in Aruhostel — see ISSUES.md root-cause update 2026-04-28); the formatter bug is universal across the Residential/Commercial pool, so the fix is in scope independent of any data correction.

**Theme & spacing discipline (ALIGN-02)** — the three fixes touch only:
- inline `flex: 1` on the address Text (geometry, no color)
- inline `numberOfLines` + `ellipsizeMode` on amenity Text (text-flow, no color)
- new `flex: 1` + `lineHeight: 20` keys on `styles.featureItemText` (geometry only)
- `formatPrice` output string composition (no React, no styling)

No new hardcoded colors; no new spacing scale step; no new theme token. Token Escalation policy did not trigger.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false" status="shipped" commit="cd181da">
  <name>Task 1: Address row truncates within card padding (Issue 1)</name>
  <files>src/screens/PropertyDetailsScreen.tsx</files>
  <read_first>
    - src/screens/PropertyDetailsScreen.tsx (focus: addressRow render at :592-597; styles.addressRow at :1216; styles.address at :1227)
    - .planning/phases/07-alignment-pass/07-01-property-details-ISSUES.md § Issue 1
    - .planning/phases/07-alignment-pass/screenshots/property-details-hospitality-dark-address-overflow.jpg (green-circle annotation, right edge of address row)
  </read_first>
  <behavior>
    - Address Text inside `addressRow` truncates against the card's right padding instead of overflowing the card boundary
    - `numberOfLines={1}` is preserved (already present pre-fix); `ellipsizeMode="tail"` is added for explicit ellipsis-on-overflow contract
    - `flex: 1` is added inline so the Text honors its parent row's bounded width before applying truncation
    - Sibling `<MapPin>` icon is unchanged (`marginRight: 6` wrapper preserved)
    - styles.address (in StyleSheet) is unchanged — fix is inline-only on the Text element to keep blast radius minimal
  </behavior>
  <action>
    At `src/screens/PropertyDetailsScreen.tsx:596`, change the address `Text` JSX from:

    ```tsx
    <Text style={[styles.address, { color: colors.textSecondary }]} numberOfLines={1}>{property.address}</Text>
    ```

    to:

    ```tsx
    <Text style={[styles.address, { color: colors.textSecondary, flex: 1 }]} numberOfLines={1} ellipsizeMode="tail">{property.address}</Text>
    ```

    Do NOT:
    - Modify `styles.address` or `styles.addressRow` in the StyleSheet (no shared-style impact)
    - Touch the `<MapPin>` icon or its `marginRight: 6` wrapper
    - Apply this fix anywhere else in the file (PropertyCard / list-cell address rows are out of scope — Phase 6 D-07 zero-diff invariant)

    Commit: `fix(07): address row truncates within card padding (Issue 1)`.
  </action>
  <verify>
    <automated>grep -q 'flex: 1 \}\] numberOfLines={1} ellipsizeMode="tail">{property.address}' src/screens/PropertyDetailsScreen.tsx &amp;&amp; ./scripts/check-role-grep.sh &amp;&amp; ./scripts/check-i18n-parity.sh</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c 'ellipsizeMode="tail">{property.address}' src/screens/PropertyDetailsScreen.tsx` returns `1`
    - `grep -F -c 'flex: 1 }]} numberOfLines={1} ellipsizeMode="tail">{property.address}' src/screens/PropertyDetailsScreen.tsx` returns `1`
    - `git log --oneline -- src/screens/PropertyDetailsScreen.tsx | grep -c 'cd181da'` returns `1` (the shipping commit is reachable from HEAD)
    - Zero diff in `src/components/PropertyCard.tsx` for this issue's fix: `git show cd181da -- src/components/PropertyCard.tsx | wc -l` returns `0`
    - `./scripts/check-role-grep.sh` exits 0
    - `./scripts/check-i18n-parity.sh` exits 0
  </acceptance_criteria>
  <done>
    Shipped at `cd181da` on 2026-04-28. Address row truncates within `listingInfoCard`'s right padding on the flagged smaller-iPhone width. Verified at the per-screen walk (Task 4) before phase-exit sweep.
  </done>
</task>

<task type="auto" tdd="false" status="shipped" commit="575212d">
  <name>Task 2: Amenity cell icon aligns to first text line (Issue 2)</name>
  <files>src/screens/PropertyDetailsScreen.tsx</files>
  <read_first>
    - src/screens/PropertyDetailsScreen.tsx (focus: non-Hospitality features.map render at :665-680; Hospitality branch at :635-661 for parity reference; styles.featureItem and styles.featureItemText at :1349-1359)
    - .planning/phases/07-alignment-pass/07-01-property-details-ISSUES.md § Issue 2
    - .planning/phases/07-alignment-pass/screenshots/property-details-hospitality-dark-amenity-misalign.jpg (green-circle annotation, "Хороший персонал" cell)
  </read_first>
  <behavior>
    - Non-Hospitality features grid (the `else` branch at `:665-680`) adopts `numberOfLines={1}` + `ellipsizeMode="tail"` on the feature Text — matches the Hospitality branch's existing single-line treatment for visual parity
    - `styles.featureItemText` gains `flex: 1` so the Text fills the row remainder before truncating, and `lineHeight: 20` so the first text line's vertical center aligns with the 20×20 icon center across both branches (hardens alignment for cells that were already single-line, too)
    - Existing `styles.featureItem` row layout (icon + text on a single baseline) is preserved
    - The 20px icon size on `<IconComponent>` is unchanged — fix is purely on the Text side
  </behavior>
  <action>
    At `src/screens/PropertyDetailsScreen.tsx:672`, change the feature Text JSX from:

    ```tsx
    <Text style={[styles.featureItemText, { color: colors.text }]}>{feature}</Text>
    ```

    to:

    ```tsx
    <Text
      style={[styles.featureItemText, { color: colors.text }]}
      numberOfLines={1}
      ellipsizeMode="tail"
    >
      {feature}
    </Text>
    ```

    At `src/screens/PropertyDetailsScreen.tsx:1355-1359`, extend the `featureItemText` StyleSheet entry from:

    ```ts
    featureItemText: {
      fontSize: 15,
      marginLeft: 12,
    },
    ```

    to:

    ```ts
    featureItemText: {
      flex: 1,
      fontSize: 15,
      lineHeight: 20,
      marginLeft: 12,
    },
    ```

    Do NOT:
    - Modify the Hospitality branch at `:635-661` (it already had `numberOfLines={1}` at `:650`)
    - Modify `styles.featureItem` (the row-level icon+text layout)
    - Touch `getFeatureIcon` or `IconComponent` rendering
    - Introduce a new theme token or new spacing scale step (ALIGN-02)

    Commit: `fix(07): amenity cell icon aligns to first text line (Issue 2)`.
  </action>
  <verify>
    <automated>grep -q 'numberOfLines={1}\s*$' src/screens/PropertyDetailsScreen.tsx &amp;&amp; grep -A3 'featureItemText: {' src/screens/PropertyDetailsScreen.tsx | grep -q 'flex: 1' &amp;&amp; grep -A4 'featureItemText: {' src/screens/PropertyDetailsScreen.tsx | grep -q 'lineHeight: 20' &amp;&amp; ./scripts/check-role-grep.sh</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c 'numberOfLines={1}' src/screens/PropertyDetailsScreen.tsx` returns at least `2` (the Issue-2 addition + the pre-existing Hospitality-branch occurrence at `:650`; baseline pre-fix was 1)
    - `grep -c 'ellipsizeMode="tail"' src/screens/PropertyDetailsScreen.tsx` returns at least `2` (Issue-1 address Text + Issue-2 feature Text)
    - `awk '/featureItemText: \{/{p=1} p; p && /^[[:space:]]*\},/{exit}' src/screens/PropertyDetailsScreen.tsx | grep -c 'flex: 1'` returns `1`
    - `awk '/featureItemText: \{/{p=1} p; p && /^[[:space:]]*\},/{exit}' src/screens/PropertyDetailsScreen.tsx | grep -c 'lineHeight: 20'` returns `1`
    - `git log --oneline -- src/screens/PropertyDetailsScreen.tsx | grep -c '575212d'` returns `1`
    - Zero diff in `src/components/PropertyCard.tsx` for this issue's fix: `git show 575212d -- src/components/PropertyCard.tsx | wc -l` returns `0`
    - `./scripts/check-role-grep.sh` exits 0
  </acceptance_criteria>
  <done>
    Shipped at `575212d` on 2026-04-28. Non-Hospitality features grid now matches Hospitality branch's single-line treatment; long labels truncate, and the icon+first-line baseline alignment holds whether the label fits or truncates. Verified at the per-screen walk (Task 4).
  </done>
</task>

<task type="auto" tdd="false" status="shipped" commit="a8d6dd7">
  <name>Task 3: Drop "USD" alongside "$" in formatPrice (Issue 3)</name>
  <files>src/utils/formatPrice.ts</files>
  <read_first>
    - src/utils/formatPrice.ts (full file — 26 LOC pre-fix, 24 LOC post-fix)
    - src/screens/PropertyDetailsScreen.tsx (sticky bottom price bar caller at :823 — verifies the fix flows to the user-flagged surface)
    - src/components/PropertyCard.tsx (formatPrice callers at :63 and :169 — same fix benefits the list cell)
    - src/components/PropertyMap.tsx (formatPrice caller at :63 — same fix benefits map pins)
    - .planning/phases/07-alignment-pass/07-01-property-details-ISSUES.md § Issue 3 (full Disposition update 2026-04-28)
  </read_first>
  <behavior>
    - USD listings (currency literal `'$'`, `'usd'`, or empty/missing) render as `$<formattedNumber>` — symbol prefix, no space, no `USD` ISO code
    - KGS listings (currency `'сом'`, `'som'`, or `'kgs'`) keep the existing `<formattedNumber> сом` suffix-form treatment
    - Any other currency falls through to `<formattedNumber> <currency>` suffix form (preserves the pre-fix unknown-currency behavior with the trimmed original-case currency string)
    - The `/mo` (or `t('property.perMonth')`) monthly suffix is appended unchanged when `p.period === 'month'` and the price string does not already include `/` or `мес`
    - JSDoc on `formatPrice` is updated from `"$USD 1,399"` to `"$1,399"` to match the new contract
    - Function signature `formatPrice(p: Property, monthlySuffix: string = '/mo'): string` is unchanged — caller-side at PropertyDetailsScreen, PropertyCard, PropertyMap is unaffected
    - Hospitality detail still omits the price block entirely per Phase 6 D-15 — this fix only manifests on Residential/Commercial listings
  </behavior>
  <action>
    Rewrite the body of `src/utils/formatPrice.ts` (lines 5–24 pre-fix). Update the JSDoc and replace the prior `currencyLabel`-then-compose pattern with a single `priceDisplay` switch:

    ```ts
    /**
     * Formats a property price with currency:
     * - USD (and default): "$1,399" (symbol prefix, no space) + monthly suffix when applicable
     * - Other currencies: "1,399 сом" (amount first, then currency) + suffix
     */
    export function formatPrice(p: Property, monthlySuffix: string = '/mo'): string {
      const numPrice = typeof p.price === 'number' ? p.price : parseFloat(String(p.price).replace(/,/g, '')) || 0;
      const formattedNumber = Number.isFinite(numPrice) ? numPrice.toLocaleString() : String(p.price);
      const currency = (p.currency || '').trim().toLowerCase();

      let priceDisplay: string;
      if (currency === '$' || currency === 'usd' || currency === '') {
        priceDisplay = `$${formattedNumber}`;
      } else if (currency === 'сом' || currency === 'som' || currency === 'kgs') {
        priceDisplay = `${formattedNumber} сом`;
      } else {
        priceDisplay = `${formattedNumber} ${(p.currency || '').trim()}`;
      }
      if (p.period === 'month' && !priceDisplay.includes('/') && !priceDisplay.includes('мес')) {
        priceDisplay += monthlySuffix;
      }
      return priceDisplay;
    }
    ```

    Do NOT:
    - Change the function name, signature, or default monthlySuffix
    - Add a new `formatCurrencySymbol` helper or split the function — the inline switch is small enough to remain a single-purpose utility
    - Touch any caller (PropertyDetailsScreen, PropertyCard, PropertyMap) — the fix is local to `formatPrice`
    - Introduce a new locale key or i18n string for the symbol — `$` is a literal, ALIGN-02 unaffected

    Commit: `fix(07): drop "USD" alongside "$" in formatPrice (Issue 3)`.
  </action>
  <verify>
    <automated>! grep -q '"\$USD"' src/utils/formatPrice.ts &amp;&amp; ! grep -q "currencyLabel" src/utils/formatPrice.ts &amp;&amp; grep -q 'priceDisplay = `\$\${formattedNumber}`' src/utils/formatPrice.ts &amp;&amp; grep -q 'priceDisplay = `\${formattedNumber} сом`' src/utils/formatPrice.ts &amp;&amp; ./scripts/check-role-grep.sh &amp;&amp; ./scripts/check-i18n-parity.sh</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c '"\$USD"' src/utils/formatPrice.ts` returns `0` — the literal output `"$USD"` is removed from runtime code
    - `grep -c 'currencyLabel' src/utils/formatPrice.ts` returns `0` — the prior intermediate variable is gone
    - `grep -c 'priceDisplay = \`\$\${formattedNumber}\`' src/utils/formatPrice.ts` returns `1` — the USD branch produces `$<amount>`
    - `grep -c 'priceDisplay = \`\${formattedNumber} сом\`' src/utils/formatPrice.ts` returns `1` — the KGS branch is preserved as suffix-form
    - `grep -c 'USD (and default): "\$1,399"' src/utils/formatPrice.ts` returns `1` — JSDoc reflects the new contract
    - `git log --oneline -- src/utils/formatPrice.ts | grep -c 'a8d6dd7'` returns `1`
    - Zero new caller-side diff: `git show a8d6dd7 -- src/screens/PropertyDetailsScreen.tsx src/components/PropertyCard.tsx src/components/PropertyMap.tsx | wc -l` returns `0`
    - `./scripts/check-role-grep.sh` exits 0
    - `./scripts/check-i18n-parity.sh` exits 0
  </acceptance_criteria>
  <done>
    Shipped at `a8d6dd7` on 2026-04-28. USD prices now render as `$<amount>` across the sticky bottom price bar (PropertyDetailsScreen), the listing card (PropertyCard), and the map pin callouts (PropertyMap) — single-label output, symmetric with the existing KGS suffix-form treatment. Verified at the per-screen walk (Task 4).
  </done>
</task>

<task type="manual" tdd="false" status="pending">
  <name>Task 4: Per-screen device walk on PropertyDetailsScreen (D-06 / D-08)</name>
  <files></files>
  <read_first>
    - .planning/phases/07-alignment-pass/07-CONTEXT.md § D-06 (per screen-PLAN walk closes the PLAN), § D-07 (whichever device is in hand), § D-08 (dark/light cadence heuristic)
    - .planning/phases/07-alignment-pass/07-01-property-details-ISSUES.md (the three issues + screenshots used as the diff target)
    - .planning/phases/06-hospitality-rendering/06-QA-MATRIX.md (precedent shape — row-per-cell, dev/walked/notes columns)
  </read_first>
  <behavior>
    - User walks PropertyDetailsScreen on whichever physical device is in hand (iPhone 15 Pro / iOS 26 OR Moto G XT2513V / Android 16 Fabric — D-07)
    - Three issues are checked against their screenshots: (1) address row truncates within `listingInfoCard` padding on a small-iPhone-width Residential listing, (2) amenity-cell first-line baseline alignment holds across single-line and wrapping labels in the non-Hospitality features grid, (3) USD listing shows `$<amount>` in the sticky bottom price bar (no `USD` ISO code)
    - Per D-08: Issues 1 and 2 are geometry-only fixes — single-mode walk is acceptable. Issue 3 is text-only — mode-agnostic, single-mode walk is acceptable. Cross-device + dark/light parity is then gated by the phase-exit sweep (D-07), tracked in `07-QA-MATRIX.md`
    - If the walk surfaces a regression on any of the three fixes: D-09 surgical-patch loop applies — open a fix-on-fix commit, re-walk only the failing surface, do NOT close this PLAN until the matrix is clean
    - Adjacent issues noticed during the walk that were NOT in the original screenshot batch are surfaced in chat per D-05 — user decides fold-in / defer / ignore on the spot. Folded items get a new PLAN entry; deferred items go to `<deferred>` below
  </behavior>
  <action>
    Run the screen-PLAN walk on the device in hand. Suggested sequence:

    1. **Issue 1 — address overflow.** Navigate to a Residential listing with a long address (e.g., the Aruhostel listing flagged in the screenshot — `propertyType: "Apartment"` per ISSUES.md). Confirm the address text truncates at the card's right padding boundary, with the ellipsis (`…`) fully INSIDE the `listingInfoCard`. The MapPin icon stays at its existing left position with `marginRight: 6` to the Text.

    2. **Issue 2 — amenity baseline.** Scroll to "Что предлагает это место" (RU) or "What this place offers" (EN). Confirm every cell renders icon + text on a single baseline. Long labels (e.g., "Хороший персонал") truncate with an ellipsis instead of wrapping. Cell heights are uniform across the grid.

    3. **Issue 3 — currency.** Confirm the sticky bottom price bar renders `$<amount>/мес` (RU) or `$<amount>/mo` (EN) for a USD listing — no `USD` substring anywhere in the price string. Spot-check a KGS listing too: it should still render `<amount> сом/мес` (suffix form, unchanged).

    4. **Adjacent-issue scan.** Quick eye-pass on the rest of the detail screen for anything visibly off that was NOT in the original screenshot batch. Surface findings in chat per D-05.

    5. **Recovery if a check fails.** Per D-09: surgical patch + re-walk only the failing surface. Do NOT replan unless the failure reveals a structural plan defect (e.g., the fix needs a new theme token after all → escalate per Token Escalation).

    On clean walk, close this PLAN by writing the SUMMARY.md and recording the walk outcome in `07-QA-MATRIX.md` (or the phase-exit matrix file when it is created — see `07-QA-MATRIX.md` scaffold task at phase level).
  </action>
  <verify>
    <manual>
      - Walk completed on physical device (iPhone 15 Pro OR Moto G XT2513V) — note device model in the SUMMARY
      - All three issues confirmed visually fixed against their screenshots
      - No adjacent issue blocks PLAN closure (deferred items captured in `<deferred>` below)
      - `07-QA-MATRIX.md` row(s) for PropertyDetailsScreen × walked-device × walked-mode marked PASS (or scaffold the matrix at phase level if it doesn't exist yet)
    </manual>
  </verify>
  <acceptance_criteria>
    - User confirms in chat: "PropertyDetailsScreen walked on {device}, {mode} — all 3 issues clean" (or equivalent)
    - SUMMARY.md is written for `07-01-property-details-PLAN.md` and committed
    - `07-QA-MATRIX.md` exists at the phase level (if not yet created, this PLAN's closure triggers its scaffold) with at least one row covering PropertyDetailsScreen on the walked device + mode
    - No fix-on-fix commit pending against any of the three shipped commits (`cd181da`, `575212d`, `a8d6dd7`)
  </acceptance_criteria>
  <done>
    Per-screen walk passes; PLAN closes; phase-exit cross-device sweep (D-07) becomes the next gate before phase exit. The walk happens against whichever device is in the user's hand at the time — the OTHER device is covered by the phase-exit sweep, not this PLAN.
  </done>
</task>

</tasks>

<deferred>
Items surfaced during issue capture / fix work that are NOT folded into this PLAN, captured here so they're not lost (per CONTEXT.md D-05):

- **Aruhostel `propertyType` data correction** — the listing's stored `propertyType` is `"Apartment"` (data-entry error), causing it to render via the Residential code path instead of Hospitality. Out of scope for Phase 7 code fixes (per ISSUES.md root-cause update 2026-04-28); user corrects via in-app edit. Captured here to acknowledge that Hospitality variants of these surfaces (which are unaffected by Issues 1–3 the way they manifested) are intentionally NOT being walked under the Hospitality code path in this PLAN.

- **Listing-form mismatch validation** (post-M1 / M2 candidate) — surface a warning when a listing's title contains "hostel" / "hotel" but its `propertyType` is set to something else (e.g., `"Apartment"`). Routes to backlog alongside role-gating M2 work — NOT a Phase 7 deliverable.

- **Phase 4 grandfathered hex literals at `MediaSection.tsx:163,315,328`** — Phase 7 was named as the venue for these, but no MediaSection screenshot was captured in this batch. Per CONTEXT.md Specifics, they remain UN-FOLDED into Phase 7 unless a future screenshot of the CreateListingScreen MediaSection flags the contrast or shadow as the visible defect.

- **PropertyCard / PropertyMap visual cross-check for the Issue-3 formatPrice fix** — the `formatPrice` change is universal across the three caller surfaces, but only the PropertyDetailsScreen sticky bottom bar was screenshot-flagged. PropertyCard list cells and PropertyMap pin callouts will be visually verified at the phase-exit cross-device sweep when the matrix iterates over Home (PropertyCard host) and Map (PropertyMap host) — NOT a per-screen-PLAN obligation here.
</deferred>
