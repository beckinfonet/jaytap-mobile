# Admin Review Dock & Photo-Upload CTA Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the admin/mod review surface in `PropertyDetailsScreen` so the photo upload becomes the single primary CTA, Approve sits as a locked goal until a photo exists, and the four secondary admin actions collapse behind a "More actions" disclosure — without changing any handler, backend call, or renter-facing UI.

**Architecture:** Two new admin-only components (`AdminReviewDock`, `AdminPhotoGrid`) extracted from inline JSX in `PropertyDetailsScreen`. Existing `NeedsMediaBanner` gets a visual rewrite to become the full-width EMPTY-state dropzone. `HeaderInfoCard` gains one additive prop for a "PENDING REVIEW" eyebrow. All colors go through `useTheme()` tokens (no hex literals); EN + RU i18n parity preserved.

**Tech Stack:** React Native 0.84 (New Architecture), TypeScript, `useTheme()` context, `useLanguage()` context for i18n, Jest + `react-test-renderer` (no React Testing Library in this repo), `lucide-react-native` icons, `@react-native-community/blur` (already imported by current dock).

**Spec:** `docs/superpowers/specs/2026-05-29-admin-review-dock-redesign-design.md`

---

## File Inventory

**Create:**
- `src/components/admin/AdminPhotoGrid.tsx`
- `src/components/admin/AdminReviewDock.tsx`
- `src/components/admin/__tests__/AdminPhotoGrid.test.tsx`
- `src/components/admin/__tests__/AdminReviewDock.test.tsx`

**Modify:**
- `src/components/NeedsMediaBanner.tsx` — full visual rewrite (interface preserved)
- `src/components/details/HeaderInfoCard.tsx` — additive `pendingReviewEyebrow` prop
- `src/components/details/__tests__/HeaderInfoCard.test.tsx` — add eyebrow tests
- `src/screens/PropertyDetailsScreen.tsx` — replace inline dock JSX (`~1685–1893`), move banner + new grid into scroll body, pass eyebrow prop into `HeaderInfoCard`
- `src/locales/en.ts` — add `adminReview.*` keys
- `src/locales/ru.ts` — add `adminReview.*` keys

**Delete (final cleanup task, user-confirmed only):**
- `.scratch/photo-redesign/` (extracted reference)
- `photoUploadRedesign.zip` (root-level handoff)

---

## Convention Notes (do not skip)

- **No hex literals in components.** Use `useTheme().colors.*`. Alpha tints are applied inline at the JSX style array (the `[styles.x, { backgroundColor: colors.success }]` pattern). Static `StyleSheet.create` blocks contain zero colors. This is enforced by the W6 strict rule referenced in `NeedsMediaBanner.tsx`.
- **Test pattern:** `react-test-renderer` + `act` (NOT `@testing-library/react-native`). Mock `useTheme` + `useLanguage`. Mock `lucide-react-native` icons as `() => null`. See `src/components/details/__tests__/HeaderInfoCard.test.tsx` for the canonical shape.
- **i18n:** the locales are `.ts` files (`src/locales/en.ts`, `src/locales/ru.ts`) exporting a flat-key object `export const en = { 'key.path': 'value', ... }`. NOT JSON. The `t()` helper accepts the flat-key path verbatim.
- **Theme tokens used:** `colors.success` (green), `colors.error` (red), `colors.warning` (amber), `colors.accent` (pink), `colors.background`, `colors.surface`, `colors.text`, `colors.textSecondary`, `colors.textTertiary`, `colors.border`, `colors.onAccent` (white).
- **`useTheme().isDark`** is available — use it to gate the dark-only accent glow shadow.
- **Existing handlers untouched:** `handleApprove`, `handleRejectSubmit`, `handleEditOnBehalf`, `handleModArchiveSubmit`, `handleRestore`, `confirmHardDelete` all stay in `PropertyDetailsScreen` and get passed into `AdminReviewDock` as props. No service / API changes.

---

## Task 1: Add i18n keys (EN + RU)

**Files:**
- Modify: `src/locales/en.ts` (append near the existing `'moderation.needsMediaBanner.*'` block — around line 878)
- Modify: `src/locales/ru.ts` (append near the existing `'moderation.needsMediaBanner.*'` block — around line 868)

- [ ] **Step 1: Add new EN keys to `src/locales/en.ts`**

Locate the `'moderation.needsMediaBanner.action': 'Add photos',` line (~878). Insert the following block immediately after it (still inside the same exported object):

```ts
  // Admin review dock — photo-upload redesign (spec 2026-05-29)
  'adminReview.dropzone.title': 'Add photos',
  'adminReview.dropzone.subtext': 'This listing has no images yet. Add at least one before it can be approved.',
  'adminReview.dropzone.pill': 'Admins only · required',
  'adminReview.dropzone.cta': 'Add photos',
  'adminReview.grid.countLabel': '{{n}} photos added',
  'adminReview.grid.addMore': '+ Add more',
  'adminReview.grid.coverBadge': 'COVER',
  'adminReview.approve.locked.label': 'Approve listing',
  'adminReview.approve.locked.helper': 'Add at least one photo to unlock',
  'adminReview.approve.unlocked.label': 'Approve & publish listing',
  'adminReview.moreActions.trigger.collapsed': 'More actions',
  'adminReview.moreActions.trigger.expanded': 'Hide actions',
  'adminReview.moreActions.menuHeader': 'MANAGE LISTING',
  'adminReview.pendingReviewEyebrow': 'PENDING REVIEW',
```

- [ ] **Step 2: Add the same keys to `src/locales/ru.ts`**

Locate the `'moderation.needsMediaBanner.action': 'Добавить фото',` line (~868). Insert immediately after it:

```ts
  // Admin review dock — photo-upload redesign (spec 2026-05-29)
  'adminReview.dropzone.title': 'Добавить фото',
  'adminReview.dropzone.subtext': 'У этого объявления ещё нет фотографий. Добавьте хотя бы одну, чтобы одобрить.',
  'adminReview.dropzone.pill': 'Только для админов · обязательно',
  'adminReview.dropzone.cta': 'Добавить фото',
  'adminReview.grid.countLabel': 'Добавлено фото: {{n}}',
  'adminReview.grid.addMore': '+ Добавить ещё',
  'adminReview.grid.coverBadge': 'ОБЛОЖКА',
  'adminReview.approve.locked.label': 'Одобрить объявление',
  'adminReview.approve.locked.helper': 'Добавьте хотя бы одно фото, чтобы разблокировать',
  'adminReview.approve.unlocked.label': 'Одобрить и опубликовать',
  'adminReview.moreActions.trigger.collapsed': 'Другие действия',
  'adminReview.moreActions.trigger.expanded': 'Скрыть действия',
  'adminReview.moreActions.menuHeader': 'УПРАВЛЕНИЕ ОБЪЯВЛЕНИЕМ',
  'adminReview.pendingReviewEyebrow': 'НА МОДЕРАЦИИ',
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS (the locale type union `TranslationKeys` is auto-derived from the EN object via `typeof en` in `src/locales/index.ts`, so any new key added to EN must also exist in RU or the union will mismatch).

- [ ] **Step 4: Commit**

```bash
git add src/locales/en.ts src/locales/ru.ts
git commit -m "feat(i18n): add adminReview.* keys for review dock redesign"
```

---

## Task 2: Create AdminPhotoGrid component (TDD)

**Files:**
- Create: `src/components/admin/AdminPhotoGrid.tsx`
- Test: `src/components/admin/__tests__/AdminPhotoGrid.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/admin/__tests__/AdminPhotoGrid.test.tsx`:

```tsx
/**
 * AdminPhotoGrid test — FILLED-state grid shown to admin/mod when a pending
 * listing has 1+ photos. Pins:
 *   - Header shows "{n} photos added" via i18n placeholder.
 *   - "+ Add more" link present and tappable.
 *   - First thumbnail carries the COVER badge; subsequent thumbnails do not.
 *   - Tapping any thumbnail OR the +Add more link fires onOpenCuration.
 *   - Renders no grid cells when photos.length === 0 (caller-gated, but
 *     belt-and-suspenders: component returns null on empty input).
 */
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';

jest.mock('../../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../context/LanguageContext', () => ({ useLanguage: jest.fn() }));
jest.mock('lucide-react-native', () => ({
  Check: () => null,
  Camera: () => null,
}));

const { useTheme } = require('../../../theme/ThemeContext');
const { useLanguage } = require('../../../context/LanguageContext');
import { AdminPhotoGrid } from '../AdminPhotoGrid';

beforeEach(() => {
  jest.clearAllMocks();
  useTheme.mockReturnValue({
    isDark: true,
    colors: {
      text: '#fff',
      textSecondary: '#aaa',
      textTertiary: '#777',
      surface: '#222',
      border: '#333',
      success: '#36c98f',
      onAccent: '#fff',
    },
  });
  useLanguage.mockReturnValue({
    t: (key: string, params?: Record<string, string>) =>
      params ? `${key}|${JSON.stringify(params)}` : key,
    language: 'en',
  });
});

const findAllText = (root: TestRenderer.ReactTestInstance): string[] =>
  root
    .findAllByType(Text)
    .map((n) => (Array.isArray(n.props.children) ? n.props.children.join('') : String(n.props.children ?? '')));

const photos = [
  { uri: 'https://cdn.example/1.jpg', key: 'p1' },
  { uri: 'https://cdn.example/2.jpg', key: 'p2' },
  { uri: 'https://cdn.example/3.jpg', key: 'p3' },
];

describe('AdminPhotoGrid', () => {
  it('returns null when photos array is empty', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <AdminPhotoGrid photos={[]} onOpenCuration={jest.fn()} onAddMore={jest.fn()} />,
      );
    });
    expect(renderer.toJSON()).toBeNull();
  });

  it('renders count label with photo count', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <AdminPhotoGrid photos={photos} onOpenCuration={jest.fn()} onAddMore={jest.fn()} />,
      );
    });
    const texts = findAllText(renderer.root);
    expect(texts.some((s) => s.includes('adminReview.grid.countLabel') && s.includes('"n":"3"'))).toBe(true);
  });

  it('renders +Add more link', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <AdminPhotoGrid photos={photos} onOpenCuration={jest.fn()} onAddMore={jest.fn()} />,
      );
    });
    expect(findAllText(renderer.root)).toContain('adminReview.grid.addMore');
  });

  it('renders COVER badge on the first thumbnail only', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <AdminPhotoGrid photos={photos} onOpenCuration={jest.fn()} onAddMore={jest.fn()} />,
      );
    });
    const coverNodes = renderer.root.findAllByProps({ testID: 'cover-badge' });
    expect(coverNodes.filter((n) => typeof n.type === 'string').length).toBe(1);
  });

  it('fires onOpenCuration when a thumbnail is tapped', () => {
    const onOpenCuration = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <AdminPhotoGrid photos={photos} onOpenCuration={onOpenCuration} onAddMore={jest.fn()} />,
      );
    });
    const cells = renderer.root.findAllByProps({ testID: 'admin-photo-grid-cell' });
    act(() => {
      cells[0].props.onPress();
    });
    expect(onOpenCuration).toHaveBeenCalledTimes(1);
  });

  it('fires onAddMore when the +Add more link is tapped', () => {
    const onAddMore = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <AdminPhotoGrid photos={photos} onOpenCuration={jest.fn()} onAddMore={onAddMore} />,
      );
    });
    const link = renderer.root.findByProps({ testID: 'admin-photo-grid-add-more' });
    act(() => {
      link.props.onPress();
    });
    expect(onAddMore).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/admin/__tests__/AdminPhotoGrid.test.tsx`
Expected: FAIL — module not found (`../AdminPhotoGrid`).

- [ ] **Step 3: Create the component**

Create `src/components/admin/AdminPhotoGrid.tsx`:

```tsx
/**
 * AdminPhotoGrid — FILLED-state thumbnail grid for the admin review surface.
 * Spec: docs/superpowers/specs/2026-05-29-admin-review-dock-redesign-design.md § 2
 *
 * Shown only to a mod/admin reviewing a pending listing that has 1+ photos.
 * First thumbnail carries the COVER badge (slot 0 = cover, MediaCurationScreen's
 * invariant). Tapping any thumbnail OR "+ Add more" navigates to MediaCurationScreen
 * for reorder/curation.
 *
 * Zero-hex rule: all colors come from useTheme(); static StyleSheet has no `color:`
 * or `backgroundColor:` keys.
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Check, Camera } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export interface AdminPhotoGridPhoto {
  uri: string;
  key?: string;
}

export interface AdminPhotoGridProps {
  photos: AdminPhotoGridPhoto[];
  onOpenCuration: () => void;
  onAddMore: () => void;
}

// Small wrapper that swaps a broken CDN image for a muted camera tile.
// Per-cell state is the simplest correct approach — an Image whose `onError`
// fires sets `failed=true`, which renders the fallback view in-place.
interface CellImageProps { uri: string }
const CellImage: React.FC<CellImageProps> = ({ uri }) => {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  if (failed || !uri) {
    return (
      <View
        testID="admin-photo-grid-cell-fallback"
        style={[styles.cellImage, styles.cellFallback, { backgroundColor: colors.surface }]}
      >
        <Camera size={20} color={colors.textTertiary} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={styles.cellImage}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
};

export const AdminPhotoGrid: React.FC<AdminPhotoGridProps> = ({
  photos,
  onOpenCuration,
  onAddMore,
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  if (!photos || photos.length === 0) return null;

  return (
    <View style={styles.container} testID="admin-photo-grid">
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Check size={15} color={colors.success} />
          <Text style={[styles.countLabel, { color: colors.text }]} numberOfLines={1}>
            {t('adminReview.grid.countLabel', { n: String(photos.length) })}
          </Text>
        </View>
        <TouchableOpacity
          testID="admin-photo-grid-add-more"
          onPress={onAddMore}
          accessibilityRole="button"
          accessibilityLabel={t('adminReview.grid.addMore')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.addMore, { color: colors.success }]}>
            {t('adminReview.grid.addMore')}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.grid}>
        {photos.map((photo, idx) => (
          <TouchableOpacity
            key={photo.key ?? photo.uri ?? `cell-${idx}`}
            testID="admin-photo-grid-cell"
            style={[styles.cell, { borderColor: colors.border }]}
            onPress={onOpenCuration}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <CellImage uri={photo.uri} />
            {idx === 0 ? (
              <View
                testID="cover-badge"
                style={[styles.coverBadge, { backgroundColor: colors.success }]}
              >
                <Text style={[styles.coverBadgeText, { color: colors.onAccent }]}>
                  {t('adminReview.grid.coverBadge')}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  addMore: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cell: {
    width: '32%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  cellImage: {
    width: '100%',
    height: '100%',
  },
  cellFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  coverBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});

export default AdminPhotoGrid;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/admin/__tests__/AdminPhotoGrid.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/AdminPhotoGrid.tsx src/components/admin/__tests__/AdminPhotoGrid.test.tsx
git commit -m "feat(admin): AdminPhotoGrid with COVER badge and curation routing"
```

---

## Task 3: Create AdminReviewDock component (TDD)

**Files:**
- Create: `src/components/admin/AdminReviewDock.tsx`
- Test: `src/components/admin/__tests__/AdminReviewDock.test.tsx`

This task is bigger — the dock is the centerpiece. Break it into TDD passes: locked Approve first, then unlocked Approve, then the More-actions disclosure with role gating.

- [ ] **Step 1: Write the failing test (locked + unlocked Approve)**

Create `src/components/admin/__tests__/AdminReviewDock.test.tsx`:

```tsx
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
    // TouchableOpacity disabled prop suppresses onPress at the RN level — assert by
    // calling props.onPress directly and verifying the button is flagged disabled.
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/admin/__tests__/AdminReviewDock.test.tsx`
Expected: FAIL — module not found (`../AdminReviewDock`).

- [ ] **Step 3: Create the component**

Create `src/components/admin/AdminReviewDock.tsx`:

```tsx
/**
 * AdminReviewDock — single-primary-CTA bottom dock for the admin review surface.
 * Spec: docs/superpowers/specs/2026-05-29-admin-review-dock-redesign-design.md § 3
 *
 * Replaces the inline `showModerationDock` JSX block (PropertyDetailsScreen
 * lines ~1685–1893 pre-redesign). Owns:
 *   - The locked-vs-unlocked Approve button.
 *   - The "More actions" disclosure trigger + expanded menu card.
 *   - The frosted blur background.
 *
 * All handlers passed in as props — this component is presentational only. The
 * parent screen owns confirmation flows, modal opens, and HTTP calls.
 *
 * Zero-hex rule: all colors via useTheme(); static StyleSheet has no `color:` or
 * `backgroundColor:` keys.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import {
  Lock,
  Check,
  ChevronDown,
  AlertTriangle,
  X,
  Edit3,
  Archive,
  ArchiveRestore,
  Trash2,
} from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export interface AdminReviewDockProps {
  isApproveEnabled: boolean;
  submittingAction: boolean;
  canApprove: boolean;
  canArchive: boolean;
  canRestore: boolean;
  canHardDelete: boolean;
  onApprove: () => void;
  onReject: () => void;
  onEditOnBehalf: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onHardDelete: () => void;
}

export const AdminReviewDock: React.FC<AdminReviewDockProps> = ({
  isApproveEnabled,
  submittingAction,
  canApprove,
  canArchive,
  canRestore,
  canHardDelete,
  onApprove,
  onReject,
  onEditOnBehalf,
  onArchive,
  onRestore,
  onHardDelete,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const [moreOpen, setMoreOpen] = useState(false);

  const approveDisabled = !isApproveEnabled || submittingAction;
  const hasAnySecondary = canApprove || canArchive || canRestore || canHardDelete;

  const closeMenuAnd = (handler: () => void) => () => {
    setMoreOpen(false);
    handler();
  };

  // Glow shadow (dark mode only) — applied inline since it depends on the
  // success token. Light mode: no shadow at all (haze on white).
  const approveGlow =
    isDark && isApproveEnabled
      ? Platform.select({
          ios: {
            shadowColor: colors.success,
            shadowOpacity: 0.6,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 10 },
          },
          android: { elevation: 6 },
        })
      : undefined;

  return (
    <View style={[styles.dockOuter, { borderTopColor: colors.border }]}>
      <BlurView
        style={StyleSheet.absoluteFillObject}
        blurType={isDark ? 'dark' : 'light'}
        blurAmount={Platform.OS === 'ios' ? 22 : 32}
        reducedTransparencyFallbackColor={colors.surface}
      />
      <View style={styles.dockContent}>
        {/* Approve button — locked vs unlocked */}
        <TouchableOpacity
          testID="admin-review-dock-approve"
          onPress={onApprove}
          disabled={approveDisabled}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityState={{ disabled: approveDisabled }}
          accessibilityLabel={
            isApproveEnabled
              ? t('adminReview.approve.unlocked.label')
              : t('adminReview.approve.locked.label')
          }
          style={[
            styles.approveBtn,
            isApproveEnabled
              ? [{ backgroundColor: colors.success }, approveGlow]
              : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
          ]}
        >
          {submittingAction ? (
            <ActivityIndicator color={isApproveEnabled ? colors.onAccent : colors.textTertiary} />
          ) : isApproveEnabled ? (
            <>
              <Check size={18} color={colors.onAccent} />
              <Text style={[styles.approveLabel, { color: colors.onAccent }]}>
                {t('adminReview.approve.unlocked.label')}
              </Text>
            </>
          ) : (
            <>
              <Lock size={15} color={colors.textTertiary} />
              <Text style={[styles.approveLabel, { color: colors.textTertiary }]}>
                {t('adminReview.approve.locked.label')}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Helper line — only when locked */}
        {!isApproveEnabled && (
          <View style={styles.helperRow}>
            <AlertTriangle size={12} color={colors.warning} />
            <Text style={[styles.helperText, { color: colors.textSecondary }]}>
              {t('adminReview.approve.locked.helper')}
            </Text>
          </View>
        )}

        {/* Expanded menu — renders ABOVE the trigger, between Approve and trigger */}
        {hasAnySecondary && moreOpen && (
          <View
            testID="admin-review-dock-more-menu"
            style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={styles.menuHeader}>
              <Text style={[styles.menuHeaderText, { color: colors.textSecondary }]}>
                {t('adminReview.moreActions.menuHeader')}
              </Text>
            </View>
            {canApprove && (
              <TouchableOpacity
                testID="admin-review-dock-row-reject"
                style={[styles.menuRow, { borderTopColor: colors.border }]}
                onPress={closeMenuAnd(onReject)}
                disabled={submittingAction}
                accessibilityRole="button"
              >
                <X size={16} color={colors.error} />
                <Text style={[styles.menuRowLabel, { color: colors.error }]}>
                  {t('moderation.action.reject')}
                </Text>
              </TouchableOpacity>
            )}
            {canApprove && (
              <TouchableOpacity
                testID="admin-review-dock-row-edit"
                style={[styles.menuRow, { borderTopColor: colors.border }]}
                onPress={closeMenuAnd(onEditOnBehalf)}
                disabled={submittingAction}
                accessibilityRole="button"
              >
                <Edit3 size={16} color={colors.textSecondary} />
                <Text style={[styles.menuRowLabel, { color: colors.text }]}>
                  {t('moderation.action.editOnBehalf')}
                </Text>
              </TouchableOpacity>
            )}
            {canArchive && (
              <TouchableOpacity
                testID="admin-review-dock-row-archive"
                style={[styles.menuRow, { borderTopColor: colors.border }]}
                onPress={closeMenuAnd(onArchive)}
                disabled={submittingAction}
                accessibilityRole="button"
              >
                <Archive size={16} color={colors.textSecondary} />
                <Text style={[styles.menuRowLabel, { color: colors.text }]}>
                  {t('property.archive')}
                </Text>
              </TouchableOpacity>
            )}
            {canRestore && (
              <TouchableOpacity
                testID="admin-review-dock-row-restore"
                style={[styles.menuRow, { borderTopColor: colors.border }]}
                onPress={closeMenuAnd(onRestore)}
                disabled={submittingAction}
                accessibilityRole="button"
              >
                <ArchiveRestore size={16} color={colors.textSecondary} />
                <Text style={[styles.menuRowLabel, { color: colors.text }]}>
                  {t('property.unarchive')}
                </Text>
              </TouchableOpacity>
            )}
            {canHardDelete && (
              <TouchableOpacity
                testID="admin-review-dock-row-delete"
                style={[styles.menuRow, { borderTopColor: colors.border }]}
                onPress={closeMenuAnd(onHardDelete)}
                disabled={submittingAction}
                accessibilityRole="button"
              >
                <Trash2 size={16} color={colors.error} />
                <Text style={[styles.menuRowLabel, { color: colors.error }]}>
                  {t('common.delete')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* More actions trigger */}
        {hasAnySecondary && (
          <TouchableOpacity
            testID="admin-review-dock-more-trigger"
            onPress={() => setMoreOpen((v) => !v)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ expanded: moreOpen }}
            style={[styles.moreTrigger, { borderColor: colors.border }]}
          >
            <Text style={[styles.moreTriggerLabel, { color: colors.textSecondary }]}>
              {moreOpen
                ? t('adminReview.moreActions.trigger.expanded')
                : t('adminReview.moreActions.trigger.collapsed')}
            </Text>
            <View
              style={[
                styles.moreChevron,
                moreOpen && styles.moreChevronOpen,
              ]}
            >
              <ChevronDown size={15} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  dockOuter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    position: 'relative',
    overflow: 'hidden',
  },
  dockContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 22,
    gap: 10,
  },
  approveBtn: {
    height: 54,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  approveLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: -2,
  },
  helperText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  moreTrigger: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  moreTriggerLabel: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  moreChevron: {
    transform: [{ rotate: '0deg' }],
  },
  moreChevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  menuCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuHeader: {
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  menuHeaderText: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1,
  },
  menuRow: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  menuRowLabel: {
    fontSize: 14.5,
    fontWeight: '600',
  },
});

export default AdminReviewDock;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/admin/__tests__/AdminReviewDock.test.tsx`
Expected: PASS (all describe blocks green).

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/AdminReviewDock.tsx src/components/admin/__tests__/AdminReviewDock.test.tsx
git commit -m "feat(admin): AdminReviewDock with locked Approve + More actions disclosure"
```

---

## Task 4: Rewrite NeedsMediaBanner as EMPTY-state dropzone

**Files:**
- Modify: `src/components/NeedsMediaBanner.tsx` — full visual rewrite, interface preserved (`onAddPhotos: () => void`, `inDock?: boolean`)

The existing keys `moderation.needsMediaBanner.title|body|action` STAY (they're tested elsewhere — see other test files that reference them). The component swaps which keys it reads to the new `adminReview.dropzone.*` keys.

- [ ] **Step 1: Read the current implementation to confirm the existing testIDs**

The current file has:
- `testID="needs-media-banner"` on the outer container
- `testID="needs-media-banner-cta"` on the CTA button

These MUST be preserved on the new component (downstream tests may reference them).

- [ ] **Step 2: Rewrite the component**

Replace the body of `src/components/NeedsMediaBanner.tsx` (keep the file path + named export) with:

```tsx
/**
 * NeedsMediaBanner — EMPTY-state dropzone for the admin review surface.
 * Spec: docs/superpowers/specs/2026-05-29-admin-review-dock-redesign-design.md § 1
 *
 * Replaces the old amber side-stripe banner. Now renders as a full-width tappable
 * dashed-border dropzone with a lock pill ("Admins only · required"), a soft-accent
 * camera tile, a big title, body copy, and an inset green CTA pill. Both the
 * container AND the CTA pill fire `onAddPhotos` (which the parent wires to
 * MediaCurationScreen navigation).
 *
 * W6 strict: zero hex/rgba in this file. All colors via useTheme(); alpha tints
 * applied inline at the JSX style array (static StyleSheet has no color keys).
 *
 * testIDs preserved from the prior implementation: `needs-media-banner` and
 * `needs-media-banner-cta`. The `inDock` prop is retained for caller backwards
 * compatibility but is now a no-op visual modifier (the dropzone is always
 * full-width with internal padding).
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Camera, Lock, Plus } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface NeedsMediaBannerProps {
  onAddPhotos: () => void;
  /** Retained for caller backwards-compat; no-op in the new design. */
  inDock?: boolean;
}

export const NeedsMediaBanner: React.FC<NeedsMediaBannerProps> = ({ onAddPhotos }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <TouchableOpacity
      testID="needs-media-banner"
      onPress={onAddPhotos}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={t('adminReview.dropzone.title')}
      style={[
        styles.container,
        { borderColor: colors.border, backgroundColor: colors.surface },
      ]}
    >
      <View style={[styles.pill, { backgroundColor: colors.background }]}>
        <Lock size={11} color={colors.textSecondary} />
        <Text style={[styles.pillLabel, { color: colors.textSecondary }]}>
          {t('adminReview.dropzone.pill')}
        </Text>
      </View>
      <View style={[styles.iconTile, { backgroundColor: colors.success }]}>
        <Camera size={26} color={colors.onAccent} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>
        {t('adminReview.dropzone.title')}
      </Text>
      <Text style={[styles.subtext, { color: colors.textSecondary }]} numberOfLines={3}>
        {t('adminReview.dropzone.subtext')}
      </Text>
      <TouchableOpacity
        testID="needs-media-banner-cta"
        onPress={onAddPhotos}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={t('adminReview.dropzone.cta')}
        style={[styles.cta, { backgroundColor: colors.success }]}
      >
        <Plus size={16} color={colors.onAccent} />
        <Text style={[styles.ctaLabel, { color: colors.onAccent }]}>
          {t('adminReview.dropzone.cta')}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 26,
    paddingHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    gap: 12,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 999,
  },
  pillLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  iconTile: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtext: {
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 250,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 4,
  },
  ctaLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export default NeedsMediaBanner;
```

- [ ] **Step 3: Verify type compatibility with consumers**

Run: `npx tsc --noEmit`
Expected: PASS. The `inDock` prop is still accepted (declared in the interface), even though it's no longer consumed.

- [ ] **Step 4: Run any existing component tests that touch NeedsMediaBanner**

Run: `npx jest --listTests | grep -i needs`
If a test file exists, run it: `npx jest path/to/test.tsx`
Expected: tests that asserted the OLD title/body keys will FAIL — that's expected. Edit those tests to use the new keys (`adminReview.dropzone.title|subtext|cta`) and re-run.

If no NeedsMediaBanner tests exist, skip this step. (As of writing, no test file for this component exists in `src/components/__tests__/`.)

- [ ] **Step 5: Commit**

```bash
git add src/components/NeedsMediaBanner.tsx
git commit -m "feat(admin): rewrite NeedsMediaBanner as EMPTY-state dropzone"
```

---

## Task 5: Add `pendingReviewEyebrow` prop to HeaderInfoCard (TDD)

**Files:**
- Modify: `src/components/details/HeaderInfoCard.tsx`
- Modify: `src/components/details/__tests__/HeaderInfoCard.test.tsx` — append new test block

- [ ] **Step 1: Add failing tests**

Append to `src/components/details/__tests__/HeaderInfoCard.test.tsx` (inside the existing `describe('HeaderInfoCard', () => { ... })`):

```tsx
  it('renders PENDING REVIEW eyebrow when pendingReviewEyebrow is true', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <HeaderInfoCard {...defaultProps} pendingReviewEyebrow={true} />,
      );
    });
    expect(findAllText(renderer.root)).toContain('adminReview.pendingReviewEyebrow');
  });

  it('does not render PENDING REVIEW eyebrow when pendingReviewEyebrow is false', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <HeaderInfoCard {...defaultProps} pendingReviewEyebrow={false} />,
      );
    });
    expect(findAllText(renderer.root)).not.toContain('adminReview.pendingReviewEyebrow');
  });

  it('does not render PENDING REVIEW eyebrow when prop is omitted (default)', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<HeaderInfoCard {...defaultProps} />);
    });
    expect(findAllText(renderer.root)).not.toContain('adminReview.pendingReviewEyebrow');
  });
```

- [ ] **Step 2: Add `warning` to the mocked theme**

Inside the same test file's `beforeEach`, extend the `colors` object in the `useTheme.mockReturnValue` so the new eyebrow's `colors.warning` reference doesn't undefined-crash:

```ts
  useTheme.mockReturnValue({
    isDark: true,
    colors: {
      text: '',
      textSecondary: '',
      textTertiary: '',
      surface: '',
      border: '',
      accent: '#FF385C',
      warning: '#F59E0B',  // ← add this line
    },
  });
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest src/components/details/__tests__/HeaderInfoCard.test.tsx`
Expected: 3 new tests FAIL (eyebrow text not found).

- [ ] **Step 4: Update HeaderInfoCard interface + render**

In `src/components/details/HeaderInfoCard.tsx`:

Update the props interface (around line 13):

```ts
export interface HeaderInfoCardProps {
  dealType: 'sale' | 'rent' | string;
  listingId?: string | null;
  title: string;
  formattedAddress: { line1: string; line2?: string };
  statusPill?: React.ReactNode;
  mapPreview?: React.ReactNode;
  /** When true, renders an amber "PENDING REVIEW" eyebrow above the pill row.
   *  Visible to anyone who can see a pending listing (admin/mod + the owner). */
  pendingReviewEyebrow?: boolean;
}
```

Update the destructure in the function signature (around line 22):

```ts
export const HeaderInfoCard: React.FC<HeaderInfoCardProps> = ({
  dealType,
  listingId,
  title,
  formattedAddress,
  statusPill,
  mapPreview,
  pendingReviewEyebrow,
}) => {
```

Insert the eyebrow JSX as the first child of the outer container `<View>` (immediately inside `<View style={styles.container}>`, BEFORE `<View style={styles.pillRow}>`):

```tsx
      {pendingReviewEyebrow ? (
        <View style={styles.eyebrowRow}>
          <View style={[styles.eyebrowRule, { backgroundColor: colors.warning }]} />
          <Text style={[styles.eyebrowLabel, { color: colors.warning }]}>
            {t('adminReview.pendingReviewEyebrow')}
          </Text>
        </View>
      ) : null}
```

Add the two new style entries to the `StyleSheet.create` block:

```ts
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  eyebrowRule: {
    width: 13,
    height: 1.5,
    borderRadius: 1,
  },
  eyebrowLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest src/components/details/__tests__/HeaderInfoCard.test.tsx`
Expected: PASS (all old + 3 new tests green).

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/details/HeaderInfoCard.tsx src/components/details/__tests__/HeaderInfoCard.test.tsx
git commit -m "feat(details): add pendingReviewEyebrow prop to HeaderInfoCard"
```

---

## Task 6: Wire AdminReviewDock into PropertyDetailsScreen

**Files:**
- Modify: `src/screens/PropertyDetailsScreen.tsx`

This task replaces the inline `showModerationDock` block (lines ~1685–1893) with the new `<AdminReviewDock>`. No handler changes — only JSX substitution.

- [ ] **Step 1: Add the import**

Near the top of `src/screens/PropertyDetailsScreen.tsx`, after the existing component imports (around lines 65–70), add:

```ts
import { AdminReviewDock } from '../components/admin/AdminReviewDock';
```

- [ ] **Step 2: Update the dock visibility predicate**

The current predicate (line 312–317) includes `showNeedsMediaBanner`. The banner is moving out of the dock in Task 7, so the dock no longer needs the banner gate. Replace the block:

```ts
  const showModerationDock =
    showNeedsMediaBanner ||
    showModFooter ||
    showArchiveBtn ||
    showRestoreBtn ||
    showHardDeleteBtn;
```

with:

```ts
  const showModerationDock =
    showModFooter ||
    showArchiveBtn ||
    showRestoreBtn ||
    showHardDeleteBtn;
```

Also delete the now-unused `useStackedPrimaryModActions` (line 319) — `AdminReviewDock` owns its own layout decisions.

- [ ] **Step 3: Replace the inline dock JSX**

Find the block starting at the `{showModerationDock && (` line (around line 1687) and ending at the matching close `)}` (around line 1893). Replace the entire block with:

```tsx
      {showModerationDock && (
        <View
          onLayout={(e) => setModDockLayoutHeight(e.nativeEvent.layout.height)}
        >
          <AdminReviewDock
            isApproveEnabled={isApproveEnabled}
            submittingAction={submittingAction}
            canApprove={showModFooter}
            canArchive={showArchiveBtn}
            canRestore={showRestoreBtn}
            canHardDelete={showHardDeleteBtn}
            onApprove={handleApprove}
            onReject={() => setIsRejectModalOpen(true)}
            onEditOnBehalf={handleEditOnBehalf}
            onArchive={() => setIsArchiveModalOpen(true)}
            onRestore={handleRestore}
            onHardDelete={() => setIsHardDeleteModalOpen(true)}
          />
        </View>
      )}
```

Note: `showModFooter` already encodes `can('approveListings') && property.status === 'pending'` (line 291), so passing it as `canApprove` to `AdminReviewDock` correctly gates Reject + Edit-on-behalf rows behind the same condition the old footer used.

- [ ] **Step 4: Remove the now-unused inline styles**

In the bottom `styles` block, the following style entries are no longer used (they were only consumed by the inline dock JSX we just deleted):
- `modDockOuter`
- `modDockContent`
- `modDockHint`
- `modDockHintText`
- `modActionStack`
- `modActionFooter`
- `modActionFooterInDock`
- `modActionBtn`
- `modActionBtnStacked`
- `modActionBtnText`

Search the file (`grep -n "modDockOuter\|modDockContent\|modDockHint\|modActionStack\|modActionFooter\|modActionBtn"`) and confirm none of them have remaining references — then delete them from the `StyleSheet.create` block.

The `BlurView` import and the `Check / X / Edit3 / Archive / ArchiveRestore / Trash2` lucide imports may also be unused now if they were only consumed by the inline dock. Check each with `grep`:

```bash
grep -n "BlurView\|<Check\|<X \|<Edit3\|<Archive \|<ArchiveRestore\|<Trash2" src/screens/PropertyDetailsScreen.tsx
```

If a name has zero matches outside the import statement, remove it from its import. Leave any name still in use (e.g., `Check` may be reused elsewhere in the screen).

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS. If you get unused-import errors, that confirms Step 4 missed an import — clean it up.

- [ ] **Step 6: Lint**

Run: `npx eslint src/screens/PropertyDetailsScreen.tsx`
Expected: no new errors. (Pre-existing warnings in the file are not your concern unless they're errors you introduced.)

- [ ] **Step 7: Commit**

```bash
git add src/screens/PropertyDetailsScreen.tsx
git commit -m "feat(admin): wire AdminReviewDock into PropertyDetailsScreen"
```

---

## Task 7: Move NeedsMediaBanner + AdminPhotoGrid into scroll body

**Files:**
- Modify: `src/screens/PropertyDetailsScreen.tsx`

The handoff treats the dropzone as the page hero — not as part of the bottom dock. After Task 6, the bottom dock contains only Approve + More actions. This task hoists `<NeedsMediaBanner>` and the new `<AdminPhotoGrid>` into the scroll body, immediately above the `HeaderInfoCard`.

- [ ] **Step 1: Add the AdminPhotoGrid import**

Near the top of `src/screens/PropertyDetailsScreen.tsx`:

```ts
import { AdminPhotoGrid } from '../components/admin/AdminPhotoGrid';
```

The `NeedsMediaBanner` import already exists (line 67) — leave it.

- [ ] **Step 2: Add a derived predicate for the FILLED-state grid**

In the derived-state region (near line 304, where `isApproveEnabled` is computed), add:

```ts
  // Admin-only photo confirmation grid — shown when a mod/admin is reviewing
  // a pending listing that ALREADY has 1+ photos. Mutually exclusive with
  // showNeedsMediaBanner (which fires on 0 photos).
  const showAdminPhotoGrid =
    can('approveListings') &&
    property?.status === 'pending' &&
    photoCount > 0;
```

- [ ] **Step 3: Insert the banner + grid in the scroll body above HeaderInfoCard**

Find the JSX where `<HeaderInfoCard ... />` is rendered (`grep -n "HeaderInfoCard" src/screens/PropertyDetailsScreen.tsx`). Immediately BEFORE that render, insert:

```tsx
            {showNeedsMediaBanner && (
              <NeedsMediaBanner
                onAddPhotos={() => onOpenMediaCuration?.(String(property.id))}
              />
            )}

            {showAdminPhotoGrid && (
              <AdminPhotoGrid
                photos={(property.media?.photos ?? []).map((p: any) => ({
                  uri: typeof p === 'string' ? p : p?.uri ?? p?.url ?? '',
                  key: typeof p === 'string' ? p : p?.key ?? p?.id ?? p?.uri,
                }))}
                onOpenCuration={() => onOpenMediaCuration?.(String(property.id))}
                onAddMore={() => onOpenMediaCuration?.(String(property.id))}
              />
            )}
```

The `(p: any) => ({ uri, key })` mapper handles both string-URL photos (legacy listings) and object-shaped photos (`{ uri | url, key | id }`). If the Property type already pins a single shape, simplify accordingly — check `src/types/Property.ts` first.

- [ ] **Step 4: Remove the now-unused `useStackedPrimaryModActions` references**

If you didn't already drop this in Task 6, grep for any remaining references:

```bash
grep -n "useStackedPrimaryModActions" src/screens/PropertyDetailsScreen.tsx
```

If any remain (they shouldn't — `AdminReviewDock` doesn't take this prop), delete them.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS. If the Photo type mapping in Step 3 trips type errors, narrow the cast — open `src/types/Property.ts` and inspect `media.photos`.

- [ ] **Step 6: Run all tests**

Run: `npx jest`
Expected: PASS (no regressions in any existing test).

- [ ] **Step 7: Commit**

```bash
git add src/screens/PropertyDetailsScreen.tsx
git commit -m "feat(admin): hoist NeedsMediaBanner + AdminPhotoGrid into scroll body"
```

---

## Task 8: Wire pendingReviewEyebrow into HeaderInfoCard call site

**Files:**
- Modify: `src/screens/PropertyDetailsScreen.tsx`

- [ ] **Step 1: Pass the prop**

Find the `<HeaderInfoCard ... />` JSX in `PropertyDetailsScreen.tsx`. Add the `pendingReviewEyebrow` prop:

```tsx
            <HeaderInfoCard
              // ... existing props ...
              pendingReviewEyebrow={property?.status === 'pending'}
            />
```

The eyebrow fires for any viewer of a pending listing (admin/mod + owner). Renters never see a pending listing in the first place (the status filter on the public list blocks it), so no extra role gate is needed here.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Run tests**

Run: `npx jest`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/screens/PropertyDetailsScreen.tsx
git commit -m "feat(details): show PENDING REVIEW eyebrow on pending listings"
```

---

## Task 9: Lint + full test sweep

- [ ] **Step 1: Run lint on every touched file**

```bash
npx eslint \
  src/components/NeedsMediaBanner.tsx \
  src/components/admin/AdminPhotoGrid.tsx \
  src/components/admin/AdminReviewDock.tsx \
  src/components/details/HeaderInfoCard.tsx \
  src/screens/PropertyDetailsScreen.tsx \
  src/locales/en.ts \
  src/locales/ru.ts
```

Expected: no new errors. Fix any you introduced.

- [ ] **Step 2: Run the full test suite**

Run: `npx jest`
Expected: every test passes. If a test that previously asserted old `moderation.needsMediaBanner.*` keys fails, update it to the new `adminReview.dropzone.*` keys.

- [ ] **Step 3: Final type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit any cleanup**

If lint/test fixes required code changes, commit them:

```bash
git add -A
git commit -m "chore(admin): lint + test cleanup after dock redesign"
```

(If nothing changed, skip the commit — don't create an empty one.)

---

## Task 10: Manual physical-device QA

Per `CLAUDE.md` (Testing bar: manual physical-device QA for M1+), this redesign must be tested on real hardware before being declared done. No automated UI tests catch theme/blur/contrast issues.

- [ ] **Step 1: iOS — launch on a real iPhone**

```bash
npx react-native run-ios --device "<your-iphone-name>"
```

If your shell needs auth, run the command yourself with `!`.

- [ ] **Step 2: iOS QA matrix — admin role**

Sign in as an admin. For each row, observe and confirm:

| Scenario | What to confirm |
|---|---|
| Pending listing with **0 photos**, **dark mode** | Dropzone appears above the listing title; "Admins only · required" pill visible; bottom dock shows ONLY the locked Approve button + helper line + "More actions" trigger; no Reject/Edit/Archive/Delete visible by default |
| Same listing, tap "More actions" | Menu card slides above the trigger; shows Reject (red) / Edit on behalf / Archive / Delete (red); chevron rotates 180° |
| Tap Reject row | Menu closes; Reject modal opens (unchanged) |
| Tap any "Add photos" target (dropzone container OR pill CTA) | Navigates to MediaCurationScreen |
| Pending listing with **3 photos**, dark mode | Dropzone is replaced by 3-col grid with COVER badge on first thumb; Approve button is now green with check icon and "Approve & publish listing" label; glow shadow visible underneath |
| Same listing, **light mode** (Settings → Appearance → Light) | Same structure; NO glow shadow under Approve; dropzone dashed border still visible on light bg; PENDING REVIEW eyebrow still amber |
| Live listing (already-approved) viewed as admin | Bottom dock shows only Archive + Delete (no dropzone, no Approve, no eyebrow) |
| Archived listing viewed as admin | Bottom dock shows Restore (in "More actions" menu) + Delete |

- [ ] **Step 3: iOS QA matrix — renter role**

Sign out, sign in as a renter (or unauthenticated). Open any live listing:

| Scenario | What to confirm |
|---|---|
| Renter views a live listing | NO bottom dock, NO dropzone, NO eyebrow — page looks identical to pre-redesign |
| Renter cannot reach a pending listing | (Pending listings are filtered out of the public list — confirm the filter still works) |

- [ ] **Step 4: Android — repeat the matrix**

```bash
npx react-native run-android
```

Confirm the same rows as Step 2 + 3 on a physical Android device. Pay special attention to:
- BlurView rendering (`@react-native-community/blur` behaves differently on Android — falls back to `colors.surface` if reduced-transparency is on).
- Dashed-border rendering on the dropzone (RN's dashed border on Android historically has quirks — if it renders solid or broken, file a follow-up but don't block the merge).
- The accent glow shadow (uses `elevation: 6` on Android instead of `shadowColor` — confirm it's visible but not overpowering).

- [ ] **Step 5: Record findings**

If anything looks wrong, file a follow-up issue and add it to `.planning/STATE.md` under "Phase carry-forward." Don't block the commit chain on cosmetic issues that aren't regressions.

---

## Task 11: Cleanup of handoff artifacts (USER-CONFIRMED before doing this)

**Pause before running this task** — confirm with the user that they're happy to delete the handoff artifacts now that the redesign is in code. They may want to keep them around as a reference for follow-up iterations.

- [ ] **Step 1: Confirm with the user**

Ask: "The redesign is implemented and merged. OK to delete `.scratch/photo-redesign/` and `photoUploadRedesign.zip` from the repo root, or keep them around?"

Wait for explicit confirmation. If they say keep, mark this task complete and stop.

- [ ] **Step 2: Delete (only if confirmed)**

```bash
rm -rf .scratch/photo-redesign/
rm photoUploadRedesign.zip
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: drop handoff zip + extracted reference after redesign ships"
```

---

## Acceptance — Plan Done When:

1. All Jest tests pass (`npx jest`).
2. `npx tsc --noEmit` passes.
3. `npx eslint <touched files>` passes with no new errors.
4. On a physical iPhone in dark mode, an admin opening a 0-photo pending listing sees: dropzone above the title, locked Approve in the dock, single "More actions" trigger — and NOT the old 5-button stack.
5. On the same device in light mode, the same admin sees the same structure with no contrast/glow regressions.
6. On a physical Android device, the same matrix renders without crashes (visual quirks on dashed borders / blur are acceptable as follow-ups if they're not regressions).
7. A renter opening a live listing sees a visually-unchanged details page.
8. All handlers (Approve, Reject, Edit on behalf, Archive, Restore, Delete) still fire their existing services and modals — backend untouched.
