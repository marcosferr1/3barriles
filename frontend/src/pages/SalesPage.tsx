import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { api } from '../api/client';
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
  THEMED_SCROLLBAR_CLASS,
  tableHorizontalScrollWrapStyle,
} from '../components/inline/Primitives';
import { clampListPageSizeDefault, PRODUCT_PICKER_PAGE_SIZE, useListPageSize } from '../settings/useListPageSize';
import type { Paginated } from '../types/api';

type Prod = {
  id: string;
  name: string;
  sku?: string | null;
  salePrice?: string | number;
  stock?: number;
};
type SaleLineDraft = { productId: string; qty: string };
type SaleServerLine = {
  id: string;
  qty: number;
  unitPrice?: string | number | null;
  lineDescription?: string | null;
  product?: Prod;
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

export default function SalesPage() {
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
  const [lines, setLines] = useState<SaleLineDraft[]>([{ productId: '', qty: '1' }]);
  const [confirmSaleOpen, setConfirmSaleOpen] = useState(false);

  async function refreshSales(salesPageOverride?: number) {
    if (!token) return;
    const page = salesPageOverride !== undefined ? salesPageOverride : salesPage;
    setLoading(true);
    try {
      const s = await api.sales.list(token, { page, pageSize: tablePageSize });
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
      tracksStock: true,
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
        }))
        .filter((x) => x.productId && x.qty > 0),
    [lines]
  );

  const saleStockProblems = useMemo(() => {
    const msgs: string[] = [];
    for (const ln of salePayload) {
      const pr = prodMap[ln.productId];
      if (!pr) continue;
      const avail = typeof pr.stock === 'number' ? pr.stock : 0;
      if (ln.qty > avail) {
        msgs.push(`“${pr.name}”: necesitás ${ln.qty} u. pero hay ${avail} en depósito.`);
      }
    }
    return msgs;
  }, [salePayload, prodMap]);

  const estimatedTotal = useMemo(
    () => salePayload.reduce((acc, ln) => acc + ln.qty * salePriceNum(prodMap[ln.productId]), 0),
    [salePayload, prodMap]
  );

  function addLine() {
    setLines((xs) => [...xs, { productId: '', qty: '1' }]);
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
    setLines([{ productId: '', qty: '1' }]);
    setPaymentMethod('CASH');
    setSalesPage(1);
    await refreshSales(1);
    await loadProductsPicker();
  }

  const canAskConfirm = salePayload.length > 0 && saleStockProblems.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 950 }}>Ventas (registro interno)</div>
        <div style={{ marginTop: 6, opacity: 0.72 }}>
          Un solo medio de pago por venta · precio vigente del producto · antes de registrar se muestra una confirmación
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

            {saleStockProblems.length > 0 ? (
              <div
                role="alert"
                style={{
                  marginBottom: 12,
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: p.dangerBg,
                  border: `1px solid rgba(239,68,68,0.25)`,
                  color: p.dangerText,
                  fontSize: 13,
                  lineHeight: 1.45,
                }}
              >
                <div style={{ fontWeight: 800, marginBottom: 6 }}>No hay suficiente stock para esta venta</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {saleStockProblems.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {lines.map((ln, idx) => {
                const pr = ln.productId ? prodMap[ln.productId] : null;
                const q = Math.floor(Number(ln.qty) || 0);
                const avail = pr != null && typeof pr.stock === 'number' ? pr.stock : pr ? 0 : null;
                const over = pr != null && q > 0 && avail != null && q > avail;

                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div className="sale-line">
                      <div className="sale-line__product">
                        <SearchableSelect
                          options={productOptions}
                          value={ln.productId}
                          onChange={(id) => updateLine(idx, { productId: id })}
                          emptyLabel="Producto…"
                        />
                      </div>
                      <div className="sale-line__controls">
                        <Input
                          className="sale-line__qty"
                          value={ln.qty}
                          onChange={(e) => updateLine(idx, { qty: e.target.value })}
                          placeholder="Cant."
                          inputMode="numeric"
                        />
                        <Button
                          className="sale-line__quit"
                          type="button"
                          variant="outline"
                          disabled={lines.length <= 1}
                          onClick={() => removeLine(idx)}
                        >
                          Quitar
                        </Button>
                      </div>
                    </div>
                    {ln.productId && pr && q > 0 && avail != null ? (
                      <div style={{ fontSize: 12, paddingLeft: 2 }}>
                        {over ? (
                          <span role="alert" style={{ fontWeight: 750, color: p.dangerText }}>
                            Cantidad solicitada ({q}) mayor al disponible ({avail} u.).
                          </span>
                        ) : (
                          <span style={{ color: p.mutedText }}>
                            Stock disponible: <strong style={{ color: p.text }}>{avail}</strong> u.
                          </span>
                        )}
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
                  <span style={{ fontSize: 12, opacity: 0.65 }}>Agregá al menos una línea con producto y cantidad.</span>
                ) : saleStockProblems.length > 0 ? (
                  <span style={{ fontSize: 12, color: p.dangerText }}>Corregí las cantidades antes de continuar.</span>
                ) : null}
              </div>
            </div>
          </div>
        </CardSection>
      </Card>

      <ConfirmModal
        open={confirmSaleOpen}
        title="Registrar venta"
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
                const sub = ln.qty * salePriceNum(prod);
                return (
                  <li key={`${i}-${ln.productId}`}>
                    {prod?.name ?? 'Producto'} × {ln.qty} — {moneyArs(sub)}
                  </li>
                );
              })}
            </ul>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Total estimado: {moneyArs(estimatedTotal)}</div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              Si confirmás, se descuenta stock y queda registrada la venta con el precio actual de cada producto.
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
                {loading ? (
                  <tr>
                    <td colSpan={4} style={{ padding: 14, opacity: 0.72 }}>
                      Cargando…
                    </td>
                  </tr>
                ) : null}
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
                          .slice(0, 6)
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
