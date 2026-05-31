/**
 * src/context/__tests__/FilterStyleContext.test.tsx
 *
 * Phase 13 Plan 13-02 (DATA-03) — useFilterStyle + FilterStyleProvider.
 *
 * Covers:
 *   1. Fresh-install path — AsyncStorage.getItem resolves null → default 'guided' (D-10, SC3).
 *   2. Persisted value survives restart — stored 'cascading' → hook returns 'cascading'.
 *   3. Corrupt/unknown stored value silently defaults to 'guided' (D-10, no console.warn).
 *   4. Write-then-read invariant — setFilterStyle('cascading') writes to AsyncStorage AND
 *      live hook state updates in the same async cycle (load-bearing for Phase 14 FILT-03).
 *   5. All 4 allowed values write + read cleanly ('guided' | 'cascading' | 'master' | 'sentence').
 *   6. useFilterStyle() outside <FilterStyleProvider> throws (D-13, LanguageContext.tsx:58 pattern).
 *   7. AsyncStorage.setItem rejection is swallowed via console.error (LanguageContext.tsx:40-41 pattern).
 *
 * Pattern: react-test-renderer + act (matches AuthContext.emailVerification.test.tsx; project
 * has no @testing-library/react-native in dev deps).
 */

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FilterStyleProvider, useFilterStyle, type FilterStyle } from '../FilterStyleContext';

// Local override of the global jest.setup.js AsyncStorage mock so each test can
// drive getItem return values independently (matches AuthContext test convention).
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn(),
}));

const mockedGetItem = AsyncStorage.getItem as jest.Mock;
const mockedSetItem = AsyncStorage.setItem as jest.Mock;

// Capture the live context value so tests can drive it.
let ctx: ReturnType<typeof useFilterStyle>;
const Probe = () => {
  ctx = useFilterStyle();
  return null;
};

const renderProvider = async () => {
  await act(async () => {
    TestRenderer.create(
      <FilterStyleProvider>
        <Probe />
      </FilterStyleProvider>,
    );
  });
};

describe('FilterStyleContext — default on fresh install (DATA-03, SC3, D-10)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetItem.mockResolvedValue(null);
    mockedSetItem.mockResolvedValue(undefined);
  });

  test('returns "guided" when AsyncStorage has no stored value', async () => {
    await renderProvider();
    expect(ctx.filterStyle).toBe('guided');
    expect(mockedGetItem).toHaveBeenCalledWith('@jaytap_filter_style');
  });
});

describe('FilterStyleContext — persisted value survives restart (DATA-03, SC3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSetItem.mockResolvedValue(undefined);
  });

  test('returns the stored "cascading" value after mount', async () => {
    mockedGetItem.mockResolvedValue('cascading');
    await renderProvider();
    expect(ctx.filterStyle).toBe('cascading');
  });

  test.each<FilterStyle>(['guided', 'cascading', 'master', 'sentence'])(
    'returns the stored "%s" value after mount',
    async (value) => {
      mockedGetItem.mockResolvedValue(value);
      await renderProvider();
      expect(ctx.filterStyle).toBe(value);
    },
  );
});

describe('FilterStyleContext — corrupt/unknown values silently default (D-10)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSetItem.mockResolvedValue(undefined);
  });

  test.each(['rainbow', 'GUIDED', '', 'guided ', ' cascading', '{}', 'null'])(
    'falls through to "guided" when stored value is %p',
    async (corrupt) => {
      mockedGetItem.mockResolvedValue(corrupt);
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      await renderProvider();
      expect(ctx.filterStyle).toBe('guided');
      // D-10: no console.warn on silent fall-through (matches LanguageContext line 27 pattern).
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    },
  );
});

describe('FilterStyleContext — write-then-read invariant (DATA-03, SC4, FILT-03)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetItem.mockResolvedValue(null);
    mockedSetItem.mockResolvedValue(undefined);
  });

  test('setFilterStyle("cascading") writes to AsyncStorage AND updates live hook state', async () => {
    await renderProvider();
    expect(ctx.filterStyle).toBe('guided');

    await act(async () => {
      await ctx.setFilterStyle('cascading');
    });

    expect(mockedSetItem).toHaveBeenCalledWith('@jaytap_filter_style', 'cascading');
    expect(ctx.filterStyle).toBe('cascading');
  });

  test.each<FilterStyle>(['guided', 'cascading', 'master', 'sentence'])(
    'setFilterStyle("%s") persists and live-updates state',
    async (value) => {
      await renderProvider();
      await act(async () => {
        await ctx.setFilterStyle(value);
      });
      expect(mockedSetItem).toHaveBeenCalledWith('@jaytap_filter_style', value);
      expect(ctx.filterStyle).toBe(value);
    },
  );
});

describe('FilterStyleContext — outside-provider guard (D-13)', () => {
  test('useFilterStyle() outside FilterStyleProvider throws a descriptive error', () => {
    // Silence the React 18 error-boundary console noise during the intentional throw.
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const Bare = () => {
      useFilterStyle();
      return null;
    };

    expect(() => {
      TestRenderer.create(<Bare />);
    }).toThrow('useFilterStyle must be used within FilterStyleProvider');

    errorSpy.mockRestore();
  });
});

describe('FilterStyleContext — AsyncStorage.setItem rejection swallowed (DoS mitigation T-13-02-04)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetItem.mockResolvedValue(null);
  });

  test('setFilterStyle does not throw when AsyncStorage.setItem rejects; console.error is called', async () => {
    mockedSetItem.mockRejectedValueOnce(new Error('Storage full'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await renderProvider();

    await act(async () => {
      // Should not throw — error is caught + logged (LanguageContext.tsx:40-41 pattern).
      await ctx.setFilterStyle('cascading');
    });

    expect(errorSpy).toHaveBeenCalled();
    // The in-memory state is NOT updated on persist failure (graceful degradation).
    expect(ctx.filterStyle).toBe('guided');

    errorSpy.mockRestore();
  });
});
