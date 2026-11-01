import type { Asset, Plant, Trace, Observation } from '../lib/contract.types';
export type Status = 'normal' | 'alarm' | 'unavailable' | 'context';
export const METHODS = ['threshold', 'wls', 'robust-aligned', 'forecast', 'tasc', 'tasc-no-timing', 'tasc-no-engine', 'tasc-no-topology'] as const;
export function linked(plant: Plant, id: string, direction: 'upstream' | 'downstream') {
  const found = new Set<string>(); const queue = [id];
  while (queue.length) {
    const current = queue.shift()!;
    for (const e of plant.streams) {
      const next = direction === 'downstream' ? e.target : e.source;
      if ((direction === 'downstream' ? e.source : e.target) === current && next !== id && !found.has(next)) { found.add(next); queue.push(next); }
    }
  }
  return found;
}
export function channelIndices(trace: Trace, assetId: string) { return trace.channels.flatMap((c, i) => c.asset_id === assetId ? [i] : []); }
export function liveValue(record: Observation, now: number): number | null {
  const age = (now - Date.parse(record.source_time)) / 1000;
  return record.quality === 'good' && typeof record.value === 'number' && Number.isFinite(record.value) && Number.isFinite(age) && age >= -2 && age <= 15 ? record.value : null;
}
export function assetState(asset: Asset, trace: Trace | null, step: number, method: string, live: Observation[] | null = null, now = Date.now()): Status {
  if (live !== null) { const records = live.filter(r => r.asset_id === asset.id); return records.length && records.every(r => liveValue(r, now) !== null) ? 'normal' : 'unavailable'; }
  if (!trace) return 'unavailable';
  const indices = channelIndices(trace, asset.id);
  if (!indices.length) return 'context';
  if (indices.some(i => !trace.valid[step]?.[i] || trace.observed[step]?.[i] === null)) return 'unavailable';
  const scores = trace.scores[method]?.[step];
  if (!scores || indices.some(i => scores[i] === null)) return 'unavailable';
  return indices.some(i => (scores[i] ?? 0) > 1) ? 'alarm' : 'normal';
}
export function safeStep(value: number, length: number) { return Math.max(0, Math.min(length - 1, Math.round(value))); }
export function formatValue(v: number | null | undefined, lang: string) { return typeof v === 'number' && Number.isFinite(v) ? v.toLocaleString(lang, { maximumFractionDigits: 2 }) : (lang==='es'?'sin dato':'no data'); }
