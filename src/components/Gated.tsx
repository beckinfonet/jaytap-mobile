import React, { ReactNode } from 'react';
import { useRole, Action } from '../hooks/useRole';

interface GatedProps {
  action: Action;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Declarative UI guard. Renders children only when the current user can perform
 * the given action. Library-free per D-01; thin wrapper over `useRole().can()`.
 *
 * Usage:
 *   <Gated action="editVerifications">
 *     <AdminOnlySwitch />
 *   </Gated>
 *
 * Optional fallback renders in place when gated out (default: null — hides entirely).
 */
export const Gated: React.FC<GatedProps> = ({ action, children, fallback = null }) => {
  const { can } = useRole();
  return <>{can(action) ? children : fallback}</>;
};
