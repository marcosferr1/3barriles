import React, { useState } from 'react';
import { api } from '../../api/client';
import { Button, Input, Modal } from '../inline/Primitives';

type Cat = { id: string; name: string };

export function CategoryQuickModal({
  open,
  onClose,
  token,
  onCreated,
  overlayStyle,
}: {
  open: boolean;
  onClose: () => void;
  token: string;
  onCreated: (c: Cat) => void;
  overlayStyle?: React.CSSProperties;
}) {
  const [name, setName] = useState('');

  async function save() {
    if (!name.trim()) return;
    const row = (await api.categories.create(token, { name: name.trim() })) as Cat;
    setName('');
    onCreated(row);
    onClose();
  }

  return (
    <Modal
      open={open}
      title="Nueva categoría"
      onClose={() => {
        setName('');
        onClose();
      }}
      panelStyle={{ maxWidth: 420 }}
      overlayStyle={overlayStyle}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Nombre</div>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setName('');
              onClose();
            }}
          >
            Cancelar
          </Button>
          <Button type="button" disabled={!name.trim()} onClick={save}>
            Guardar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
