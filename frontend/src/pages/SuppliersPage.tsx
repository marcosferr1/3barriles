import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { api } from '../api/client';
import { usePalette } from '../theme/ThemeProvider';
import { SupplierQuickModal } from '../components/forms/SupplierQuickModal';
import { ConfirmModal } from '../components/inline/ConfirmModal';
import { PaginationBar } from '../components/inline/PaginationBar';
import {
  Button,
  Card,
  CardSection,
  Input,
  Modal,
  TableLoadingRow,
  Textarea,
  THEMED_SCROLLBAR_CLASS,
  tableHorizontalScrollWrapStyle,
} from '../components/inline/Primitives';
import { clampListPageSizeDefault, useListPageSize } from '../settings/useListPageSize';
import type { Paginated } from '../types/api';

type Supplier = { id: string; name: string; phone?: string | null; email?: string | null; notes?: string | null };

const DEFAULT_PROV_NAME = '3barrilesProv';

export default function SuppliersPage() {
  const { token } = useAuth();
  const p = usePalette();
  const { pageSize: listPageSize } = useListPageSize();
  const tablePageSize = clampListPageSizeDefault(listPageSize);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<Supplier | null>(null);

  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Supplier | null>(null);

  async function refresh() {
    if (!token) return;
    setLoading(true);
    try {
      const res = (await api.suppliers.list(token, {
        q: q.trim() || undefined,
        page,
        pageSize: tablePageSize,
      })) as Paginated<Supplier>;
      setItems(res.items || []);
      setTotal(res.total ?? 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPage(1);
  }, [q]);

  useEffect(() => {
    setPage(1);
  }, [listPageSize]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, q, page, tablePageSize]);

  function openEdit(s: Supplier) {
    setEditRow(s);
    setEditName(s.name);
    setEditPhone(s.phone || '');
    setEditEmail(s.email || '');
    setEditNotes(s.notes || '');
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!token || !editRow) return;
    if (!editName.trim()) return;
    await api.suppliers.patch(token, editRow.id, {
      name: editName.trim(),
      phone: editPhone.trim() || null,
      email: editEmail.trim() || null,
      notes: editNotes.trim() || null,
    });
    setEditOpen(false);
    setEditRow(null);
    await refresh();
  }

  async function execDeleteSupplier() {
    if (!token || !pendingDelete) return;
    await api.suppliers.remove(token, pendingDelete.id);
    await refresh();
  }

  if (!token) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 950 }}>Proveedores</div>
        <div style={{ marginTop: 6, opacity: 0.72 }}>Usados en órdenes de compra y en cada producto</div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <Input placeholder="Buscar proveedor…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 280, maxWidth: '100%' }} />
        <Button type="button" onClick={() => setCreateOpen(true)}>
          Nuevo proveedor
        </Button>
      </div>

      <Card>
        <CardSection style={{ padding: 0 }}>
          <div className={THEMED_SCROLLBAR_CLASS} style={tableHorizontalScrollWrapStyle}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: `1px solid ${p.cardBorder}` }}>
                  <th style={{ padding: '12px 14px' }}>Nombre</th>
                  <th style={{ padding: '12px 14px' }}>Contacto</th>
                  <th style={{ padding: '12px 14px' }}></th>
                </tr>
              </thead>
              <tbody>
                {loading ? <TableLoadingRow colSpan={3} /> : null}
                {!loading && items.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ padding: 14, opacity: 0.72 }}>
                      Sin proveedores{q.trim() ? ` que coincidan con “${q.trim()}”` : ''}.
                    </td>
                  </tr>
                ) : null}
                {!loading &&
                  items.map((s) => (
                    <tr key={s.id} style={{ borderBottom: `1px solid ${p.cardBorder}` }}>
                      <td style={{ padding: '12px 14px', fontWeight: 850 }}>
                        {s.name}
                        {s.name === DEFAULT_PROV_NAME ? (
                          <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.65 }}>(interno)</span>
                        ) : null}
                      </td>
                      <td style={{ padding: '12px 14px', opacity: 0.82 }}>
                        <div>{s.phone || '—'}</div>
                        <div style={{ fontSize: 13 }}>{s.email || ''}</div>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <Button type="button" variant="outline" size="sm" onClick={() => openEdit(s)}>
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={s.name === DEFAULT_PROV_NAME}
                          onClick={() => setPendingDelete(s)}
                        >
                          Eliminar
                        </Button>
                        </div>
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

      <SupplierQuickModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        token={token}
        onCreated={async () => {
          await refresh();
        }}
      />

      <Modal open={editOpen} title={editRow ? `Editar · ${editRow.name}` : 'Editar'} onClose={() => setEditOpen(false)} panelStyle={{ maxWidth: 480 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Nombre</div>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} disabled={editRow?.name === DEFAULT_PROV_NAME} />
            {editRow?.name === DEFAULT_PROV_NAME ? (
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>El nombre del proveedor interno no se modifica desde acá.</div>
            ) : null}
          </div>
          <div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Teléfono</div>
            <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
          </div>
          <div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Email</div>
            <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
          </div>
          <div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Notas</div>
            <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={!editName.trim()} onClick={saveEdit}>
              Guardar
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={Boolean(pendingDelete)}
        title="Eliminar proveedor"
        danger
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        description={
          pendingDelete ? (
            <>
              ¿Eliminar el proveedor <strong>«{pendingDelete.name}»</strong>? Si tiene órdenes de compra o productos
              asociados, el servidor puede rechazar la operación.
            </>
          ) : (
            ''
          )
        }
        onClose={() => setPendingDelete(null)}
        onConfirm={execDeleteSupplier}
      />
    </div>
  );
}
