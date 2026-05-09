import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, LayoutList, LogOut, Palette } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { useDashboardPrefs, type DashboardSectionId } from '../settings/useDashboardPrefs';
import { useListPageSize } from '../settings/useListPageSize';
import { usePalette, useTheme } from '../theme/ThemeProvider';
import { Button, Card, CardSection } from '../components/inline/Primitives';

export default function ConfiguracionPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { mode, setMode } = useTheme();
  const { pageSize, setPageSize, options } = useListPageSize();
  const { visible: dashVisible, setSection: setDashSection, resetDashboardSections } = useDashboardPrefs();
  const p = usePalette();

  const dashLabels: Record<DashboardSectionId, string> = {
    kpis: 'Tarjetas de ventas del período',
    lowStock: 'Alertas de reposición',
    purchases: 'Compras recibidas',
    sales: 'Ventas recientes',
    topProducts: 'Top cantidad vendida',
  };

  function doLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 520 }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 950 }}>Configuración</div>
        <div style={{ marginTop: 6, opacity: 0.72, lineHeight: 1.45 }}>Preferencias del panel interno · sesión</div>
      </div>

      <Card>
        <CardSection style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Palette size={20} opacity={0.85} />
            <div style={{ fontWeight: 950 }}>Aspecto · tema</div>
          </div>
          <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 14, lineHeight: 1.45 }}>
            Cambia cómo se ve el sistema en este dispositivo. La elección queda guardada en el navegador.
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <Button variant={mode === 'light' ? 'primary' : 'outline'} size="sm" type="button" onClick={() => setMode('light')}>
              Light
            </Button>
            <Button variant={mode === 'dark' ? 'primary' : 'outline'} size="sm" type="button" onClick={() => setMode('dark')}>
              Dark
            </Button>
            <Button variant={mode === 'hybrid' ? 'primary' : 'outline'} size="sm" type="button" onClick={() => setMode('hybrid')}>
              Hybrid
            </Button>
          </div>
        </CardSection>
      </Card>

      <Card>
        <CardSection style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <LayoutList size={20} opacity={0.85} />
            <div style={{ fontWeight: 950 }}>Listas · filas por página</div>
          </div>
          <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 14, lineHeight: 1.45 }}>
            Cantidad de registros por solicitud en tablas paginadas (productos, ventas, categorías, etc.). Menos filas implica
            respuestas más livianas; más filas, menos clics entre páginas. Se guarda solo en este navegador. El servidor puede
            acotar el valor en algunos listados (por ejemplo categorías hasta 100 por pedido).
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 280 }}>
            <span style={{ fontSize: 13, fontWeight: 750 }}>Filas por página</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              style={{
                height: 42,
                padding: '0 12px',
                borderRadius: 14,
                border: `1px solid ${p.inputBorder}`,
                backgroundColor: p.inputBg,
                color: p.text,
                fontSize: 14,
              }}
            >
              {options.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </CardSection>
      </Card>

      <Card>
        <CardSection style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <LayoutDashboard size={20} opacity={0.85} />
            <div style={{ fontWeight: 950 }}>Dashboard · qué mostrar</div>
          </div>
          <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 14, lineHeight: 1.45 }}>
            Ocultá bloques que no uses en el resumen inicial. La configuración queda en este navegador.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(Object.keys(dashLabels) as DashboardSectionId[]).map((id) => (
              <label
                key={id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                <input
                  type="checkbox"
                  checked={dashVisible[id]}
                  onChange={(e) => setDashSection(id, e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: p.primary }}
                />
                <span>{dashLabels[id]}</span>
              </label>
            ))}
          </div>
          <div style={{ marginTop: 14 }}>
            <Button type="button" variant="outline" size="sm" onClick={resetDashboardSections}>
              Restaurar todo
            </Button>
          </div>
        </CardSection>
      </Card>

      <Card>
        <CardSection style={{ padding: 16 }}>
          <div style={{ fontWeight: 950, marginBottom: 8 }}>Cerrar sesión</div>
          <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 14, lineHeight: 1.45 }}>
            Salís del panel interno en este equipo. Vas a tener que iniciar sesión de nuevo para volver al sistema.
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={doLogout}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              borderColor: p.cardBorder,
              color: p.text,
            }}
          >
            <LogOut size={18} /> Salir del sistema
          </Button>
        </CardSection>
      </Card>
    </div>
  );
}
