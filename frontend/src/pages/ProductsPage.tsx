import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { api } from '../api/client';
import { usePalette } from '../theme/ThemeProvider';
import { BarDrinkModal, type BarDrinkRow } from '../components/forms/BarDrinkModal';
import { CategoryQuickModal } from '../components/forms/CategoryQuickModal';
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
  Modal,
  TableLoadingRow,
  THEMED_SCROLLBAR_CLASS,
  tableHorizontalScrollWrapStyle,
} from '../components/inline/Primitives';
import { clampListPageSizeProducts, useListPageSize } from '../settings/useListPageSize';
import type { Paginated } from '../types/api';

/** Listas auxiliares para modales (tope API categorías/proveedores). */
const META_SELECT_PAGE_SIZE = 100;

type Cat = { id: string; name: string };
type Supplier = { id: string; name: string };

type Prod = {
  id: string;
  name: string;
  sku?: string | null;
  salePrice?: string | number;
  unitCost?: string | number;
  reorderLevel?: number;
  categoryId?: string | null;
  supplierId?: string;
  category?: Cat | null;
  supplier?: Supplier | null;
  stock?: number;
  active?: boolean;
  tracksStock?: boolean;
  happyHourEnabled?: boolean;
  happyHourMode?: string | null;
  happyHourUnitPrice?: string | number | null;
};

function moneyArs(amount: string | number) {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(n);
}

function happyHourSummary(x: Prod): string {
  if (!x.happyHourEnabled || !x.happyHourMode || x.happyHourMode === 'OFF') return '—';
  if (x.happyHourMode === 'SPECIAL_PRICE') return `Precio HH ${moneyArs(`${x.happyHourUnitPrice ?? '0'}`)}`;
  if (x.happyHourMode === 'DOUBLE_QTY') return 'Cantidad ×2 al precio lista';
  if (x.happyHourMode === 'PROMO_2FOR1') return 'Promo 2×1 (mitad precio unit.)';
  return x.happyHourMode;
}

export default function ProductsPage() {
  const { token } = useAuth();
  const p = usePalette();
  const { pageSize: listPageSize } = useListPageSize();
  const tablePageSize = clampListPageSizeProducts(listPageSize);
  const [tab, setTab] = useState<'stock' | 'tragos'>('stock');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Prod[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [cats, setCats] = useState<Cat[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [q, setQ] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [barDrinkOpen, setBarDrinkOpen] = useState(false);
  const [editingDrink, setEditingDrink] = useState<BarDrinkRow | null>(null);
  const [supplierQuickOpen, setSupplierQuickOpen] = useState(false);
  const [categoryQuickOpen, setCategoryQuickOpen] = useState(false);
  const [adjOpen, setAdjOpen] = useState(false);

  const [adjustTarget, setAdjustTarget] = useState<Prod | null>(null);
  const [qtyDelta, setQtyDelta] = useState('0');
  const [note, setNote] = useState('');
  const [pendingDeactivate, setPendingDeactivate] = useState<Prod | null>(null);
  const [createMetaLoading, setCreateMetaLoading] = useState(false);

  async function refresh() {
    if (!token) return;
    setLoading(true);
    try {
      const prods = await api.products.list(token, {
        q: q.trim() || undefined,
        tracksStock: tab === 'stock',
        page,
        pageSize: tablePageSize,
      });
      const pr = prods as Paginated<Prod>;
      setItems(pr.items);
      setTotal(pr.total);
    } finally {
      setLoading(false);
    }
  }

  async function refreshMetaOnly() {
    if (!token) return;
    const [categories, sups] = await Promise.all([
      api.categories.list(token, { page: 1, pageSize: META_SELECT_PAGE_SIZE }),
      api.suppliers.list(token, { page: 1, pageSize: META_SELECT_PAGE_SIZE }),
    ]);
    setCats((categories as Paginated<Cat>).items);
    setSuppliers((sups as Paginated<Supplier>).items);
  }

  /** Abre el modal de inmediato (con spinner si todavía no cargaron las listas).
   *  Refresca proveedores/categorías en paralelo: si no había nada, se ven al toque
   *  cuando vuelve el fetch; si ya había, no hay que esperar. */
  function openCreateProduct() {
    if (!token) return;
    setCreateOpen(true);
    setCreateMetaLoading(true);
    refreshMetaOnly().finally(() => setCreateMetaLoading(false));
  }

  useEffect(() => {
    setPage(1);
  }, [q, tab]);

  useEffect(() => {
    setPage(1);
  }, [listPageSize]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, q, tab, page, tablePageSize]);

  const catMap = useMemo(() => Object.fromEntries(cats.map((c) => [c.id, c.name])), [cats]);

  function openAdjust(x: Prod) {
    setAdjustTarget(x);
    setQtyDelta('0');
    setNote('');
    setAdjOpen(true);
  }

  function openNewTrago() {
    setEditingDrink(null);
    setBarDrinkOpen(true);
  }

  function openEditTrago(x: Prod) {
    setEditingDrink(x as BarDrinkRow);
    setBarDrinkOpen(true);
  }

  async function onAdjust() {
    if (!token || !adjustTarget) return;
    await api.products.adjust(token, adjustTarget.id, {
      qtyDelta: Number(qtyDelta.replace(',', '.')) || 0,
      note: note.trim() || null,
    });
    setAdjOpen(false);
    setAdjustTarget(null);
    await refresh();
  }

  async function execDeactivate() {
    if (!token || !pendingDeactivate) return;
    await api.products.deactivate(token, pendingDeactivate.id);
    await refresh();
  }

  const isBar = (x: Prod) => x.tracksStock === false;

  if (!token) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 950 }}>Productos</div>
          <div style={{ marginTop: 6, opacity: 0.72, maxWidth: 720, lineHeight: 1.45 }}>
            {tab === 'stock' ? (
              <>
                Alta de mercadería con stock. El ingreso habitual es <strong>Compras → Recibir</strong>. Saldo inicial excepcional en el alta; correcciones:{' '}
                <strong>Ajuste</strong>.
              </>
            ) : (
              <>
                Tragos BAR: sin movimiento de depósito al venderlos; el consumo de botellas se registra aparte al cierre del servicio. Solo proveedor por defecto; venta desde{' '}
                <strong>Ventas BAR</strong>.
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <Button
              type="button"
              variant={tab === 'stock' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => {
                setTab('stock');
                setPage(1);
              }}
            >
              Mercadería
            </Button>
            <Button
              type="button"
              variant={tab === 'tragos' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => {
                setTab('tragos');
                setPage(1);
              }}
            >
              Tragos
            </Button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Input
            placeholder="Buscar…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            style={{ width: 280, maxWidth: '100%' }}
          />
          {tab === 'stock' ? (
            <Button type="button" onClick={openCreateProduct}>
              Nuevo producto
            </Button>
          ) : (
            <Button type="button" onClick={openNewTrago}>
              Nuevo trago
            </Button>
          )}
        </div>
      </div>

      {tab === 'stock' ? (
        <Card>
          <CardSection style={{ padding: 0 }}>
            <div className={THEMED_SCROLLBAR_CLASS} style={tableHorizontalScrollWrapStyle}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1020 }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: `1px solid ${p.cardBorder}` }}>
                    <th style={{ padding: '12px 14px' }}>Producto</th>
                    <th style={{ padding: '12px 14px' }}>Proveedor</th>
                    <th style={{ padding: '12px 14px' }}>Categoría</th>
                    <th style={{ padding: '12px 14px' }}>Costo ref.</th>
                    <th style={{ padding: '12px 14px' }}>Venta sug.</th>
                    <th style={{ padding: '12px 14px' }}>Stock</th>
                    <th style={{ padding: '12px 14px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? <TableLoadingRow colSpan={7} /> : null}
                  {!loading &&
                    items.map((x) => (
                      <tr key={x.id} style={{ borderBottom: `1px solid ${p.cardBorder}` }}>
                        <td style={{ padding: '12px 14px', fontWeight: 750 }}>
                          {x.name}
                          <div style={{ fontSize: 13, opacity: 0.7 }}>{x.sku || 'Sin SKU'}</div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>{x.supplier?.name || '—'}</td>
                        <td style={{ padding: '12px 14px' }}>{x.category?.name || (x.categoryId ? catMap[String(x.categoryId)] : '') || '—'}</td>
                        <td style={{ padding: '12px 14px' }}>{moneyArs(`${x.unitCost ?? '0'}`)}</td>
                        <td style={{ padding: '12px 14px' }}>{moneyArs(`${x.salePrice ?? '0'}`)}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <Badge
                            tone={typeof x.stock === 'number' && x.stock <= (x.reorderLevel ?? 5) ? 'danger' : 'neutral'}
                            label={`${x.stock ?? 0}`}
                          />
                        </td>
                        <td style={{ padding: '12px 14px', display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <Button type="button" variant="outline" size="sm" onClick={() => openAdjust(x)}>
                            Ajuste
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => setPendingDeactivate(x)}>
                            Desactivar
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '0 16px 16px' }}>
              <PaginationBar page={page} pageSize={tablePageSize} total={total} onPageChange={setPage} disabled={loading} />
            </div>
          </CardSection>
        </Card>
      ) : (
        <Card>
          <CardSection style={{ padding: 0 }}>
            <div className={THEMED_SCROLLBAR_CLASS} style={tableHorizontalScrollWrapStyle}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: `1px solid ${p.cardBorder}` }}>
                    <th style={{ padding: '12px 14px' }}>Trago</th>
                    <th style={{ padding: '12px 14px' }}>Lista</th>
                    <th style={{ padding: '12px 14px' }}>Happy hour</th>
                    <th style={{ padding: '12px 14px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? <TableLoadingRow colSpan={4} /> : null}
                  {!loading &&
                    items.map((x) => (
                      <tr key={x.id} style={{ borderBottom: `1px solid ${p.cardBorder}` }}>
                        <td style={{ padding: '12px 14px', fontWeight: 750 }}>
                          {x.name}
                          <div style={{ fontSize: 13, opacity: 0.7 }}>{x.sku || 'Sin SKU'}</div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>{moneyArs(`${x.salePrice ?? '0'}`)}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13 }}>
                          {x.happyHourEnabled ? <Badge tone="neutral" label={happyHourSummary(x)} /> : <span style={{ opacity: 0.6 }}>Sin HH</span>}
                        </td>
                        <td style={{ padding: '12px 14px', display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <Button type="button" variant="outline" size="sm" onClick={() => openEditTrago(x)}>
                            Editar
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => setPendingDeactivate(x)}>
                            Desactivar
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '0 16px 16px' }}>
              <PaginationBar page={page} pageSize={tablePageSize} total={total} onPageChange={setPage} disabled={loading} />
            </div>
          </CardSection>
        </Card>
      )}

      <ProductCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        token={token}
        suppliers={suppliers}
        categories={cats}
        loadingMeta={createMetaLoading}
        onRefreshMeta={refreshMetaOnly}
        onRequestNewSupplier={() => setSupplierQuickOpen(true)}
        onRequestNewCategory={() => setCategoryQuickOpen(true)}
        onCreated={() => refresh()}
      />

      <BarDrinkModal
        open={barDrinkOpen}
        onClose={() => {
          setBarDrinkOpen(false);
          setEditingDrink(null);
        }}
        token={token}
        editing={editingDrink}
        onSaved={refresh}
      />

      <SupplierQuickModal
        open={supplierQuickOpen}
        onClose={() => setSupplierQuickOpen(false)}
        token={token}
        overlayStyle={{ zIndex: 3500 }}
        onCreated={async () => {
          await refreshMetaOnly();
        }}
      />

      <CategoryQuickModal
        open={categoryQuickOpen}
        onClose={() => setCategoryQuickOpen(false)}
        token={token}
        overlayStyle={{ zIndex: 3500 }}
        onCreated={async () => {
          await refreshMetaOnly();
        }}
      />

      <Modal open={adjOpen} title={adjustTarget ? `Ajuste manual · ${adjustTarget.name}` : 'Ajuste'} onClose={() => setAdjOpen(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, opacity: 0.75 }}>
            Usá valores positivos o negativos (por ejemplo corrige roturas/conteo). Stock final no puede quedar negativo.
          </div>
          <div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Delta (+/−)</div>
            <Input value={qtyDelta} onChange={(e) => setQtyDelta(e.target.value)} inputMode="numeric" />
          </div>
          <div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Nota</div>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: conteo cámara X" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <Button type="button" variant="outline" onClick={() => setAdjOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={onAdjust}>
              Aplicar
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={Boolean(pendingDeactivate)}
        title="Desactivar producto"
        danger
        confirmLabel="Desactivar"
        cancelLabel="Cancelar"
        description={
          pendingDeactivate ? (
            <>
              ¿Desactivar <strong>«{pendingDeactivate.name}»</strong>?{' '}
              {pendingDeactivate && isBar(pendingDeactivate) ? (
                <span>Los tragos se pueden dar de baja sin condición de stock.</span>
              ) : (
                <span>Solo puede hacerse si el stock es cero.</span>
              )}
            </>
          ) : (
            ''
          )
        }
        onClose={() => setPendingDeactivate(null)}
        onConfirm={execDeactivate}
      />
    </div>
  );
}
