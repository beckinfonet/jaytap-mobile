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

/**
 * 260603-emq — optional i18n hook. Defaults preserve the original behavior
 * (identity translate + English "or"), so existing callers/tests are unchanged.
 * RU callers pass `translate` (per-type i18n lookup) and a localized `connective`
 * so the result reads e.g. "квартира или дом" instead of raw English.
 */
export interface JoinTypesOptions {
  translate?: (type: string) => string;
  connective?: string;
}

export function joinTypes(
  category: PropertyCategory,
  types: string[],
  lower = false,
  opts?: JoinTypesOptions,
): string {
  // `category` is accepted for handoff parity / forward-fit; not consumed in
  // the v1 algorithm. Reference it to silence unused-var rules.
  void category;

  const translate = opts?.translate ?? ((s: string) => s);
  const connective = opts?.connective ?? 'or';
  const norm = (s: string): string => {
    const tr = translate(s);
    return lower ? tr.toLowerCase() : tr;
  };

  if (types.length === 0) return '';
  if (types.length === 1) return norm(types[0]);
  if (types.length === 2) return `${norm(types[0])} ${connective} ${norm(types[1])}`;
  // 3+ — handoff stops at 3 ("A, B or C"). Generalize the same shape:
  //   first N-1 comma-joined, then ' {connective} {last}'.
  const head = types.slice(0, -1).map(norm).join(', ');
  const tail = norm(types[types.length - 1]);
  return `${head} ${connective} ${tail}`;
}
