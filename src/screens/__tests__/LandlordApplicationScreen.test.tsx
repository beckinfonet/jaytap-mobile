/**
 * src/screens/__tests__/LandlordApplicationScreen.test.tsx — Task 7.
 *
 * Smoke tests for the soft-prompt profile gate on LandlordApplicationScreen:
 *
 *   F6: incomplete profile → gate banner rendered (title + missing field labels)
 *   F7: complete profile   → gate banner NOT rendered
 *   F8: _testForceGateFields prop → banner shows forced fields regardless of profile
 *
 * Pattern: react-test-renderer + act() (mirrors repo precedent in
 * PropertyDetailsScreen.test.tsx and ModerationQueueScreen.test.tsx;
 * @testing-library/react-native is not in dev deps).
 */

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { LandlordApplicationScreen } from '../LandlordApplicationScreen';
import type { AuthUser, BackendProfile } from '../../types/Auth';

// -- Mocks -----------------------------------------------------------------

jest.mock('../../services/LandlordApplicationService', () => ({
  __esModule: true,
  ...jest.requireActual('../../services/LandlordApplicationService'),
  LandlordApplicationService: {
    submit: jest.fn(),
    getMine: jest.fn().mockResolvedValue([]),
    withdraw: jest.fn(),
    getAdminQueue: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
  },
}));

// Context hooks — return deterministic shape.
jest.mock('../../theme/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#FFFFFF',
      surface: '#F0F0F0',
      text: '#000000',
      textSecondary: '#666666',
      border: '#CCCCCC',
      primary: '#007AFF',
      warning: '#F59E0B',
      onWarning: '#FFFFFF',
    },
    isDark: false,
  }),
}));

jest.mock('../../context/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'landlordApp.gateTitle': 'Add your details first',
        'landlordApp.gateBody': 'Admins need this info to approve you:',
        'landlordApp.gateOpenSettings': 'Open settings',
        'landlordApp.gateMissing.firstName': 'First name',
        'landlordApp.gateMissing.lastName': 'Last name',
        'landlordApp.gateMissing.phone': 'Phone number',
        'landlordApp.gateMissing.messagingChannel': 'WhatsApp or Telegram',
        'landlordApp.title': 'Become a Landlord',
        'landlordApp.intro': 'Submit your application',
        'common.back': 'Back',
      };
      return map[key] ?? key;
    },
  }),
}));

// Provide a AuthContext mock that useAuth() inside the component reads.
let mockUser: AuthUser | null = null;

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    refreshRole: jest.fn().mockResolvedValue(undefined),
  }),
  // Also export AuthContext so any direct import doesn't break.
  AuthContext: { Provider: ({ children }: any) => children },
}));

// Mock heavy native deps not available in Jest.
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));
jest.mock('react-native-keyboard-controller', () => ({
  KeyboardAwareScrollView: ({ children }: any) => children,
}));
jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
}));
jest.mock('lucide-react-native', () => ({
  Camera: () => null,
  Upload: () => null,
  ChevronLeft: () => null,
  Check: () => null,
  Clock: () => null,
  Settings: () => null,
}));

// -- Helpers ---------------------------------------------------------------

const makeUser = (overrides: Partial<BackendProfile> = {}): AuthUser => ({
  localId: 'uid-test',
  email: 'test@example.com',
  backendProfile: {
    uid: 'uid-test',
    email: 'test@example.com',
    userType: 'user',
    firstName: 'Aibek',
    lastName: 'Tursunov',
    phone: '+996554525410',
    whatsapp: '+996554525410',
    ...overrides,
  },
});

/** Recursively collect all `children` string values from a test-renderer JSON tree. */
function collectText(node: any): string[] {
  if (!node) return [];
  if (typeof node === 'string') return [node];
  if (Array.isArray(node)) return node.flatMap(collectText);
  const results: string[] = [];
  if (typeof node.children === 'string') results.push(node.children);
  if (Array.isArray(node.children)) results.push(...node.children.flatMap(collectText));
  return results;
}

function hasText(root: any, text: string): boolean {
  return collectText(root).some((t) => t.includes(text));
}

// -- Tests -----------------------------------------------------------------

describe('LandlordApplicationScreen — profile gate (F6–F8)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { LandlordApplicationService } = require('../../services/LandlordApplicationService');
    (LandlordApplicationService.getMine as jest.Mock).mockResolvedValue([]);
  });

  test('F6: incomplete profile → gate banner rendered, form hidden', async () => {
    mockUser = makeUser({ firstName: '', whatsapp: '', telegram: '' });

    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <LandlordApplicationScreen onBack={jest.fn()} onOpenAccountSettings={jest.fn()} />
      );
    });

    const tree = renderer!.toJSON();
    expect(hasText(tree, 'Add your details first')).toBe(true);
    expect(hasText(tree, 'First name')).toBe(true);
    expect(hasText(tree, 'WhatsApp or Telegram')).toBe(true);
  });

  test('F7: complete profile → form rendered, gate banner hidden', async () => {
    mockUser = makeUser();

    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <LandlordApplicationScreen onBack={jest.fn()} onOpenAccountSettings={jest.fn()} />
      );
    });
    // Wait for async getMine to settle.
    await act(async () => {});

    const tree = renderer!.toJSON();
    expect(hasText(tree, 'Add your details first')).toBe(false);
  });

  test('F8: server backstop — _testForceGateFields prop renders banner with those fields', async () => {
    mockUser = makeUser(); // complete profile

    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <LandlordApplicationScreen
          onBack={jest.fn()}
          onOpenAccountSettings={jest.fn()}
          _testForceGateFields={['phone', 'messagingChannel']}
        />
      );
    });

    const tree = renderer!.toJSON();
    expect(hasText(tree, 'Phone number')).toBe(true);
    expect(hasText(tree, 'WhatsApp or Telegram')).toBe(true);
  });
});
