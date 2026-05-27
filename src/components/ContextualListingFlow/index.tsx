/**
 * Phase 2 — `<ContextualListingFlow>` orchestrator (D-11 + D-12 + D-13 + D-14 + D-15 + D-16 + D-17 + D-18).
 *
 * State owned here:
 *   - useState<FormBag>           — D-02 single source of truth for form values
 *   - useState<FormErrorBag>      — D-02 errors
 *   - useState<currentStep:1..6>  — D-11 step index (NOT lifted to App.tsx; protects 1215-LOC budget)
 *
 * Mod-context banner (D-18) renders ABOVE the step body across Steps 1-6.
 * Progress indicator (D-14) renders "Step N of 6" + 6-segment bar.
 *
 * Submit dispatch (D-16) — wired in Plan 02-04b:
 *   mode='create'      → PropertyService.createProperty(payload)         (server defaults status:'pending')
 *   mode='edit-owner'  → PropertyService.updateProperty(id, payload)     (M2 D-22 auto-flip preserved)
 *   mode='edit-mod'    → PropertyService.editAsModerator(id, payload, [], reason) (M2 MOD-14)
 *
 * Steps 1-6 are all wired. Plan 02-07 mounts the orchestrator into App.tsx
 * (replacing CreateListingScreen).
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { X, ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { Step1DealAndPropertyType } from './Step1DealAndPropertyType';
import { Step2Location } from './Step2Location';
import { Step3BasicInfo } from './Step3BasicInfo';
import { Step4ConditionAmenities } from './Step4ConditionAmenities';
import { Step5TitleDescription } from './Step5TitleDescription';
import { Step6DealConditions } from './Step6DealConditions';
import { commonStyles } from './styles';
import { validateStep, emptyFormBag } from './validators';
import { propertyToFormBag, formBagToPropertyPayload } from './adapters';
import { PropertyService } from '../../services/PropertyService';
import type { FormBag, FormErrorBag, ContextualListingFlowProps } from './types';

const TOTAL_STEPS = 6 as const;
type StepIndex = 1 | 2 | 3 | 4 | 5 | 6;

export function ContextualListingFlow(props: ContextualListingFlowProps) {
  const { mode, onClose } = props;
  const moderatorContext = mode === 'edit-mod' ? props.moderatorContext : undefined;
  const initialListing = mode !== 'create' ? props.initialListing : undefined;

  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();

  const [values, setValues] = useState<FormBag>(() => {
    const base = propertyToFormBag(initialListing);
    // Default content.language to current UI language for create mode
    if (!initialListing) base.content.language = language === 'en' ? 'en' : 'ru';
    return base;
  });
  const [errors, setErrors] = useState<FormErrorBag>({});
  const [currentStep, setCurrentStep] = useState<StepIndex>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick 260525-x8l — photo-gate on Step 6 submit for mode='edit-mod'.
  // Defense-in-depth UX parity with PropertyDetailsScreen.tsx:226 NeedsMediaBanner pattern.
  // For create / edit-owner modes the value is Infinity so the `photoCount === 0` check
  // downstream is false — only edit-mod is gated.
  // Trust boundary stays on the backend (/approve MEDIA_REQUIRED per quick 260514-rk1;
  // PUT /moderation/listings/:id is field-only per quick 260511-cog) — this is guidance.
  const photoCount =
    mode === 'edit-mod' ? props.initialListing?.media?.photos?.length ?? 0 : Infinity;

  // Keep an `_unused` reference so emptyFormBag is reachable for downstream plans
  // (validators.ts re-export). Eslint is configured to ignore underscore-prefixed.
  void emptyFormBag;

  const onChange = useCallback(<K extends keyof FormBag>(field: K, value: FormBag[K]) => {
    setValues((prev) => {
      const next = { ...prev, [field]: value };
      // ROADMAP SC#3 (Plan 02-03): switching propertyType in Step 1 reflows Step 3 —
      // clear leftover sub-fields from the prior selection (rooms/bathroom/kitchen/
      // hotelRooms/hotelClass). Step 3 sub-fields are mutually exclusive across the
      // FLOW-08 matrix (apartment/house vs office/commercial vs hotel/hostel), so a
      // switch from e.g. apartment→hotel must drop the prior `rooms` value to avoid
      // submitting a hotel listing with a stale `rooms` field.
      if (field === 'propertyType' && prev.propertyType !== value) {
        next.basics = {
          ...prev.basics,
          rooms: undefined,
          bathroom: undefined,
          kitchen: undefined,
          hotelRooms: undefined,
          hotelClass: undefined,
          bedrooms: undefined,        // M4 — residential-only; clear on any propertyType switch
          // bathroomCount intentionally NOT cleared — applies to all 6 types (CONTEXT.md Claude's Discretion L111)
        };
      }
      // ROADMAP SC#4 (Plan 02-04b): switching dealType in Step 1 reflows Step 6 —
      // clear leftover terms.* fields. Step 6 fields (negotiable / deposit /
      // prepaymentMonths / minTerm) are dealType-gated per the matrix in
      // Step6DealConditions.tsx, so a switch from e.g. rent_long → sale must drop
      // any prior prepaymentMonths/minTerm to avoid submitting a sale listing
      // with stale rent fields.
      if (field === 'dealType' && prev.dealType !== value) {
        next.terms = {};
      }
      return next;
    });
  }, []);

  // D-13: silent Back; confirm on X / Step-1 hardware back
  const requestClose = useCallback(() => {
    Alert.alert(
      t('contextualListing.discardConfirm.title'),
      t('contextualListing.discardConfirm.body'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('contextualListing.discardConfirm.confirm'),
          style: 'destructive',
          onPress: onClose,
        },
      ],
    );
  }, [onClose, t]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) setCurrentStep((s) => (s - 1) as StepIndex);
    else requestClose();
  }, [currentStep, requestClose]);

  const handleNext = useCallback(async () => {
    const r = validateStep(currentStep, values);
    setErrors(r.errors);
    if (!r.isValid) return;
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((s) => (s + 1) as StepIndex);
    } else {
      // Quick 260525-x8l — belt-and-braces photo-gate. Even if the button's disabled
      // prop is bypassed (e.g. Android long-press race per threat T-x8l-04), refuse to
      // dispatch the PUT /moderation/listings/:id call when edit-mod has zero photos.
      if (mode === 'edit-mod' && photoCount === 0) {
        return;
      }
      // Submit (D-16) — real PropertyService dispatch by mode.
      //   create     → POST /api/properties (server defaults status:'pending', M2 D-22 sanitizer)
      //   edit-owner → PUT /api/properties/:id (M2 D-22 rejected→pending auto-flip preserved)
      //   edit-mod   → editAsModerator (M2 MOD-14, status flips to 'live' server-side)
      // Phase 2 does NOT ship media — Phase 3 owns that. PropertyService methods take
      // `images = []` by default, so we omit the second arg.
      setIsSubmitting(true);
      try {
        const payload = formBagToPropertyPayload(values);
        let resultId: string;
        if (mode === 'create') {
          const created = await PropertyService.createProperty(payload);
          resultId =
            (created as { id?: string; _id?: string }).id ??
            (created as { _id?: string })._id ??
            '';
        } else if (mode === 'edit-owner') {
          const editProps = props as { initialListing: { id: string } };
          const updated = await PropertyService.updateProperty(
            editProps.initialListing.id,
            payload,
          );
          resultId =
            (updated as { id?: string; _id?: string }).id ??
            (updated as { _id?: string })._id ??
            editProps.initialListing.id;
        } else {
          // edit-mod — editAsModerator(propertyId, propertyData, images?, reason?)
          const modProps = props as {
            initialListing: { id: string };
            moderatorContext: { reason?: string };
          };
          const updated = await PropertyService.editAsModerator(
            modProps.initialListing.id,
            payload,
            [],
            modProps.moderatorContext.reason,
          );
          resultId =
            (updated as { id?: string; _id?: string }).id ??
            (updated as { _id?: string })._id ??
            modProps.initialListing.id;
        }
        if ((props as { onSuccess?: (id: string) => void }).onSuccess) {
          (props as { onSuccess: (id: string) => void }).onSuccess(resultId);
        }
        onClose();
      } catch (e: unknown) {
        // M4 D-10 — discriminate Phase 6 backend 400 codes; route to inline error row Step3 renders.
        // Practically unreachable via stepper UI clamping, but Phase 6 D-11 wired these codes explicitly
        // so Phase 7 can discriminate.
        const code =
          (e as { response?: { data?: { code?: string } }; code?: string }).response?.data?.code ??
          (e as { code?: string }).code;
        if (code === 'M4_BEDROOMS_INVALID') {
          setErrors((prev) => ({
            ...prev,
            ['basics.bedrooms']: 'contextualListing.step3.bedroomsInvalid',
          }));
          setCurrentStep(3);
        } else if (code === 'M4_BATHROOM_STEP_INVALID') {
          setErrors((prev) => ({
            ...prev,
            ['basics.bathroomCount']: 'contextualListing.step3.bathroomCountInvalid',
          }));
          setCurrentStep(3);
        } else {
          const msg =
            (e as { message?: string }).message ?? t('common.errorGeneric');
          Alert.alert(t('common.error'), msg);
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [currentStep, values, mode, props, onClose, t, photoCount]);

  // D-13 (W-04): Android hardware back. Single-ownership in the orchestrator
  // (NOT in App.tsx). At currentStep > 1 → step back; at currentStep === 1 →
  // discard confirm. Always returns true to consume the event.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (currentStep > 1) {
        setCurrentStep((s) => (s - 1) as StepIndex);
        return true;
      }
      requestClose();
      return true;
    });
    return () => sub.remove();
  }, [currentStep, requestClose]);

  const stepBody = useMemo(() => {
    switch (currentStep) {
      case 1:
        return <Step1DealAndPropertyType values={values} onChange={onChange} errors={errors} />;
      case 2:
        return <Step2Location values={values} onChange={onChange} errors={errors} />;
      case 3:
        return <Step3BasicInfo values={values} onChange={onChange} errors={errors} />;
      case 4:
        return <Step4ConditionAmenities values={values} onChange={onChange} errors={errors} />;
      case 5:
        return <Step5TitleDescription values={values} onChange={onChange} errors={errors} />;
      case 6:
        return <Step6DealConditions values={values} onChange={onChange} errors={errors} />;
    }
  }, [currentStep, values, onChange, errors]);

  const submitLabel =
    currentStep < TOTAL_STEPS
      ? t('common.next')
      : mode === 'edit-mod'
      ? t('contextualListing.submit.modEdit')
      : t('contextualListing.submit.create');

  // Quick 260525-x8l — Step 6 photo-gate trigger. ONLY fires for edit-mod on the
  // final step with zero photos. Reuses moderation.needsMediaBanner.{title,body}
  // i18n keys — no new strings introduced.
  const isFinalSubmitBlocked =
    currentStep === TOTAL_STEPS && mode === 'edit-mod' && photoCount === 0;

  return (
    <SafeAreaView
      style={[commonStyles.flowContainer, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      {/* Header — close button + progress indicator (D-14) */}
      <View
        style={[
          commonStyles.headerContainer,
          { borderBottomColor: colors.border, borderBottomWidth: 1 },
        ]}
      >
        <View style={commonStyles.progressBarRow}>
          <TouchableOpacity
            onPress={requestClose}
            testID="contextual-listing-close"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <X color={colors.text} size={22} />
          </TouchableOpacity>
          <Text
            testID="contextual-listing-progress-label"
            style={[commonStyles.progressLabel, { color: colors.text }]}
          >
            {t('contextualListing.progress.stepOf', {
              current: String(currentStep),
              total: String(TOTAL_STEPS),
            })}
          </Text>
          <View style={commonStyles.progressBarTrack} testID="contextual-listing-progress-bar">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <View
                key={i}
                style={[
                  commonStyles.progressSegment,
                  {
                    backgroundColor:
                      i < currentStep ? colors.primary : isDark ? '#3A3A3C' : '#E5E5EA',
                  },
                ]}
              />
            ))}
          </View>
        </View>
      </View>

      {/* Mod-context banner (D-18) — persists across Steps 1-6 */}
      {moderatorContext ? (
        <View
          style={[
            commonStyles.modContextBanner,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          testID="mod-context-banner"
        >
          <View style={[commonStyles.modContextStripe, { backgroundColor: colors.warning }]} />
          <View style={commonStyles.modContextBody}>
            <Text style={[commonStyles.modContextTitle, { color: colors.text }]}>
              {t('moderation.editOnBehalf.banner', {
                // Plan 05-05 walk fix: never render raw uid. Prefer ownerName
                // (firstName + lastName from User doc) → ownerEmail → fallback.
                // Raw uid was the previous fallback and made the banner look
                // broken when a property's ownerUid had no matching Mongo User
                // doc (seed data, deleted users, pre-migration listings).
                owner:
                  moderatorContext.ownerName ||
                  moderatorContext.ownerEmail ||
                  t('moderation.editOnBehalf.ownerFallback'),
              })}
            </Text>
            {moderatorContext.reason ? (
              <Text
                style={[commonStyles.modContextSubtitle, { color: colors.textSecondary }]}
                numberOfLines={3}
              >
                {moderatorContext.reason}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* Step body — KeyboardAwareScrollView (project pattern from LandlordApplicationScreen
          / ForgotPasswordScreen) auto-scrolls focused inputs above the keyboard. Required
          for Phase 11 Step 2 address input (sits below the map fold). M1 KBD-02 invariant
          preserved — no banned offset prop, no behavior= prop on a library KAV. */}
      <KeyboardAwareScrollView
        contentContainerStyle={commonStyles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {stepBody}
      </KeyboardAwareScrollView>

      {/* Quick 260525-x8l — photo-gate inline warning. Renders ONLY when
          isFinalSubmitBlocked (edit-mod + Step 6 + zero photos). Reuses the existing
          modContextBanner styles (same visual contract as NeedsMediaBanner without
          the "Add photos" CTA — the stepper has no in-flow photo-add affordance).
          Stripe uses colors.warning to match NeedsMediaBanner.tsx:42 + RejectionBanner. */}
      {isFinalSubmitBlocked ? (
        <View
          style={[
            commonStyles.modContextBanner,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          testID="contextual-listing-photo-gate-warning"
        >
          <View style={[commonStyles.modContextStripe, { backgroundColor: colors.warning }]} />
          <View style={commonStyles.modContextBody}>
            <Text style={[commonStyles.modContextTitle, { color: colors.text }]}>
              {t('moderation.needsMediaBanner.title')}
            </Text>
            <Text
              style={[commonStyles.modContextSubtitle, { color: colors.textSecondary }]}
              numberOfLines={3}
            >
              {t('moderation.needsMediaBanner.body')}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Footer — Back / Next (or Submit on Step 6) */}
      <View style={[commonStyles.footer, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          testID="contextual-listing-back"
          onPress={handleBack}
          disabled={isSubmitting}
          style={[commonStyles.footerButton, { backgroundColor: colors.surface }]}
        >
          <ChevronLeft color={colors.text} size={18} />
          <Text style={[commonStyles.footerButtonText, { color: colors.text }]}>
            {t('common.back')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="contextual-listing-next"
          onPress={handleNext}
          disabled={isSubmitting || isFinalSubmitBlocked}
          style={[
            commonStyles.footerButton,
            { backgroundColor: colors.primary },
            // Quick 260525-x8l — visual disabled state (opacity 0.5) matches project
            // convention for disabled mod buttons (PropertyDetailsScreen dock pattern).
            isFinalSubmitBlocked ? { opacity: 0.5 } : null,
          ]}
        >
          <Text style={[commonStyles.footerButtonText, { color: colors.activeChipText }]}>
            {submitLabel}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
