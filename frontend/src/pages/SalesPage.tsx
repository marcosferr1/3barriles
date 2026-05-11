import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { api } from '../api/client';
import { toast } from '@/lib/toast';
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
  Modal,
  Select,
  TableLoadingRow,
  THEMED_SCROLLBAR_CLASS,
  tableHorizontalScrollWrapStyle,
} from '../components/inline/Primitives';
import { clampListPageSizeDefault, PRODUCT_PICKER_PAGE_SIZE, useListPageSize } from '../settings/useListPageSize';
import type { Paginated } from '../types/api';

type BundleItemRow = {
  componentProductId?: string;
  qtyPerBundle?: number;
  componentProduct?: { id?: string; name?: string };
};

type Prod = {
  id: string;
  name: string;
  sku?: string | null;
  salePrice?: string | number;
  stock?: number;
  tracksStock?: boolean;
  isBundle?: boolean;
  bundleItems?: BundleItemRow[];
};
type SaleLineDraft = { productId: string; qty: string };
type SaleServerLine = {
  id?: string;
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
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaleId, setEditSaleId] = useState<string | null>(null);
  const [editPayment, setEditPayment] = useState<'CASH' | 'TRANSFER' | 'CARD'>('CASH');
  const [editLines, setEditLines] = useState<SaleLineDraft[]>([{ productId: '', qty: '1' }]);
  const [deleteTarget, setDeleteTarget] = useState<SaleServer | null>(null);

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
      merchandiseForSale: true,
      withBundleItems: true,
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
        label: `${x.isBundle ? '[Pack] ' : ''}${x.name}${x.sku ? ` (${x.sku})` : ''}`,
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
    const needMap: Record<string, { label: string; qty: number }> = {};
    function addNeed(id: string, label: string, q: number) {
      if (!id) return;
      const k = String(id);
      if (!needMap[k]) needMap[k] = { label, qty: 0 };
      needMap[k].qty += q;
    }
    for (const ln of salePayload) {
      const pr = prodMap[ln.productId];
      if (!pr) continue;
      if (pr.isBundle && pr.bundleItems?.length) {
        for (const bi of pr.bundleItems) {
          const cid = String(bi.componentProductId ?? bi.componentProduct?.id ?? '');
          const comp = prodMap[cid];
          const nm = comp?.name ?? bi.componentProduct?.name ?? 'Producto';
          const per = Math.max(1, Math.floor(Number(bi.qtyPerBundle ?? 1)));
          addNeed(cid, nm, ln.qty * per);
        }
      } else if (pr.tracksStock !== false) {
        addNeed(String(pr.id), pr.name, ln.qty);
      }
    }
    for (const [id, { label, qty }] of Object.entries(needMap)) {
      const comp = prodMap[id];
      const avail = comp != null && typeof comp.stock === 'number' ? comp.stock : 0;
      if (qty > avail) {
        msgs.push(`“${label}”: necesitás ${qty} u. pero hay ${avail} en depósito.`);
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
    toast.success('Venta registrada');
    setLines([{ productId: '', qty: '1' }]);
    setPaymentMethod('CASH');
    setSalesPage(1);
    await refreshSales(1);
    await loadProductsPicker();
  }

  const canAskConfirm = salePayload.length > 0 && saleStockProblems.length === 0;

  const editPayload = useMemo(
    () =>
      editLines
        .map((ln) => ({
          productId: ln.productId,
          qty: Math.floor(Number(ln.qty) || 0),
        }))
        .filter((x) => x.productId && x.qty > 0),
    [editLines]
  );

  const editProdMap = prodMap;

  const editStockProblems = useMemo(() => {
    const msgs: string[] = [];
    const needMap: Record<string, { label: string; qty: number }> = {};
    function addNeed(id: string, label: string, q: number) {
      if (!id) return;
      const k = String(id);
      if (!needMap[k]) needMap[k] = { label, qty: 0 };
      needMap[k].qty += q;
    }
    for (const ln of editPayload) {
      const pr = editProdMap[ln.productId];
      if (!pr) continue;
      if (pr.isBundle && pr.bundleItems?.length) {
        for (const bi of pr.bundleItems) {
          const cid = String(bi.componentProductId ?? bi.componentProduct?.id ?? '');
          const comp = editProdMap[cid];
          const nm = comp?.name ?? bi.componentProduct?.name ?? 'Producto';
          const per = Math.max(1, Math.floor(Number(bi.qtyPerBundle ?? 1)));
          addNeed(cid, nm, ln.qty * per);
        }
      } else if (pr.tracksStock !== false) {
        addNeed(String(pr.id), pr.name, ln.qty);
      }
    }
    for (const [id, { label, qty }] of Object.entries(needMap)) {
      const comp = editProdMap[id];
      const avail = comp != null && typeof comp.stock === 'number' ? comp.stock : 0;
      if (qty > avail) {
        msgs.push(`“${label}”: necesitás ${qty} u. pero hay ${avail} en depósito.`);
      }
    }
    return msgs;
  }, [editPayload, editProdMap]);

  async function openEditSale(s: SaleServer) {
    if (!token) return;
    setEditSaleId(s.id);
    setEditOpen(true);
    setEditLoading(true);
    try {
      const full = (await api.sales.get(token, s.id)) as SaleServer;
      setEditPayment((full.paymentMethod as typeof editPayment) || 'CASH');
      const ls = (full.lines || []).map((ln) => ({
        productId: ln.product?.id || '',
        qty: String(ln.qty ?? 1),
      }));
      setEditLines(ls.length ? ls : [{ productId: '', qty: '1' }]);
    } finally {
      setEditLoading(false);
    }
  }

  async function execEditSale() {
    if (!token || !editSaleId || !editPayload.length) return;
    await api.sales.patch(token, editSaleId, { paymentMethod: editPayment, lines: editPayload });
    toast.success('Venta actualizada');
    setEditOpen(false);
    setEditSaleId(null);
    await refreshSales();
    await loadProductsPicker();
  }

  async function execDeleteSale() {
    if (!token || !deleteTarget) return;
    await api.sales.remove(token, deleteTarget.id);
    toast.success('Venta eliminada');
    setDeleteTarget(null);
    await refreshSales();
    await loadProductsPicker();
  }

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
                const avail =
                  pr != null && !pr.isBundle && typeof pr.stock === 'number' ? pr.stock : pr && !pr.isBundle ? 0 : null;
                const over = pr != null && !pr.isBundle && q > 0 && avail != null && q > avail;

                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div className="sale-line">
                      <div className="sale-line__product">
                        <SearchableSelect
                          options={productOptions}
                          value={ln.productId}
                          onChange={(id) => updateLine(idx, { productId: id })}
                          emptyLabel="Producto o pack…"
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
                    {ln.productId && pr && q > 0 ? (
                      <div style={{ fontSize: 12, paddingLeft: 2 }}>
                        {pr.isBundle ? (
                          <span style={{ color: p.mutedText }}>
                            Pack: el stock se valida por cada producto del catálogo que compone el pack (ver alerta arriba si falta).
                          </span>
                        ) : avail != null ? (
                          over ? (
                            <span role="alert" style={{ fontWeight: 750, color: p.dangerText }}>
                              Cantidad solicitada ({q}) mayor al disponible ({avail} u.).
                            </span>
                          ) : (
                            <span style={{ color: p.mutedText }}>
                              Stock disponible: <strong style={{ color: p.text }}>{avail}</strong> u.
                            </span>
                          )
                        ) : null}
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

      <Modal open={editOpen} title="Editar venta" onClose={() => setEditOpen(false)} panelStyle={{ maxWidth: 560 }}>
        {editLoading ? (
          <div style={{ padding: 24, textAlign: 'center', opacity: 0.8 }}>Cargando…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 13, opacity: 0.75 }}>
              Se revierten los movimientos de stock de la venta anterior y se aplican los nuevos al guardar.
            </div>
            <div>
              <div style={{ fontWeight: 800, marginBottom: 6, fontSize: 13 }}>Medio de pago</div>
              <Select value={editPayment} onChange={(e) => setEditPayment(e.target.value as typeof editPayment)}>
                <option value="CASH">Efectivo</option>
                <option value="TRANSFER">Transferencia</option>
                <option value="CARD">Tarjeta</option>
              </Select>
            </div>
            {editStockProblems.length > 0 ? (
              <div
                role="alert"
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: p.dangerBg,
                  border: `1px solid rgba(239,68,68,0.25)`,
                  color: p.dangerText,
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Stock insuficiente</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {editStockProblems.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div style={{ fontWeight: 950, marginBottom: 6 }}>Líneas</div>
            {editLines.map((ln, idx) => (
              <div key={idx} className="sale-line" style={{ marginBottom: 8 }}>
                <div className="sale-line__product">
                  <SearchableSelect
                    options={productOptions}
                    value={ln.productId}
                    onChange={(id) =>
                      setEditLines((xs) => xs.map((l, i) => (i === idx ? { ...l, productId: id } : l)))
                    }
                    emptyLabel="Producto o pack…"
                  />
                </div>
                <div className="sale-line__controls">
                  <Input
                    className="sale-line__qty"
                    value={ln.qty}
                    onChange={(e) =>
                      setEditLines((xs) => xs.map((l, i) => (i === idx ? { ...l, qty: e.target.value } : l)))
                    }
                    inputMode="numeric"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={editLines.length <= 1}
                    onClick={() => setEditLines((xs) => xs.filter((_, i) => i !== idx))}
                  >
                    Quitar
                  </Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setEditLines((xs) => [...xs, { productId: '', qty: '1' }])}>
              + línea
            </Button>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" disabled={!editPayload.length || editStockProblems.length > 0} onClick={execEditSale}>
                Guardar cambios
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={deleteTarget != null}
        title="Borrar venta"
        confirmLabel="Borrar"
        cancelLabel="Cancelar"
        description={
          deleteTarget ? (
            <>
              Se eliminará el registro y se revertirán los movimientos de stock asociados. Total:{' '}
              <strong>{moneyArs(`${deleteTarget.totalAmount ?? '0'}`)}</strong>
              {deleteTarget.soldAt ? (
                <>
                  {' '}
                  · {new Date(deleteTarget.soldAt).toLocaleString('es-AR')}
                </>
              ) : null}
            </>
          ) : null
        }
        onClose={() => setDeleteTarget(null)}
        onConfirm={execDeleteSale}
      />

      <Card>
        <CardSection style={{ padding: 0 }}>
          <div className={THEMED_SCROLLBAR_CLASS} style={tableHorizontalScrollWrapStyle}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1040 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: `1px solid ${p.cardBorder}` }}>
                  <th style={{ padding: '12px 14px' }}>Cuándo</th>
                  <th style={{ padding: '12px 14px' }}>Pago</th>
                  <th style={{ padding: '12px 14px' }}>Total</th>
                  <th style={{ padding: '12px 14px' }}>Ítems</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <TableLoadingRow colSpan={5} /> : null}
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
                      <td style={{ padding: '12px 14px', fontSize: 13, opacity: 0.86, maxWidth: 420 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {(s.lines || []).slice(0, 8).map((ln, li) => (
                            <div key={ln.id || `${s.id}-${li}`}>
                              {ln.lineDescription || ln.product?.name || 'Producto'}{' '}
                              <span style={{ opacity: 0.75 }}>×{ln.qty}</span>
                              {ln.unitPrice != null ? (
                                <span style={{ opacity: 0.65 }}>
                                  {' '}
                                  @ {moneyArs(ln.unitPrice)}
                                </span>
                              ) : null}
                            </div>
                          ))}
                          {!s.lines?.length ? '—' : null}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <Button type="button" variant="outline" size="sm" onClick={() => void openEditSale(s)}>
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          style={{ marginLeft: 8 }}
                          onClick={() => setDeleteTarget(s)}
                        >
                          Borrar
                        </Button>
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
