/**
 * Helpers para datas "date-only" (YYYY-MM-DD) sem bug de timezone (dia -1).
 *
 * Em JS, `new Date("YYYY-MM-DD")` é interpretado como UTC e pode “voltar um dia”
 * em timezones negativos (ex.: Brasil). Aqui tratamos como data local.
 */

export function isISODateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function parseISODateAsLocal(value: string): Date {
  if (isISODateOnly(value)) {
    // "YYYY-MM-DDT00:00:00" é interpretado como horário local.
    return new Date(`${value}T00:00:00`);
  }
  return new Date(value);
}

export function formatDateBR(value?: string | null): string {
  if (!value) return "";
  const d = parseISODateAsLocal(value);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR");
}

export function isoDateToBR(value?: string | null): string {
  if (!value) return "";
  if (isISODateOnly(value)) {
    const [y, m, d] = value.split("-");
    return `${d}/${m}/${y}`;
  }
  return formatDateBR(value);
}

export function brDateToISO(br?: string | null): string | null {
  if (!br) return null;
  const match = br.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function isoInputToBR(iso?: string | null): string {
  if (!iso) return "";
  // input type="date" entrega YYYY-MM-DD
  if (isISODateOnly(iso)) return isoDateToBR(iso);
  return formatDateBR(iso);
}

