import { toast } from '@/lib/toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

type ApiFetchMeta = { notifyError?: boolean };

async function apiFetch(path: string, options?: RequestInit, meta?: ApiFetchMeta) {
  const notifyError = meta?.notifyError !== false;
  const { headers: optsHeaders, ...rest } = options || {};
  const headers = new Headers(optsHeaders ?? undefined);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers,
    });
  } catch {
    const message = 'No se pudo conectar con el servidor';
    if (notifyError) toast.error(message);
    throw new Error(message);
  }

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      message = data?.error || message;
    } catch {
      // ignore
    }
    if (notifyError) toast.error(message);
    throw new Error(message);
  }

  if (res.status === 204) return null as never;
  return res.json();
}

function buildQuery(params: Record<string, string | number | null | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    sp.set(k, String(v));
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

async function apiAuthFetch(token: string, path: string, options?: RequestInit, meta?: ApiFetchMeta) {
  return apiFetch(
    path,
    {
      ...options,
      headers: {
        ...(options?.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    },
    meta
  );
}

export const api = {
  login: (body: { email: string; password: string }) =>
    apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: (token: string) =>
    apiFetch('/auth/me', { headers: { Authorization: `Bearer ${token}` } }, { notifyError: false }),

  dashboard: {
    summary: (
      token: string,
      params?: {
        from?: string;
        to?: string;
        purchaseLimit?: number;
        saleLimit?: number;
        topLimit?: number;
        stockLimit?: number;
      }
    ) => {
      const qs = buildQuery({
        from: params?.from,
        to: params?.to,
        purchaseLimit: params?.purchaseLimit,
        saleLimit: params?.saleLimit,
        topLimit: params?.topLimit,
        stockLimit: params?.stockLimit,
      });
      return apiAuthFetch(token, `/dashboard/summary${qs}`);
    },
  },

  categories: {
    list: (token: string, params?: { page?: number; pageSize?: number; q?: string }) => {
      const qs = buildQuery({
        page: params?.page,
        pageSize: params?.pageSize,
        q: params?.q?.trim() || undefined,
      });
      return apiAuthFetch(token, `/categories${qs}`);
    },
    create: (token: string, body: { name: string }) =>
      apiAuthFetch(token, '/categories', { method: 'POST', body: JSON.stringify(body) }),
    patch: (token: string, id: string, body: { name: string }) =>
      apiAuthFetch(token, `/categories/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) }),
    remove: (token: string, id: string) =>
      apiAuthFetch(token, `/categories/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },

  suppliers: {
    list: (token: string, params?: { q?: string; page?: number; pageSize?: number }) => {
      const qs = buildQuery({
        q: params?.q?.trim() || undefined,
        page: params?.page,
        pageSize: params?.pageSize,
      });
      return apiAuthFetch(token, `/suppliers${qs}`);
    },
    create: (token: string, body: { name: string; phone?: string; email?: string; notes?: string }) =>
      apiAuthFetch(token, '/suppliers', { method: 'POST', body: JSON.stringify(body) }),
    patch: (token: string, id: string, body: Record<string, unknown>) =>
      apiAuthFetch(token, `/suppliers/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) }),
    remove: (token: string, id: string) =>
      apiAuthFetch(token, `/suppliers/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },

  products: {
    list: (
      token: string,
      params?: {
        q?: string;
        supplierId?: string;
        tracksStock?: boolean;
        merchandiseForSale?: boolean;
        withBundleItems?: boolean;
        isBundle?: boolean;
        includeInactive?: boolean;
        page?: number;
        pageSize?: number;
      }
    ) => {
      const qs = buildQuery({
        q: params?.q,
        supplierId: params?.supplierId,
        tracksStock: params?.tracksStock === true ? 'true' : params?.tracksStock === false ? 'false' : undefined,
        merchandiseForSale: params?.merchandiseForSale ? 'true' : undefined,
        withBundleItems: params?.withBundleItems ? 'true' : undefined,
        isBundle: params?.isBundle === true ? 'true' : params?.isBundle === false ? 'false' : undefined,
        includeInactive: params?.includeInactive ? 'true' : undefined,
        page: params?.page,
        pageSize: params?.pageSize,
      });
      return apiAuthFetch(token, `/products${qs}`);
    },
    get: (token: string, id: string) => apiAuthFetch(token, `/products/${encodeURIComponent(id)}`),
    create: (
      token: string,
      body: {
        name: string;
        sku?: string | null;
        supplierId?: string;
        categoryId?: string | null;
        unitCost?: number;
        salePrice?: number;
        reorderLevel?: number;
        active?: boolean;
        initialQty?: number;
        tracksStock?: boolean;
        happyHourEnabled?: boolean;
        happyHourMode?: 'OFF' | 'SPECIAL_PRICE' | 'DOUBLE_QTY' | 'PROMO_2FOR1';
        happyHourUnitPrice?: number | null;
        isBundle?: boolean;
        bundleItems?: Array<{ componentProductId: string; qtyPerBundle: number; productId?: string; qty?: number }>;
      }
    ) => apiAuthFetch(token, '/products', { method: 'POST', body: JSON.stringify(body) }),
    patch: (token: string, id: string, body: Record<string, unknown>) =>
      apiAuthFetch(token, `/products/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) }),
    deactivate: (token: string, id: string) =>
      apiAuthFetch(token, `/products/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    adjust: (token: string, id: string, body: { qtyDelta: number; note?: string | null }) =>
      apiAuthFetch(token, `/products/${encodeURIComponent(id)}/adjust-stock`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  },

  purchaseOrders: {
    list: (token: string, params?: { page?: number; pageSize?: number }) => {
      const qs = buildQuery({
        page: params?.page,
        pageSize: params?.pageSize,
      });
      return apiAuthFetch(token, `/purchase-orders${qs}`);
    },
    get: (token: string, id: string) => apiAuthFetch(token, `/purchase-orders/${encodeURIComponent(id)}`),
    create: (
      token: string,
      body: {
        supplierId: string;
        orderedAt?: string;
        lines: Array<{ productId: string; qty: number; unitCost: number }>;
      }
    ) => apiAuthFetch(token, '/purchase-orders', { method: 'POST', body: JSON.stringify(body) }),
    receive: (token: string, id: string) =>
      apiAuthFetch(token, `/purchase-orders/${encodeURIComponent(id)}/receive`, { method: 'POST' }),
  },

  sales: {
    list: (token: string, params?: { page?: number; pageSize?: number; barSales?: boolean }) => {
      const qs = buildQuery({
        page: params?.page,
        pageSize: params?.pageSize,
        barSales: params?.barSales ? 'true' : undefined,
      });
      return apiAuthFetch(token, `/sales${qs}`);
    },
    get: (token: string, id: string) => apiAuthFetch(token, `/sales/${encodeURIComponent(id)}`),
    create: (
      token: string,
      body: {
        paymentMethod: 'CASH' | 'TRANSFER' | 'CARD';
        lines: Array<{ productId: string; qty: number; happyHour?: boolean }>;
      }
    ) => apiAuthFetch(token, '/sales', { method: 'POST', body: JSON.stringify(body) }),
    patch: (
      token: string,
      id: string,
      body: {
        paymentMethod: 'CASH' | 'TRANSFER' | 'CARD';
        lines: Array<{ productId: string; qty: number; happyHour?: boolean }>;
      }
    ) =>
      apiAuthFetch(token, `/sales/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    remove: (token: string, id: string) =>
      apiAuthFetch(token, `/sales/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },
};
