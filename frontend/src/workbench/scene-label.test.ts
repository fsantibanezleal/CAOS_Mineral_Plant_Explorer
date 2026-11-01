import { describe, expect, it } from 'vitest';
import { sceneValueLabel } from './scene-label';

describe('3D observation labels', () => {
  it('formats available numeric values with their unit', () => {
    expect(sceneValueLabel(725.87, 't/h', 'en', 'observations', false)).toBe('726 t/h');
  });

  it('explains unavailable values instead of showing a question mark', () => {
    expect(sceneValueLabel(null, undefined, 'en', 'observations', false)).toBe('No observation');
    expect(sceneValueLabel(null, undefined, 'es', 'observations', true)).toBe('Sin lectura en vivo');
    expect(sceneValueLabel(null, undefined, 'es', 'engines', false)).toBe('Sin métrica vinculada');
  });
});
