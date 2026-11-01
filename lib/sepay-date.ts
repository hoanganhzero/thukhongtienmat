export function parseSePayDate(value?: string) {
  if (!value) return null;
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(normalized);
  const parsed = new Date(hasZone ? normalized : normalized + '+07:00');
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
