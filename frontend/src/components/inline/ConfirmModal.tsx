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
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!open) {
      setBusy(false);
      setSubmitError('');
    }
  }, [open]);

  async function handleConfirm() {
    setBusy(true);
    setSubmitError('');
    try {
      await Promise.resolve(onConfirm());
      onClose();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'No se pudo completar la acción.');
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
        {submitError ? (
          <div role="alert" style={{ fontSize: 13, lineHeight: 1.45, color: p.dangerText, fontWeight: 700 }}>
            {submitError}
          </div>
        ) : null}
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
