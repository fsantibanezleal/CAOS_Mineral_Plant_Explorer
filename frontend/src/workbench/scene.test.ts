import { it, expect } from 'vitest';
import { validateGLTF, buildPlant } from './scene';
import graph from '../../../data/derived/plant.json';
import type { Plant } from '../lib/contract.types';
it('adversarial: external resources and unknown mappings are refused',()=>{
  expect(()=>validateGLTF({asset:{version:'2.0'},buffers:[{uri:'https://untrusted.invalid/a.bin'}]},graph as Plant)).toThrow('External');
  expect(()=>validateGLTF({asset:{version:'2.0'},nodes:[{extras:{assetId:'UNKNOWN'}}]},graph as Plant)).toThrow('Unknown');
  expect(()=>validateGLTF({asset:{version:'2.0'},nodes:[{extras:{assetId:'SAG'}}],accessors:[{count:3e6}]},graph as Plant)).toThrow('budget');
});
it('every scene asset has an exact graph identity and finite geometry',()=>{const root=buildPlant(graph as Plant);expect(root.children.map(c=>c.userData.assetId)).toEqual(graph.assets.map(a=>a.id));root.traverse(o=>{expect(o.position.toArray().every(Number.isFinite)).toBe(true);});});
