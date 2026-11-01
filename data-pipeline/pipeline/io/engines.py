"""Real CAOS engine consumers: released packages and immutable public artifacts.

Raw upstream files are cached outside this repository. A consumed artifact is
replay evidence from its own case; it is never relabeled current plant telemetry.
"""
from __future__ import annotations

import hashlib
import importlib.metadata
import json
import time
import urllib.request
from pathlib import Path

import numpy as np

PINNED={'minehaulsim':'0.12.1','bedblend':'0.7.3','milldem':'0.3.1','oreblocks':'0.6.6'}

def digest(raw: bytes) -> str:return hashlib.sha256(raw).hexdigest()

def select(document: dict,path: str):
    value=document
    for part in path.split('.'):
        value=value[int(part)] if isinstance(value,list) else value[part]
    if isinstance(value,bool) or not isinstance(value,(int,float)) or not np.isfinite(value):raise ValueError(f'not a finite numeric output: {path}')
    return float(value)

def consume_artifact(source: dict,raw: bytes) -> dict:
    if digest(raw)!=source['sha256'] or len(raw)!=source['bytes']:raise ValueError(f"source content changed: {source['id']}")
    document=json.loads(raw)
    if document.get('schema')!=source.get('schema'):raise ValueError('upstream schema version changed')
    return {'id':source['id'],'asset_id':source['asset_id'],'lane':'upstream_replay','source_url':source['source_url'],'commit':source['commit'],'source_sha256':source['sha256'],'version':source['version'],'license':source['license'],'provenance':source['provenance'],'metrics':[{**m,'value':select(document,m['path'])} for m in source['metrics']]}

def fetch_artifacts(lock: dict,cache_root: Path,*,offline=False) -> list[dict]:
    cache_root.mkdir(parents=True,exist_ok=True);results=[]
    for source in lock['sources']:
        path=cache_root/(source['sha256']+'.json')
        if not path.exists():
            if offline:raise FileNotFoundError(f"source cache missing: {source['id']}")
            prefix=f"https://raw.githubusercontent.com/fsantibanezleal/{source['id']}/{source['commit']}/"
            if len(source['commit'])!=40 or not source['url'].startswith(prefix):raise ValueError('unapproved source origin or unpinned commit')
            with urllib.request.urlopen(source['url'],timeout=40) as response:raw=response.read(8_000_001)
            if len(raw)>8_000_000:raise ValueError('upstream artifact exceeds declared input budget')
            consume_artifact(source,raw)
            path.write_bytes(raw)
        results.append(consume_artifact(source,path.read_bytes()))
    return results

def _version(name):
    actual=importlib.metadata.version(name)
    if actual!=PINNED[name]:raise ValueError(f'{name} version {actual}, expected {PINNED[name]}')
    return actual

def execute_packages(seed=7) -> list[dict]:
    """Execute each published API. Never import another app's private modules."""
    import bedblend as bb
    import milldem
    import minehaulsim as mh
    import oreblocks
    output=[]
    def record(package,asset,config,start,metrics,geometry=None):
        row={'id':package,'asset_id':asset,'version':_version(package),'lane':'executed_model','provenance':'seeded synthetic reference; not plant calibrated','license':'Apache-2.0' if package=='minehaulsim' else 'MIT','source_url':f'https://pypi.org/project/{package}/{PINNED[package]}/','seed':seed,'config':config,'metrics':[{'label':k,'value':float(v),'unit':u} for k,v,u in metrics],'elapsed_ms':(time.perf_counter()-start)*1000}
        if geometry is not None:row['geometry']=geometry
        row['result_sha256']=digest(json.dumps({k:v for k,v in row.items() if k!='elapsed_ms'},sort_keys=True,allow_nan=False).encode())
        output.append(row)
    start=time.perf_counter();spec=mh.generate_open_pit(seed=seed);run=spec.run(seed=seed,until_s=3600)
    record('minehaulsim','TRK',{'until_s':3600},start,[('Shift output',run.tonnes,'t'),('Completed cycles',run.cycles,'count'),('Truck wait',run.truck_wait_s,'s')])
    start=time.perf_counter();terrain=bb.Terrain.flat(40,40,3.0);plan=bb.rectangular_yard(n_areas=1,area_width_m=60,area_length_m=60,bench_height_m=6,n_benches=1,margin_m=25)
    fleet=bb.Fleet.of(2,bb.TruckSpec(),(10,90),repose_deg=37)
    loads=bb.payloads_from(bb.dig_sequence(n_loads=120,seed=seed),seed=seed)
    built=bb.build(terrain,plan,fleet,loads,repose_deg=37,seed=seed)
    record('bedblend','ROM',{'loads':120,'cell_m':3,'nx':40,'ny':40,'repose_deg':37},start,[('Accepted loads',len(built.placed),'count'),('Refusal rate',built.refusal_rate,'fraction'),('Peak height',max(built.terrain.z),'m')],{'nx':40,'ny':40,'cell_m':3,'heights_m':list(built.terrain.z)})
    start=time.perf_counter();cfg=milldem.MillConfig(diameter_m=3,ball_diameter_m=.3,phi_c=.75,fill=.3)
    result=milldem.simulate(cfg,sim_time=.75,seed=seed)
    record('milldem','SAG',{'diameter_m':3,'ball_diameter_m':.3,'phi_c':.75,'fill':.3,'sim_time_s':.75,'interpretation':'reduced-resolution 2D transient; no net-power prediction'},start,[('Toe',result.toe_deg,'deg'),('Shoulder',result.shoulder_deg,'deg')])
    start=time.perf_counter();twin=oreblocks.make_twin('porphyry',(8,8,5),seed=seed)
    record('oreblocks','PIT',{'archetype':'porphyry','dims':[8,8,5]},start,[('Ultimate pit value',twin.upit.pit_value,'USD'),('Extracted blocks',twin.upit.n_in_pit,'count')])
    return output
