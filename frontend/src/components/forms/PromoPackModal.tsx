import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import { toast } from '@/lib/toast';
import { Button, Input, Modal, Spinner } from '../inline/Primitives';
import { SearchableSelect } from '../inline/SearchableSelect';
import { usePalette } from '../../theme/ThemeProvider';
import { PRODUCT_PICKER_PAGE_SIZE } from '../../settings/useListPageSize';
import type { Paginated } from '../../types/api';

type Cat = { id: string; name: string };
type Supplier = { id: string; name: string };
type CatProd = { id: string; name: string; sku?: string | null };
type BundleLineDraft = { productId: string; qtyPerBundle: string };

export function PromoPackModal({
  open,
  onClose,
  token,
  suppliers,
  categories,
  loadingMeta = false,
  editingId,
  onRefreshMeta,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  token: string;
  suppliers: Supplier[];
  categories: Cat[];
  loadingMeta?: boolean;
  editingId: string | null;
  onRefreshMeta: () => Promise<void>;
  onSaved?: () => void;
}) {
  const p = usePalette();
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [unitCost, setUnitCost] = useState('0');
  const [salePrice, setSalePrice] = useState('0');
  const [lines, setLines] = useState<BundleLineDraft[]>([{ productId: '', qtyPerBundle: '1' }]);
  const [catalog, setCatalog] = useState<CatProd[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);

  const supplierOptions = useMemo(
    () => suppliers.map((s) => ({ value: s.id, label: s.name })),
    [suppliers]
  );
  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.id, label: c.name })),
    [categories]
  );
  const catMap = useMemo(() => Object.fromEntries(catalog.map((x) => [x.id, x])), [catalog]);
  const productOptions = useMemo(
    () =>
      catalog.map((x) => ({
        value: x.id,
        label: `${x.name}${x.sku ? ` (${x.sku})` : ''}`,
      })),
    [catalog]
  );

  function reset() {
    setName('');
    setSku('');
    setSupplierId(suppliers[0]?.id ?? '');
    setCategoryId('');
    setUnitCost('0');
    setSalePrice('0');
    setLines([{ productId: '', qtyPerBundle: '1' }]);
  }

  useEffect(() => {
    if (!open || !token) return;
    void (async () => {
      const ps = await api.products.list(token, {
        tracksStock: true,
        page: 1,
        pageSize: PRODUCT_PICKER_PAGE_SIZE,
      });
      const pd = ps as Paginated<CatProd>;
      setCatalog(pd.items || []);
    })();
  }, [open, token]);

  useEffect(() => {
    if (!open || !token) return;
    if (!editingId) {
      reset();
      if (suppliers[0]?.id) setSupplierId(suppliers[0].id);
      return;
    }
    let cancelled = false;
    setLoadingDetail(true);
    void (async () => {
      try {
        const row = (await api.products.get(token, editingId)) as {
          name?: string;
          sku?: string | null;
          supplierId?: string;
          categoryId?: string | null;
          unitCost?: string | number;
          salePrice?: string | number;
          bundleItems?: Array<{
            componentProductId?: string;
            qtyPerBundle?: number;
            componentProduct?: { id: string; name: string };
          }>;
        };
        if (cancelled) return;
        setName(row.name || '');
        setSku(row.sku || '');
        setSupplierId(String(row.supplierId || suppliers[0]?.id || ''));
        setCategoryId(row.categoryId || '');
        setUnitCost(String(row.unitCost ?? '0'));
        setSalePrice(String(row.salePrice ?? '0'));
        const bis = row.bundleItems || [];
        setLines(
          bis.length
            ? bis.map((b) => ({
                productId: String(b.componentProductId || b.componentProduct?.id || ''),
                qtyPerBundle: String(b.qtyPerBundle ?? 1),
              }))
            : [{ productId: '', qtyPerBundle: '1' }]
        );
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, editingId, token, suppliers]);

  function addLine() {
    setLines((xs) => [...xs, { productId: '', qtyPerBundle: '1' }]);
  }

  function updateLine(idx: number, patch: Partial<BundleLineDraft>) {
    setLines((xs) => xs.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function removeLine(idx: number) {
    setLines((xs) => xs.filter((_, i) => i !== idx));
  }

  const bundlePayload = useMemo(() => {
    const out: Array<{ componentProductId: string; qtyPerBundle: number }> = [];
    const seen = new Set<string>();
    for (const ln of lines) {
      if (!ln.productId) continue;
      if (seen.has(ln.productId)) continue;
      seen.add(ln.productId);
      const q = Math.max(1, Math.trunc(Number(String(ln.qtyPerBundle).replace(',', '.')) || 0));
      if (!Number.isFinite(q) || q < 1) continue;
      out.push({ componentProductId: ln.productId, qtyPerBundle: q });
    }
    return out;
  }, [lines]);

  async function save() {
    if (!name.trim() || !supplierId || !bundlePayload.length) return;
    setSaving(true);
    try {
      const uc = Number(String(unitCost).replace(',', '.')) || 0;
      const sp = Number(String(salePrice).replace(',', '.')) || 0;
      if (editingId) {
        await api.products.patch(token, editingId, {
          name: name.trim(),
          sku: sku.trim() || null,
          supplierId,
          categoryId: categoryId || null,
          unitCost: uc,
          salePrice: sp,
          bundleItems: bundlePayload,
        });
        toast.success('Promo / pack actualizado');
      } else {
        await api.products.create(token, {
          name: name.trim(),
          sku: sku.trim() || null,
          supplierId,
          categoryId: categoryId || null,
          unitCost: uc,
          salePrice: sp,
          tracksStock: false,
          isBundle: true,
          bundleItems: bundlePayload,
        });
        toast.success('Promo / pack creado');
      }
      await onRefreshMeta();
      onSaved?.();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const showOverlay = loadingMeta && suppliers.length === 0 && categories.length === 0;
  const canSave = name.trim() && supplierId && bundlePayload.length > 0 && !loadingDetail;

  return (
    <Modal
      open={open}
      title={editingId ? 'Editar promo / pack' : 'Nueva promo / pack'}
      onClose={onClose}
      panelStyle={{ maxWidth: 560 }}
    >
      <div style={{ position: 'relative' }}>
        {showOverlay ? (
          <div
            aria-live="polite"
            style={{
              position: 'absolute',
              inset: -8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 10,
              background: `${p.cardBg}cc`,
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)',
              borderRadius: 12,
              zIndex: 5,
              minHeight: 160,
            }}
          >
            <Spinner size={32} thickness={3} />
            <div style={{ fontSize: 13, color: p.mutedText, fontWeight: 700 }}>
              Cargando proveedores y categorías…
            </div>
          </div>
        ) : null}
        {loadingDetail ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
            <Spinner size={28} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 13, opacity: 0.78, lineHeight: 1.45, marginBottom: 4 }}>
              Un pack es un solo ítem en la venta: al registrarlo se descuenta del depósito cada producto del catálogo según
              las cantidades por pack. La creación del pack no exige stock; al vender sí.
            </div>
            <div>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Nombre del pack</div>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Promo Fernet" />
            </div>
            <div>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>SKU</div>
              <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Opcional" />
            </div>
            <div>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Proveedor</div>
              <SearchableSelect options={supplierOptions} value={supplierId} onChange={setSupplierId} emptyLabel="Elegí…" />
            </div>
            <div>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Categoría</div>
              <SearchableSelect options={categoryOptions} value={categoryId} onChange={setCategoryId} emptyLabel="—" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Costo ref. pack</div>
                <Input value={unitCost} onChange={(e) => setUnitCost(e.target.value)} inputMode="decimal" />
              </div>
              <div>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Precio venta pack</div>
                <Input value={salePrice} onChange={(e) => setSalePrice(e.target.value)} inputMode="decimal" />
              </div>
            </div>

            <div style={{ paddingTop: 8, borderTop: `1px solid ${p.cardBorder}` }}>
              <div style={{ fontWeight: 950, marginBottom: 8 }}>Contenido del pack (mercadería con stock)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {lines.map((ln, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div className="sale-line">
                      <div className="sale-line__product">
                        <SearchableSelect
                          options={productOptions}
                          value={ln.productId}
                          onChange={(id) => updateLine(idx, { productId: id })}
                          emptyLabel="Producto del catálogo…"
                        />
                      </div>
                      <div className="sale-line__controls">
                        <Input
                          className="sale-line__qty"
                          value={ln.qtyPerBundle}
                          onChange={(e) => updateLine(idx, { qtyPerBundle: e.target.value })}
                          placeholder="Cant. / pack"
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
                    {ln.productId && catMap[ln.productId] ? (
                      <div style={{ fontSize: 12, color: p.mutedText, paddingLeft: 2 }}>
                        Incluye <strong style={{ color: p.text }}>{catMap[ln.productId].name}</strong> por cada pack vendido.
                      </div>
                    ) : null}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addLine}>
                  + producto al pack
                </Button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="button" disabled={!canSave || saving} onClick={save}>
                {saving ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
