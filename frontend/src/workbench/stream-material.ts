const LABELS: Record<string, { en: string; es: string }> = {
  acid: { en: 'Acid', es: 'Ácido' },
  concentrate: { en: 'Concentrate', es: 'Concentrado' },
  copper: { en: 'Copper', es: 'Cobre' },
  electrolyte: { en: 'Electrolyte', es: 'Electrolito' },
  leach_residue: { en: 'Leach residue', es: 'Residuo de lixiviación' },
  ore: { en: 'Ore', es: 'Mineral' },
  organic: { en: 'Organic phase', es: 'Fase orgánica' },
  slurry: { en: 'Slurry', es: 'Pulpa' },
  solution: { en: 'Solution', es: 'Solución' },
  tailings: { en: 'Tailings', es: 'Relaves' },
  water: { en: 'Water', es: 'Agua' },
};

export function streamMaterialLabel(material: string, language: string): string {
  const labels = LABELS[material];
  return labels ? labels[language === 'es' ? 'es' : 'en'] : material.replaceAll('_', ' ');
}
