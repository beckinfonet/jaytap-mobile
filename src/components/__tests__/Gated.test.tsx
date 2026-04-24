/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from 'react-native';
import { Gated } from '../Gated';

jest.mock('../../hooks/useRole', () => ({
  useRole: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useRole } = require('../../hooks/useRole');

describe('Gated', () => {
  beforeEach(() => {
    (useRole as jest.Mock).mockReset();
  });

  test('renders children when can(action) returns true', async () => {
    (useRole as jest.Mock).mockReturnValue({
      can: (a: string) => a === 'editVerifications',
    });

    let tree: ReactTestRenderer.ReactTestRenderer | null = null;
    await ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <Gated action="editVerifications">
          <Text testID="child">admin-only</Text>
        </Gated>,
      );
    });
    const json = tree!.toJSON();
    expect(JSON.stringify(json)).toContain('admin-only');
  });

  test('renders fallback (default null) when can(action) returns false', async () => {
    (useRole as jest.Mock).mockReturnValue({
      can: () => false,
    });

    let tree: ReactTestRenderer.ReactTestRenderer | null = null;
    await ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <Gated action="editVerifications">
          <Text testID="child">admin-only</Text>
        </Gated>,
      );
    });
    expect(JSON.stringify(tree!.toJSON() || {})).not.toContain('admin-only');
  });

  test('renders explicit fallback prop when can(action) returns false', async () => {
    (useRole as jest.Mock).mockReturnValue({
      can: () => false,
    });

    let tree: ReactTestRenderer.ReactTestRenderer | null = null;
    await ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <Gated action="editVerifications" fallback={<Text>no-access</Text>}>
          <Text>admin-only</Text>
        </Gated>,
      );
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('no-access');
    expect(json).not.toContain('admin-only');
  });
});
