import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { api } from '../api/client';
import { usePalette } from '../theme/ThemeProvider';
import { ProductCreateModal } from '../components/forms/ProductCreateModal';
import { SupplierQuickModal } from '../components/forms/SupplierQuickModal';
import { ConfirmModal } from '../components/inline/ConfirmModal';
import { PaginationBar } from '../components/inline/PaginationBar';
import {
  Badge,
  Button,
  Card,
  CardSection,
  Input,
  THEMED_SCROLLBAR_CLASS,
  tableHorizontalScrollWrapStyle,
} from '../components/inline/Primitives';
import { SearchableSelect } from '../components/inline/SearchableSelect';
import { clampListPageSizeDefault, PRODUCT_PICKER_PAGE_SIZE, useListPageSize } from '../settings/useListPageSize';
import type { Paginated } from '../types/api';

type Supplier = { id: string; name: string };
type Prod = { id: string; name: string; sku?: string | null; unitCost?: string | number; stock?: number };
type LineDraft = { productId: string; qty: string; unitCost: string };

type POLineServer = {
  id: string;
  productId: string;
  qty: number;
  unitCost: string | number;
  product?: Prod;
};
type PurchaseOrderServer = {
  id: string;
  status: string;
  orderedAt?: string | Date | null;
  receivedAt?: string | Date | null;
  supplier?: Supplier;
  lines?: POLineServer[];
};

/** Listas para selects en formulario / modales (tope API genérico). */
const META_SELECT_PAGE_SIZE = 100;

export default function PurchaseOrdersPage() {
  const { token } = useAuth();
  const p = usePalette();
  const { pageSize: listPageSize } = useListPageSize();
  const tablePageSize = clampListPageSizeDefault(listPageSize);
  const [loading, setLoading] = useState(true);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [orders, setOrders] = useState<PurchaseOrderServer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Prod[]>([]);
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);

  const [supplierId, setSupplierId] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([{ productId: '', qty: '1', unitCost: '0' }]);

  const [supplierQuickOpen, setSupplierQuickOpen] = useState(false);
  const [productCreateOpen, setProductCreateOpen] = useState(false);
  const [receivePoId, setReceivePoId] = useState<string | null>(null);

  async function refreshOrdersAndSuppliers(listPage?: number) {
    if (!token) return;
    const page = listPage ?? ordersPage;
    setLoading(true);
    try {
      const [os, ss] = await Promise.all([
        api.purchaseOrders.list(token, { page, pageSize: tablePageSize }),
        api.suppliers.list(token, { page: 1, pageSize: META_SELECT_PAGE_SIZE }),
      ]);
      const po = os as Paginated<PurchaseOrderServer>;
      const sup = ss as Paginated<Supplier>;
      setOrders(po.items || []);
      setOrdersTotal(po.total ?? 0);
      setSuppliers(sup.items || []);
    } finally {
      setLoading(false);
    }
  }

  async function refreshMetaForProductModal() {
    if (!token) return;
    const [ss, cc] = await Promise.all([
      api.suppliers.list(token, { page: 1, pageSize: META_SELECT_PAGE_SIZE }),
      api.categories.list(token, { page: 1, pageSize: META_SELECT_PAGE_SIZE }),
    ]);
    setSuppliers((ss as Paginated<Supplier>).items || []);
    setCats((cc as Paginated<{ id: string; name: string }>).items || []);
  }

  useEffect(() => {
    refreshOrdersAndSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, ordersPage, tablePageSize]);

  useEffect(() => {
    setOrdersPage(1);
  }, [listPageSize]);

  useEffect(() => {
    if (!token || !supplierId) {
      setProducts([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const ps = (await api.products.list(token, {
        supplierId,
        tracksStock: true,
        page: 1,
        pageSize: PRODUCT_PICKER_PAGE_SIZE,
      })) as Paginated<Prod>;
      if (!cancelled) setProducts(ps.items || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [token, supplierId]);

  useEffect(() => {
    setLines([{ productId: '', qty: '1', unitCost: '0' }]);
  }, [supplierId]);

  const prodMap = useMemo(() => Object.fromEntries(products.map((x) => [x.id, x])), [products]);
  const supplierOptions = useMemo(() => suppliers.map((s) => ({ value: s.id, label: s.name })), [suppliers]);
  const productOptions = useMemo(
    () =>
      products.map((x) => ({
        value: x.id,
        label: `${x.name}${x.sku ? ` (${x.sku})` : ''}`,
      })),
    [products]
  );

  function addLine() {
    setLines((xs) => [...xs, { productId: '', qty: '1', unitCost: '0' }]);
  }

  function updateLine(idx: number, patch: Partial<LineDraft>) {
    setLines((xs) => xs.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function removeLine(idx: number) {
    setLines((xs) => xs.filter((_, i) => i !== idx));
  }

  function onPickProduct(idx: number, productId: string) {
    const prod = prodMap[productId];
    const uc = prod != null ? String(prod.unitCost ?? '0') : '0';
    updateLine(idx, { productId, unitCost: uc });
  }

  async function onCreate() {
    if (!token) return;
    if (!supplierId) return;
    const payload = lines
      .map((ln) => ({
        productId: ln.productId,
        qty: Number(ln.qty) || 0,
        unitCost: Number(String(ln.unitCost).replace(',', '.')) || 0,
      }))
      .filter((x) => x.productId && x.qty > 0 && x.unitCost >= 0);
    if (!payload.length) return;
    await api.purchaseOrders.create(token, { supplierId, lines: payload });
    setSupplierId('');
    setLines([{ productId: '', qty: '1', unitCost: '0' }]);
    setOrdersPage(1);
    await refreshOrdersAndSuppliers(1);
  }

  async function execReceivePurchase() {
    if (!token || !receivePoId) return;
    await api.purchaseOrders.receive(token, receivePoId);
    await refreshOrdersAndSuppliers();
  }

  if (!token) return null;

  const receiveDraft = receivePoId ? orders.find((o) => o.id === receivePoId) ?? null : null;

  const fieldLabel: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 800,
    marginBottom: 6,
    color: p.mutedText,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 950 }}>Compras a proveedor</div>
        <p style={{ color: p.mutedText, fontSize: 14, lineHeight: 1.45, margin: '8px 0 0', maxWidth: 720 }}>
          Es el lugar indicado para <strong>sumar stock cuando comprás</strong>: primero orden en borrador, luego{' '}
          <strong>Recibir</strong> cuando llegó la mercadería. En alta de producto el stock inicial es sólo si no cargás esa compra aquí.
        </p>
      </div>

      <Card>
        <CardSection style={{ padding: 16 }}>
          <div style={{ fontWeight: 950, marginBottom: 10 }}>Nueva orden (borrador)</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 260px', minWidth: 0, width: '100%', maxWidth: '100%' }}>
              <div style={{ fontWeight: 800, marginBottom: 6, fontSize: 13 }}>Proveedor</div>
              <SearchableSelect
                options={supplierOptions}
                value={supplierId}
                onChange={setSupplierId}
                emptyLabel="Elegí proveedor…"
              />
              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button type="button" variant="outline" size="sm" onClick={() => setSupplierQuickOpen(true)}>
                  Nuevo proveedor
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!supplierId}
                  onClick={async () => {
                    await refreshMetaForProductModal();
                    setProductCreateOpen(true);
                  }}
                >
                  Nuevo producto
                </Button>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 950, marginBottom: 10 }}>Líneas</div>
            {!supplierId ? (
              <div style={{ opacity: 0.75, fontSize: 14, marginBottom: 10 }}>
                Primero elegí un proveedor para cargar sólo sus productos.
              </div>
            ) : null}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {lines.map((ln, idx) => {
                const sel = ln.productId ? prodMap[ln.productId] : null;
                const st = sel != null ? (typeof sel.stock === 'number' ? sel.stock : 0) : null;
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div className="po-line">
                      <div className="po-line__product">
                        <label htmlFor={`po-line-product-${idx}`} style={fieldLabel}>
                          Producto
                        </label>
                        <SearchableSelect
                          id={`po-line-product-${idx}`}
                          options={productOptions}
                          value={ln.productId}
                          onChange={(id) => onPickProduct(idx, id)}
                          emptyLabel="Elegir…"
                          disabled={!supplierId}
                        />
                      </div>
                      <div className="po-line__controls">
                        <div className="po-line__field po-line__field--qty">
                          <label htmlFor={`po-line-qty-${idx}`} style={fieldLabel}>
                            Cantidad
                          </label>
                          <Input
                            id={`po-line-qty-${idx}`}
                            value={ln.qty}
                            onChange={(e) => updateLine(idx, { qty: e.target.value })}
                            placeholder="Ej: 12"
                            inputMode="numeric"
                          />
                        </div>
                        <div className="po-line__field po-line__field--cost">
                          <label htmlFor={`po-line-cost-${idx}`} style={fieldLabel}>
                            Costo unitario (factura)
                          </label>
                          <Input
                            id={`po-line-cost-${idx}`}
                            value={ln.unitCost}
                            onChange={(e) => updateLine(idx, { unitCost: e.target.value })}
                            placeholder="Ej: 4200"
                            inputMode="decimal"
                          />
                        </div>
                        <div className="po-line__field po-line__field--remove">
                          <span style={{ ...fieldLabel, visibility: 'hidden' }} aria-hidden>
                            ·
                          </span>
                          <Button type="button" variant="outline" disabled={lines.length <= 1} onClick={() => removeLine(idx)}>
                            Quitar
                          </Button>
                        </div>
                      </div>
                    </div>
                    {ln.productId && sel ? (
                      <div
                        style={{
                          fontSize: 12,
                          lineHeight: 1.45,
                          paddingLeft: 2,
                          color: p.mutedText,
                        }}
                      >
                        Stock actual en depósito: <strong style={{ color: p.text }}>{st ?? 0}</strong>
                        {st === 0 ? (
                          <span style={{ marginLeft: 10, fontWeight: 800, color: p.dangerText }}>
                            Sin stock · al recibir esta orden sumará cantidades al inventario.
                          </span>
                        ) : (
                          ''
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Button type="button" variant="outline" size="sm" onClick={addLine} disabled={!supplierId}>
                  + línea
                </Button>
                <Button type="button" disabled={!supplierId} onClick={onCreate}>
                  Crear orden
                </Button>
              </div>
            </div>
          </div>
        </CardSection>
      </Card>

      <Card>
        <CardSection style={{ padding: 0 }}>
          <div className={THEMED_SCROLLBAR_CLASS} style={tableHorizontalScrollWrapStyle}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: `1px solid ${p.cardBorder}` }}>
                  <th style={{ padding: '12px 14px' }}>Estado</th>
                  <th style={{ padding: '12px 14px' }}>Proveedor</th>
                  <th style={{ padding: '12px 14px' }}>Fecha</th>
                  <th style={{ padding: '12px 14px' }}>Ítems</th>
                  <th style={{ padding: '12px 14px' }}></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 14, opacity: 0.72 }}>
                      Cargando…
                    </td>
                  </tr>
                ) : null}
                {!loading && orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 14, opacity: 0.72 }}>
                      Sin órdenes de compra en esta página.
                    </td>
                  </tr>
                ) : null}
                {!loading &&
                  orders.map((po) => (
                    <tr key={po.id} style={{ borderBottom: `1px solid ${p.cardBorder}` }}>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <Badge
                          tone={po.status === 'RECEIVED' ? 'success' : 'warning'}
                          label={po.status === 'DRAFT' ? 'Borrador' : 'Recibida'}
                        />
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 850 }}>{po.supplier?.name || '—'}</td>
                      <td style={{ padding: '12px 14px', opacity: 0.82, fontSize: 13 }}>
                        {String(po.receivedAt || po.orderedAt || '').slice(0, 16) || ''}
                      </td>
                      <td style={{ padding: '12px 14px', opacity: 0.88, fontSize: 13 }}>
                        {(po.lines || [])
                          .slice(0, 3)
                          .map((ln) => {
                            const pname = ln.product?.name || prodMap[ln.productId]?.name || ln.productId;
                            return `${pname}: ${ln.qty}`;
                          })
                          .join(' · ') || '—'}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={po.status !== 'DRAFT'}
                          onClick={() => po.status === 'DRAFT' && setReceivePoId(po.id)}
                        >
                          Recibir entrada
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '0 16px 16px' }}>
            <PaginationBar
              page={ordersPage}
              pageSize={tablePageSize}
              total={ordersTotal}
              onPageChange={setOrdersPage}
              disabled={loading}
            />
          </div>
        </CardSection>
      </Card>

      <ConfirmModal
        open={Boolean(receivePoId)}
        title="Recibir entrada al stock"
        confirmLabel="Recibir entrada"
        cancelLabel="Cancelar"
        description={
          receiveDraft ? (
            <>
              Vas a confirmar que la compra a <strong>{receiveDraft.supplier?.name || 'proveedor'}</strong> llegó en
              depósito. Se sumarán al inventario las cantidades de cada línea. ¿Continuar?
            </>
          ) : (
            ''
          )
        }
        onClose={() => setReceivePoId(null)}
        onConfirm={execReceivePurchase}
      />

      <SupplierQuickModal
        open={supplierQuickOpen}
        onClose={() => setSupplierQuickOpen(false)}
        token={token}
        onCreated={async (s) => {
          await refreshOrdersAndSuppliers();
          setSupplierId(s.id);
        }}
      />

      <ProductCreateModal
        open={productCreateOpen}
        onClose={() => setProductCreateOpen(false)}
        token={token}
        suppliers={suppliers}
        categories={cats}
        lockSupplierId={supplierId || null}
        onRefreshMeta={refreshMetaForProductModal}
        onCreated={async () => {
          if (token && supplierId) {
            const ps = (await api.products.list(token, {
              supplierId,
              tracksStock: true,
              page: 1,
              pageSize: PRODUCT_PICKER_PAGE_SIZE,
            })) as Paginated<Prod>;
            setProducts(ps.items || []);
          }
        }}
      />
    </div>
  );
}
