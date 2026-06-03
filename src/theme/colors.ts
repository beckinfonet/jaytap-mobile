// MODE_INDEPENDENT_PALETTE — 5 tokens whose value is identical in light + dark.
// Extracted to a const + spread into both blocks (Phase 12 D-04) so mode-independence
// is FALSIFIABLE at the source level: breaking the invariant requires deleting the
// spread itself, which is visible in any diff. SPEC §Constraints requires
// colors.light.accent === colors.dark.accent (etc.) — that holds by construction here.
const MODE_INDEPENDENT_PALETTE = {
  accent: '#ff5a6f', // MoveIn handoff 2026-05-31 — used by Phase 14+ accent CTAs / Show N homes button (replaces the prior light #FF385C / dark #FF5C7C split — now brand-locked)
  accentSoft: 'rgba(255,90,111,0.16)', // MoveIn handoff 2026-05-31 — used by Phase 14+ accent fill background (e.g. Show N homes button hover)
  accentLine: 'rgba(255,90,111,0.45)', // MoveIn handoff 2026-05-31 — used by Phase 14+ accent border / underline (e.g. Cascading Reveal Category tab strip)
  // Filter-variant accent triple (quick 260531-x3z) — scoped to Guided Steps +
  // Cascading Reveal filter components only. Lets the filter UIs render a
  // distinct hue from the brand pink without rebranding the whole app accent.
  filterAccent: '#6f7bff',
  filterAccentSoft: 'rgba(111,123,255,0.16)',
  filterAccentLine: 'rgba(111,123,255,0.45)',
  landlordGreen: '#35c98f', // MoveIn handoff 2026-05-31 — used by Phase 16 'You're a Landlord' green-tinted banner background
  landlordGreenSoft: 'rgba(53,201,143,0.16)', // 260603-fyy — soft fill mirroring the accent→accentSoft pair; backs the IdentityCard 'Account Settings' pill (re-tinted from brand pink to the landlord-green hue)
  destructiveRed: '#ff4d4d', // MoveIn handoff 2026-05-31 — used by Phase 15 DANGER ZONE Delete-account row tint / Phase 16 Log out outlined pill stroke
} as const;

export const colors = {
  light: {
    ...MODE_INDEPENDENT_PALETTE,
    background: '#f3f3f6',
    bgDim: '#e7e7ec', // MoveIn handoff 2026-05-31 — used by Phase 14 Cascading Reveal panel backdrop / Phase 15 ACCOUNT section card dimming
    surface: '#ffffff',
    surface2: '#f0f0f4', // MoveIn handoff 2026-05-31 — used by Phase 14 Guided Steps bottom-sheet wizard nested surface
    surface3: '#e4e4ea', // MoveIn handoff 2026-05-31 — used by Phase 14 Guided Steps Type-cards selected state
    border: 'rgba(0,0,0,0.08)',
    hair2: 'rgba(0,0,0,0.13)', // MoveIn handoff 2026-05-31 — used by Phase 14+ strong-weight hairline / Phase 16 ADMIN TOOLS section divider
    text: '#16161a',
    textSecondary: 'rgba(22,22,28,0.62)',
    textTertiary: 'rgba(22,22,28,0.42)',
    iconChipFg: 'rgba(22,22,28,0.80)', // MoveIn handoff 2026-05-31 — used by Phase 16 38px icon chip foreground (grouped-row anatomy)
    primary: '#2D2D2D',
    primaryLight: '#F2EFE9',
    inputBackground: '#FFFFFF', // White input on gray background looks cleaner
    chipBackground: '#FFFFFF',
    chipBorder: '#E0E0E0',
    activeChipBackground: '#2D2D2D',
    activeChipText: '#FFFFFF',
    success: '#4CAF50',
    error: '#F44336',
    warning: '#F59E0B', // amber-500 — banner background (Phase 1 ROLE-10 / D-13)
    onWarning: '#FFFFFF', // text on warning bg
    // Phase 3 Plan 03-05 (revision 2 W6) — semantic tokens for media-curation surface.
    // onAccent: text/icon foreground on accent CTA backgrounds (e.g. Approve & publish
    // button label, NeedsMediaBanner CTA). White reads correctly on success / accent
    // hues in light mode.
    onAccent: '#FFFFFF',
    // destructiveSoft: tinted background for destructive-foreground icon chips
    // (mirrors the accent → accentSoft pair). Light mode uses a slightly lighter
    // opacity (0.10) so the red-on-white chip doesn't overwhelm the surface;
    // dark mode keeps 0.13 to preserve sufficient contrast against the dark
    // surface. Introduced Phase 15 review-fix WR-01 to complete the
    // hardcoded-rgba → token migration for DANGER ZONE.
    destructiveSoft: 'rgba(255,77,77,0.10)',
    // scrim: semi-opaque overlay above tile photos for delete-X affordance + the
    // upload loading-overlay backdrop. 0.55 opacity matches UI-SPEC §"Photo / video
    // tile (rendered)" verbatim — same hue in light + dark since it's a black
    // overlay above an arbitrary image (legibility is a function of contrast with
    // the image, not the theme background).
    scrim: 'rgba(0,0,0,0.55)',
    cardShadow: '#1A1A1A',
    buttonText: '#5D5045',
  },
  dark: {
    ...MODE_INDEPENDENT_PALETTE,
    background: '#121214',
    bgDim: '#0c0c0e', // MoveIn handoff 2026-05-31 — used by Phase 14 Cascading Reveal panel backdrop / Phase 15 ACCOUNT section card dimming
    surface: '#1c1c20',
    surface2: '#26262c', // MoveIn handoff 2026-05-31 — used by Phase 14 Guided Steps bottom-sheet wizard nested surface
    surface3: '#303038', // MoveIn handoff 2026-05-31 — used by Phase 14 Guided Steps Type-cards selected state
    border: 'rgba(255,255,255,0.08)',
    hair2: 'rgba(255,255,255,0.14)', // MoveIn handoff 2026-05-31 — used by Phase 14+ strong-weight hairline / Phase 16 ADMIN TOOLS section divider
    text: '#f4f4f6',
    textSecondary: 'rgba(244,244,246,0.60)',
    textTertiary: 'rgba(244,244,246,0.40)',
    iconChipFg: 'rgba(244,244,246,0.85)', // MoveIn handoff 2026-05-31 — used by Phase 16 38px icon chip foreground (grouped-row anatomy)
    primary: '#FFFFFF',
    primaryLight: '#353941',
    inputBackground: '#2E3238',
    chipBackground: '#2E3238',
    chipBorder: '#3E4349',
    activeChipBackground: '#E0E0E0',
    activeChipText: '#121212',
    success: '#66BB6A',
    error: '#EF5350',
    warning: '#F59E0B', // amber-500 (same hue, dark mode)
    onWarning: '#0F172A', // dark slate text on warning bg in dark mode
    // Phase 3 Plan 03-05 (revision 2 W6) — accent CTA still renders white text in
    // dark mode (matches RejectionBanner precedent — accent is a bright pink hue
    // and white text passes AA on it in both light + dark modes).
    onAccent: '#FFFFFF',
    // destructiveSoft: tinted background for destructive-foreground icon chips
    // (mirrors the accent → accentSoft pair). Dark mode uses 0.13 (matches the
    // pre-token literal at AccountSettingsScreen line 381) so the red chip
    // reads correctly against the dark surface. Introduced Phase 15 review-fix
    // WR-01.
    destructiveSoft: 'rgba(255,77,77,0.13)',
    // scrim: identical hue (semi-opaque black) — its contrast is with the
    // underlying photo, not the theme surface, so the same value works in dark.
    scrim: 'rgba(0,0,0,0.55)',
    cardShadow: '#000000',
    buttonText: '#E0E0E0',
  },
};

export type ThemeColors = typeof colors.light;
