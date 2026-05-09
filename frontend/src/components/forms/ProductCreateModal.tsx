import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import { Button, Input, Modal } from '../inline/Primitives';
import { SearchableSelect } from '../inline/SearchableSelect';

type Cat = { id: string; name: string };
type Supplier = { id: string; name: string };

type ProdRow = {
  id: string;
  name: string;
  sku?: string | null;
  supplier?: Supplier | null;
  category?: Cat | null;
};

/** Modal de alta producto con proveedor, categoría, costos y stock inicial. Si `lockSupplierId` está definido, ese proveedor se usa siempre (Compras). */
export function ProductCreateModal({
  open,
  onClose,
  token,
  suppliers,
  categories,
  lockSupplierId,
  onRefreshMeta,
  onCreated,
  onRequestNewSupplier,
  onRequestNewCategory,
}: {
  open: boolean;
  onClose: () => void;
  token: string;
  suppliers: Supplier[];
  categories: Cat[];
  lockSupplierId?: string | null;
  onRefreshMeta: () => Promise<void>;
  onCreated?: (row: ProdRow) => void;
  onRequestNewSupplier?: () => void;
  onRequestNewCategory?: () => void;
}) {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [unitCost, setUnitCost] = useState('0');
  const [salePrice, setSalePrice] = useState('0');
  /** Stock sin OC: excepcional (saldo inicial). Lo habitual → Compras → Recibir. */
  const [openingStockWithoutPO, setOpeningStockWithoutPO] = useState(false);
  const [initialQty, setInitialQty] = useState('0');
  const [reorderLevel, setReorderLevel] = useState('5');

  const locked = Boolean(lockSupplierId);

  /** Formulario limpio cada vez que se abre (y si cambia proveedor bloqueado desde Compras). */
  useEffect(() => {
    if (!open) return;
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset inicial al abrir; lockSupplierId en closure
  }, [open, lockSupplierId]);

  const supplierOptions = useMemo(
    () => suppliers.map((s) => ({ value: s.id, label: s.name })),
    [suppliers]
  );
  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.id, label: c.name })),
    [categories]
  );

  function reset() {
    setName('');
    setSku('');
    setSupplierId(lockSupplierId ?? '');
    setCategoryId('');
    setUnitCost('0');
    setSalePrice('0');
    setOpeningStockWithoutPO(false);
    setInitialQty('0');
    setReorderLevel('5');
  }

  async function save() {
    if (!name.trim()) return;
    const sid = lockSupplierId || supplierId;
    if (!sid) return;
    const row = (await api.products.create(token, {
      name: name.trim(),
      sku: sku.trim() || null,
      supplierId: sid,
      categoryId: categoryId || null,
      unitCost: Number(String(unitCost).replace(',', '.')) || 0,
      salePrice: Number(String(salePrice).replace(',', '.')) || 0,
      initialQty: openingStockWithoutPO
        ? Math.max(0, Math.trunc(Number(String(initialQty).replace(',', '.')) || 0))
        : 0,
      reorderLevel: Number(reorderLevel) || 5,
    })) as ProdRow;
    reset();
    await onRefreshMeta();
    onCreated?.(row);
    onClose();
  }

  return (
    <Modal open={open} title="Nuevo producto" onClose={onClose} panelStyle={{ maxWidth: 560 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Nombre</div>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>SKU</div>
          <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Opcional" />
          <div style={{ fontSize: 12, opacity: 0.72, marginTop: 6, lineHeight: 1.45 }}>
            Identificador único opcional: código interno, barras u otro; sirve para buscar rápido y evitar duplicados si lo
            controlás así.
          </div>
        </div>
        {!locked ? (
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
        ) : (
          <div style={{ fontSize: 13, opacity: 0.8 }}>
            Proveedor fijado a la orden de compra actual.
          </div>
        )}
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
        <div style={{ padding: '10px 0', borderTop: '1px solid rgba(127,127,127,0.2)' }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Stock · flujo recomendado</div>
          <div style={{ fontSize: 12, opacity: 0.76, marginBottom: 10, lineHeight: 1.45 }}>
            El stock habitual entra por <strong>Compras</strong>: cargás la orden y luego &quot;Recibir&quot;. Así queda enlazado
            proveedor, cantidad y costo de la línea.
          </div>
          <label
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
              cursor: 'pointer',
              fontSize: 13,
              lineHeight: 1.45,
              marginBottom: openingStockWithoutPO ? 10 : 0,
            }}
          >
            <input
              type="checkbox"
              checked={openingStockWithoutPO}
              onChange={(e) => {
                const v = e.target.checked;
                setOpeningStockWithoutPO(v);
                if (!v) setInitialQty('0');
              }}
              style={{ marginTop: 3, flexShrink: 0 }}
            />
            <span>
              Ya tengo unidades en depósito pero <strong>no</strong> voy a cargar esa entrada como orden de compra (saldo
              inicial, migración desde otro sistema).
            </span>
          </label>
          {openingStockWithoutPO ? (
            <>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Cantidad ya en depósito</div>
              <Input value={initialQty} onChange={(e) => setInitialQty(e.target.value)} inputMode="numeric" placeholder="0" />
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6, lineHeight: 1.4 }}>
                Se registra como movimiento de ajuste (&quot;Stock inicial alta producto&quot;), no como recepción de compra.
              </div>
            </>
          ) : null}
        </div>
        <div style={{ maxWidth: 220 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Reposición (alerta bajo stock)</div>
          <Input value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} inputMode="numeric" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Cancelar
          </Button>
          <Button type="button" disabled={!name.trim() || (!locked && !supplierId)} onClick={save}>
            Guardar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
