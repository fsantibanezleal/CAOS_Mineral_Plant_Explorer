import { describe, it, expect } from 'vitest';
import { linked, liveValue, assetState, safeStep } from './model';
import graph from '../../../data/derived/plant.json';
import trace from '../../../data/derived/PL-01/trace.json';
import type { Plant, Trace, Observation } from '../lib/contract.types';
describe('connected plant state', () => {
  it('adversarial: identity and cycles remain bounded', () => {
    const p = graph as Plant;
    const downstream = linked(p, 'SAG', 'downstream');
    expect(downstream.has('CY1')).toBe(true); expect(downstream.has('SAG')).toBe(false); expect(downstream.size).toBeLessThan(p.assets.length);
    expect(safeStep(999, 160)).toBe(159);
  });
  it('adversarial: missing and stale never become healthy', () => {
    const p = graph as Plant; const t = structuredClone(trace) as Trace;
    t.observed[80][0] = null;
    expect(assetState(p.assets.find(a => a.id === 'ROM')!, t, 80, 'tasc')).toBe('unavailable');
    const r = { quality:'good', value:720, source_time:'2026-10-31T00:00:00Z' } as Observation;
    expect(liveValue(r, Date.parse('2026-10-31T00:01:00Z'))).toBeNull();
    expect(liveValue({...r, value:0}, Date.parse(r.source_time))).toBe(0);
    expect(assetState(p.assets[0], t, 80, 'tasc', [])).toBe('unavailable');
  });
});
