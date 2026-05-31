/**
 * joinTypes — natural-language collapse for Breadcrumb + Cascading result line.
 *
 * Empty → ''; 1 → label; 2 → "A or B"; 3+ → "A, B or C" (handoff stops at 3).
 *
 * Source: handoff filters-shared.jsx:75-79 (ported). The `category` parameter is
 * accepted to match the handoff signature even though the current logic does
 * not branch on it — forward-fit for category-specific connective words in M7+.
 *
 * Convention: matches buildFilterQuery.ts shape (named export, pure fn, no
 * React imports, no side effects).
 *
 * @see src/utils/propertyCategory.ts — PropertyCategory
 * @see .planning/phases/14-.../14-CONTEXT.md §"Specifics" (joinTypes algorithm)
 */
import type { PropertyCategory } from '../../../utils/propertyCategory';

export function joinTypes(
  category: PropertyCategory,
  types: string[],
  lower = false,
): string {
  // `category` is accepted for handoff parity / forward-fit; not consumed in
  // the v1 algorithm. Reference it to silence unused-var rules.
  void category;

  const norm = (s: string): string => (lower ? s.toLowerCase() : s);

  if (types.length === 0) return '';
  if (types.length === 1) return norm(types[0]);
  if (types.length === 2) return `${norm(types[0])} or ${norm(types[1])}`;
  // 3+ — handoff stops at 3 ("A, B or C"). Generalize the same shape:
  //   first N-1 comma-joined, then ' or {last}'.
  const head = types.slice(0, -1).map(norm).join(', ');
  const tail = norm(types[types.length - 1]);
  return `${head} or ${tail}`;
}
