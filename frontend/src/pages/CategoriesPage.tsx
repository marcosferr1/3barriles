import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { api } from '../api/client';
import { usePalette } from '../theme/ThemeProvider';
import { ConfirmModal } from '../components/inline/ConfirmModal';
import { PaginationBar } from '../components/inline/PaginationBar';
import {
  Button,
  Card,
  CardSection,
  Input,
  Modal,
  TableLoadingRow,
  THEMED_SCROLLBAR_CLASS,
  tableHorizontalScrollWrapStyle,
} from '../components/inline/Primitives';
import { clampListPageSizeDefault, useListPageSize } from '../settings/useListPageSize';
import type { Paginated } from '../types/api';

type Category = { id: string; name: string };

export default function CategoriesPage() {
  const { token } = useAuth();
  const p = usePalette();
  const { pageSize: listPageSize } = useListPageSize();
  const tablePageSize = clampListPageSizeDefault(listPageSize);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);

  async function refresh() {
    if (!token) return;
    setLoading(true);
    try {
      const res = (await api.categories.list(token, {
        page,
        pageSize: tablePageSize,
        q: q.trim() || undefined,
      })) as Paginated<Category>;
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
  }, [token, page, q, tablePageSize]);

  async function onCreate() {
    if (!token || !createName.trim()) return;
    await api.categories.create(token, { name: createName.trim() });
    setCreateName('');
    setCreateOpen(false);
    await refresh();
  }

  function openEdit(c: Category) {
    setEditRow(c);
    setEditName(c.name);
    setEditOpen(true);
  }

  async function onSaveEdit() {
    if (!token || !editRow || !editName.trim()) return;
    await api.categories.patch(token, editRow.id, { name: editName.trim() });
    setEditOpen(false);
    setEditRow(null);
    await refresh();
  }

  async function execDelete() {
    if (!token || !pendingDelete) return;
    await api.categories.remove(token, pendingDelete.id);
    await refresh();
  }

  if (!token) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 950 }}>Categorías</div>
          <div style={{ marginTop: 6, opacity: 0.72 }}>Agrupá productos; al eliminar, se desvinculan del producto</div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Input placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 260, maxWidth: '100%' }} />
          <Button type="button" onClick={() => setCreateOpen(true)}>
            Nueva categoría
          </Button>
        </div>
      </div>

      <Card>
        <CardSection style={{ padding: 0 }}>
          <div className={THEMED_SCROLLBAR_CLASS} style={tableHorizontalScrollWrapStyle}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: `1px solid ${p.cardBorder}` }}>
                  <th style={{ padding: '12px 14px' }}>Nombre</th>
                  <th style={{ padding: '12px 14px', width: 200 }} />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableLoadingRow colSpan={2} />
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={2} style={{ padding: 14, opacity: 0.72 }}>
                      Sin categorías{q.trim() ? ` que coincidan con “${q.trim()}”` : ''}.
                    </td>
                  </tr>
                ) : (
                  items.map((c) => (
                    <tr key={c.id} style={{ borderBottom: `1px solid ${p.cardBorder}` }}>
                      <td style={{ padding: '12px 14px', fontWeight: 850 }}>{c.name}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <Button type="button" variant="outline" size="sm" onClick={() => openEdit(c)}>
                            Editar
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => setPendingDelete(c)}>
                            Eliminar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '0 16px 16px' }}>
            <PaginationBar page={page} pageSize={tablePageSize} total={total} onPageChange={setPage} disabled={loading} />
          </div>
        </CardSection>
      </Card>

      <Modal open={createOpen} title="Nueva categoría" onClose={() => setCreateOpen(false)} panelStyle={{ maxWidth: 440 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Nombre</div>
            <Input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Ej: Vinos" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={!createName.trim()} onClick={onCreate}>
              Guardar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={editOpen}
        title={editRow ? `Editar · ${editRow.name}` : 'Editar categoría'}
        onClose={() => setEditOpen(false)}
        panelStyle={{ maxWidth: 440 }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Nombre</div>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={!editName.trim()} onClick={onSaveEdit}>
              Guardar
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={Boolean(pendingDelete)}
        title="Eliminar categoría"
        danger
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        description={
          pendingDelete ? (
            <>
              ¿Eliminar la categoría <strong>«{pendingDelete.name}»</strong>? Los productos que la usen quedarán sin
              categoría.
            </>
          ) : (
            ''
          )
        }
        onClose={() => setPendingDelete(null)}
        onConfirm={execDelete}
      />
    </div>
  );
}
