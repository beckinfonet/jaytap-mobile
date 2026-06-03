/**
 * IdentityCard test — avatar + name + email + role-badge slot + accountSettings pill.
 *
 * Phase 16 Plan 16-01 (PROF-01/02 / D-03). Pattern: react-test-renderer + act.
 *
 * Cases:
 *   1. role='admin' renders <RoleBadge> child with admin label.
 *   2. role='moderator' renders <RoleBadge> child with moderator label.
 *   3. role='user' renders no RoleBadge; tapping the card invokes onPress once.
 */
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';

jest.mock('../../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTheme } = require('../../../theme/ThemeContext');
import IdentityCard from '../IdentityCard';
import RoleBadge from '../RoleBadge';

const defaultColors = {
  surface: '#1c1c20',
  surface2: '#26262c',
  text: '#f4f4f6',
  textSecondary: 'rgba(244,244,246,0.60)',
  textTertiary: 'rgba(244,244,246,0.40)',
  accent: '#ff5a6f',
  accentSoft: 'rgba(255,90,111,0.16)',
  // 260603-fyy — Account Settings pill re-tinted to the landlord-green pair.
  landlordGreen: '#35c98f',
  landlordGreenSoft: 'rgba(53,201,143,0.16)',
};

beforeEach(() => {
  jest.clearAllMocks();
  useTheme.mockReturnValue({ isDark: true, colors: defaultColors });
});

const findTexts = (root: TestRenderer.ReactTestInstance): string[] =>
  root
    .findAllByType(Text)
    .map((n) => (Array.isArray(n.props.children) ? n.props.children.join('') : String(n.props.children ?? '')));

describe('IdentityCard', () => {
  test('role="admin" renders <RoleBadge> with admin label', () => {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <IdentityCard
          email="alice@example.com"
          role="admin"
          onPress={() => {}}
          accountSettingsLabel="Account settings ›"
          roleBadgeLabel="ADMIN"
        />,
      );
    });
    const badges = tree.root.findAllByType(RoleBadge);
    expect(badges.length).toBe(1);
    expect(badges[0].props.role).toBe('admin');
    expect(findTexts(tree.root)).toContain('ADMIN');
  });

  test('role="moderator" renders <RoleBadge> with moderator label', () => {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <IdentityCard
          email="mod@example.com"
          role="moderator"
          onPress={() => {}}
          accountSettingsLabel="Account settings ›"
          roleBadgeLabel="MODERATOR"
        />,
      );
    });
    const badges = tree.root.findAllByType(RoleBadge);
    expect(badges.length).toBe(1);
    expect(badges[0].props.role).toBe('moderator');
    expect(findTexts(tree.root)).toContain('MODERATOR');
  });

  test('role="user" renders no RoleBadge; tapping invokes onPress once', () => {
    const onPress = jest.fn();
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <IdentityCard
          email="user@example.com"
          role="user"
          onPress={onPress}
          accountSettingsLabel="Account settings ›"
        />,
      );
    });
    expect(tree.root.findAllByType(RoleBadge).length).toBe(0);

    // Find the outer TouchableOpacity by its accessibility role.
    const tappable = tree.root.find(
      (n) =>
        !!n.props &&
        n.props.accessibilityRole === 'button' &&
        n.props.accessibilityLabel === 'user@example.com',
    );
    expect(tappable).toBeDefined();
    act(() => {
      tappable!.props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
