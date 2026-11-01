"""Named product stages from immutable source evidence to validated visual replay."""
from __future__ import annotations

import hashlib
import importlib.metadata
import json
from dataclasses import asdict
from pathlib import Path

import joblib
import numpy as np

from .. import registry
from ..io.contract import validate_rows
from ..io.engines import execute_packages, fetch_artifacts
from ..io.formats import write_json
from ..model.hydromet import acid_limited_extraction, cstr_conversion, electrowinning, solvent_extraction
from ..model.learning import fit_normal
from ..model.plant import reference_plant, validate_graph
from ..model.scenarios import channel_specs, generate
from ..model.thickener import simulate_thickener
from .plant_evaluate import benchmark, calibrate, evaluate_one

ROOT=Path(__file__).resolve().parents[3]
VERSION=(ROOT/'VERSION').read_text().strip()

def clean(value):
    if isinstance(value,np.ndarray):return clean(value.tolist())
    if isinstance(value,(np.integer,)):return int(value)
    if isinstance(value,(float,np.floating)):return round(float(value),7) if np.isfinite(value) else None
    if isinstance(value,dict):return {str(k):clean(v) for k,v in value.items()}
    if isinstance(value,(tuple,list)):return [clean(v) for v in value]
    return value

def sources(output:Path,cache:Path):
    lock=json.loads((ROOT/'data/sources/engines.lock.json').read_text(encoding='utf-8'))
    rows=fetch_artifacts(lock,cache)+execute_packages()
    obj={'schema':'orebridge.engine-evidence/v1','records':rows,'unavailable':lock['unavailable']}
    write_json(output/'engine-evidence.json',clean(obj));return obj

def train(models:Path):
    models.mkdir(parents=True,exist_ok=True);bundle=fit_normal()
    joblib.dump(bundle,models/'forecast-model.joblib',compress=3)
    summary={k:clean(v) for k,v in bundle.items() if k!='model'}
    summary.update({'schema':'orebridge.state-model/v1','algorithm':'scikit-learn HistGradientBoostingRegressor, causal multichannel lags','checkpoint':'forecast-model.joblib','checkpoint_sha256':hashlib.sha256((models/'forecast-model.joblib').read_bytes()).hexdigest(),'environment':{p:importlib.metadata.version(p) for p in ['numpy','scipy','scikit-learn','joblib']}})
    return bundle,summary

def _trace(case,bundle,thresholds,seed=1000,severity=1):
    report=validate_rows([{'case_id':case.id,'family':case.family,'seed':seed,'severity':severity}])
    if report.rejected:raise ValueError(report.rejected)
    params=report.accepted[0];scenario=generate(params.family,params.seed,params.severity,params.steps)
    rows,result,elapsed=evaluate_one(scenario,bundle,thresholds)
    methods={}
    for name,r in result.items():
        scores=np.full(scenario.observed.shape,np.nan);scores[14:]=r['scores']/thresholds[name]
        methods[name]=scores
    estimate=np.full(scenario.observed.shape,np.nan)
    if result['tasc']['estimate'] is not None:estimate[14:]=result['tasc']['estimate']
    return clean({'schema':'orebridge.trace/v1','case_id':case.id,'family':case.family,'provenance':'authored_synthetic_known_truth','time_origin':'2026-10-31T12:00:00Z','time_s':np.arange(params.steps),'channels':channel_specs(),'observed':scenario.observed,'valid':scenario.valid,'truth':scenario.truth,'fault':scenario.fault,'quality_reasons':scenario.reasons,'scores':methods,'estimate':estimate,'metrics':rows,'threshold':thresholds,'elapsed_ms':elapsed}),asdict(params)

def export_case(case,output:Path,bundle,thresholds,*,seed=1000,severity=1):
    trace,params=_trace(case,bundle,thresholds,seed,severity)
    path=f'{case.id}/trace.json';size=write_json(output/path,trace);raw=(output/path).read_bytes()
    manifest={'schema':'orebridge.manifest/v1','case_id':case.id,'title':case.title,'category':case.category,'seed':seed,'params':params,'engine':'OreBridge state coherence','engine_version':VERSION,'real_or_synthetic':'synthetic','expected_band':{'en':'Known-truth disturbance; numeric results are replayed, not plant forecasts.','es':'Perturbación de verdad conocida; resultados reproducidos, no pronósticos de planta.'},'artifact':{'path':path,'format':'json','trace_schema':'orebridge.trace/v1','bytes':size,'sha256':hashlib.sha256(raw).hexdigest()},'lane':'replay','gate':{'lane':'replay','pure_python':True,'input_contract':True,'scientific_replay':True},'metrics':trace['metrics']}
    write_json(output/f'manifests/{case.id}.json',manifest)
    return {'case_id':case.id,'title':case.title,'category':case.category,'manifest_path':f'manifests/{case.id}.json'}

def run_all(output:Path,models:Path,*,train_model=True,full_benchmark=False,engine_file:Path|None=None):
    output.mkdir(parents=True,exist_ok=True);graph=reference_plant();validate_graph(graph)
    if train_model:bundle,summary=train(models)
    else:
        checkpoint=models/'forecast-model.joblib'
        if not checkpoint.exists():raise FileNotFoundError('real forecast checkpoint absent; --no-train never substitutes a fake model')
        bundle=joblib.load(checkpoint);summary={'schema':'orebridge.state-model/v1','algorithm':'scikit-learn histogram gradient boosting','checkpoint_sha256':hashlib.sha256(checkpoint.read_bytes()).hexdigest(),'train_seeds':bundle['train_seeds'],'calibration_seeds':bundle['calibration_seeds']}
    thresholds=calibrate(bundle);write_json(output/'state-model.json',clean(summary))
    evidence=engine_file or output/'engine-evidence.json'
    if not evidence.exists():raise FileNotFoundError('engine evidence absent: run sources with an external cache root first')
    engines=json.loads(evidence.read_text(encoding='utf-8'))
    if len(engines['records'])<14:raise ValueError('incomplete real engine adapter matrix')
    write_json(output/'engine-evidence.json',clean(engines));write_json(output/'plant.json',graph)
    leach=acid_limited_extraction(100,.005,cstr_conversion(6,2,4),700)
    sx=solvent_extraction(150,leach['dissolved_copper_kg_h']/150,120,2)
    ew=electrowinning(400000,.92,2.1,sx['transferred_copper_kg_h'])
    write_json(output/'downstream.json',clean({'schema':'orebridge.downstream/v1','leach':leach,'sx':sx,'ew':ew,'thickener':simulate_thickener(),'provenance':'bounded authored process reference; not plant calibrated'}))
    entries=[export_case(c,output,bundle,thresholds) for c in registry.list_cases()]
    result=benchmark(bundle,thresholds,seeds=range(1000,1016) if full_benchmark else range(1000,1002),severities=(.5,1,2,4) if full_benchmark else (1,))
    write_json(output/'benchmark.json',clean(result))
    files=['plant.json','engine-evidence.json','downstream.json','benchmark.json','state-model.json','readiness.json']
    index={'schema':'orebridge.index/v1','engine_version':VERSION,'n_cases':len(entries),'default_case':registry.default_case(),'cases':entries,'files':files}
    write_json(output/'manifests/index.json',index)
    from ..core import readiness
    doc=readiness.compute(repo_root=ROOT,derived_root=output,models_dir=ROOT/'models');readiness.write(output,doc)
    validate(output)
    return entries

def validate(output:Path):
    graph=json.loads((output/'plant.json').read_text(encoding='utf-8'));validate_graph(graph)
    index=json.loads((output/'manifests/index.json').read_text(encoding='utf-8'))
    for entry in index['cases']:
        manifest=json.loads((output/entry['manifest_path']).read_text(encoding='utf-8'));artifact=manifest['artifact'];raw=(output/artifact['path']).read_bytes()
        if len(raw)!=artifact['bytes'] or hashlib.sha256(raw).hexdigest()!=artifact['sha256']:raise ValueError('case artifact byte/hash drift')
        trace=json.loads(raw)
        if np.shape(trace['observed'])!=(160,16):raise ValueError('scenario matrix incomplete')
    b=json.loads((output/'benchmark.json').read_text(encoding='utf-8'))
    count=12*len(b['protocol']['test_seeds'])*len(b['protocol']['severity'])*8
    if len(b['rows'])!=count:raise ValueError('benchmark matrix has missing method/case cells')
    print(f'validated {len(index["cases"])} plant scenarios and {count} benchmark cells',flush=True)
