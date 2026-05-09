import { useCallback, useEffect, useState } from 'react';

/** Clave compartida con Configuración · listas paginadas */
export const LIST_PAGE_SIZE_KEY = '3barriles.listPageSize';

export const LIST_PAGE_SIZE_DEFAULT = 25;

/** Valores permitidos; el backend limita por endpoint (p. ej. categorías máx. 100). */
export const LIST_PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200] as const;

export type ListPageSizeOption = (typeof LIST_PAGE_SIZE_OPTIONS)[number];

const CHANGE_EVENT = '3barriles-listpagesize-change';

function readStored(): number {
  try {
    const raw = localStorage.getItem(LIST_PAGE_SIZE_KEY);
    const n = parseInt(raw || '', 10);
    if (!Number.isFinite(n)) return LIST_PAGE_SIZE_DEFAULT;
    if (!(LIST_PAGE_SIZE_OPTIONS as readonly number[]).includes(n)) return LIST_PAGE_SIZE_DEFAULT;
    return n;
  } catch {
    return LIST_PAGE_SIZE_DEFAULT;
  }
}

/** Alineado con `parsePagination` del backend (productos usa maxPageSize 200). */
export const MAX_LIST_PAGE_SIZE_DEFAULT = 100;
export const MAX_LIST_PAGE_SIZE_PRODUCTS = 200;

/** Tamaño de página para selects/modales de productos (máx. API productos). */
export const PRODUCT_PICKER_PAGE_SIZE = MAX_LIST_PAGE_SIZE_PRODUCTS;

export function clampListPageSizeDefault(n: number): number {
  return Math.min(n, MAX_LIST_PAGE_SIZE_DEFAULT);
}

export function clampListPageSizeProducts(n: number): number {
  return Math.min(n, MAX_LIST_PAGE_SIZE_PRODUCTS);
}

export function useListPageSize() {
  const [pageSize, setState] = useState(readStored);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LIST_PAGE_SIZE_KEY || e.key === null) setState(readStored());
    };
    const onCustom = () => setState(readStored());
    window.addEventListener('storage', onStorage);
    window.addEventListener(CHANGE_EVENT, onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(CHANGE_EVENT, onCustom);
    };
  }, []);

  const setPageSize = useCallback((n: number) => {
    const v = (LIST_PAGE_SIZE_OPTIONS as readonly number[]).includes(n) ? n : LIST_PAGE_SIZE_DEFAULT;
    localStorage.setItem(LIST_PAGE_SIZE_KEY, String(v));
    setState(v);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { pageSize, setPageSize, options: LIST_PAGE_SIZE_OPTIONS };
}
