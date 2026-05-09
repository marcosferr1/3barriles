import React, { useEffect, useMemo, useState } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { Beer, FolderTree, LayoutDashboard, Menu, Package, Settings, ShoppingCart, Truck, Wine } from 'lucide-react';
import { usePalette, useTheme } from '../theme/ThemeProvider';
import { Button } from '../components/inline/Primitives';
import DashboardOverviewPage from './DashboardOverviewPage';
import ProductsPage from './ProductsPage';
import SuppliersPage from './SuppliersPage';
import PurchaseOrdersPage from './PurchaseOrdersPage';
import SalesPage from './SalesPage';
import BarSalesPage from './BarSalesPage';
import CategoriesPage from './CategoriesPage';
import ConfiguracionPage from './ConfiguracionPage';

type NavItem = { key: string; label: string; to: string; icon: React.ReactNode };

/** Contraste en barra lateral hybrid (verde botella): ítem activo marfil + texto verde */
const HYBRID_NAV_ACTIVE_BG = '#F3F0E6';
const HYBRID_NAV_ACTIVE_TEXT = '#1F3D2B';

export default function DashboardPage() {
  const location = useLocation();
  const { mode } = useTheme();
  const p = usePalette();
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 1024 : false));
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems: NavItem[] = useMemo(
    () => [
      { key: 'dash', label: 'Dashboard', to: '/app/', icon: <LayoutDashboard size={18} /> },
      { key: 'prod', label: 'Productos', to: '/app/productos', icon: <Wine size={18} /> },
      { key: 'cat', label: 'Categorías', to: '/app/categorias', icon: <FolderTree size={18} /> },
      { key: 'sup', label: 'Proveedores', to: '/app/proveedores', icon: <Truck size={18} /> },
      { key: 'po', label: 'Compras', to: '/app/compras', icon: <Package size={18} /> },
      { key: 'sale', label: 'Ventas mercadería', to: '/app/ventas', icon: <ShoppingCart size={18} /> },
      { key: 'saleBar', label: 'Ventas BAR', to: '/app/ventas/bar', icon: <Beer size={18} /> },
      { key: 'cfg', label: 'Configuración', to: '/app/configuracion', icon: <Settings size={18} /> },
    ],
    []
  );

  function isActive(to: string) {
    const path = location.pathname;
    if (to === '/app/' || to === '/app') return path === '/app' || path === '/app/';
    if (to === '/app/ventas') return path.startsWith('/app/ventas') && !path.startsWith('/app/ventas/bar');
    if (to === '/app/ventas/bar') return path.startsWith('/app/ventas/bar');
    return path.startsWith(to.replace(/\/$/, ''));
  }

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (isMobile) setMenuOpen(false);
  }, [location.pathname, isMobile]);

  const sidebarIsDark = mode !== 'light';
  const asideBg = sidebarIsDark ? p.sidebarBg : '#FFFFFF';
  const asideText = sidebarIsDark ? p.sidebarText : p.text;
  const sidebarLogoSrc = mode === 'light' ? '/logopequenio.png' : '/logopequenioblanco.png';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', minWidth: 0 }}>
      {isMobile && menuOpen ? (
        <div
          onClick={() => setMenuOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(26,15,19,0.45)', zIndex: 40 }}
        />
      ) : null}

      <aside
        style={{
          width: 260,
          background: asideBg,
          color: asideText,
          borderRight: `1px solid ${sidebarIsDark ? 'rgba(243,240,230,0.14)' : p.sidebarBorder}`,
          padding: '20px 12px',
          boxSizing: 'border-box',
          position: isMobile ? 'fixed' : 'relative',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 50,
          transform: isMobile ? (menuOpen ? 'translateX(0)' : 'translateX(-110%)') : 'none',
          transition: isMobile ? 'transform 0.2s ease' : undefined,
        }}
      >
        <div style={{  display: 'flex', 

          padding: '6px 6px 18px 6px',
          justifyContent: 'center',
          flexDirection: 'row',
        }}>
          <img
            src={sidebarLogoSrc}
            alt="Barriles"
            style={{
              height: 52,
              width: 'auto',
              maxWidth: '100%',
              objectFit: 'contain',
              objectPosition: 'left center',
              display: 'block',
            }}
          />
          <span style={{ fontSize: 12, fontWeight: 700, color: asideText, marginLeft: 10 }}>3Barriles</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 6px' }}>
          {navItems.map((item) => {
            const active = isActive(item.to);
            const hybridActive = mode === 'hybrid' && active;
            return (
              <Link
                key={item.key}
                to={item.to}
                style={{
                  padding: '10px 12px',
                  borderRadius: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: 13,
                  ...(hybridActive
                    ? {
                        background: HYBRID_NAV_ACTIVE_BG,
                        color: HYBRID_NAV_ACTIVE_TEXT,
                        border: '1px solid rgba(243,240,230,0.45)',
                      }
                    : {
                        background: active ? p.primary : 'transparent',
                        color: active ? p.primaryText : asideText,
                      }),
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <main style={{ flex: 1, minWidth: 0, background: p.background, color: p.text }}>
        <div style={{ padding: 24, boxSizing: 'border-box', width: '100%', maxWidth: '100%', minWidth: 0 }}>
          <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            {isMobile ? (
              <Button variant="outline" size="sm" type="button" onClick={() => setMenuOpen((v) => !v)}>
                <Menu size={16} />
              </Button>
            ) : (
              <div />
            )}
          </div>

          <Routes>
            <Route path="/" element={<DashboardOverviewPage />} />
            <Route path="productos" element={<ProductsPage />} />
            <Route path="categorias" element={<CategoriesPage />} />
            <Route path="proveedores" element={<SuppliersPage />} />
            <Route path="compras" element={<PurchaseOrdersPage />} />
            <Route path="ventas/bar" element={<BarSalesPage />} />
            <Route path="ventas" element={<SalesPage />} />
            <Route path="configuracion" element={<ConfiguracionPage />} />
            <Route path="*" element={<DashboardOverviewPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
