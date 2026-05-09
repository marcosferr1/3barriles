import React from 'react';
import { THEMED_SCROLLBAR_CLASS } from '../../theme/themedScrollbar';
import { usePalette, useTheme } from '../../theme/ThemeProvider';

export { THEMED_SCROLLBAR_CLASS };

/** Contenedor de tablas anchas: en viewport angosto el scroll es lateral (incl. iOS). */
export const tableHorizontalScrollWrapStyle: React.CSSProperties = {
  overflowX: 'auto',
  maxWidth: '100%',
  WebkitOverflowScrolling: 'touch',
};

type ButtonVariant = 'primary' | 'outline';
type ButtonSize = 'md' | 'sm';

function baseRadius() {
  return 14;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  style,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  const p = usePalette();
  const height = size === 'sm' ? 34 : 42;
  const padX = size === 'sm' ? 12 : 16;

  const merged: React.CSSProperties = {
    height,
    padding: `0 ${padX}px`,
    borderRadius: baseRadius(),
    border: variant === 'outline' ? `1px solid ${p.cardBorder}` : '1px solid transparent',
    background: variant === 'outline' ? 'transparent' : p.primary,
    color: variant === 'outline' ? p.text : p.primaryText,
    cursor: props.disabled ? 'not-allowed' : 'pointer',
    opacity: props.disabled ? 0.6 : 1,
    fontWeight: 600,
    fontSize: size === 'sm' ? 13 : 14,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...(style || {}),
  };

  return (
    <button {...props} style={merged}>
      {children}
    </button>
  );
}

export function Input({
  style,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  const p = usePalette();
  const { mode } = useTheme();

  return (
    <input
      {...props}
      style={{
        width: '100%',
        height: 42,
        padding: '0 12px',
        borderRadius: baseRadius(),
        border: `1px solid ${p.inputBorder}`,
        backgroundColor: p.inputBg,
        color: p.text,
        colorScheme: mode === 'dark' ? 'dark' : 'light',
        outline: 'none',
        ...(style || {}),
      }}
    />
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const p = usePalette();
  return (
    <div
      style={{
        background: p.cardBg,
        border: `1px solid ${p.cardBorder}`,
        borderRadius: baseRadius(),
        boxShadow: '0 1px 0 rgba(0,0,0,0.02)',
        ...(style || {}),
      }}
    >
      {children}
    </div>
  );
}

export function CardSection({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ padding: 18, ...(style || {}) }}>{children}</div>;
}

export function Badge({
  label,
  tone = 'neutral',
  style,
}: {
  label: string;
  tone?: 'neutral' | 'success' | 'danger' | 'warning';
  style?: React.CSSProperties;
}) {
  const p = usePalette();
  const map: Record<string, { bg: string; text: string; border: string }> = {
    neutral: { bg: p.cardBg, text: p.text, border: p.cardBorder },
    success: { bg: 'rgba(31,61,43,0.12)', text: '#1f3d2b', border: 'rgba(31,61,43,0.25)' },
    danger: { bg: p.dangerBg, text: p.dangerText, border: 'rgba(239, 68, 68, 0.25)' },
    warning: { bg: 'rgba(201,162,77,0.18)', text: '#5c4510', border: 'rgba(201,162,77,0.35)' },
  };
  const t = map[tone];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 28,
        padding: '0 10px',
        borderRadius: 999,
        background: t.bg,
        color: t.text,
        border: `1px solid ${t.border}`,
        fontSize: 14,
        fontWeight: 600,
        ...(style || {}),
      }}
    >
      {label}
    </span>
  );
}

export function Select({
  style,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const p = usePalette();
  const { mode } = useTheme();
  const contentDark = mode === 'dark';

  return (
    <select
      {...props}
      style={{
        width: '100%',
        height: 42,
        padding: '0 12px',
        borderRadius: baseRadius(),
        border: `1px solid ${p.inputBorder}`,
        backgroundColor: p.inputBg,
        color: p.text,
        outline: 'none',
        colorScheme: contentDark ? 'dark' : 'light',
        ...(style || {}),
      }}
    />
  );
}

export function Textarea({
  style,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const p = usePalette();
  const { mode } = useTheme();

  return (
    <textarea
      {...props}
      style={{
        width: '100%',
        minHeight: 90,
        padding: '10px 12px',
        borderRadius: baseRadius(),
        border: `1px solid ${p.inputBorder}`,
        backgroundColor: p.inputBg,
        color: p.text,
        colorScheme: mode === 'dark' ? 'dark' : 'light',
        outline: 'none',
        resize: 'vertical',
        ...(style || {}),
      }}
    />
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  overlayStyle,
  panelStyle,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  overlayStyle?: React.CSSProperties;
  panelStyle?: React.CSSProperties;
}) {
  const p = usePalette();
  const isDarkBg = p.background.toLowerCase().includes('#1a');

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: isDarkBg ? 'rgba(26,15,19,0.78)' : 'rgba(89,30,42,0.35)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        overflowY: 'auto',
        ...(overlayStyle || {}),
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 620,
          maxHeight: 'calc(100vh - 32px)',
          background: p.cardBg,
          border: `1px solid ${p.cardBorder}`,
          borderRadius: baseRadius(),
          boxShadow: isDarkBg ? '0 20px 46px rgba(0,0,0,0.5)' : '0 18px 40px rgba(0,0,0,0.18)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          ...(panelStyle || {}),
        }}
      >
        <div
          style={{
            padding: '14px 18px',
            borderBottom: `1px solid ${p.cardBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 900 }}>{title}</div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: 12,
              border: `1px solid ${p.cardBorder}`,
              background: 'transparent',
              color: p.text,
              cursor: 'pointer',
              fontWeight: 900,
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: 18, overflowY: 'auto', minHeight: 0 }}>{children}</div>
      </div>
    </div>
  );
}
