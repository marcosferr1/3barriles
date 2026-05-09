import React, { useState } from 'react';
import { api } from '../../api/client';
import { Button, Input, Modal, Textarea } from '../inline/Primitives';

type Supplier = { id: string; name: string };

export function SupplierQuickModal({
  open,
  onClose,
  token,
  onCreated,
  title = 'Nuevo proveedor',
  overlayStyle,
}: {
  open: boolean;
  onClose: () => void;
  token: string;
  onCreated: (s: Supplier) => void;
  title?: string;
  overlayStyle?: React.CSSProperties;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  function reset() {
    setName('');
    setPhone('');
    setEmail('');
    setNotes('');
  }

  async function save() {
    if (!name.trim()) return;
    const row = (await api.suppliers.create(token, {
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      notes: notes.trim() || undefined,
    })) as Supplier;
    reset();
    onCreated(row);
    onClose();
  }

  return (
    <Modal
      open={open}
      title={title}
      onClose={() => {
        reset();
        onClose();
      }}
      panelStyle={{ maxWidth: 480 }}
      overlayStyle={overlayStyle}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Nombre</div>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Teléfono</div>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Email</div>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Notas</div>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
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
          <Button type="button" disabled={!name.trim()} onClick={save}>
            Guardar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
