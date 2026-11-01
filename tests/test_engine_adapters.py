import hashlib
import json
from pathlib import Path

import pytest
from pipeline.io.engines import consume_artifact, select


def test_immutable_artifact_adapter_and_metric_path():
    raw=json.dumps({'schema':'engine/v1','result':{'recovery':92.1}}).encode()
    source={'id':'test','schema':'engine/v1','bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'asset_id':'FL1','source_url':'https://example.org/source','commit':'a'*40,'version':'1.0','license':'MIT','provenance':'synthetic','metrics':[{'path':'result.recovery','label':'Recovery','unit':'%'}]}
    assert consume_artifact(source,raw)['metrics'][0]['value']==92.1
    with pytest.raises(ValueError):consume_artifact(source,raw+b' ')
    with pytest.raises(ValueError):select({'x':True},'x')
    with pytest.raises(ValueError):select({'x':float('nan')},'x')

def test_source_lock_is_public_immutable_and_asset_bound():
    lock=json.loads((Path(__file__).resolve().parents[1]/'data/sources/engines.lock.json').read_text())
    assert len(lock['sources'])==10
    for source in lock['sources']:
        assert len(source['sha256'])==64 and len(source['commit'])==40
        assert source['url'].startswith('https://raw.githubusercontent.com/fsantibanezleal/')
        assert source['asset_id'] and source['metrics']
