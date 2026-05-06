/**
 * Phase 2 Plan 02-04a — Step5TitleDescription RTL smoke tests (FLOW-10).
 *
 * Test stack: react-test-renderer (matches Step1/Step3/Step4 tests).
 *
 * Coverage (FLOW-10 + SPEC §Step 5):
 *   - title: single-line TextInput.
 *   - description: multiline TextInput (numberOfLines, textAlignVertical via styles).
 *   - both required strings (validator enforces .trim() at Step 02-02).
 *   - keyboard avoidance is owned by KeyboardProvider at App.tsx root — no new
 *     keyboard work in this component (CONTEXT §<code_context>, RESEARCH §Reusable Assets).
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import type { ReactTestInstance } from 'react-test-renderer';
import { Step5TitleDescription } from '../Step5TitleDescription';
import { emptyFormBag } from '../validators';
import type { FormBag, FormErrorBag } from '../types';

jest.mock('../../../theme/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light' as const,
    colors: {
      text: '#000',
      textSecondary: '#666',
      background: '#FFF',
      surface: '#FFF',
      primary: '#007AFF',
      accent: '#FF385C',
      border: '#E0E0E0',
      error: '#FF3B30',
      activeChipBackground: '#2D2D2D',
      activeChipText: '#FFFFFF',
      inputBackground: '#FFF',
    },
    isDark: false,
    toggleTheme: () => undefined,
  }),
}));

jest.mock('../../../context/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    setLanguage: async () => undefined,
  }),
}));

function findByTestID(root: ReactTestInstance, testID: string): ReactTestInstance {
  return root.findByProps({ testID });
}

function tryFindByTestID(root: ReactTestInstance, testID: string): ReactTestInstance | null {
  const matches = root.findAllByProps({ testID });
  return matches.length > 0 ? matches[0] : null;
}

interface RenderArgs {
  values?: FormBag;
  errors?: FormErrorBag;
}

async function renderStep5(args: RenderArgs = {}) {
  const onChange = jest.fn();
  const values = args.values ?? emptyFormBag();
  const errors = args.errors ?? {};
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <Step5TitleDescription values={values} onChange={onChange} errors={errors} />,
    );
  });
  return { tree, root: tree.root, onChange };
}

describe('Step5TitleDescription (Plan 02-04a)', () => {
  // Test 1
  test('renders title TextInput with placeholder key contextualListing.step5.titlePlaceholder', async () => {
    const { root } = await renderStep5();
    const titleInput = findByTestID(root, 'content-title');
    expect(titleInput).toBeTruthy();
    // Mock t() returns the key verbatim → placeholder prop equals the key.
    expect(titleInput.props.placeholder).toBe('contextualListing.step5.titlePlaceholder');
  });

  // Test 2
  test('renders description multiline TextInput with placeholder key contextualListing.step5.descriptionPlaceholder', async () => {
    const { root } = await renderStep5();
    const descInput = findByTestID(root, 'content-description');
    expect(descInput).toBeTruthy();
    expect(descInput.props.placeholder).toBe('contextualListing.step5.descriptionPlaceholder');
  });

  // Test 3
  test('title onChangeText dispatches onChange("content", { ...prev, title })', async () => {
    const { root, onChange } = await renderStep5();
    const titleInput = findByTestID(root, 'content-title');
    await ReactTestRenderer.act(async () => {
      titleInput.props.onChangeText('Cozy 2-bed in Bishkek');
    });
    const last = onChange.mock.calls[onChange.mock.calls.length - 1];
    expect(last[0]).toBe('content');
    expect((last[1] as FormBag['content']).title).toBe('Cozy 2-bed in Bishkek');
  });

  // Test 4
  test('description onChangeText dispatches onChange("content", { ...prev, description })', async () => {
    const { root, onChange } = await renderStep5();
    const descInput = findByTestID(root, 'content-description');
    await ReactTestRenderer.act(async () => {
      descInput.props.onChangeText('Sunny apartment near Vefa');
    });
    const last = onChange.mock.calls[onChange.mock.calls.length - 1];
    expect(last[0]).toBe('content');
    expect((last[1] as FormBag['content']).description).toBe('Sunny apartment near Vefa');
  });

  // Test 5
  test("errors['content.title'] renders error text below title input", async () => {
    const { root } = await renderStep5({
      errors: { 'content.title': 'contextualListing.step5.titleRequired' },
    });
    expect(tryFindByTestID(root, 'content-title-error')).not.toBeNull();
  });

  // Test 6
  test("errors['content.description'] renders error text below description input", async () => {
    const { root } = await renderStep5({
      errors: { 'content.description': 'contextualListing.step5.descriptionRequired' },
    });
    expect(tryFindByTestID(root, 'content-description-error')).not.toBeNull();
  });

  // Test 7
  test('description input has multiline prop true', async () => {
    const { root } = await renderStep5();
    const descInput = findByTestID(root, 'content-description');
    expect(descInput.props.multiline).toBe(true);
  });
});
