import { it, expectTypeOf } from 'vitest';
import type { paths } from './contract.gen';
import type { CaseIndex, Plant, EngineEvidence } from './contract.types';
type Json<P extends keyof paths> = paths[P]['get'] extends {responses:{200:{content:{'application/json':infer B}}}}?B:never;
it('generated gateway responses match artifact aliases',()=>{expectTypeOf<Json<'/api/index'>>().toEqualTypeOf<CaseIndex>();expectTypeOf<Json<'/api/plant'>>().toEqualTypeOf<Plant>();expectTypeOf<Json<'/api/engines'>>().toEqualTypeOf<EngineEvidence>();});
