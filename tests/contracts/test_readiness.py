import shutil
from pathlib import Path

from pipeline.core.readiness import compute

ROOT=Path(__file__).resolve().parents[2]

def test_adversarial_missing_trace_produces_partial_state(tmp_path):
    out=tmp_path/'derived';shutil.copytree(ROOT/'data/derived',out)
    (out/'PL-01/trace.json').unlink()
    doc=compute(repo_root=ROOT,derived_root=out,models_dir=tmp_path/'models')
    row=next(r for r in doc['contracts'] if r['id']=='trace')
    assert row['state']=='partial' and 'PL-01/trace.json' in row['missing']

def test_missing_index_is_never_an_available_result(tmp_path):
    doc=compute(repo_root=ROOT,derived_root=tmp_path,models_dir=tmp_path/'models')
    assert all(r['state']=='missing' for r in doc['contracts'] if r['id'] in ['case-index','case-manifest','trace'])
