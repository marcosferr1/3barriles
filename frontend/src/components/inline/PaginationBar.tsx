import React from 'react';
import { usePalette } from '../../theme/ThemeProvider';
import { Button } from './Primitives';

type Props = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
};

export function PaginationBar({ page, pageSize, total, onPageChange, disabled }: Props) {
  const p = usePalette();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);
  const canPrev = safePage > 1 && !disabled;
  const canNext = safePage < totalPages && !disabled;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginTop: 12,
        paddingTop: 12,
        borderTop: `1px solid ${p.cardBorder}`,
        fontSize: 13,
        color: p.mutedText,
      }}
    >
      <span>
        {total === 0 ? (
          'Sin resultados'
        ) : (
          <>
            Mostrando <strong style={{ color: p.text }}>{from}</strong>–<strong style={{ color: p.text }}>{to}</strong> de{' '}
            <strong style={{ color: p.text }}>{total}</strong>
          </>
        )}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Button type="button" variant="outline" size="sm" disabled={!canPrev} onClick={() => onPageChange(safePage - 1)}>
          Anterior
        </Button>
        <span style={{ fontWeight: 700, color: p.text, minWidth: 72, textAlign: 'center' }}>
          {safePage} / {totalPages}
        </span>
        <Button type="button" variant="outline" size="sm" disabled={!canNext} onClick={() => onPageChange(safePage + 1)}>
          Siguiente
        </Button>
      </div>
    </div>
  );
}
