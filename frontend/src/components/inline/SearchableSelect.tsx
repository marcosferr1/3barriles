import React, { useEffect, useMemo, useRef, useState } from 'react';
import { THEMED_SCROLLBAR_CLASS } from '../../theme/themedScrollbar';
import { usePalette, useTheme } from '../../theme/ThemeProvider';

export type SearchOption = { value: string; label: string };

function baseRadius() {
  return 14;
}

/**
 * Select con filtro local por etiqueta (case insensitive). Escape cierra el desplegable.
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Buscar…',
  disabled,
  emptyLabel = '—',
  id,
}: {
  options: SearchOption[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  emptyLabel?: string;
  id?: string;
}) {
  const p = usePalette();
  const { mode } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  const withEmpty = useMemo(() => [{ value: '', label: emptyLabel }, ...options], [options, emptyLabel]);

  const selectedLabel = useMemo(() => {
    const row = withEmpty.find((o) => o.value === value);
    return row?.label ?? '';
  }, [withEmpty, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const [emptyOpt, ...rest] = withEmpty;
    if (!q) return withEmpty;
    const restFiltered = rest.filter((o) => o.label.toLowerCase().includes(q));
    return [emptyOpt, ...restFiltered];
  }, [withEmpty, query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const el = wrapRef.current;
      if (el && !el.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        style={{
          width: '100%',
          height: 42,
          padding: '0 12px',
          borderRadius: baseRadius(),
          border: `1px solid ${p.inputBorder}`,
          backgroundColor: p.inputBg,
          color: p.text,
          colorScheme: mode === 'dark' ? 'dark' : 'light',
          textAlign: 'left',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          fontSize: 14,
        }}
      >
        {value ? selectedLabel : <span style={{ color: p.mutedText }}>{emptyLabel}</span>}
      </button>
      {open ? (
        <div
          style={
            {
              position: 'absolute',
              left: 0,
              right: 0,
              top: 'calc(100% + 4px)',
              zIndex: 2000,
              background: p.menuSurface,
              border: `1px solid ${p.menuBorder}`,
              borderRadius: baseRadius(),
              boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 280,
              overflow: 'hidden',
              ['--ss-row-hover' as string]: p.menuItemHoverBg,
              ['--ss-row-selected' as string]: p.menuItemSelectedBg,
            } as React.CSSProperties
          }
          className="searchable-select-popover"
        >
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            style={{
              width: '100%',
              height: 40,
              padding: '0 12px',
              border: 'none',
              borderBottom: `1px solid ${p.menuBorder}`,
              backgroundColor: p.menuSurface,
              color: p.text,
              colorScheme: mode === 'dark' ? 'dark' : 'light',
              outline: 'none',
              fontSize: 14,
            }}
          />
          <div className={THEMED_SCROLLBAR_CLASS} style={{ overflowY: 'auto', maxHeight: 220 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 12, fontSize: 13, color: p.mutedText }}>Sin coincidencias</div>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value || '__empty'}
                  type="button"
                  className={o.value === value ? 'searchable-select-row searchable-select-row--selected' : 'searchable-select-row'}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 12px',
                    border: 'none',
                    background: 'transparent',
                    color: p.text,
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
