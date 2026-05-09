import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { api } from '../api/client';
import { DEFAULT_SUPPLIER_ID } from '../constants/defaultSupplier';
import { usePalette } from '../theme/ThemeProvider';
import { ConfirmModal } from '../components/inline/ConfirmModal';
import { PaginationBar } from '../components/inline/PaginationBar';
import { SearchableSelect } from '../components/inline/SearchableSelect';
import {
  Badge,
  Button,
  Card,
  CardSection,
  Input,
  Select,
  TableLoadingRow,
  THEMED_SCROLLBAR_CLASS,
  tableHorizontalScrollWrapStyle,
} from '../components/inline/Primitives';
import { clampListPageSizeDefault, PRODUCT_PICKER_PAGE_SIZE, useListPageSize } from '../settings/useListPageSize';
import type { Paginated } from '../types/api';

const HAPPY_OFF = 'OFF';
const HH_SPECIAL = 'SPECIAL_PRICE';
const HH_DOUBLE = 'DOUBLE_QTY';
const HH_PROMO = 'PROMO_2FOR1';

type Prod = {
  id: string;
  name: string;
  sku?: string | null;
  salePrice?: string | number;
  stock?: number;
  tracksStock?: boolean;
  happyHourEnabled?: boolean;
  happyHourMode?: string | null;
  happyHourUnitPrice?: string | number | null;
};
type SaleLineDraft = { productId: string; qty: string; happyHour: boolean };

type SaleServerLine = {
  id: string;
  qty: number;
  unitPrice?: string | number | null;
  lineDescription?: string | null;
  happyHourApplied?: boolean;
  product?: { id: string; name: string; sku?: string | null; tracksStock?: boolean | null };
};
type SaleServer = {
  id: string;
  soldAt?: string | Date | null;
  paymentMethod?: string | null;
  totalAmount?: string | number | null;
  lines?: SaleServerLine[];
};

function moneyArs(amount: string | number) {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(n);
}

const PAY_LABEL: Record<'CASH' | 'TRANSFER' | 'CARD', string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
};

function salePriceNum(p?: Prod | null): number {
  if (!p) return 0;
  const raw = p.salePrice;
  const n = typeof raw === 'string' ? Number(raw) : Number(raw ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function hhPriceNum(p?: Prod | null): number {
  if (!p) return 0;
  const raw = p.happyHourUnitPrice;
  const n = typeof raw === 'string' ? Number(raw) : Number(raw ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** Previsualización alineada con el backend (`resolveSaleLine`). */
function estimateBarLine(product: Prod, userQty: number, happyHour: boolean) {
  const salePrice = salePriceNum(product);
  let effQty = userQty;
  let unitPrice = salePrice;
  let lineDescription = product.name;

  const wantHh =
    !!happyHour &&
    product.happyHourEnabled &&
    product.happyHourMode &&
    product.happyHourMode !== HAPPY_OFF;

  if (!wantHh) {
    return { effQty, unitPrice, lineDescription };
  }

  lineDescription = `${product.name} (happy hour)`;
  switch (product.happyHourMode) {
    case HH_SPECIAL:
      effQty = userQty;
      unitPrice = hhPriceNum(product);
      break;
    case HH_DOUBLE:
      effQty = userQty * 2;
      unitPrice = salePrice;
      break;
    case HH_PROMO:
      effQty = userQty * 2;
      unitPrice = salePrice / 2;
      break;
    default:
      return { effQty: userQty, unitPrice: salePrice, lineDescription: product.name };
  }
  return { effQty, unitPrice, lineDescription };
}

export default function BarSalesPage() {
  const { token } = useAuth();
  const p = usePalette();
  const { pageSize: listPageSize } = useListPageSize();
  const tablePageSize = clampListPageSizeDefault(listPageSize);
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<SaleServer[]>([]);
  const [salesTotal, setSalesTotal] = useState(0);
  const [salesPage, setSalesPage] = useState(1);
  const [products, setProducts] = useState<Prod[]>([]);

  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER' | 'CARD'>('CASH');
  const [lines, setLines] = useState<SaleLineDraft[]>([{ productId: '', qty: '1', happyHour: false }]);
  const [confirmSaleOpen, setConfirmSaleOpen] = useState(false);

  async function refreshSales(salesPageOverride?: number) {
    if (!token) return;
    const page = salesPageOverride !== undefined ? salesPageOverride : salesPage;
    setLoading(true);
    try {
      const s = await api.sales.list(token, { page, pageSize: tablePageSize, barSales: true });
      const sd = s as Paginated<SaleServer>;
      setSales(sd.items || []);
      setSalesTotal(sd.total ?? 0);
    } finally {
      setLoading(false);
    }
  }

  async function loadProductsPicker() {
    if (!token) return;
    const ps = await api.products.list(token, {
      supplierId: DEFAULT_SUPPLIER_ID,
      tracksStock: false,
      page: 1,
      pageSize: PRODUCT_PICKER_PAGE_SIZE,
    });
    const pd = ps as Paginated<Prod>;
    setProducts(pd.items || []);
  }

  useEffect(() => {
    void loadProductsPicker();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    void refreshSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, salesPage, tablePageSize]);

  useEffect(() => {
    setSalesPage(1);
  }, [listPageSize]);

  const prodMap = useMemo(() => Object.fromEntries(products.map((x) => [x.id, x])), [products]);

  const productOptions = useMemo(
    () =>
      products.map((x) => ({
        value: x.id,
        label: `${x.name}${x.sku ? ` (${x.sku})` : ''}`,
      })),
    [products]
  );

  const salePayload = useMemo(
    () =>
      lines
        .map((ln) => ({
          productId: ln.productId,
          qty: Math.floor(Number(ln.qty) || 0),
          happyHour: !!ln.happyHour,
        }))
        .filter((x) => x.productId && x.qty > 0),
    [lines]
  );

  const estimatedTotal = useMemo(() => {
    let acc = 0;
    for (const ln of salePayload) {
      const prod = prodMap[ln.productId];
      if (!prod) continue;
      const est = estimateBarLine(prod, ln.qty, ln.happyHour);
      acc += est.effQty * est.unitPrice;
    }
    return acc;
  }, [salePayload, prodMap]);

  function addLine() {
    setLines((xs) => [...xs, { productId: '', qty: '1', happyHour: false }]);
  }

  function updateLine(idx: number, patch: Partial<SaleLineDraft>) {
    setLines((xs) => xs.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function removeLine(idx: number) {
    setLines((xs) => xs.filter((_, i) => i !== idx));
  }

  async function execCreateSale() {
    if (!token || !salePayload.length) return;
    await api.sales.create(token, { paymentMethod, lines: salePayload });
    setLines([{ productId: '', qty: '1', happyHour: false }]);
    setPaymentMethod('CASH');
    setSalesPage(1);
    await refreshSales(1);
    await loadProductsPicker();
  }

  const canAskConfirm = salePayload.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 950 }}>Ventas BAR</div>
        <div style={{ marginTop: 6, opacity: 0.72, maxWidth: 720, lineHeight: 1.45 }}>
          Tragos del proveedor por defecto únicamente. No se descuenta depósito al registrar la venta: el uso de botellas se carga después.
        </div>
      </div>

      <Card>
        <CardSection style={{ padding: 16 }}>
          <div style={{ fontWeight: 950, marginBottom: 10 }}>Nueva venta</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 360px)', gap: 10 }}>
            <div>
              <div style={{ fontWeight: 800, marginBottom: 6, fontSize: 13 }}>Medio de pago</div>
              <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}>
                <option value="CASH">Efectivo</option>
                <option value="TRANSFER">Transferencia</option>
                <option value="CARD">Tarjeta</option>
              </Select>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 950, marginBottom: 10 }}>Líneas</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {lines.map((ln, idx) => {
                const pr = ln.productId ? prodMap[ln.productId] : null;
                const qUser = Math.floor(Number(ln.qty) || 0);
                const est = pr && qUser > 0 ? estimateBarLine(pr, qUser, ln.happyHour) : null;
                const hhAllowed = !!(pr?.happyHourEnabled && pr?.happyHourMode && pr.happyHourMode !== HAPPY_OFF);

                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div className="bar-sales-line">
                      <div className="bar-sales-line__product">
                        <SearchableSelect
                          options={productOptions}
                          value={ln.productId}
                          onChange={(id) => updateLine(idx, { productId: id, happyHour: false })}
                          emptyLabel="Trago…"
                        />
                      </div>
                      <div className="bar-sales-line-controls">
                        <Input
                          className="bar-sales-line__qty"
                          value={ln.qty}
                          onChange={(e) => updateLine(idx, { qty: e.target.value })}
                          placeholder="Cant."
                          inputMode="numeric"
                          style={{ width: '88px', maxWidth: '100%', boxSizing: 'border-box' }}
                        />
                        <label
                          className="bar-sales-line__hh"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 12,
                            fontWeight: 650,
                            opacity: hhAllowed ? 1 : 0.38,
                          }}
                        >
                          <input
                            type="checkbox"
                            disabled={!hhAllowed || !ln.productId}
                            checked={!!ln.happyHour && hhAllowed}
                            onChange={(e) => updateLine(idx, { happyHour: e.target.checked })}
                          />{' '}
                          HH
                        </label>
                        <Button
                          className="bar-sales-line__quit"
                          type="button"
                          variant="outline"
                          disabled={lines.length <= 1}
                          onClick={() => removeLine(idx)}
                        >
                          Quitar
                        </Button>
                      </div>
                    </div>
                    {est && qUser > 0 ? (
                      <div style={{ fontSize: 12, color: p.mutedText }}>
                        Facturado:{' '}
                        <strong style={{ color: p.text }}>
                          {est.lineDescription} × {est.effQty}
                        </strong>{' '}
                        · {moneyArs(est.unitPrice)} c/u → {moneyArs(est.effQty * est.unitPrice)}
                      </div>
                    ) : null}
                  </div>
                );
              })}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <Button type="button" variant="outline" size="sm" onClick={addLine}>
                  + línea
                </Button>
                <Button type="button" disabled={!canAskConfirm} onClick={() => setConfirmSaleOpen(true)}>
                  Confirmar venta
                </Button>
                {!salePayload.length ? (
                  <span style={{ fontSize: 12, opacity: 0.65 }}>Agregá al menos una línea con trago y cantidad.</span>
                ) : null}
              </div>
            </div>
          </div>
        </CardSection>
      </Card>

      <ConfirmModal
        open={confirmSaleOpen}
        title="Registrar venta BAR"
        confirmLabel="Registrar venta"
        cancelLabel="Volver"
        description={
          <>
            <div style={{ marginBottom: 10 }}>
              Medio de pago:{' '}
              <strong>{PAY_LABEL[paymentMethod]}</strong>
            </div>
            <ul style={{ margin: '0 0 12px', paddingLeft: 20, lineHeight: 1.5 }}>
              {salePayload.map((ln, i) => {
                const prod = prodMap[ln.productId];
                const est = prod ? estimateBarLine(prod, ln.qty, ln.happyHour) : null;
                const lineLabel = est?.lineDescription || prod?.name || 'Producto';
                const sub = est ? est.effQty * est.unitPrice : 0;
                return (
                  <li key={`${i}-${ln.productId}`}>
                    {lineLabel} × {est?.effQty ?? ln.qty} — {moneyArs(sub)}
                  </li>
                );
              })}
            </ul>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Total: {moneyArs(estimatedTotal)}</div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              No impacta stock de depósito. Los montos quedan fijados como en cada línea.
            </div>
          </>
        }
        onClose={() => setConfirmSaleOpen(false)}
        onConfirm={execCreateSale}
      />

      <Card>
        <CardSection style={{ padding: 0 }}>
          <div className={THEMED_SCROLLBAR_CLASS} style={tableHorizontalScrollWrapStyle}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 960 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: `1px solid ${p.cardBorder}` }}>
                  <th style={{ padding: '12px 14px' }}>Cuándo</th>
                  <th style={{ padding: '12px 14px' }}>Pago</th>
                  <th style={{ padding: '12px 14px' }}>Total</th>
                  <th style={{ padding: '12px 14px' }}>Ítems</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <TableLoadingRow colSpan={4} /> : null}
                {!loading &&
                  sales.map((s) => (
                    <tr key={s.id} style={{ borderBottom: `1px solid ${p.cardBorder}` }}>
                      <td style={{ padding: '12px 14px', fontSize: 13, opacity: 0.85 }}>
                        {s.soldAt ? new Date(s.soldAt).toLocaleString('es-AR') : '—'}
                      </td>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <Badge label={String(s.paymentMethod || '—')} tone="neutral" />
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 900 }}>{moneyArs(`${s.totalAmount ?? '0'}`)}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, opacity: 0.86 }}>
                        {(s.lines || [])
                          .slice(0, 8)
                          .map((ln) => `${ln.lineDescription || ln.product?.name || 'Producto'} x${ln.qty}`)
                          .join(' · ') || '—'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '0 16px 16px' }}>
            <PaginationBar
              page={salesPage}
              pageSize={tablePageSize}
              total={salesTotal}
              onPageChange={setSalesPage}
              disabled={loading}
            />
          </div>
        </CardSection>
      </Card>
    </div>
  );
}
