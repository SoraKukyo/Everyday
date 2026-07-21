import { supabase } from './supabaseClient';

export const DEFAULT_PAGE_SIZE = 500;
export const DEFAULT_MAX_ROWS = 5000;

/**
 * Reads private rows in explicit pages instead of relying on Supabase's
 * response-size default. Callers receive a visible truncation signal if the
 * configured safety ceiling is reached.
 */
export async function listAllRowsForUser(table, userId, {
  orderColumn = 'created_at',
  ascending = false,
  pageSize = DEFAULT_PAGE_SIZE,
  maxRows = DEFAULT_MAX_ROWS,
} = {}) {
  const rows = [];
  let offset = 0;

  while (rows.length < maxRows) {
    const remaining = maxRows - rows.length;
    const size = Math.min(pageSize, remaining);
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .order(orderColumn, { ascending })
      .range(offset, offset + size - 1);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < size) return { rows, truncated: false };
    offset += page.length;
  }

  const { data: nextPage, error: nextPageError } = await supabase
    .from(table)
    .select('id')
    .eq('user_id', userId)
    .order(orderColumn, { ascending })
    .range(offset, offset);
  if (nextPageError) throw nextPageError;
  return { rows, truncated: Boolean(nextPage?.length) };
}
