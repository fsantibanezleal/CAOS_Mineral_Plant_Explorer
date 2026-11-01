import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { describe, it, expect } from 'vitest';
const repo=new URL('../../../',import.meta.url);
const read=(path:string)=>JSON.parse(readFileSync(new URL(path,repo),'utf8'));
const ajv=new Ajv2020({strict:false,allErrors:true});addFormats(ajv);
export function validate(name:string,value:unknown){const schema=read(`docs/contracts/schemas/${name}.schema.json`);const fn=ajv.getSchema(schema.$id)??ajv.compile(schema);return {valid:fn(value),errors:fn.errors};}
describe('plant document consumers',()=>{
 it('the index conforms and names a baked default case',()=>{const index=read('data/derived/manifests/index.json');expect(validate('case-index',index).errors).toBeNull();expect(index.cases.some((c:{case_id:string})=>c.case_id===index.default_case)).toBe(true);});
 for(const tree of ['data/derived','docs/contracts/fixtures/data/derived']){
  it(`manifest and trace conform: ${tree}`,()=>{const index=read(`${tree}/manifests/index.json`);for(const c of index.cases){const m=read(`${tree}/${c.manifest_path}`);expect(validate('case-manifest',m).errors).toBeNull();const bytes=readFileSync(new URL(`${tree}/${m.artifact.path}`,repo));expect(bytes.length).toBe(m.artifact.bytes);expect(createHash('sha256').update(bytes).digest('hex')).toBe(m.artifact.sha256);expect(validate('trace',JSON.parse(bytes.toString())).errors).toBeNull();}});
 }
 it('adversarial: missing channel and altered value are rejected',()=>{const t=read('data/derived/PL-01/trace.json');t.channels=[];expect(validate('trace',t).valid).toBe(false);t.observed[1][0]='not-a-number';expect(validate('trace',t).valid).toBe(false);});
 it('graph, evidence and model are real declared artifacts',()=>{for(const [schema,path] of [['plant-graph','plant.json'],['engine-evidence','engine-evidence.json'],['state-model','state-model.json'],['state-model','state-model-ridge.json'],['learned-comparison','learned-comparison.json'],['readiness','readiness.json']]){expect(existsSync(new URL(`data/derived/${path}`,repo))).toBe(true);expect(validate(schema,read(`data/derived/${path}`)).errors).toBeNull();}});
});
