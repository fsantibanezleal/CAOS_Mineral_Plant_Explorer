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
export function evidenceStep(trace: Trace, step: number, method: string, channel: number): number {
  const lags = trace.evidence_lag_s[method];
  const lag = lags?.[channel];
  // Alignment admits a complete common snapshot only after the longest lag.
  if (lags && trace.time_s[step] - trace.time_s[0] < Math.max(...lags)) return -1;
  return typeof lag === 'number' ? trace.time_s.indexOf(trace.time_s[step] - lag) : -1;
}
export function snapshotValue(trace: Trace, step: number, method: string, channel: number): number | null {
  const at = evidenceStep(trace, step, method, channel);
  return at >= 0 && trace.valid[at]?.[channel] ? trace.observed[at]?.[channel] ?? null : null;
}
export function liveValue(record: Observation, now: number, plant: Plant): number | null {
  const binding = plant.tags.find(t => t.tag_id === record.tag_id);
  if (!binding || binding.asset_id !== record.asset_id || binding.unit !== record.unit ||
      typeof record.source_time !== 'string' || !['source', 'server'].includes(record.freshness_basis)) return null;
  const zoned = (v: string) => /(?:Z|[+-]\d{2}:\d{2})$/.test(v);
  if (!zoned(record.source_time) || !zoned(record.receipt_time) || (record.server_time !== null && !zoned(record.server_time))) return null;
  const receipt = Date.parse(record.receipt_time), source = Date.parse(record.source_time);
  const server = record.server_time === null ? null : Date.parse(record.server_time);
  const fresh = record.freshness_basis === 'server' ? server : source;
  if (!Number.isFinite(receipt) || !Number.isFinite(source) || (server !== null && !Number.isFinite(server)) ||
      fresh === null || !Number.isFinite(fresh) || receipt > now + 2000 || now - receipt > 15000 ||
      source > receipt + 2000 || (server !== null && server > receipt + 2000) ||
      !Number.isInteger(record.sequence) || record.sequence < 0) return null;
  const age = (now - fresh) / 1000;
  return record.quality === 'good' && typeof record.value === 'number' && Number.isFinite(record.value) &&
    record.value >= binding.minimum && age >= -2 && age <= 15 ? record.value : null;
}
/** Refuse semantic/ordering violations before they can replace accepted connection state. */
export function acceptSnapshot(plant: Plant, rows: unknown, previous: Map<string, Observation>, now: number): Observation[] {
  if (!Array.isArray(rows) || rows.length > plant.tags.length) throw Error('Invalid observation collection');
  const ids = new Set<string>();
  const records = rows.map((r: Observation) => {
    const tag = r && plant.tags.find(t => t.tag_id === r.tag_id);
    if (!tag || tag.asset_id !== r.asset_id || tag.unit !== r.unit || ids.has(r.tag_id) ||
        typeof r.receipt_time !== 'string' || !Number.isFinite(Date.parse(r.receipt_time)) ||
        !Number.isInteger(r.sequence) || r.sequence < 0 || !['good','bad','uncertain'].includes(r.quality) ||
        !['source','server'].includes(r.freshness_basis) ||
        (r.source_time !== null && (typeof r.source_time !== 'string' || !Number.isFinite(Date.parse(r.source_time)))) ||
        (r.server_time !== null && (typeof r.server_time !== 'string' || !Number.isFinite(Date.parse(r.server_time)))) ||
        (r.value !== null && (typeof r.value !== 'number' || !Number.isFinite(r.value)))) throw Error('Invalid observation identity, unit or value');
    ids.add(r.tag_id);
    const last = previous.get(r.tag_id);
    if (last && (r.sequence <= last.sequence ||
        (r.source_time && last.source_time && Date.parse(r.source_time) < Date.parse(last.source_time)) ||
        (r.server_time && last.server_time && Date.parse(r.server_time) < Date.parse(last.server_time)))) throw Error('Out-of-order observation');
    return liveValue(r, now, plant) === null ? {...r, value: null, quality: 'bad' as const} : r;
  });
  for (const r of records) if (r.quality === 'good') previous.set(r.tag_id, r);
  return records;
}
export function assetState(asset: Asset, trace: Trace | null, step: number, method: string, live: Observation[] | null = null, now = Date.now(), plant?: Plant): Status {
  if (live !== null) { const records = live.filter(r => r.asset_id === asset.id); return plant && records.length && records.every(r => liveValue(r, now, plant) !== null) ? 'normal' : 'unavailable'; }
  if (!trace) return 'unavailable';
  const indices = channelIndices(trace, asset.id);
  if (!indices.length) return 'context';
  if (indices.some(i => snapshotValue(trace, step, method, i) === null)) return 'unavailable';
  const scores = trace.scores[method]?.[step];
  if (!scores || indices.some(i => scores[i] === null)) return 'unavailable';
  return indices.some(i => (scores[i] ?? 0) > 1) ? 'alarm' : 'normal';
}
export function safeStep(value: number, length: number) { return Math.max(0, Math.min(length - 1, Math.round(value))); }
export function formatValue(v: number | null | undefined, lang: string, digits = 2) { return typeof v === 'number' && Number.isFinite(v) ? v.toLocaleString(lang, { maximumFractionDigits: digits }) : (lang==='es'?'sin dato':'no data'); }
