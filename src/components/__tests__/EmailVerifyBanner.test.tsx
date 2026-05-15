/**
 * src/components/__tests__/EmailVerifyBanner.test.tsx
 *
 * Quick task 260515-iqi — soft, dismissible unverified-email banner.
 *
 * Covers:
 *   - renders null when no user / when emailVerified === true
 *   - renders the bar when signed-in AND emailVerified !== true
 *   - the resend touchable calls resendVerificationEmail()
 *   - the recheck touchable calls recheckEmailVerified()
 *   - the dismiss "X" hides the banner for the session
 *
 * Pattern: react-test-renderer + act (no RTL/jest-native in dev deps).
 */

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { EmailVerifyBanner } from '../EmailVerifyBanner';

jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../context/LanguageContext', () => ({ useLanguage: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const { useAuth } = require('../../context/AuthContext');
const { useTheme } = require('../../theme/ThemeContext');
const { useLanguage } = require('../../context/LanguageContext');

const setup = (authOverrides: Record<string, unknown> = {}) => {
  const resendVerificationEmail = jest.fn().mockResolvedValue(undefined);
  const recheckEmailVerified = jest.fn().mockResolvedValue(undefined);
  useAuth.mockReturnValue({
    user: { localId: 'uid_1', email: 'a@b.com' },
    emailVerified: false,
    resendVerificationEmail,
    recheckEmailVerified,
    ...authOverrides,
  });
  useTheme.mockReturnValue({
    colors: {
      warning: '#f5a623',
      onWarning: '#fff',
      text: '#000',
      textSecondary: '#666',
    },
  });
  useLanguage.mockReturnValue({ language: 'en' });
  return { resendVerificationEmail, recheckEmailVerified };
};

// Walk the rendered tree and collect TouchableOpacity nodes by accessibilityLabel.
const findByLabel = (tree: TestRenderer.ReactTestRenderer, label: string) =>
  tree.root.findAll(
    n => !!n.props && n.props.accessibilityLabel === label,
  )[0];

// Render inside act() — EmailVerifyBanner holds useState, so the initial commit
// must be act-wrapped or RTR escalates the "not wrapped in act" warning.
const render = (): TestRenderer.ReactTestRenderer => {
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(<EmailVerifyBanner />);
  });
  return tree;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('EmailVerifyBanner (260515-iqi)', () => {
  test('renders null when there is no signed-in user', () => {
    setup({ user: null });
    const tree = render();
    expect(tree.toJSON()).toBeNull();
  });

  test('renders null when the email is already verified', () => {
    setup({ emailVerified: true });
    const tree = render();
    expect(tree.toJSON()).toBeNull();
  });

  test('renders the bar when signed in and unverified', () => {
    setup();
    const tree = render();
    expect(tree.toJSON()).not.toBeNull();
  });

  test('resend action calls resendVerificationEmail', async () => {
    const { resendVerificationEmail } = setup();
    const tree = render();
    const resendBtn = findByLabel(tree, 'Resend verification email');
    await act(async () => {
      resendBtn.props.onPress();
    });
    expect(resendVerificationEmail).toHaveBeenCalledTimes(1);
  });

  test('recheck action calls recheckEmailVerified', async () => {
    const { recheckEmailVerified } = setup();
    const tree = render();
    const recheckBtn = findByLabel(tree, "I've verified — refresh");
    await act(async () => {
      recheckBtn.props.onPress();
    });
    expect(recheckEmailVerified).toHaveBeenCalledTimes(1);
  });

  test('dismiss "X" hides the banner for the session', async () => {
    setup();
    const tree = render();
    expect(tree.toJSON()).not.toBeNull();
    const dismissBtn = findByLabel(tree, 'Dismiss');
    await act(async () => {
      dismissBtn.props.onPress();
    });
    expect(tree.toJSON()).toBeNull();
  });
});
