/**
 * src/components/StepperInput.tsx
 *
 * Phase 7 Plan 07-01 — Reusable tap-only numeric stepper (FORM-01 + FORM-03).
 *
 * - Circular `−` and `+` Pressable buttons (ICON_CIRCLE = 34) inside TAP = 44 hit
 *   areas, mirroring AuthModalCloseButton.tsx:8-9 sizing. Forked locally (not
 *   imported) per CONTEXT.md "Reusable Assets" note — keeps coupling looser.
 * - `hitSlop` set on both ± buttons regardless of disabled state (Claude's
 *   Discretion: "always 44pt regardless of state" per CONTEXT.md D-11 footnote
 *   and the FORM-03 ≥44pt invariant).
 * - Boundary state (`−` at min OR `+` at max) sets `disabled={true}` on the
 *   boundary button AND drops only the glyph color to `colors.textSecondary`
 *   (D-03 — circle outline + fill stay at the active treatment so the row never
 *   reflows or feels broken).
 * - Empty state (`value === undefined`) renders em-dash `—` (U+2014) per D-02.
 *   Integers render via `String(v)` (strips trailing `.0`); 0.5-step values
 *   render via `v.toFixed(1)` (e.g. `1.5`) per D-04.
 * - `+` from undefined initializes to `min` (FORM-01 spec contract). `−` from
 *   undefined is a no-op (never goes negative, never regresses to undefined).
 *
 * Behavior NOT shipped (deferred per CONTEXT.md "Deferred Ideas"):
 *   - Long-press accelerated increment → M5+.
 *   - `1½` Unicode glyph for half-bathrooms → M5+ (we ship `1.5` decimal).
 *
 * Consumed by Plan 07-04 (Step3BasicInfo integration — bedrooms + bathroomCount).
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

/** Minimum tap target (Apple HIG / Material). Forked from AuthModalCloseButton.tsx:7-8. */
const TAP = 44;
const ICON_CIRCLE = 34;

/**
 * Format the stepper value for the center cell.
 * - undefined → em-dash `—` (U+2014) per D-02
 * - integer → bare string per D-04 (e.g. 5 → '5', strips trailing `.0`)
 * - half-step → one-decimal string per D-04 (e.g. 1.5 → '1.5')
 */
const formatValue = (v: number | undefined): string =>
  v === undefined ? '—' : Number.isInteger(v) ? String(v) : v.toFixed(1);

export interface StepperInputProps {
  /** Current numeric value; `undefined` is the canonical "not provided" state. */
  value: number | undefined;
  /** Called with the new value on tap. Passes `min` on `+` from undefined. */
  onChange: (v: number | undefined) => void;
  /** Inclusive lower bound; `−` at `min` is a no-op. */
  min: number;
  /** Inclusive upper bound; `+` at `max` is a no-op. */
  max: number;
  /** Increment unit. 1 for integers (bedrooms), 0.5 for half-step (bathroomCount). */
  step: number;
  /** Already-localized label string — caller does the `t()` lookup. */
  label: string;
  /** Optional base testID; component derives `${testID}-minus`, `-value`, `-plus`. */
  testID?: string;
  /** Optional row-container accessibilityLabel (button labels are auto-derived from `label`). */
  accessibilityLabel?: string;
}

export const StepperInput: React.FC<StepperInputProps> = ({
  value,
  onChange,
  min,
  max,
  step,
  label,
  testID,
  accessibilityLabel,
}) => {
  const { colors } = useTheme();

  // D-03 — undefined-state `−` is disabled (tapping `−` from undefined is a no-op
  // per FORM-01 spec). At-or-below `min` is also disabled to prevent negative drift.
  const isMinDisabled = value === undefined || value <= min;
  // `+` is disabled only when a concrete value has reached `max`; from undefined
  // the user can still tap `+` to initialize to `min` (FORM-01 spec contract).
  const isMaxDisabled = value !== undefined && value >= max;

  const handleDecrement = (): void => {
    if (isMinDisabled) return; // no-op short-circuit at min boundary OR undefined
    // value is defined and > min here (per isMinDisabled false branch).
    onChange((value as number) - step);
  };

  const handleIncrement = (): void => {
    if (isMaxDisabled) return; // no-op short-circuit at max boundary
    if (value === undefined) {
      onChange(min); // FORM-01: `+` from undefined initializes to `min`.
      return;
    }
    onChange(Math.min(value + step, max));
  };

  const minusTestID = testID ? `${testID}-minus` : undefined;
  const valueTestID = testID ? `${testID}-value` : undefined;
  const plusTestID = testID ? `${testID}-plus` : undefined;

  const circleBg = colors.activeChipBackground ?? colors.border;

  return (
    <View accessibilityLabel={accessibilityLabel}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <View style={styles.controlRow}>
        <Pressable
          onPress={handleDecrement}
          disabled={isMinDisabled}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          accessibilityState={{ disabled: isMinDisabled }}
          testID={minusTestID}
          style={({ pressed }) => [
            styles.hitArea,
            { opacity: pressed && !isMinDisabled ? 0.7 : 1 },
          ]}
        >
          <View style={[styles.circle, { backgroundColor: circleBg }]}>
            <Text
              style={[
                styles.glyph,
                { color: isMinDisabled ? colors.textSecondary : colors.text },
              ]}
            >
              {'−'}
            </Text>
          </View>
        </Pressable>

        <Text style={[styles.value, { color: colors.text }]} testID={valueTestID}>
          {formatValue(value)}
        </Text>

        <Pressable
          onPress={handleIncrement}
          disabled={isMaxDisabled}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          accessibilityState={{ disabled: isMaxDisabled }}
          testID={plusTestID}
          style={({ pressed }) => [
            styles.hitArea,
            { opacity: pressed && !isMaxDisabled ? 0.7 : 1 },
          ]}
        >
          <View style={[styles.circle, { backgroundColor: circleBg }]}>
            <Text
              style={[
                styles.glyph,
                { color: isMaxDisabled ? colors.textSecondary : colors.text },
              ]}
            >
              +
            </Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  hitArea: {
    width: TAP,
    height: TAP,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    width: ICON_CIRCLE,
    height: ICON_CIRCLE,
    borderRadius: ICON_CIRCLE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glyph: {
    fontSize: 22,
    fontWeight: '600',
  },
  value: {
    fontSize: 20,
    fontWeight: '600',
    minWidth: 48,
    textAlign: 'center',
  },
});
