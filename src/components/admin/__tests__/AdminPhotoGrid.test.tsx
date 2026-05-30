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
