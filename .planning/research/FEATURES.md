# Feature Research

**Domain:** Mobile real-estate marketplace with three-category listing taxonomy (Residential / Commercial / Hospitality-showcase) and role-based moderation
**Researched:** 2026-04-22
**Confidence:** MEDIUM-HIGH

## Scope

This dossier covers four decision areas for the JayTap M1 + M2 roadmap:

1. Per-category required fields (Residential / Commercial / Hospitality)
2. Hospitality "showcase-only" signals (no price, no booking)
3. Marketplace moderation flows (approval, flag/report, edit-on-behalf-of, trust badges)
4. Role assignment patterns (hardcoded allowlist → RBAC migration)

It is deliberately opinionated: recommendations are stated as "do X because Y" rather than surveys.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels broken or sketchy.

#### Residential listings (baseline — already implemented, listed here for completeness and to anchor the category contract)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Full address (house #, street, district/city) | Every portal (Zillow, Rightmove, OLX, Avito) requires it | LOW | Already present — keep. On Zillow, the address is the hard gate: no address = no listing. |
| Rent vs. Sale toggle | Standard across all platforms | LOW | Already present. |
| Price + currency | Baseline expectation; Residential is the category where price is non-negotiable | LOW | Already present. Keep required for Residential only. |
| Bedrooms count | Universal filter; Rightmove/Zillow make it mandatory | LOW | Already present. Required for Residential. |
| Bathrooms count | Universal filter | LOW | Already present. Required for Residential. |
| Living area (m² / sqft) | Standard search filter | LOW | Already present. Required for Residential. |
| Photos (min 1, soft floor ~5) | Listings without photos look scam-adjacent; Zillow explicitly flags them as low-quality | LOW | Already present (multipart upload). Consider a soft UI nudge "add at least 5 photos" — no backend enforcement yet. |
| Title + description | Every platform requires both | LOW | Already present. |
| Contact method (phone / chat / WhatsApp / Telegram) | Local-market expectation in Bishkek; already wired via `LSApplicationQueriesSchemes` | LOW | Already present. |
| Location pin on map | Buyers/renters expect map context; Zillow/Rightmove show it on every detail page | MEDIUM | Already present (`PropertyMap` + `react-native-maps`). |

#### Commercial listings (NEW required-field contract for M1)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Property sub-type (office / retail / warehouse / industrial) | Commercial portals (CommercialSearch, CoStar, CBRE) always split these — a "warehouse" search should never return a retail storefront | LOW | Add as an enum field shown when category = Commercial. Four sub-types is a good starting set for Bishkek. |
| **Area (m²)** — REQUIRED | The #1 commercial filter; area replaces "bedrooms" as the primary size signal | LOW | Already have the field; mark required for Commercial. |
| Price + price unit (total / per-m² per-month) | Commercial is typically quoted per-m²-per-month in post-Soviet markets; lump-sum in Western markets. Supporting both is standard | LOW-MEDIUM | Extend `formatPrice` util; add a `priceUnit: 'total' \| 'per_sqm_month'` field. |
| Address / location | Same as Residential | LOW | Reuse existing. |
| Photos | Same as Residential | LOW | Reuse existing. |
| Title + description | Same as Residential | LOW | Reuse existing. |
| Contact method | Same as Residential | LOW | Reuse existing. |
| **NOT** bedrooms / bathrooms | Commercial listings don't have bedrooms; bathrooms are usually shared-building amenities, not sellable features | — | Hide bedrooms/bathrooms fields entirely when category = Commercial. |

#### Hospitality listings (NEW — Hostel / Hotel, showcase-only)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Property sub-type (hostel / hotel) | Already decided; two sub-types is sufficient | LOW | Enum field. |
| Total rooms count | Primary capacity signal for hospitality | LOW | New field, required for Hospitality. |
| Bathrooms count (shared vs. en-suite hint) | Hostel buyers/renters care deeply about shared-bathroom ratios; Airbnb/Booking require at least one bathroom | LOW | Reuse bathrooms field; add an optional boolean "en-suite available". |
| Max guest capacity | Booking.com and Airbnb both require this; hostel use-case needs it to convey dorm size | LOW | New field: `maxGuests: number`. |
| Amenities checklist (WiFi, A/C, parking, kitchen, breakfast, laundry, 24h reception, common area, lockers) | Schema.org `LodgingBusiness.amenityFeature` is the industry taxonomy; users scan amenities before anything else on a no-price page | MEDIUM | New `amenities: string[]` multi-select. See "Recommended amenities taxonomy" below. |
| Photos (min 5, soft floor ~10) | No-price listings lean even harder on visuals. Airbnb rejects hostel listings with sparse photos. | LOW | Reuse existing upload. |
| **Contact method (phone + WhatsApp or Telegram)** — REQUIRED | Without price/booking, contact *is* the conversion action. Make it mandatory for Hospitality (vs. optional elsewhere). | LOW | Tighten validation for Hospitality category. |
| Address + map pin | Same expectation | LOW | Reuse. |
| Title + description | Same expectation | LOW | Reuse. |
| **NOT** a price field | Explicit anti-feature per PROJECT.md; dynamic daily pricing can't be tracked and contact drives offline booking | — | Hide price block entirely when category = Hospitality. Also hide in list-card rendering. |
| **NOT** a booking calendar / reservation CTA | Explicit anti-feature; JayTap isn't an OTA | — | Do NOT add. See Anti-Features section. |

#### Recommended amenities taxonomy (Hospitality)

Derived from Schema.org `LodgingBusiness.amenityFeature` + Airbnb/Booking.com common sets, scoped to what a Bishkek guest realistically cares about. 12 items is the sweet spot — fewer feels thin, more feels like a chore.

| Amenity | i18n key (suggested) | Why include |
|---------|----------------------|-------------|
| WiFi | `amenity.wifi` | Universal filter; #1 hostel concern |
| Air conditioning | `amenity.ac` | Bishkek summer relevance |
| Heating | `amenity.heating` | Bishkek winter relevance |
| Kitchen / shared kitchen | `amenity.kitchen` | Hostel differentiator |
| Breakfast included | `amenity.breakfast` | Hotel differentiator |
| Parking | `amenity.parking` | High-demand in Bishkek |
| 24h reception | `amenity.reception24h` | Trust signal |
| Laundry | `amenity.laundry` | Hostel essential |
| Hot water | `amenity.hotWater` | Local trust signal (not assumed in KG) |
| Common area / lounge | `amenity.commonArea` | Hostel differentiator |
| Lockers | `amenity.lockers` | Dorm/hostel trust signal |
| En-suite bathrooms available | `amenity.ensuite` | Segments hostel vs. hotel UX |

#### Listing moderation (M2 table stakes — every marketplace has these)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Listing status: pending → live → rejected | Standard marketplace pattern (OLX, Avito, Airbnb). New listings shouldn't auto-publish once moderation exists. | MEDIUM | New `status` field on Property. OLX auto-approves ~90% algorithmically; JayTap at current scale can default to auto-approve with moderator post-hoc review. |
| Flag/report listing button on every detail page | Every marketplace has this. OLX: community flagging is a core moderation input. | MEDIUM | New screen/modal + `POST /api/properties/:id/flag`. ChatService already has a `POST /chats/:id/report` endpoint — follow that pattern. |
| Moderation queue (admin/moderator-only screen) | Requires UI + backend list endpoint; standard "review-queue" pattern | MEDIUM-HIGH | New `ModerationQueueScreen`. Filter by `status = pending` or `flagCount > 0`. |
| Moderator edit-on-behalf-of (typo fixes, URL additions) | Standard in Airbnb/Booking; also how JayTap's M1 Matterport-URL gate logically extends | MEDIUM | Reuse `CreateListingScreen` with an `isModerating` flag and a `targetUserId` override. |
| "Why rejected?" reason required | Users churn hard if rejections are silent; OLX/Airbnb both surface rejection reasons | LOW | Add `rejectionReason: string` field; show in OwnerListings. |

#### Role system (M2 table stakes)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Three roles: `admin` / `moderator` / `user` | Already specified in PROJECT.md; industry-standard trio | LOW (schema) | Backend `userType` already exists; widen the enum. |
| Role stored server-side, not client-determined | Custom claims are the Firebase-recommended approach: immutable from client, embedded in ID token, no extra DB read | MEDIUM | JayTap currently uses Identity Toolkit REST only, not the Firebase Admin SDK from backend — backend stores `userType` itself. Keep doing that, but remove the client's ability to send `userType` in profile updates. |
| Admin UI to promote user → moderator | Standard admin dashboard feature | MEDIUM | New `AdminUsersScreen` (list + search + role-picker per user). Admin-only. |
| Session refresh on role change | Token/profile-cache invalidation required; otherwise promoted moderators appear not-promoted until logout | LOW | `AuthContext` needs a `refreshProfile()` method; call after promotion. |

---

### Differentiators (Competitive Advantage)

Features that set JayTap apart. Align with the core value (reliable Bishkek-focused browsing + curated immersive media).

#### Hospitality-specific differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| 3D Matterport tours front-and-center on hospitality cards | No-price hospitality *needs* a visual hook; Matterport is the most immersive widely-supported format | LOW (reuse existing) | Already exists — in M1, promote tour-hero rendering to appear first on Hospitality cards (vs. gallery-first on Residential). |
| Panoramic (Ricoh 360) secondary media slot | Cheaper to produce than Matterport; covers the long tail of hospitality listings that don't justify full 3D | LOW (reuse existing) | Already exists via `activePhotosUrl`. |
| Admin-curated URL gate (M1) / admin-only URL field (M2) | Gates the quality of the differentiating media — prevents broken/spam Matterport links degrading the "curated" promise | LOW (M1) / MEDIUM (M2) | M1: hardcoded email allowlist in `CreateListingScreen`. M2: role-based. |
| Admin trust badges (verified / curated / staff-reviewed) | Already partially present via `PlatformVerifications`; extending to a Hospitality-specific "Curated 3D tour" badge is cheap and high-signal | LOW | Extend existing `user.backendProfile.userType === 'admin'` gate to also edit a `hospitalityCurated: boolean`. |
| Separate Hospitality section on Home / Favorites / OwnerListings | Different information density (tours-first, no price) — mixing them hurts both | MEDIUM | Already in PROJECT.md scope; confirmed as a strong pattern (Airbnb separates "Rooms / Entire place / Shared room"). |
| Contact-method quick actions (Tap-to-call, WhatsApp deep-link, Telegram deep-link) | Bishkek market runs on WhatsApp/Telegram, not in-app chat. Required infrastructure already in `Info.plist`. | LOW | Already wired as URL schemes; surface as explicit buttons on Hospitality detail pages. |

#### Moderation differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Self-serve "Request curation" button on owner's hospitality listing | Puts the moderator/admin queue into user hands; lowers the friction of getting tours added | LOW (UI) / MEDIUM (backend queue) | New field: `curationRequested: boolean`. Surfaces in moderation queue. |
| Transparent listing status timeline on OwnerListings | "Submitted → Approved → Live" timestamps reduce support load | LOW | Reuse existing listing card. |
| In-app rejection reason with "Fix and resubmit" CTA | Lowers churn vs. OLX-style "your ad was removed" silence | LOW | Already implied by "reason required" in table stakes; the CTA is the differentiator. |

---

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Booking / reservation calendar for Hospitality** | Hostels/hotels on other portals have it; product managers instinctively add it | Daily dynamic pricing can't be reliably scraped or manually maintained; availability drift destroys trust; OTAs (Booking/Airbnb) charge 15–20% commissions JayTap can't undercut without a payment stack | Keep showcase-only. Drive off-platform contact via WhatsApp/Telegram/phone. Documented Out-of-Scope in PROJECT.md. |
| **Per-night price field for Hospitality** | Seems like an obvious small feature | Users *will* treat it as authoritative and book on stale data; creates owner-vs-guest disputes JayTap can't arbitrate | No price block at all for Hospitality. Already decided. |
| **Separate per-room listings for hostels** (Airbnb-style) | Mimics Airbnb's shared-room pattern | Showcase-only means no room-level availability is needed; proliferates listing rows with near-identical metadata; would require a parent/child data model | Single listing per hostel; "total rooms + max guests" conveys capacity without per-room rows. |
| **In-app role promotion UI in M1** | Looks cheap; "just add a dropdown" | Without server-side claim enforcement the dropdown is security theater; currently any client can PATCH `userType` | Hardcoded email allowlist in M1 (explicit & reviewable in code). Ship proper RBAC in M2. Already decided. |
| **User-visible moderator identity** | "Transparency" argument | Invites harassment of moderators; no marketplace at scale does this (Reddit, OLX, Airbnb all keep moderator identity private) | Show "Moderated by JayTap team" — never a username. |
| **Public flag counts** | Seems like useful social proof | Games the system (coordinated flagging); leaks moderation signal to bad actors | Flag count is moderator-only; users see only "Report submitted" confirmation. |
| **Fine-grained permission matrix (dozens of perms)** | "Proper" RBAC instinct | For a 3-role system at pre-launch scale, per-perm granularity triples implementation complexity for zero user value | Coarse 3-role model now. If permission grain is ever needed, add it then — "start with roles, graduate to permissions only when a requirement forces it" (Oso). |
| **Backend reads Firestore `users` doc for role on every request** | Simplest-feeling implementation | Adds per-request DB read cost and latency; role can't be trusted unless rules lock writes | Firebase custom claims (embedded in ID token, immutable from client). If backend isn't on Firebase Admin SDK yet (JayTap currently isn't — only Identity Toolkit REST on client), keep `userType` in backend DB, but reject any client-submitted changes to it. |
| **Global "Land" category reintroduction** | Stakeholder familiarity bias | Explicitly out-of-scope per PROJECT.md; Bishkek target use case doesn't need it | Don't. The removal is a M1 goal. |

---

## Feature Dependencies

```
M1 (Polish + Hospitality):

  [Three-category listing taxonomy]
       └──enables──> [Per-category required-field branching]
                          └──enables──> [Hospitality: no price, no bedrooms/baths]
                                             └──enables──> [Separate Hospitality section on list screens]
                                             └──enables──> [Hospitality amenities multi-select]
                                             └──enables──> [Hospitality contact-first UX]

  [Hardcoded admin email allowlist]
       └──enables──> [Matterport URL gate]
       └──enables──> [Panoramic URL gate]
       └──precursor-to──> [M2 formal roles]

M2 (Roles & Moderation):

  [Three-role system: admin/moderator/user]
       └──requires──> [Server-side role storage (not client-writable)]
       └──enables──> [Listing approval flow (status: pending → live)]
                          └──requires──> [Moderation queue screen]
                          └──requires──> [Reject-with-reason flow]
       └──enables──> [Flag/report button on listings]
                          └──requires──> [Moderation queue (same screen, flagCount filter)]
       └──enables──> [Edit-on-behalf-of (moderator reuses CreateListingScreen)]
       └──enables──> [Role promotion UI (admin-only)]
                          └──requires──> [Token/profile refresh on role change]

Conflicts / mutual exclusions:

  [Hospitality showcase-only]  ──conflicts──> [Booking calendar]
  [Hospitality showcase-only]  ──conflicts──> [Per-night price field]
  [Hardcoded email allowlist]  ──conflicts──> [In-app role promotion UI] (can't coexist safely in one milestone)
```

### Dependency Notes

- **Three-category taxonomy blocks every Hospitality feature.** It must land first in M1; amenities, separate section, and price-hiding all depend on the category enum.
- **M1 hardcoded allowlist is a forward-compatible shim.** The call sites (`CreateListingScreen` URL fields, `PropertyDetailsScreen:178`) should check a single helper like `isAdmin(user)` so M2 can swap the implementation without touching consumers.
- **M2 moderation queue has a bootstrapping problem.** If listings start defaulting to `pending`, the queue must exist before the default flips — or the first-time moderator login sees an empty app. Recommendation: ship the queue + approval flow together, and default new listings to `live` initially with `pending` added as a later flip (OLX pattern: auto-approve + post-hoc audit).
- **Role changes require session refresh.** This is a known Firebase gotcha (ID token claims are only refreshed on re-auth or forced refresh). `AuthContext` needs a `refreshProfile()` surface or role promotions appear to fail until logout/login.

---

## MVP Definition

### Launch With (M1 — v1.0.4 "Polish + Hospitality")

Per PROJECT.md, these are already active. Research confirms the feature list; adds amenity taxonomy specifics.

- [x] Remove `Land` property type everywhere
- [x] Three-category taxonomy (Residential / Commercial / Hospitality)
- [x] Category-branched required fields (Residential: beds/baths/area/price; Commercial: area + sub-type + price + price-unit; Hospitality: rooms/baths/maxGuests/amenities/contact, no price)
- [x] Hospitality sub-types: Hostel / Hotel
- [x] Hospitality amenities multi-select (12-item taxonomy above)
- [x] Separate Hospitality section on Home / Favorites / OwnerListings
- [x] PropertyDetailsScreen renders Hospitality without price, tours-first
- [x] Hardcoded admin email allowlist gates Matterport/panoramic URL edits
- [x] WhatsApp/Telegram/phone contact quick-actions surfaced on Hospitality detail pages (infrastructure already present — just promote the UI)

### Add After Validation (M2 — "Roles & Moderation")

Trigger: M1 ships, initial user listings accumulate, moderation becomes the bottleneck.

- [ ] Formal three-role system (admin / moderator / user) with server-side trust boundary
- [ ] Listing status field (`pending` / `live` / `rejected`) — default to `live` initially, flip to `pending` when moderation capacity is proven
- [ ] Moderation queue screen (admin + moderator)
- [ ] Flag/report listing flow (user → queue)
- [ ] Moderator edit-on-behalf-of (reuse CreateListingScreen)
- [ ] Admin UI to promote users → moderator
- [ ] Admin-only trust-badge assignment (extend existing `PlatformVerifications`)
- [ ] Rejection reason + "Fix and resubmit" CTA on owner's listing card
- [ ] `AuthContext.refreshProfile()` to handle role-change session refresh

### Future Consideration (v2+)

Defer until there's pull from real usage.

- [ ] Per-room listings for hostels (only if users demand bed-level granularity — currently an anti-feature)
- [ ] Firebase Admin SDK on backend + custom-claims-based RBAC (if `userType`-in-DB model becomes untrustworthy or a performance bottleneck)
- [ ] Automated content moderation (AI image/text scanning) — only after manual moderation volume justifies it; OLX at massive scale uses it, JayTap pre-launch does not
- [ ] Appeals flow for rejected listings
- [ ] Per-permission model (vs. coarse roles) — only if a real requirement forces it
- [ ] Chat moderation tooling — already out-of-scope in PROJECT.md; reconfirm at M3 time
- [ ] Commercial-specific sub-filters (ceiling height, loading docks, power capacity for warehouses) — add only if commercial listing volume justifies it

---

## Feature Prioritization Matrix

### M1 scope

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Remove Land, add Hostel/Hotel, 3-category grouping | HIGH | LOW | P1 |
| Per-category required-field branching | HIGH | MEDIUM | P1 |
| Hospitality amenities multi-select (12 items) | HIGH | LOW | P1 |
| Separate Hospitality section on list screens | HIGH | MEDIUM | P1 |
| Hide price for Hospitality (detail + cards) | HIGH | LOW | P1 |
| Hardcoded admin email allowlist for URL fields | HIGH | LOW | P1 |
| WhatsApp/Telegram quick-action buttons surfaced on Hospitality | MEDIUM | LOW | P2 |
| Price-unit field for Commercial (total / per-m²-month) | MEDIUM | LOW | P2 |
| "Curated 3D tour" admin badge on Hospitality | LOW | LOW | P3 |

### M2 scope

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Three-role backend (admin/moderator/user) | HIGH | MEDIUM | P1 |
| `isAdmin(user)` / `isModerator(user)` client helpers | HIGH | LOW | P1 |
| Flag/report listing button | HIGH | MEDIUM | P1 |
| Moderation queue screen | HIGH | MEDIUM-HIGH | P1 |
| Moderator edit-on-behalf-of | MEDIUM | MEDIUM | P2 |
| Admin UI to promote users | MEDIUM | MEDIUM | P2 |
| Rejection reason + resubmit CTA | MEDIUM | LOW | P2 |
| Listing `pending → live` approval flow | MEDIUM | MEDIUM | P2 |
| `AuthContext.refreshProfile()` | HIGH | LOW | P1 (required by role-change correctness) |
| Admin trust-badge assignment UI | LOW | LOW | P3 |

**Priority key:** P1 = must have in that milestone. P2 = should have. P3 = nice to have.

---

## Competitor Feature Analysis

| Feature | Airbnb / Booking.com | OLX / Avito | Zillow / Rightmove | JayTap approach |
|---------|----------------------|-------------|--------------------|-----------------|
| Hospitality price required | Yes (per-night) | Yes (varies) | N/A | **No** — showcase-only by design |
| Booking calendar | Yes | No (classifieds) | No | **No** — anti-feature |
| Rooms + guest capacity | Yes | Partial | No | **Yes** — required for Hospitality |
| Amenities taxonomy | Yes (huge, ~80 items) | Partial | Partial | **Yes** — 12-item curated set |
| Category-branched required fields | Yes | Yes | Yes | **Yes** — Residential/Commercial/Hospitality |
| Listing moderation | Yes (automated + manual) | Yes (~90% automated) | Yes (manual policy checks) | **M2** — manual, human moderators, no automation |
| Flag/report listing | Yes | Yes | Yes | **M2** — manual queue |
| Moderator edit-on-behalf-of | Yes (host concierge) | Partial | Yes (MLS agent edits) | **M2** — admin/moderator only |
| User-submitted rejection appeals | Yes | Yes | Yes | **v2+** — defer until churn justifies |
| Public moderator identity | No | No | No | **No** — follow industry norm |
| Hardcoded admin list | No (enterprise RBAC) | No | No | **M1 only** — shim, removed in M2 |
| Immersive media (3D / 360) | Yes (Matterport in some tiers) | Rare | Rare | **Core differentiator** — already shipped |
| WhatsApp/Telegram off-platform contact | Discouraged (they want the booking) | Common | Discouraged (they want the lead) | **Encouraged for Hospitality** — showcase model makes off-platform the point |

---

## Key Domain Findings (confidence-flagged)

- **HIGH:** Schema.org `LodgingBusiness.amenityFeature` + `starRating` is the canonical hospitality taxonomy; Airbnb and Booking.com both require at least one bathroom and at least one bed per room at listing creation time. [Source: schema.org, Airbnb Help Center]
- **HIGH:** Commercial listings universally use area as the primary size metric and sub-type (office/retail/warehouse/industrial) as the primary segmentation axis. Bedrooms/bathrooms are hidden in commercial flows. [Source: CommercialSearch, CBRE, CommercialCafe]
- **HIGH:** Every marketplace of non-trivial size has a listing status lifecycle and a flag/report button. OLX auto-approves ~90% algorithmically but retains manual review for the rest. [Source: OLX Trust Group, Quora on OLX moderation]
- **HIGH:** Firebase custom claims are the recommended pattern for role-based access — immutable from client, embedded in ID token, zero extra DB reads — but require token refresh after a role change or the old claim persists until the user logs out/in. [Source: firebase.google.com, Medium migration guides]
- **MEDIUM:** Hardcoded email allowlists are a known-fine early-stage shim. Multiple sources (Osohq, Jacob Paris blog) explicitly note they're maintainable until permissions need UI-driven changes — at which point migration to DB-backed or claim-backed roles is warranted. The M1 → M2 plan is textbook. [Source: osohq.com, jacobparis.com]
- **MEDIUM:** Hostel-specific listing patterns on Airbnb treat each hostel room as its own listing — JayTap's decision to treat a hostel as a single listing is simpler and appropriate for showcase-only, but means capacity (rooms + maxGuests) must carry the signal the per-room approach would otherwise convey. [Source: Hostaway blog, Airbnb Help]
- **LOW:** Specific Rightmove required-field list isn't publicly documented as a machine-readable spec; industry convention (price + address + bedrooms + bathrooms + area + photos) is consistent across all portals surveyed. Flagged as LOW only because no single authoritative source lists the full schema.

---

## Sources

- [Schema.org Hotels documentation](https://schema.org/docs/hotels.html)
- [Schema.org LodgingBusiness](https://schema.org/LodgingBusiness)
- [Airbnb — Listing a Room](https://www.airbnb.com/help/article/3400)
- [Airbnb — Standards for hotels and hospitality businesses](https://www.airbnb.com/help/article/1526)
- [Hostaway — How to list your Hostel on Airbnb](https://www.hostaway.com/blog/how-to-list-your-hostel-on-airbnb/)
- [Zillow — Creating a Listing](https://zillow.zendesk.com/hc/en-us/articles/32915356424595-Creating-a-Listing)
- [Zillow — Rental Listing Quality Policies](https://www.zillow.com/rentals-network/listings-quality-policy/)
- [CommercialSearch](https://www.commercialsearch.com/)
- [CBRE Properties](https://www.cbre.com/properties)
- [CommercialCafe](https://www.commercialcafe.com)
- [OLX Trust](https://www.olxgroup.com/trust/)
- [Quora — How does OLX moderate and approve ads](https://www.quora.com/How-does-OLX-moderate-and-approve-ads-submitted-by-users)
- [GetStream — Marketplace Content Moderation Guide](https://getstream.io/blog/marketplace-content-moderation/)
- [Grab Engineering — Managing dynamic marketplace content at scale](https://engineering.grab.com/dynamic-marketplace)
- [Firebase — Control Access with Custom Claims and Security Rules](https://firebase.google.com/docs/auth/admin/custom-claims)
- [Medium — Migrating to Firebase Custom Claims for RBAC](https://medium.com/@chaitanyayendru/migrating-to-firebase-custom-claims-for-role-based-access-control-26c08f852795)
- [Oso — How to Build a Role-Based Access Control Layer](https://www.osohq.com/learn/rbac-role-based-access-control)
- [Jacob Paris — Simple RBAC in Remix: Hardcoded permissions](https://www.jacobparis.com/content/simple-rbac)

---

*Feature research for: JayTap M1 + M2 (mobile real-estate marketplace, Bishkek)*
*Researched: 2026-04-22*
