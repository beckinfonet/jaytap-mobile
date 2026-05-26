/**
 * Phase 2 — shared StyleSheet for `<ContextualListingFlow>` and Step components.
 *
 * EXCEPTION: per CONVENTIONS.md, components own their styles co-located in the same .tsx file.
 * This shared-styles file is documented as an intentional exception (matches M1 P4 precedent
 * at `src/components/CreateListingForm/styles.ts`) — keeps Step1-6 components from each
 * re-declaring identical container/section/chip token-rules.
 *
 * Theme-aware values are applied via `useTheme()` at consumption site (NOT here).
 * This file owns ONLY dimensional/layout tokens (no colors).
 */

import { StyleSheet } from 'react-native';

export const commonStyles = StyleSheet.create({
  // Orchestrator
  flowContainer: { flex: 1 },
  headerContainer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  progressBarRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressLabel: { fontSize: 14, fontWeight: '600' },
  progressBarTrack: { flexDirection: 'row', flex: 1, height: 4, marginLeft: 12, gap: 4 },
  progressSegment: { flex: 1, borderRadius: 2 },

  // Mod-context banner (transplant pattern from CreateListingScreen.tsx:714-744)
  modContextBanner: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 20,
    marginVertical: 8,
    overflow: 'hidden',
  },
  modContextStripe: { width: 4 },
  modContextBody: { flex: 1, padding: 12 },
  modContextTitle: { fontSize: 14, fontWeight: '600' },
  modContextSubtitle: { fontSize: 13, marginTop: 4 },

  // Step body
  scrollContent: { padding: 20, paddingBottom: 40 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  sectionLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },

  // Chip rows (lift sizing from HomeScreen.tsx:486-516)
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipRowHorizontal: { flexDirection: 'row', gap: 8, paddingRight: 20 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontSize: 14, fontWeight: '500' },

  // Form inputs
  input: { height: 50, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 16 },
  inputMultiline: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  errorText: { fontSize: 12, marginTop: 4 },

  // Map (Step 2)
  mapContainer: { height: 260, borderRadius: 12, overflow: 'hidden', marginVertical: 8 },
  map: { flex: 1 },

  // Footer (Back / Next buttons)
  footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1 },
  footerButton: { flex: 1, height: 50, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  footerButtonText: { fontSize: 16, fontWeight: '600' },
});
