import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { toast } from '@/lib/toast';
import { Button, Input, Modal } from '../inline/Primitives';
import { DEFAULT_SUPPLIER_ID } from '../../constants/defaultSupplier';

export type HappyHourMode = 'OFF' | 'SPECIAL_PRICE' | 'DOUBLE_QTY' | 'PROMO_2FOR1';

export type BarDrinkRow = {
  id: string;
  name: string;
  sku?: string | null;
  salePrice?: string | number;
  tracksStock?: boolean;
  happyHourEnabled?: boolean;
  happyHourMode?: HappyHourMode | string | null;
  happyHourUnitPrice?: string | number | null;
  active?: boolean;
};

export function BarDrinkModal({
  open,
  onClose,
  token,
  editing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  token: string;
  editing?: BarDrinkRow | null;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [salePrice, setSalePrice] = useState('0');
  const [happyHourEnabled, setHappyHourEnabled] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name || '');
      setSku(editing.sku || '');
      setSalePrice(String(editing.salePrice ?? '0'));
      setHappyHourEnabled(!!editing.happyHourEnabled && (editing.happyHourMode as string) !== 'OFF');
    } else {
      setName('');
      setSku('');
      setSalePrice('0');
      setHappyHourEnabled(false);
    }
  }, [open, editing]);

  async function save() {
    if (!name.trim()) return;
    const sp = Number(String(salePrice).replace(',', '.')) || 0;
    const HH_MODE_2X1: HappyHourMode = 'PROMO_2FOR1';

    if (editing) {
      await api.products.patch(token, editing.id, {
        name: name.trim(),
        sku: sku.trim() || null,
        salePrice: sp,
        happyHourEnabled,
        happyHourMode: happyHourEnabled ? HH_MODE_2X1 : 'OFF',
        happyHourUnitPrice: null,
      });
      toast.success('Trago actualizado');
    } else {
      await api.products.create(token, {
        name: name.trim(),
        sku: sku.trim() || null,
        supplierId: DEFAULT_SUPPLIER_ID,
        tracksStock: false,
        unitCost: 0,
        reorderLevel: 0,
        salePrice: sp,
        initialQty: 0,
        happyHourEnabled,
        happyHourMode: happyHourEnabled ? HH_MODE_2X1 : 'OFF',
        happyHourUnitPrice: happyHourEnabled ? null : undefined,
      });
      toast.success('Trago creado');
    }
    await onSaved();
    onClose();
  }

  return (
    <Modal open={open} title={editing ? 'Editar trago' : 'Nuevo trago BAR'} onClose={onClose} panelStyle={{ maxWidth: 520 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Nombre</div>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder='Ej: Fernet con Coca' />
        </div>
        <div>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>SKU</div>
          <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Opcional" />
        </div>
        <div>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Precio de lista</div>
          <Input value={salePrice} onChange={(e) => setSalePrice(e.target.value)} inputMode="decimal" />
        </div>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontWeight: 700, lineHeight: 1.45 }}>
          <input
            type="checkbox"
            checked={happyHourEnabled}
            onChange={(e) => setHappyHourEnabled(e.target.checked)}
            style={{ marginTop: 3, flexShrink: 0 }}
          />
          <span>
            Happy hour 2×1 en venta BAR{' '}
            <span style={{ fontWeight: 600, opacity: 0.75 }}>(pagás 1 al precio de lista, van 2 tragos en el ticket)</span>
          </span>
        </label>
        {happyHourEnabled ? (
          <div style={{ fontSize: 12, opacity: 0.78, lineHeight: 1.5, paddingLeft: 28 }}>
            Es el 2×1 de siempre: el total de la línea con happy hour coincide con cobrar un trago a precio lista, pero se
            registran 2 unidades. En <strong>Ventas BAR</strong> tildás happy hour por línea cuando corresponda.
          </div>
        ) : null}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={save}>
            Guardar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
