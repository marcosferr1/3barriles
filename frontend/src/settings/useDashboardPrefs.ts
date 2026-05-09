import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = '3barriles.dashboard.sections';
const CHANGE = '3barriles-dashboard-prefs-change';

export type DashboardSectionId = 'kpis' | 'lowStock' | 'purchases' | 'sales' | 'topProducts';

const ALL_KEYS: DashboardSectionId[] = ['kpis', 'lowStock', 'purchases', 'sales', 'topProducts'];

const defaultVisible: Record<DashboardSectionId, boolean> = {
  kpis: true,
  lowStock: true,
  purchases: true,
  sales: true,
  topProducts: true,
};

function read(): Record<DashboardSectionId, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultVisible };
    const parsed = JSON.parse(raw) as Partial<Record<DashboardSectionId, boolean>>;
    const next = { ...defaultVisible };
    for (const k of ALL_KEYS) {
      if (typeof parsed[k] === 'boolean') next[k] = parsed[k]!;
    }
    return next;
  } catch {
    return { ...defaultVisible };
  }
}

function write(v: Record<DashboardSectionId, boolean>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  window.dispatchEvent(new Event(CHANGE));
}

export function useDashboardPrefs() {
  const [visible, setVisible] = useState(read);

  useEffect(() => {
    const sync = () => setVisible(read());
    window.addEventListener(CHANGE, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const setSection = useCallback((id: DashboardSectionId, value: boolean) => {
    setVisible((prev) => {
      const next = { ...prev, [id]: value };
      write(next);
      return next;
    });
  }, []);

  const resetDashboardSections = useCallback(() => {
    write({ ...defaultVisible });
    setVisible({ ...defaultVisible });
  }, []);

  return { visible, setSection, resetDashboardSections };
}
