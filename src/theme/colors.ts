export const colors = {
  light: {
    background: '#F0F2F5', // Slightly darker, cooler gray/beige mix for better contrast with white cards
    surface: '#FFFFFF',
    text: '#2D2D2D',
    textSecondary: '#666666',
    textTertiary: '#999999',
    primary: '#2D2D2D',
    primaryLight: '#F2EFE9',
    accent: '#FF385C',
    border: '#E0E0E0',
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
    background: '#191A1D', // Softer dark gray (Gunmetal) - Less "Black"
    surface: '#25282F', // Lighter surface for contrast
    text: '#F5F5F5',
    textSecondary: '#A0A3A8',
    textTertiary: '#6B6F76',
    primary: '#FFFFFF',
    primaryLight: '#353941',
    accent: '#FF5C7C',
    border: '#2E3238',
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
    // scrim: identical hue (semi-opaque black) — its contrast is with the
    // underlying photo, not the theme surface, so the same value works in dark.
    scrim: 'rgba(0,0,0,0.55)',
    cardShadow: '#000000',
    buttonText: '#E0E0E0',
  },
};

export type ThemeColors = typeof colors.light;
