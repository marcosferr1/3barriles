import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { api } from '../api/client';
import { useDashboardPrefs } from '../settings/useDashboardPrefs';
import { usePalette, useTheme } from '../theme/ThemeProvider';
import type { DatePresetId } from '../utils/dateRange';
import { applyDatePreset, defaultDashboardRange } from '../utils/dateRange';
import { Badge, Button, Card, CardSection, Input, Spinner } from '../components/inline/Primitives';

function moneyArs(amount: string | number) {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(n);
}

const PAY_LABEL: Record<string, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
};

type DashboardSummary = {
  range: { fromDay: string; toDay: string };
  salesInRange: { count: number; total: string };
  lowStock: Array<{ id: string; name: string; sku?: string | null; stock: number; reorderLevel: number }>;
  lowStockTotal: number;
  lowStockHasMore: boolean;
  recentPurchases: Array<{ id: string; receivedAt?: string | Date | null; supplier?: { name?: string | null } }>;
  recentPurchasesTotal: number;
  recentPurchasesHasMore: boolean;
  recentSales: Array<{
    id: string;
    soldAt?: string | Date | null;
    paymentMethod?: string;
    totalAmount?: string;
    lines?: Array<{
      qty: number;
      unitPrice?: string | number | null;
      lineDescription?: string | null;
      product?: { id?: string; name?: string | null; isBundle?: boolean };
    }>;
  }>;
  recentSalesTotal: number;
  recentSalesHasMore: boolean;
  topProducts: Array<{ id?: string; name?: string; qty_sold?: number }>;
  topProductsTotal: number;
  topProductsHasMore: boolean;
};

const LOAD_CHUNK = 5;
const MAX_LIST = 50;

const PRESETS: { id: DatePresetId; label: string }[] = [
  { id: 'today', label: 'Hoy' },
  { id: 'last7', label: 'Últimos 7 días' },
  { id: 'last30', label: 'Últimos 30 días' },
  { id: 'thisMonth', label: 'Este mes' },
  { id: 'lastMonth', label: 'Mes pasado' },
];

function rangeMatchesPreset(id: DatePresetId, from: string, to: string): boolean {
  const r = applyDatePreset(id);
  return r.from === from && r.to === to;
}

export default function DashboardOverviewPage() {
  const { token } = useAuth();
  const p = usePalette();
  const { mode } = useTheme();
  const { visible } = useDashboardPrefs();
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  const [from, setFrom] = useState(() => defaultDashboardRange().from);
  const [to, setTo] = useState(() => defaultDashboardRange().to);

  const [purchaseLimit, setPurchaseLimit] = useState(LOAD_CHUNK);
  const [saleLimit, setSaleLimit] = useState(LOAD_CHUNK);
  const [topLimit, setTopLimit] = useState(LOAD_CHUNK);
  const [stockLimit, setStockLimit] = useState(LOAD_CHUNK);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!token) return;
      setLoading(true);
      setLoadFailed(false);
      try {
        const data = await api.dashboard.summary(token, {
          from,
          to,
          purchaseLimit,
          saleLimit,
          topLimit,
          stockLimit,
        });
        if (!cancelled) {
          setSummary(data as DashboardSummary);
          setLoadFailed(false);
        }
      } catch {
        if (!cancelled) {
          setSummary(null);
          setLoadFailed(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token, from, to, purchaseLimit, saleLimit, topLimit, stockLimit, retryTick]);

  function applyPreset(id: DatePresetId) {
    const r = applyDatePreset(id);
    setFrom(r.from);
    setTo(r.to);
    setPurchaseLimit(LOAD_CHUNK);
    setSaleLimit(LOAD_CHUNK);
    setTopLimit(LOAD_CHUNK);
    setStockLimit(LOAD_CHUNK);
  }

  function onManualDateChange(nextFrom: string, nextTo: string) {
    setFrom(nextFrom);
    setTo(nextTo);
    setPurchaseLimit(LOAD_CHUNK);
    setSaleLimit(LOAD_CHUNK);
    setTopLimit(LOAD_CHUNK);
    setStockLimit(LOAD_CHUNK);
  }

  if (!token) return null;

  const allHidden =
    !visible.kpis && !visible.lowStock && !visible.purchases && !visible.sales && !visible.topProducts;

  const rangeLabel =
    summary && summary.range.fromDay === summary.range.toDay
      ? summary.range.fromDay
      : summary
        ? `${summary.range.fromDay} → ${summary.range.toDay}`
        : '';

  const defRange = defaultDashboardRange();
  const isDefault7 = from === defRange.from && to === defRange.to;

  const chipBase = (active: boolean): React.CSSProperties => ({
    height: 34,
    padding: '0 12px',
    borderRadius: 14,
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    border: `1px solid ${active ? p.primary : p.inputBorder}`,
    background: active ? p.primary : p.inputBg,
    color: active ? p.primaryText : p.text,
    colorScheme: mode === 'dark' ? 'dark' : 'light',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 24, fontWeight: 950, letterSpacing: -0.3 }}>Resumen operativo</div>
        <div style={{ marginTop: 6, opacity: 0.72 }}>Ventas registradas · stock · compras · período ajustable</div>
      </div>

      <Card>
        <CardSection style={{ padding: 16 }}>
          <div style={{ fontWeight: 950, marginBottom: 10 }}>Período</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {PRESETS.map((pr) => {
              const active = rangeMatchesPreset(pr.id, from, to);
              return (
                <button key={pr.id} type="button" onClick={() => applyPreset(pr.id)} style={chipBase(active)}>
                  {pr.label}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 750, opacity: 0.85 }}>Desde</span>
              <Input
                type="date"
                value={from}
                onChange={(e) => onManualDateChange(e.target.value, to)}
                style={{ minWidth: 160 }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 750, opacity: 0.85 }}>Hasta</span>
              <Input
                type="date"
                value={to}
                onChange={(e) => onManualDateChange(from, e.target.value)}
                style={{ minWidth: 160 }}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                const r = defaultDashboardRange();
                onManualDateChange(r.from, r.to);
              }}
              style={chipBase(isDefault7)}
            >
              Por defecto (7 días)
            </button>
          </div>
          {rangeLabel ? (
            <div style={{ marginTop: 10, fontSize: 13, opacity: 0.75 }}>
              Mostrando datos del <strong style={{ color: p.text }}>{rangeLabel}</strong>
            </div>
          ) : null}
        </CardSection>
      </Card>

      {loading ? (
        <div
          role="status"
          aria-label="Cargando…"
          style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 24 }}
        >
          <Spinner size={32} />
        </div>
      ) : null}
      {!loading && loadFailed ? (
        <Card>
          <CardSection style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ fontWeight: 800, lineHeight: 1.45 }}>No pudimos cargar el resumen del panel.</div>
            <div style={{ fontSize: 14, opacity: 0.8, lineHeight: 1.45 }}>
              Revisá la conexión o probá de nuevo; el detalle del error apareció en un aviso arriba.
            </div>
            <Button type="button" variant="primary" size="sm" onClick={() => setRetryTick((t) => t + 1)}>
              Reintentar
            </Button>
          </CardSection>
        </Card>
      ) : null}

      {!loading && allHidden ? (
        <div style={{ padding: 14, borderRadius: 14, border: `1px solid ${p.cardBorder}`, opacity: 0.85, lineHeight: 1.45 }}>
          Ocultaste todas las secciones del dashboard. Podés volver a mostrar KPIs, listas y alertas en{' '}
          <Link to="/app/configuracion" style={{ color: p.primary, fontWeight: 800 }}>
            Configuración → Dashboard
          </Link>
          .
        </div>
      ) : null}

      {summary && visible.kpis ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <Card>
            <CardSection>
              <div style={{ opacity: 0.7, fontWeight: 800, marginBottom: 8 }}>Ventas en el período</div>
              <div style={{ fontSize: 28, fontWeight: 950 }}>{summary.salesInRange.count}</div>
              <div style={{ marginTop: 6 }}>{moneyArs(summary.salesInRange.total)}</div>
            </CardSection>
          </Card>
        </div>
      ) : null}

      {summary && visible.lowStock ? (
        <Card>
          <CardSection>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ fontWeight: 950 }}>Alertas de reposición</div>
              <Badge label={`${summary.lowStockTotal}`} 
              style={{ backgroundColor: p.warningBg, color: p.  warningText, border: `1px solid ${p.warningBorder}` }}
              />
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {summary.lowStock.length ? (
                summary.lowStock.map((x) => (
                  <div
                    key={x.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '10px 12px',
                      borderRadius: 14,
                      border: `1px solid ${p.cardBorder}`,
                    }}
                  >
                    <div style={{ fontWeight: 750 }}>
                      <div>{x.name}</div>
                      <div style={{ fontSize: 13, opacity: 0.7 }}>{x.sku || 'Sin SKU'} · punto de reposición {x.reorderLevel}</div>
                    </div>
                    <Badge label={`Stock ${x.stock}`} tone="danger" />
                  </div>
                ))
              ) : (
                <div style={{ opacity: 0.72 }}>No hay productos bajo el punto de reposición.</div>
              )}
            </div>
            {summary.lowStockHasMore ? (
              <div style={{ marginTop: 12 }}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={stockLimit >= MAX_LIST}
                  onClick={() => setStockLimit((n) => Math.min(n + LOAD_CHUNK, MAX_LIST))}
                >
                  +5 alertas más (máx. {MAX_LIST})
                </Button>
              </div>
            ) : null}
          </CardSection>
        </Card>
      ) : null}

      {summary && (visible.purchases || visible.sales || visible.topProducts) ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
          {visible.purchases ? (
            <Card>
              <CardSection>
                <div style={{ fontWeight: 950, marginBottom: 12 }}>Compras recibidas</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(summary.recentPurchases || []).length ? (
                    summary.recentPurchases.map((po) => (
                      <div
                        key={po.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 12,
                          padding: '10px 12px',
                          borderRadius: 14,
                          border: `1px solid ${p.cardBorder}`,
                        }}
                      >
                        <div style={{ fontWeight: 750 }}>
                          {po.supplier?.name || 'Proveedor'}
                          <div style={{ fontSize: 13, opacity: 0.72 }}>
                            {po.receivedAt ? new Date(po.receivedAt).toLocaleString('es-AR') : ''}
                          </div>
                        </div>
                        <Badge label="Recibida" tone="success" />
                      </div>
                    ))
                  ) : (
                    <div style={{ opacity: 0.7 }}>Sin compras en este período.</div>
                  )}
                </div>
                {summary.recentPurchasesHasMore ? (
                  <div style={{ marginTop: 12 }}>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={purchaseLimit >= MAX_LIST}
                      onClick={() => setPurchaseLimit((n) => Math.min(n + LOAD_CHUNK, MAX_LIST))}
                    >
                      +5 compras más (máx. {MAX_LIST})
                    </Button>
                  </div>
                ) : null}
              </CardSection>
            </Card>
          ) : null}

          {visible.sales ? (
            <Card>
              <CardSection>
                <div style={{ fontWeight: 950, marginBottom: 12 }}>Ventas recientes</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(summary.recentSales || []).length ? (
                    summary.recentSales.map((s) => (
                      <div
                        key={s.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 12,
                          padding: '10px 12px',
                          borderRadius: 14,
                          border: `1px solid ${p.cardBorder}`,
                        }}
                      >
                        <div style={{ fontWeight: 750, minWidth: 0 }}>
                          {PAY_LABEL[s.paymentMethod || ''] || s.paymentMethod || '—'}
                          <div style={{ fontSize: 13, opacity: 0.72 }}>
                            {s.soldAt ? new Date(s.soldAt).toLocaleString('es-AR') : ''}
                          </div>
                          {(s.lines || []).length ? (
                            <ul
                              style={{
                                margin: '8px 0 0',
                                paddingLeft: 18,
                                fontSize: 12,
                                opacity: 0.82,
                                fontWeight: 600,
                                lineHeight: 1.45,
                              }}
                            >
                              {(s.lines || []).slice(0, 6).map((ln, i) => (
                                <li key={i}>
                                  {ln.lineDescription || ln.product?.name || 'Ítem'} × {ln.qty}
                                  {ln.product?.isBundle ? (
                                    <span style={{ opacity: 0.75 }}> (pack)</span>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                        <div style={{ fontWeight: 900 }}>{moneyArs(String(s.totalAmount || '0'))}</div>
                      </div>
                    ))
                  ) : (
                    <div style={{ opacity: 0.7 }}>Sin ventas en este período.</div>
                  )}
                </div>
                {summary.recentSalesHasMore ? (
                  <div style={{ marginTop: 12 }}>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={saleLimit >= MAX_LIST}
                      onClick={() => setSaleLimit((n) => Math.min(n + LOAD_CHUNK, MAX_LIST))}
                    >
                      +5 ventas más (máx. {MAX_LIST})
                    </Button>
                  </div>
                ) : null}
              </CardSection>
            </Card>
          ) : null}

          {visible.topProducts ? (
            <Card>
              <CardSection>
                <div style={{ fontWeight: 950, marginBottom: 12 }}>Top por cantidad vendida</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(summary.topProducts || []).length ? (
                    summary.topProducts.map((t) => (
                      <div
                        key={`${t.id}-${t.name}`}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 12,
                          padding: '10px 12px',
                          borderRadius: 14,
                          border: `1px solid ${p.cardBorder}`,
                        }}
                      >
                        <div style={{ fontWeight: 750 }}>{t.name}</div>
                        <Badge label={`${t.qty_sold || 0} u.`} tone="neutral" />
                      </div>
                    ))
                  ) : (
                    <div style={{ opacity: 0.7 }}>Sin datos en este período.</div>
                  )}
                </div>
                {summary.topProductsHasMore ? (
                  <div style={{ marginTop: 12 }}>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={topLimit >= MAX_LIST}
                      onClick={() => setTopLimit((n) => Math.min(n + LOAD_CHUNK, MAX_LIST))}
                    >
                      +5 en el top (máx. {MAX_LIST})
                    </Button>
                  </div>
                ) : null}
              </CardSection>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
