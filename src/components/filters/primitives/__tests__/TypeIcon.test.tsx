/**
 * TypeIcon test — verifies the 10-type → Lucide component mapping.
 *
 * Phase 14 Plan 14-01 (FILT-01, FILT-02).
 * Pattern: react-test-renderer + act (no RTL).
 */
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import {
  Building,
  House,
  Building2,
  Briefcase,
  Store,
  Warehouse,
  Factory,
  BedDouble,
  Hotel,
} from 'lucide-react-native';
import TypeIcon, { ICON_MAP } from '../TypeIcon';
import type { PropertyType } from '../../../../utils/propertyCategory';

const render = (type: PropertyType, props: Partial<{ size: number; color: string }> = {}) => {
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(<TypeIcon type={type} {...props} />);
  });
  return tree;
};

describe('TypeIcon', () => {
  test('Apartment renders Building', () => {
    const tree = render('Apartment');
    expect(tree.root.findAllByType(Building).length).toBe(1);
  });

  test('House renders House', () => {
    const tree = render('House');
    expect(tree.root.findAllByType(House).length).toBe(1);
  });

  test('Townhome renders Building2', () => {
    const tree = render('Townhome');
    expect(tree.root.findAllByType(Building2).length).toBe(1);
  });

  test('Condo renders Building2', () => {
    const tree = render('Condo');
    expect(tree.root.findAllByType(Building2).length).toBe(1);
  });

  test('Office renders Briefcase', () => {
    const tree = render('Office');
    expect(tree.root.findAllByType(Briefcase).length).toBe(1);
  });

  test('Retail renders Store', () => {
    const tree = render('Retail');
    expect(tree.root.findAllByType(Store).length).toBe(1);
  });

  test('Warehouse renders Warehouse', () => {
    const tree = render('Warehouse');
    expect(tree.root.findAllByType(Warehouse).length).toBe(1);
  });

  test('Industrial renders Factory', () => {
    const tree = render('Industrial');
    expect(tree.root.findAllByType(Factory).length).toBe(1);
  });

  test('Hostel renders BedDouble', () => {
    const tree = render('Hostel');
    expect(tree.root.findAllByType(BedDouble).length).toBe(1);
  });

  test('Hotel renders Hotel', () => {
    const tree = render('Hotel');
    expect(tree.root.findAllByType(Hotel).length).toBe(1);
  });

  test('passes size and color props through with strokeWidth=1.75', () => {
    const tree = render('Apartment', { size: 32, color: '#fff' });
    const icon = tree.root.findByType(Building);
    expect(icon.props.size).toBe(32);
    expect(icon.props.color).toBe('#fff');
    expect(icon.props.strokeWidth).toBe(1.75);
  });

  test('ICON_MAP exposes all 10 PropertyType entries', () => {
    expect(Object.keys(ICON_MAP).sort()).toEqual(
      [
        'Apartment',
        'Building2: never',
        'Condo',
        'Hostel',
        'Hotel',
        'House',
        'Industrial',
        'Office',
        'Retail',
        'Townhome',
        'Warehouse',
      ].filter((k) => k !== 'Building2: never').sort(),
    );
  });
});
