import React, { useEffect, useState } from 'react';
import { usePalette } from '../../theme/ThemeProvider';
import { Button, Modal } from './Primitives';

/** Confirmación tipo diálogo (reemplazo de `window.confirm`). */
export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Estilo destacado para acciones destructivas (eliminar). */
  danger?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const p = usePalette();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setBusy(false);
    }
  }, [open]);

  async function handleConfirm() {
    setBusy(true);
    try {
      await Promise.resolve(onConfirm());
      onClose();
    } catch {
      // Errores de API ya muestran toast desde api/client; no duplicar texto en el modal.
    } finally {
      setBusy(false);
    }
  }

  const dangerConfirmStyle: React.CSSProperties = danger
    ? {
        borderColor: 'rgba(239, 68, 68, 0.4)',
        color: p.dangerText,
        background: p.dangerBg,
      }
    : {};

  return (
    <Modal open={open} title={title} onClose={() => !busy && onClose()} panelStyle={{ maxWidth: 460 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 14, lineHeight: 1.5, color: p.text, opacity: 0.92 }}>{description}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
          <Button type="button" variant="outline" disabled={busy} onClick={() => !busy && onClose()}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={danger ? 'outline' : 'primary'}
            disabled={busy}
            style={danger ? dangerConfirmStyle : undefined}
            onClick={handleConfirm}
          >
            {busy ? 'Enviando…' : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
