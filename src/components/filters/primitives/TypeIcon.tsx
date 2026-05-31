/**
 * TypeIcon — Lucide-icon dispatch for the 10 JayTap property types.
 *
 * Phase 14 Plan 14-01 (FILT-01, FILT-02). Verified icon names from
 * RESEARCH.md §"Lucide Icon Verification" (all 10 confirmed present in
 * lucide-react-native@^0.564.0 bundle).
 *
 * Pattern source: src/components/details/AttributeList.tsx (static
 * Record<PropertyType, LucideIcon> + render-via-component-from-map).
 *
 * Note: collision between local Lucide-import names `House` / `Hotel` /
 * `Warehouse` and the corresponding PropertyType strings is intentional;
 * the map keys are PropertyType literals, the values are LucideIcon refs.
 */
import React from 'react';
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
  type LucideIcon,
} from 'lucide-react-native';
import type { PropertyType } from '../../../utils/propertyCategory';

export const ICON_MAP: Record<PropertyType, LucideIcon> = {
  Apartment: Building,
  House: House,
  Townhome: Building2,
  Condo: Building2,
  Office: Briefcase,
  Retail: Store,
  Warehouse: Warehouse,
  Industrial: Factory,
  Hostel: BedDouble,
  Hotel: Hotel,
};

export interface TypeIconProps {
  type: PropertyType;
  size?: number;
  color?: string;
}

const TypeIcon: React.FC<TypeIconProps> = ({ type, size = 19, color }) => {
  const Icon = ICON_MAP[type];
  if (!Icon) return null;
  return <Icon size={size} color={color} strokeWidth={1.75} />;
};

export default TypeIcon;
