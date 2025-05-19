/* ---------------------------------- types --------------------------------- */
export type ColumnKey = 'name' | 'grade' | 'forkedAt';

export interface SortCriterion {
  key: ColumnKey;
  order: 'asc' | 'desc';
}

/* -------------------------- click-cycle helper ----------------------------- */
/* undefined   ──►  'desc'   (1st click)
 * 'desc'      ──►  'asc'    (2nd click)
 * 'asc'       ──►  undefined (3rd click → no sort)
 */
export function cycleOrder(
  current?: 'asc' | 'desc'
): 'asc' | 'desc' | undefined {
  if (current === undefined) return 'desc';
  if (current === 'desc')    return 'asc';
  return undefined;
}

/* ------------------------------ comparator --------------------------------- */
export function compare(a: any, b: any, key: ColumnKey): number {
  switch (key) {
    case 'name':
      return a.students[0].login.localeCompare(b.students[0].login);

    case 'grade': {
      // Extract the leading number (`"100/100"` → 100).  Missing/invalid → −1.
      const getNum = (g: string | undefined) => {
        const n = parseInt(g ?? '', 10);
        return Number.isNaN(n) ? -1 : n;
      };
      return getNum(a.grade) - getNum(b.grade);
    }

    case 'forkedAt': {
      const toMs = (d: string | undefined) => Date.parse(d ?? '');
      return toMs(a.forkedAt ?? a.repository?.forked_at) -
             toMs(b.forkedAt ?? b.repository?.forked_at);
    }
  }
}

/* ------------------------------- sorter ------------------------------------ */
export function applySort(
  data: any[],
  { key, order }: SortCriterion | undefined   // only one column active
): any[] {
  if (!key) return data;                      // no sort requested

  return [...data].sort((a, b) => {
    const cmp = compare(a, b, key);
    return order === 'asc' ? cmp : -cmp;
  });
}
