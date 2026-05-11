import { Toaster as Sonner } from 'sonner';
import { useTheme } from '@/theme/ThemeProvider';

/** Toaster estilo shadcn (Sonner), alineado al tema claro / oscuro de la app. */
export function Toaster() {
  const { mode } = useTheme();
  const sonnerTheme = mode === 'dark' ? 'dark' : 'light';

  return (
    <Sonner
      theme={sonnerTheme}
      position="top-center"
      richColors
      closeButton
      duration={4500}
      className="toaster group"
    />
  );
}
