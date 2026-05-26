/**
 * src/screens/__tests__/ApplicantProfileScreen.test.tsx — Task 8.
 *
 * Pattern: react-test-renderer + act() (mirrors repo precedent;
 * @testing-library/react-native is not in dev deps).
 */
import React from 'react';
import { Linking } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { ApplicantProfileScreen } from '../ApplicantProfileScreen';
import type { LandlordApplication } from '../../services/LandlordApplicationService';

jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve());

jest.mock('../../theme/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#FFFFFF',
      surface: '#F0F0F0',
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
    t: (key: string, params?: Record<string, string>) => {
      if (params?.date) return `${key} ${params.date}`;
      return key;
    },
    language: 'en',
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));

jest.mock('lucide-react-native', () => ({
  ChevronLeft: () => null,
  Phone: () => null,
  MessageCircle: () => null,
  Send: () => null,
  Check: () => null,
  X: () => null,
  ExternalLink: () => null,
}));

// Helper: walk the test tree and find a node by testID, return its onPress prop.
function findByTestID(root: TestRenderer.ReactTestInstance, testID: string) {
  return root.findByProps({ testID });
}

const baseApp: LandlordApplication = {
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

function renderScreen(application: LandlordApplication) {
  let renderer: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <ApplicantProfileScreen
        application={application}
        onBack={jest.fn()}
        onApprove={jest.fn()}
        onReject={jest.fn()}
      />
    );
  });
  return renderer!;
}

describe('ApplicantProfileScreen (F9–F11)', () => {
  beforeEach(() => {
    (Linking.openURL as jest.Mock).mockClear();
  });

  test('F9: renders name + email and tap rows for present channels', () => {
    const renderer = renderScreen(baseApp);
    const tree = renderer.toJSON();
    const treeString = JSON.stringify(tree);

    expect(treeString).toContain('Aibek Tursunov');
    expect(treeString).toContain('aibek@example.com');
    expect(treeString).toContain('@aibek_tur');
  });

  test('F9b: null fields render applicantProfile.notProvided placeholder', () => {
    const incompleteApp: LandlordApplication = {
      ...baseApp,
      applicant: {
        ...baseApp.applicant!,
        profilePhone: null,
        telegram: null,
      },
    };
    const renderer = renderScreen(incompleteApp);
    const tree = renderer.toJSON();
    const treeString = JSON.stringify(tree);

    expect(treeString).toContain('applicantProfile.notProvided');
  });

  test('F10: tap WhatsApp row → Linking.openURL with https://wa.me/<digits>', () => {
    const renderer = renderScreen(baseApp);
    const node = findByTestID(renderer.root, 'contact-row-whatsapp');
    act(() => {
      node.props.onPress();
    });
    expect(Linking.openURL).toHaveBeenCalledWith('https://wa.me/996554525410');
  });

  test('F11: tap Telegram row with @handle → URL strips the @', () => {
    const renderer = renderScreen(baseApp);
    const node = findByTestID(renderer.root, 'contact-row-telegram');
    act(() => {
      node.props.onPress();
    });
    expect(Linking.openURL).toHaveBeenCalledWith('https://t.me/aibek_tur');
  });

  test('tap profile phone row → tel: URL', () => {
    const renderer = renderScreen(baseApp);
    const node = findByTestID(renderer.root, 'contact-row-profilePhone');
    act(() => {
      node.props.onPress();
    });
    expect(Linking.openURL).toHaveBeenCalledWith('tel:+996554525410');
  });

  test('renders application phone only when distinct from profile phone', () => {
    const distinctApp: LandlordApplication = { ...baseApp, phone: '+996700000000' };
    const renderer = renderScreen(distinctApp);
    const treeString = JSON.stringify(renderer.toJSON());
    expect(treeString).toContain('+996700000000');
    expect(treeString).toContain('applicantProfile.appPhone');

    // Same-phone variant: appPhone row should NOT render.
    const sameRenderer = renderScreen(baseApp);
    const sameString = JSON.stringify(sameRenderer.toJSON());
    expect(sameString).not.toContain('applicantProfile.appPhone');
  });
});
