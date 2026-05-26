/**
 * src/screens/__tests__/LandlordApplicationQueueScreen.test.tsx — Task 9.
 *
 * Pattern: react-test-renderer + act() (repo precedent; @testing-library/react-native
 * is not in dev deps).
 *
 * NOTE: JSON.stringify(renderer.toJSON()) hits a circular-structure error on
 * VirtualizedList/FlatList internals (same as ModerationQueueScreen.test.tsx —
 * see comment there). We use root.findAllByType(Text) and root.findAllByProps()
 * to inspect rendered content instead.
 */
import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { LandlordApplicationQueueScreen } from '../LandlordApplicationQueueScreen';
import { LandlordApplicationService } from '../../services/LandlordApplicationService';
import type { LandlordApplication } from '../../services/LandlordApplicationService';

jest.mock('../../services/LandlordApplicationService', () => ({
  __esModule: true,
  LandlordApplicationService: {
    getAdminQueue: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
  },
}));

jest.mock('../../theme/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#FFFFFF',
      surface: '#F0F0F0',
      inputBackground: '#FAFAFA',
      text: '#000000',
      textSecondary: '#666666',
      border: '#CCCCCC',
      primary: '#007AFF',
      accent: '#FF385C',
      warning: '#F59E0B',
      onWarning: '#FFFFFF',
    },
    isDark: false,
  }),
}));

jest.mock('../../context/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

jest.mock('react-native-safe-area-context', () => {
  const React = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  return {
    SafeAreaView: ({ children, ...props }: any) =>
      React.createElement(RN.View, props, children),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

jest.mock('lucide-react-native', () => {
  const React = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  const stub = (name: string) => (props: any) =>
    React.createElement(RN.View, { ...props, accessibilityLabel: name });
  return new Proxy({}, { get: (_t, prop) => stub(String(prop)) });
});

// Helper: collect all rendered text content from Text nodes in the tree.
function getAllRenderedText(renderer: TestRenderer.ReactTestRenderer): string {
  return renderer.root
    .findAllByType(Text)
    .map((node) => {
      // children can be a string or array
      const children = node.props.children;
      if (Array.isArray(children)) return children.join('');
      return String(children ?? '');
    })
    .join(' ');
}

const fullApp: LandlordApplication = {
  _id: 'app-1',
  uid: 'uid-1',
  status: 'submitted',
  phone: '+996554525410',
  idPhotoUrl: 'https://example.com/id.jpg',
  listingTypeIntents: ['residential'],
  applicantNote: null,
  submittedAt: '2026-05-19T12:00:00.000Z',
  applicant: {
    firstName: 'Aibek',
    lastName: 'Tursunov',
    email: 'aibek@example.com',
    profilePhone: '+996554525410',
    whatsapp: '+996554525410',
    telegram: '@aibek_tur',
    createdAt: '2026-04-12T12:00:00.000Z',
    profileComplete: true,
  },
};

async function renderAndFlush(props: { onOpenApplicantProfile: jest.Mock; mockApps: LandlordApplication[] }) {
  (LandlordApplicationService.getAdminQueue as jest.Mock).mockResolvedValue(props.mockApps);
  let renderer: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <LandlordApplicationQueueScreen
        onBack={jest.fn()}
        onOpenApplicantProfile={props.onOpenApplicantProfile}
      />
    );
  });
  return renderer!;
}

describe('LandlordApplicationQueueScreen card refactor (F1–F5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('F1: card header shows name + email; no inline phone/intent rows', async () => {
    const renderer = await renderAndFlush({ onOpenApplicantProfile: jest.fn(), mockApps: [fullApp] });
    const allText = getAllRenderedText(renderer);
    expect(allText).toContain('Aibek Tursunov');
    expect(allText).toContain('aibek@example.com');
    // The card should NOT include the application form-phone or intent labels inline.
    expect(allText).not.toContain('landlordApp.phoneLabel');
    expect(allText).not.toContain('landlordApp.intentLabel');
  });

  test('F2: missing firstName/lastName → (not provided)', async () => {
    const incomplete: LandlordApplication = {
      ...fullApp,
      applicant: { ...fullApp.applicant!, firstName: null, lastName: null },
    };
    const renderer = await renderAndFlush({ onOpenApplicantProfile: jest.fn(), mockApps: [incomplete] });
    const allText = getAllRenderedText(renderer);
    expect(allText).toContain('applicantProfile.notProvided');
  });

  test('F3: applicant null → uid fallback in header', async () => {
    const orphan: LandlordApplication = { ...fullApp, applicant: null };
    const renderer = await renderAndFlush({ onOpenApplicantProfile: jest.fn(), mockApps: [orphan] });
    const allText = getAllRenderedText(renderer);
    expect(allText).toContain('uid-1');
  });

  test('F4: profileComplete false → Profile incomplete chip rendered', async () => {
    const incomplete: LandlordApplication = {
      ...fullApp,
      applicant: { ...fullApp.applicant!, profileComplete: false },
    };
    const renderer = await renderAndFlush({ onOpenApplicantProfile: jest.fn(), mockApps: [incomplete] });
    const allText = getAllRenderedText(renderer);
    expect(allText).toContain('applicantProfile.profileIncomplete');
  });

  test('F5: tap card header → onOpenApplicantProfile called with the row', async () => {
    const onOpen = jest.fn();
    const renderer = await renderAndFlush({ onOpenApplicantProfile: onOpen, mockApps: [fullApp] });
    const header = renderer.root.findByProps({ testID: 'card-header-app-1' });
    await act(async () => {
      header.props.onPress();
    });
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ _id: 'app-1' }));
  });

  test('F4-also: applicant=null also renders Profile incomplete chip', async () => {
    const orphan: LandlordApplication = { ...fullApp, applicant: null };
    const renderer = await renderAndFlush({ onOpenApplicantProfile: jest.fn(), mockApps: [orphan] });
    const allText = getAllRenderedText(renderer);
    expect(allText).toContain('applicantProfile.profileIncomplete');
  });
});
