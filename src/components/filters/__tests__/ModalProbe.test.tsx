/**
 * src/components/filters/__tests__/ModalProbe.test.tsx
 *
 * Phase 14 Plan 14-01 Wave-0 probe.
 *
 * Diagnostic ONLY — always exits 0 (ends with `expect(true).toBe(true)`), so
 * the commit-time `npx jest src/components/filters/` gate in Task 7 is
 * self-passing regardless of the Modal-renderability outcome. The probe's
 * actual PASS/FAIL signal is encoded by writing a single-line file at
 * `.planning/phases/14-filter-ui-variants-guided-steps-cascading-reveal-homescreen-/14-MODAL-PROBE-OUTCOME.txt`.
 *
 * Plan 14-03 reads the outcome file:
 *   - PASS → ship `GuidedFilterSheet.test.tsx` rendering the full Modal
 *   - FAIL → extract a `GuidedFilterSheetContent` inner component (sheet body
 *     without the Modal wrapper) and test that directly.
 *
 * See 14-VALIDATION.md §"Wave 0 Requirements" + 14-RESEARCH.md §A5 (Modal-test-renderer risk).
 *
 * Pattern: react-test-renderer + act (no @testing-library/react-native — not in devDeps).
 */
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Modal, Text, View } from 'react-native';

// tsconfig.json restricts `types` to ["jest"] (no @types/node), so fs/path/__dirname
// must be accessed via require + declare. Jest runs the test from a Node runtime
// where these are always available; the types are just trimmed out of the project.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs: { writeFileSync: (path: string, data: string, encoding: string) => void } = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path: { resolve: (...segments: string[]) => string } = require('path');
declare const __dirname: string;

// Relative depth from `src/components/filters/__tests__/`: up 4 = repo root,
// then descend into `.planning/phases/14-.../14-MODAL-PROBE-OUTCOME.txt`.
const OUTCOME_PATH = path.resolve(
  __dirname,
  '../../../../.planning/phases/14-filter-ui-variants-guided-steps-cascading-reveal-homescreen-/14-MODAL-PROBE-OUTCOME.txt',
);

test('Modal-mount probe writes PASS or FAIL outcome and always passes', () => {
  let outcome: 'PASS' | 'FAIL' = 'FAIL';
  // TS narrows `tree` to `never` after the initial `= null` if not annotated; use
  // an explicit union type with a wrapper object so TS keeps the wider shape.
  const treeRef: { current: TestRenderer.ReactTestRenderer | null } = { current: null };

  try {
    act(() => {
      treeRef.current = TestRenderer.create(
        <Modal visible transparent animationType="none" onRequestClose={() => {}}>
          <View>
            <Text>x</Text>
          </View>
        </Modal>,
      );
    });
    const tree = treeRef.current;
    if (tree && tree.toJSON() !== null) {
      act(() => {
        tree.update(
          <Modal visible={false} transparent animationType="none" onRequestClose={() => {}}>
            <View>
              <Text>x</Text>
            </View>
          </Modal>,
        );
      });
      outcome = 'PASS';
    } else {
      outcome = 'FAIL';
    }
  } catch (_err) {
    outcome = 'FAIL';
  } finally {
    if (treeRef.current) {
      try {
        treeRef.current.unmount();
      } catch {
        // swallow — probe outcome already captured
      }
    }
  }

  try {
    fs.writeFileSync(OUTCOME_PATH, outcome + '\n', 'utf8');
  } catch (_e) {
    // If the planning dir is missing for some reason, the outcome write fails
    // silently — Task 7's commit-time gate will surface the absence. Probe
    // itself must still exit 0 per its always-pass contract.
  }

  // Load-bearing: console.log surfaces outcome in jest tail for SUMMARY transcription.
  // eslint-disable-next-line no-console
  console.log('[Wave-0 ModalProbe] outcome=' + outcome);

  // Load-bearing: guarantees the test ALWAYS passes so the commit-time
  // `npx jest src/components/filters/` gate never fails on this probe.
  expect(true).toBe(true);
});
