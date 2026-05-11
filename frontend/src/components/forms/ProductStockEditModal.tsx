import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import { toast } from '@/lib/toast';
import { Button, Input, Modal, Spinner } from '../inline/Primitives';
import { SearchableSelect } from '../inline/SearchableSelect';
import { usePalette } from '../../theme/ThemeProvider';

type Cat = { id: string; name: string };
type Supplier = { id: string; name: string };

/** Edición de mercadería con stock (nombre, SKU, proveedor, categoría, costos, alerta de reposición). */
export function ProductStockEditModal({
  open,
  onClose,
  token,
  productId,
  suppliers,
  categories,
  loadingMeta = false,
  onRefreshMeta,
  onRequestNewSupplier,
  onRequestNewCategory,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  token: string;
  productId: string | null;
  suppliers: Supplier[];
  categories: Cat[];
  loadingMeta?: boolean;
  onRefreshMeta: () => Promise<void>;
  onRequestNewSupplier?: () => void;
  onRequestNewCategory?: () => void;
  onSaved?: () => void;
}) {
  const p = usePalette();
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [unitCost, setUnitCost] = useState('0');
  const [salePrice, setSalePrice] = useState('0');
  const [reorderLevel, setReorderLevel] = useState('5');
  const [loading, setLoading] = useState(false);

  const supplierOptions = useMemo(
    () => suppliers.map((s) => ({ value: s.id, label: s.name })),
    [suppliers]
  );
  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.id, label: c.name })),
    [categories]
  );

  useEffect(() => {
    if (!open || !token || !productId) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const row = (await api.products.get(token, productId)) as {
          name?: string;
          sku?: string | null;
          supplierId?: string;
          categoryId?: string | null;
          unitCost?: string | number;
          salePrice?: string | number;
          reorderLevel?: number;
        };
        if (cancelled) return;
        setName(row.name || '');
        setSku(row.sku || '');
        setSupplierId(String(row.supplierId || ''));
        setCategoryId(row.categoryId || '');
        setUnitCost(String(row.unitCost ?? '0'));
        setSalePrice(String(row.salePrice ?? '0'));
        setReorderLevel(String(row.reorderLevel ?? 5));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, token, productId]);

  async function save() {
    if (!productId || !name.trim() || !supplierId) return;
    await api.products.patch(token, productId, {
      name: name.trim(),
      sku: sku.trim() || null,
      supplierId,
      categoryId: categoryId || null,
      unitCost: Number(String(unitCost).replace(',', '.')) || 0,
      salePrice: Number(String(salePrice).replace(',', '.')) || 0,
      reorderLevel: Math.max(0, Math.trunc(Number(reorderLevel) || 0)),
    });
    toast.success('Producto actualizado');
    await onRefreshMeta();
    onSaved?.();
    onClose();
  }

  const showOverlay = loadingMeta && suppliers.length === 0 && categories.length === 0;

  return (
    <Modal open={open} title="Editar producto" onClose={onClose} panelStyle={{ maxWidth: 560 }}>
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
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 28 }}>
            <Spinner size={28} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 12, opacity: 0.72, lineHeight: 1.45, marginBottom: 4 }}>
              El stock se corrige con <strong>Ajuste</strong> en la tabla o con <strong>Compras → Recibir</strong>.
            </div>
            <div>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Nombre</div>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>SKU</div>
              <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Opcional" />
            </div>
            <div>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Proveedor</div>
              <SearchableSelect options={supplierOptions} value={supplierId} onChange={setSupplierId} emptyLabel="Elegí proveedor…" />
              {onRequestNewSupplier ? (
                <div style={{ marginTop: 8 }}>
                  <Button type="button" variant="outline" size="sm" onClick={onRequestNewSupplier}>
                    Nuevo proveedor
                  </Button>
                </div>
              ) : null}
            </div>
            <div>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Categoría</div>
              <SearchableSelect options={categoryOptions} value={categoryId} onChange={setCategoryId} emptyLabel="—" />
              {onRequestNewCategory ? (
                <div style={{ marginTop: 8 }}>
                  <Button type="button" variant="outline" size="sm" onClick={onRequestNewCategory}>
                    Nueva categoría
                  </Button>
                </div>
              ) : null}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Precio unitario compra</div>
                <Input value={unitCost} onChange={(e) => setUnitCost(e.target.value)} inputMode="decimal" />
              </div>
              <div>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Precio venta sugerido</div>
                <Input value={salePrice} onChange={(e) => setSalePrice(e.target.value)} inputMode="decimal" />
              </div>
            </div>
            <div style={{ maxWidth: 220 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Reposición (alerta bajo stock)</div>
              <Input value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} inputMode="numeric" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="button" disabled={!name.trim() || !supplierId} onClick={save}>
                Guardar
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
