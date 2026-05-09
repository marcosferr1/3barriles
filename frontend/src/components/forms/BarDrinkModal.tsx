import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Button, Input, Modal, Select } from '../inline/Primitives';
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
  const [happyHourMode, setHappyHourMode] = useState<HappyHourMode>('SPECIAL_PRICE');
  const [happyHourUnitPrice, setHappyHourUnitPrice] = useState('0');

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name || '');
      setSku(editing.sku || '');
      setSalePrice(String(editing.salePrice ?? '0'));
      setHappyHourEnabled(!!editing.happyHourEnabled);
      const m = (editing.happyHourMode as HappyHourMode) || 'OFF';
      setHappyHourMode(m !== 'OFF' ? m : 'SPECIAL_PRICE');
      setHappyHourUnitPrice(String(editing.happyHourUnitPrice ?? '0'));
    } else {
      setName('');
      setSku('');
      setSalePrice('0');
      setHappyHourEnabled(false);
      setHappyHourMode('SPECIAL_PRICE');
      setHappyHourUnitPrice('0');
    }
  }, [open, editing]);

  async function save() {
    if (!name.trim()) return;
    const sp = Number(String(salePrice).replace(',', '.')) || 0;
    const hhp = Number(String(happyHourUnitPrice).replace(',', '.')) || 0;
    const modes: HappyHourMode[] = ['SPECIAL_PRICE', 'DOUBLE_QTY', 'PROMO_2FOR1'];
    const modeForApi =
      happyHourEnabled && modes.includes(happyHourMode) ? happyHourMode : 'OFF';

    if (editing) {
      await api.products.patch(token, editing.id, {
        name: name.trim(),
        sku: sku.trim() || null,
        salePrice: sp,
        happyHourEnabled,
        happyHourMode: happyHourEnabled ? modeForApi : 'OFF',
        happyHourUnitPrice: happyHourEnabled && modeForApi === 'SPECIAL_PRICE' ? hhp : null,
      });
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
        happyHourMode: happyHourEnabled ? modeForApi : 'OFF',
        happyHourUnitPrice: happyHourEnabled && modeForApi === 'SPECIAL_PRICE' ? hhp : undefined,
      });
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
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
          <input type="checkbox" checked={happyHourEnabled} onChange={(e) => setHappyHourEnabled(e.target.checked)} />{' '}
          Happy hour disponible en la venta BAR
        </label>
        {happyHourEnabled ? (
          <>
            <div>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Modo happy hour</div>
              <Select value={happyHourMode} onChange={(e) => setHappyHourMode(e.target.value as HappyHourMode)}>
                <option value="SPECIAL_PRICE">Precio especial por trago</option>
                <option value="DOUBLE_QTY">Doble cantidad (2× lista, mismo precio unit.)</option>
                <option value="PROMO_2FOR1">Promo: 2 tragos cobrás 1 lista (cant. efectiva ×2, precio u. mitad)</option>
              </Select>
              <div style={{ fontSize: 12, opacity: 0.72, marginTop: 6, lineHeight: 1.45 }}>
                En la venta BAR podés tildar Happy hour por línea. El ticket guarda texto «(happy hour)» y montos auditables.
              </div>
            </div>
            {happyHourMode === 'SPECIAL_PRICE' ? (
              <div>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Precio unitario happy hour</div>
                <Input value={happyHourUnitPrice} onChange={(e) => setHappyHourUnitPrice(e.target.value)} inputMode="decimal" />
              </div>
            ) : null}
          </>
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
