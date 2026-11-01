import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {copperRoute,conversion} from './process';
const reference=JSON.parse(readFileSync(new URL('../../../data/derived/downstream.json',import.meta.url),'utf8'));
it('browser route agrees with the independent Python bake',()=>{const r=copperRoute();expect(r.dissolved).toBeCloseTo(reference.leach.dissolved_copper_kg_h,2);expect(r.transferred).toBeCloseTo(reference.sx.transferred_copper_kg_h,2);expect(r.cathode).toBeCloseTo(reference.ew.cathode_kg_h,2);expect(r.power).toBe(reference.ew.power_kw);});
it('adversarial: conservation and limiting cases survive parameter changes',()=>{for(const tau of [.5,2,6,20])for(const current of [0,200,1000]){const r=copperRoute(tau,current,100);expect(r.dissolved+r.residue).toBeCloseTo(r.feed,9);expect(r.cathode).toBeLessThanOrEqual(r.transferred);expect(r.acidUsed).toBeLessThanOrEqual(100+1e-8);}expect(copperRoute(6,0).cathode).toBe(0);expect(()=>copperRoute(NaN)).toThrow();expect(()=>copperRoute(100)).toThrow();expect(conversion(0)).toBeCloseTo(0,8);});
