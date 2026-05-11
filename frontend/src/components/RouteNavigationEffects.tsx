import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook global por cambio de ruta (pathname / query / hash).
 * Sube el scroll al inicio al navegar dentro de la SPA (mejor que quedar abajo de una lista larga).
 * Para toasts globales usá `import { toast } from '@/lib/toast'` donde corresponda; no cerramos toasts acá
 * para no cortar un mensaje justo después de un redirect (p. ej. login → /app).
 */
export function RouteNavigationEffects() {
  const location = useLocation();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname, location.search, location.hash]);

  return null;
}
