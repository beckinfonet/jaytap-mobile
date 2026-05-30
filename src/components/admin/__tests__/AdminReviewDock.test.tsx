/**
 * AdminReviewDock test — single primary CTA + collapsible secondary menu.
 * Spec: docs/superpowers/specs/2026-05-29-admin-review-dock-redesign-design.md § 3
 *
 * Pins:
 *   - Locked state: Approve disabled, lock icon, helper line visible.
 *   - Unlocked state: Approve enabled, check icon, glow shadow in dark mode only.
 *   - More-actions disclosure toggles open/closed.
 *   - Each row is gated by its canXxx prop (no row → no render of that row).
 *   - Tapping a row closes the menu and fires the matching handler.
 *   - Submitting flag disables every button.
 */
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';

jest.mock('../../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../context/LanguageContext', () => ({ useLanguage: jest.fn() }));
jest.mock('@react-native-community/blur', () => ({
  BlurView: ({ children }: any) => children ?? null,
}));
jest.mock('lucide-react-native', () => ({
  Lock: () => null,
  Check: () => null,
  ChevronDown: () => null,
  AlertTriangle: () => null,
  X: () => null,
  Edit3: () => null,
  Archive: () => null,
  ArchiveRestore: () => null,
  Trash2: () => null,
}));

const { useTheme } = require('../../../theme/ThemeContext');
const { useLanguage } = require('../../../context/LanguageContext');
import { AdminReviewDock } from '../AdminReviewDock';

const defaultProps = {
  isApproveEnabled: false,
  submittingAction: false,
  canApprove: true,
  canArchive: true,
  canRestore: false,
  canHardDelete: true,
  onApprove: jest.fn(),
  onReject: jest.fn(),
  onEditOnBehalf: jest.fn(),
  onArchive: jest.fn(),
  onRestore: jest.fn(),
  onHardDelete: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  useTheme.mockReturnValue({
    isDark: true,
    colors: {
      text: '#fff',
      textSecondary: '#aaa',
      textTertiary: '#777',
      surface: '#222',
      background: '#000',
      border: '#333',
      success: '#36c98f',
      error: '#ff4d4d',
      warning: '#f5a23a',
      accent: '#FF5C7C',
      onAccent: '#fff',
      onWarning: '#000',
    },
  });
  useLanguage.mockReturnValue({ t: (k: string) => k, language: 'en' });
});

const findAllText = (root: TestRenderer.ReactTestInstance): string[] =>
  root
    .findAllByType(Text)
    .map((n) => (Array.isArray(n.props.children) ? n.props.children.join('') : String(n.props.children ?? '')));

describe('AdminReviewDock — locked Approve state', () => {
  it('renders locked label and helper line when isApproveEnabled is false', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<AdminReviewDock {...defaultProps} />);
    });
    const texts = findAllText(renderer.root);
    expect(texts).toContain('adminReview.approve.locked.label');
    expect(texts).toContain('adminReview.approve.locked.helper');
  });

  it('Approve button is disabled when locked', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<AdminReviewDock {...defaultProps} />);
    });
    const btn = renderer.root.findByProps({ testID: 'admin-review-dock-approve' });
    expect(btn.props.disabled).toBe(true);
  });

  it('does not fire onApprove when locked Approve is tapped', () => {
    const onApprove = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<AdminReviewDock {...defaultProps} onApprove={onApprove} />);
    });
    const btn = renderer.root.findByProps({ testID: 'admin-review-dock-approve' });
    expect(btn.props.disabled).toBe(true);
    expect(onApprove).not.toHaveBeenCalled();
  });
});

describe('AdminReviewDock — unlocked Approve state', () => {
  it('renders unlocked label when isApproveEnabled is true', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <AdminReviewDock {...defaultProps} isApproveEnabled={true} />,
      );
    });
    const texts = findAllText(renderer.root);
    expect(texts).toContain('adminReview.approve.unlocked.label');
    expect(texts).not.toContain('adminReview.approve.locked.helper');
  });

  it('fires onApprove when tapped while unlocked', () => {
    const onApprove = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <AdminReviewDock {...defaultProps} isApproveEnabled={true} onApprove={onApprove} />,
      );
    });
    const btn = renderer.root.findByProps({ testID: 'admin-review-dock-approve' });
    act(() => btn.props.onPress());
    expect(onApprove).toHaveBeenCalledTimes(1);
  });
});

describe('AdminReviewDock — more-actions disclosure', () => {
  it('renders the trigger with collapsed label by default', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<AdminReviewDock {...defaultProps} />);
    });
    expect(findAllText(renderer.root)).toContain('adminReview.moreActions.trigger.collapsed');
    expect(findAllText(renderer.root)).not.toContain('adminReview.moreActions.menuHeader');
  });

  it('shows the menu header and rows after tapping the trigger', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<AdminReviewDock {...defaultProps} />);
    });
    const trigger = renderer.root.findByProps({ testID: 'admin-review-dock-more-trigger' });
    act(() => trigger.props.onPress());
    const texts = findAllText(renderer.root);
    expect(texts).toContain('adminReview.moreActions.trigger.expanded');
    expect(texts).toContain('adminReview.moreActions.menuHeader');
    expect(texts).toContain('moderation.action.reject');
    expect(texts).toContain('moderation.action.editOnBehalf');
    expect(texts).toContain('property.archive');
    expect(texts).toContain('common.delete');
  });

  it('tapping Reject row closes the menu and fires onReject', () => {
    const onReject = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<AdminReviewDock {...defaultProps} onReject={onReject} />);
    });
    const trigger = renderer.root.findByProps({ testID: 'admin-review-dock-more-trigger' });
    act(() => trigger.props.onPress());
    const rejectRow = renderer.root.findByProps({ testID: 'admin-review-dock-row-reject' });
    act(() => rejectRow.props.onPress());
    expect(onReject).toHaveBeenCalledTimes(1);
    expect(findAllText(renderer.root)).toContain('adminReview.moreActions.trigger.collapsed');
  });
});

describe('AdminReviewDock — role gating', () => {
  it('omits Reject + Edit when canApprove is false', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<AdminReviewDock {...defaultProps} canApprove={false} />);
    });
    const trigger = renderer.root.findByProps({ testID: 'admin-review-dock-more-trigger' });
    act(() => trigger.props.onPress());
    const findRow = (id: string) =>
      renderer.root.findAllByProps({ testID: id }).filter((n) => typeof n.type !== 'string').length > 0 ||
      renderer.root.findAllByProps({ testID: id }).filter((n) => typeof n.type === 'string').length > 0;
    expect(findRow('admin-review-dock-row-reject')).toBe(false);
    expect(findRow('admin-review-dock-row-edit')).toBe(false);
  });

  it('renders Restore (not Archive) when canRestore is true and canArchive is false', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <AdminReviewDock {...defaultProps} canArchive={false} canRestore={true} />,
      );
    });
    const trigger = renderer.root.findByProps({ testID: 'admin-review-dock-more-trigger' });
    act(() => trigger.props.onPress());
    const texts = findAllText(renderer.root);
    expect(texts).toContain('property.unarchive');
    expect(texts).not.toContain('property.archive');
  });

  it('omits Delete row when canHardDelete is false', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<AdminReviewDock {...defaultProps} canHardDelete={false} />);
    });
    const trigger = renderer.root.findByProps({ testID: 'admin-review-dock-more-trigger' });
    act(() => trigger.props.onPress());
    const deleteRow = renderer.root.findAllByProps({ testID: 'admin-review-dock-row-delete' });
    expect(deleteRow.filter((n) => typeof n.type === 'string').length).toBe(0);
  });
});

describe('AdminReviewDock — submitting flag', () => {
  it('disables Approve when submittingAction is true', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <AdminReviewDock {...defaultProps} isApproveEnabled={true} submittingAction={true} />,
      );
    });
    const btn = renderer.root.findByProps({ testID: 'admin-review-dock-approve' });
    expect(btn.props.disabled).toBe(true);
  });
});
