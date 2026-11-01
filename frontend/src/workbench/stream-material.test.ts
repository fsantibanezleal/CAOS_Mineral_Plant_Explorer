import { describe, expect, it } from 'vitest';
import { streamMaterialLabel } from './stream-material';

describe('localized stream materials', () => {
  it('translates the declared mineral-plant material families', () => {
    expect(streamMaterialLabel('tailings', 'en')).toBe('Tailings');
    expect(streamMaterialLabel('tailings', 'es')).toBe('Relaves');
    expect(streamMaterialLabel('leach_residue', 'es')).toBe('Residuo de lixiviación');
    expect(streamMaterialLabel('organic', 'es')).toBe('Fase orgánica');
  });

  it('preserves readable unknown material identifiers', () => {
    expect(streamMaterialLabel('future_material', 'es')).toBe('future material');
  });
});
