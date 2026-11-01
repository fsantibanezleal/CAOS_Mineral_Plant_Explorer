import { describe, it, expect } from 'vitest';
import { linked, liveValue, assetState, safeStep, acceptSnapshot, evidenceStep, snapshotValue } from './model';
import graph from '../../../data/derived/plant.json';
import trace from '../../../data/derived/PL-01/trace.json';
import type { Plant, Trace, Observation } from '../lib/contract.types';
const p=graph as Plant,t=trace as Trace,now=Date.parse('2026-10-31T12:00:00Z');
const r:Observation={tag_id:'ROM.feed',asset_id:'ROM',unit:'t/h',value:720,quality:'good',sequence:100,source_time:'2026-10-31T11:57:00Z',server_time:'2026-10-31T12:00:00Z',receipt_time:'2026-10-31T12:00:00Z',freshness_basis:'server'};
describe('connected plant state',()=>{
 it('withholds the whole aligned snapshot during common warmup',()=>{expect(evidenceStep(t,6,'tasc',5)).toBe(-1);expect(snapshotValue(t,6,'tasc',5)).toBeNull();expect(evidenceStep(t,6,'threshold',5)).toBe(6);expect(evidenceStep(t,14,'tasc',5)).toBe(8);});
 it('adversarial: keeps traversal bounded despite recirculation',()=>{const down=linked(p,'SAG','downstream');expect(down.has('CY1')).toBe(true);expect(down.has('SAG')).toBe(false);expect(down.size).toBeLessThan(p.assets.length);expect(safeStep(999,160)).toBe(159);});
 it('adversarial: keeps source change age separate from server confirmation',()=>{expect(liveValue(r,now,p)).toBe(720);expect(liveValue({...r,freshness_basis:'source'},now,p)).toBeNull();expect(liveValue({...r,value:0},now,p)).toBe(0);expect(liveValue(r,now+16000,p)).toBeNull();});
 it('adversarial: refuses wrong asset, unit and older delivery without overwriting history',()=>{for(const patch of [{asset_id:'SAG'},{unit:'MW'},{tag_id:'unknown'}]){expect(liveValue({...r,...patch},now,p)).toBeNull();expect(()=>acceptSnapshot(p,[{...r,...patch}],new Map(),now)).toThrow();}const previous=new Map();acceptSnapshot(p,[r],previous,now);expect(()=>acceptSnapshot(p,[{...r,sequence:99,value:721}],previous,now)).toThrow('Out-of-order');expect(previous.get(r.tag_id).value).toBe(720);});
 it('associates aligned scores with their actual evidence reading',()=>{const at=evidenceStep(t,80,'tasc',5);expect(at).toBe(74);expect(snapshotValue(t,80,'tasc',5)).toBe(t.observed[74][5]);const copy=structuredClone(t);copy.observed[74][5]=null;expect(assetState(p.assets.find(a=>a.id==='FL1')!,copy,80,'tasc')).toBe('unavailable');expect(assetState(p.assets[0],t,80,'tasc',[],now,p)).toBe('unavailable');});
});
