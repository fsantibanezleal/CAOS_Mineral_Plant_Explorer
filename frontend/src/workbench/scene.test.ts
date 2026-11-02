import { it, expect } from 'vitest';
import { validateGLTF, buildPlant } from './scene';
import * as T from 'three';
import graph from '../../../data/derived/plant.json';
import type { Plant } from '../lib/contract.types';
it('adversarial: external resources and unknown mappings are refused',()=>{
  expect(()=>validateGLTF({asset:{version:'2.0'},buffers:[{uri:'https://untrusted.invalid/a.bin'}]},graph as Plant)).toThrow('External');
  expect(()=>validateGLTF({asset:{version:'2.0'},nodes:[{extras:{assetId:'UNKNOWN'}}]},graph as Plant)).toThrow('Unknown');
  expect(()=>validateGLTF({asset:{version:'2.0'},nodes:[{extras:{assetId:'SAG'}}],accessors:[{count:3e6}]},graph as Plant)).toThrow('budget');
});
it('every scene asset has an exact graph identity and finite geometry',()=>{const root=buildPlant(graph as Plant);expect(root.children.map(c=>c.userData.assetId)).toEqual(graph.assets.map(a=>a.id));root.traverse(o=>{expect(o.position.toArray().every(Number.isFinite)).toBe(true);});});
it('adversarial: the reference scene has no floating status beacons and keeps the ROM pile low-relief',()=>{
  const plant=graph as Plant,root=buildPlant(plant),rom=root.children.find(child=>child.userData.assetId==='ROM')!;
  let beacons=0;root.traverse(object=>{if(object.userData.statusMarker)beacons++;});
  const bounds=new T.Box3().setFromObject(rom),size=bounds.getSize(new T.Vector3()),footprint=Math.min(...plant.assets.find(asset=>asset.id==='ROM')!.size);
  expect(beacons).toBe(0);
  expect(size.y).toBeLessThan(footprint*.42);
});
