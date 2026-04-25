/**
 * CreateListingForm/styles.ts — shared StyleSheet for sub-components.
 *
 * CONVENTION EXCEPTION (documented per planner context note 2026-04-24):
 * This file breaks the standard "styles colocated at bottom of component file"
 * convention (CONVENTIONS.md §Styling row ~223). Rationale: transcribing the
 * current CreateListingScreen.tsx:1065-1403 StyleSheet verbatim into each of 7
 * sibling sub-components would duplicate ~340 lines × 7 = ~2400 lines with zero
 * semantic variance. Shared file is the minimum-regret choice for a refactor
 * whose explicit goal is preserving pixel behavior.
 *
 * Dynamic values (color, theme) are applied INLINE via useTheme() in each
 * consumer — the static values (spacing / radius / height / font size / weight)
 * live here. Consumers: BasicInfoSection, ResidentialSection, CommercialSection,
 * HospitalitySection, MediaSection, PriceSection, VerificationSection.
 *
 * Values below are transcribed verbatim from
 * src/screens/CreateListingScreen.tsx lines 1097–1291 (StyleSheet at HEAD after
 * Plan 04-02). Plans 04-04 and 04-05 may extend this file with additional keys
 * (imagesGrid, imageItem, addTourButton, tourItem, verificationSection, etc.)
 * as their sub-components are carved out.
 */

import { StyleSheet } from 'react-native';

export const commonStyles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 12,
  },
  textArea: {
    minHeight: 100,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  thirdInput: {
    flex: 1,
  },
  halfInput: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  fieldError: {
    marginTop: -8,
    marginBottom: 12,
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  featureText: {
    fontSize: 14,
    marginRight: 8,
  },
  removeFeature: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 30,
    padding: 4,
    height: 44,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentText: {
    fontWeight: '600',
    fontSize: 16,
  },
  addButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  datePickerButton: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  datePickerButtonText: {
    fontSize: 16,
  },
  datePickerChevron: {
    fontSize: 18,
  },
  datePickerDoneButton: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  datePickerDoneButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
