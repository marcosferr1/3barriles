function parseBackOn(raw: string | undefined): boolean {
  if (raw === undefined || raw === '') return true;
  const v = raw.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}

/** `BACK_ON` en `.env` (raíz del repo). Por defecto `true` si no está definida. */
export const isBackOn = parseBackOn(import.meta.env.BACK_ON as string | undefined);
