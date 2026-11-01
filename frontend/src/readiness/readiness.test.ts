import { it, expect } from 'vitest';
import { behavior, viewState, isUnavailable } from './readiness';
import type { Readiness } from '../lib/contract.types';
it('adversarial: a missing trace cannot show a healthy result',()=>{const d={schema:'orebridge.readiness/v1',product_version:__APP_VERSION__,catalog_sha256:'0'.repeat(64),contracts:[{id:'trace',version:'2.0.0',status:'real',provenance:null,state:'missing',reason:{en:'Missing trace',es:'Traza ausente'},missing:['PL-01/trace.json']}]} as Readiness;expect(viewState(d,['trace']).state).toBe('missing');expect(isUnavailable(d,'PL-01/trace.json')).toBe(true);expect(behavior('missing').showsResult).toBe(false);});
