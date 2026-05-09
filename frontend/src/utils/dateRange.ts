/** Fecha local como YYYY-MM-DD */
export function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function startOfDayLocal(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Primer día del mes de `ref` */
export function startOfMonth(ref: Date): Date {
  return new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0);
}

export type DatePresetId = 'today' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth';

export function applyDatePreset(id: DatePresetId): { from: string; to: string } {
  const now = new Date();
  const today = startOfDayLocal(now);

  switch (id) {
    case 'today':
      return { from: toYMD(today), to: toYMD(today) };
    case 'last7': {
      const from = addDays(today, -6);
      return { from: toYMD(from), to: toYMD(today) };
    }
    case 'last30': {
      const from = addDays(today, -29);
      return { from: toYMD(from), to: toYMD(today) };
    }
    case 'thisMonth': {
      const start = startOfMonth(now);
      return { from: toYMD(start), to: toYMD(today) };
    }
    case 'lastMonth': {
      const endPrev = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      const startPrev = new Date(endPrev.getFullYear(), endPrev.getMonth(), 1, 0, 0, 0, 0);
      return { from: toYMD(startPrev), to: toYMD(endPrev) };
    }
    default:
      return { from: toYMD(addDays(today, -6)), to: toYMD(today) };
  }
}

export function defaultDashboardRange(): { from: string; to: string } {
  return applyDatePreset('last7');
}
