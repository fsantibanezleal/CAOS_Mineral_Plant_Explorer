export function sceneValueLabel(
  value: number | null,
  unit: string | undefined,
  language: string,
  overlay: 'observations' | 'engines',
  live: boolean,
): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `${value.toLocaleString(language, { maximumFractionDigits: value < 100 ? 1 : 0 })} ${unit ?? ''}`.trim();
  }
  if (overlay === 'engines') return language === 'es' ? 'Sin métrica vinculada' : 'No linked metric';
  if (live) return language === 'es' ? 'Sin lectura en vivo' : 'No live reading';
  return language === 'es' ? 'Sin observación' : 'No observation';
}
