/**
 * CreateListingForm — barrel.
 *
 * Single import point for the 7 sub-components + shared types. Plans
 * 04-03 / 04-04 / 04-05 add re-exports incrementally; Plan 04-06 imports via
 * one line:
 *   import {
 *     BasicInfoSection, ResidentialSection, CommercialSection,
 *     HospitalitySection, MediaSection, PriceSection, VerificationSection,
 *   } from '../components/CreateListingForm';
 *
 * Convention: matches src/locales/index.ts shape (named re-exports, no default;
 * `export type` block for types-only exports). This is the second barrel in
 * the repo — a documented exception per PATTERNS.md §3 row 139–161.
 */

// Task 2 of Plan 04-03 activates this re-export once BasicInfoSection.tsx
// lands. Keeping it commented here in Task 1 keeps `npx tsc --noEmit` clean
// for the scaffolding-only commit. (Deviation: Rule 3 — see 04-03-SUMMARY.)
// export { BasicInfoSection } from './BasicInfoSection';

// Plans 04-04 + 04-05 will add the remaining 6 re-exports:
// export { ResidentialSection } from './ResidentialSection';
// export { CommercialSection } from './CommercialSection';
// export { HospitalitySection } from './HospitalitySection';
// export { MediaSection } from './MediaSection';
// export { PriceSection } from './PriceSection';
// export { VerificationSection } from './VerificationSection';

export type { FormBag, FormErrorBag, SectionProps } from './types';
