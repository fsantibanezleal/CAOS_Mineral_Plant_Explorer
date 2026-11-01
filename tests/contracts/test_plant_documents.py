"""Producer contracts, immutable evidence, dimensional consistency and provider swap."""
import copy
import hashlib
import json
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator
from openapi_spec_validator import validate

ROOT=Path(__file__).resolve().parents[2]
def read(path):return json.loads(path.read_text(encoding='utf-8'))
def check(name,doc):Draft202012Validator(read(ROOT/f'docs/contracts/schemas/{name}.schema.json')).validate(doc)

@pytest.mark.parametrize('relative',['data/derived','docs/contracts/fixtures/data/derived'])
def test_exported_plant_documents_and_provider_swap(relative):
    root=ROOT/relative
    index=read(root/'manifests/index.json');check('case-index',index)
    assert index['n_cases']==len(index['cases'])
    graph=read(root/'plant.json');check('plant-graph',graph)
    assets={a['id'] for a in graph['assets']}
    for e in index['cases']:
        m=read(root/e['manifest_path']);check('case-manifest',m)
        raw=(root/m['artifact']['path']).read_bytes()
        assert len(raw)==m['artifact']['bytes'] and hashlib.sha256(raw).hexdigest()==m['artifact']['sha256']
        trace=json.loads(raw);check('trace',trace)
        assert trace['case_id']==m['case_id']==e['case_id']
        assert all(c['asset_id'] in assets for c in trace['channels'])
        for name in ['observed','valid','truth','fault','estimate']:
            assert len(trace[name])==len(trace['time_s'])
            assert all(len(row)==len(trace['channels']) for row in trace[name])
    for name,file in [('engine-evidence','engine-evidence.json'),('state-model','state-model.json'),('readiness','readiness.json')]:check(name,read(root/file))

def test_adversarial_malformed_trace_and_extra_field_refused():
    trace=read(ROOT/'data/derived/PL-01/trace.json')
    bad=copy.deepcopy(trace);bad['observed'][1][0]='bad'
    with pytest.raises(Exception):check('trace',bad)
    bad=copy.deepcopy(trace);bad['undeclared']=True
    with pytest.raises(Exception):check('trace',bad)

def test_openapi_is_valid_and_only_read_only_operations():
    api=read(ROOT/'docs/contracts/api.openapi.json');validate(api, base_uri=(ROOT / "docs/contracts/api.openapi.json").as_uri())
    assert all(set(path)=={'get'} for path in api['paths'].values())

def test_model_seeds_never_overlap_benchmark():
    protocol=read(ROOT/'data/derived/benchmark.json')['protocol']
    train=set(protocol['train_seeds']);test=set(protocol['test_seeds'])
    assert not train&test
    assert not test&set(protocol['forecast_calibration_seeds'])
    assert not test&set(protocol['state_calibration_seeds'])
