"""Read-only, allow-listed OPC UA observation adapter for a site-local gateway."""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import sys
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import urlparse

ROOT=Path(__file__).resolve().parents[1]
if str(ROOT/'data-pipeline') not in sys.path:sys.path.insert(0,str(ROOT/'data-pipeline'))
from pipeline.model.observations import validate_observation


@dataclass(frozen=True)
class GatewayConfig:
    endpoint:str|None=None
    token:str|None=None
    bindings:tuple[dict,...]=()
    origins:tuple[str,...]=('http://localhost:5173',)
    security_string:str|None=None
    allow_local_test:bool=False
    max_age_s:float=15

    @classmethod
    def from_env(cls):
        binding_file=os.environ.get('OREBRIDGE_TAG_MAP')
        bindings=tuple(json.loads(Path(binding_file).read_text(encoding='utf-8'))) if binding_file else ()
        return cls(endpoint=os.environ.get('OREBRIDGE_OPC_ENDPOINT'),token=os.environ.get('OREBRIDGE_GATEWAY_TOKEN'),bindings=bindings,origins=tuple(x.strip() for x in os.environ.get('OREBRIDGE_ORIGINS','http://localhost:5173').split(',') if x.strip()),security_string=os.environ.get('OREBRIDGE_OPC_SECURITY'),allow_local_test=os.environ.get('OREBRIDGE_ALLOW_LOCAL_TEST')=='1')

    def validate(self):
        if not self.endpoint or not self.bindings:raise ValueError('source_not_configured')
        if not self.token or len(self.token)<24:raise ValueError('gateway_token_too_short')
        host=urlparse(self.endpoint).hostname
        if urlparse(self.endpoint).scheme!='opc.tcp':raise ValueError('unsupported_opc_transport')
        local=host in ('localhost','127.0.0.1','::1')
        secure = self.security_string and self.security_string.split(',')[:2] in [
            ['Basic256Sha256', 'SignAndEncrypt'], ['Aes128Sha256RsaOaep', 'SignAndEncrypt'], ['Aes256Sha256RsaPss', 'SignAndEncrypt']]
        if not secure and not (local and self.allow_local_test):raise ValueError('signed_encrypted_source_required')
        if len(self.bindings)>2000:raise ValueError('tag_budget_exceeded')
        ids=[r['tag_id'] for r in self.bindings]
        if len(set(ids))!=len(ids):raise ValueError('duplicate_tag_binding')
        if '*' in self.origins:raise ValueError('wildcard_gateway_origin_forbidden')
        assets={a['id'] for a in json.loads((ROOT/'data/derived/plant.json').read_text(encoding='utf-8'))['assets']} if (ROOT/'data/derived/plant.json').exists() else set()
        for r in self.bindings:
            if not r.get('node_id') or not r.get('unit') or not r.get('asset_id'):raise ValueError('incomplete_tag_binding')
            if assets and r['asset_id'] not in assets:raise ValueError('unknown_plant_asset')

class OPCReader:
    def __init__(self,config:GatewayConfig):
        config.validate();self.config=config;self.sequence=0;self.previous={}

    async def read(self):
        from asyncua import Client
        client=Client(url=self.config.endpoint,timeout=5)
        if self.config.security_string:await client.set_security_string(self.config.security_string)
        self.sequence+=1;records=[]
        async with client:
            for binding in self.config.bindings:
                # The node is created only from the local allow-list, never a browser argument.
                dv=await client.get_node(binding['node_id']).read_data_value()
                now=datetime.now(UTC).isoformat();source=dv.SourceTimestamp
                record={'tag_id':binding['tag_id'],'asset_id':binding['asset_id'],'value':dv.Value.Value,'unit':binding['unit'],'source_time':source.isoformat() if source else now,'receipt_time':now,'sequence':self.sequence,'quality':'good' if dv.StatusCode.is_good() and source else 'uncertain'}
                verdict=validate_observation(record,binding,now,self.previous.get(binding['tag_id']),max_age_s=self.config.max_age_s)
                if verdict.accepted:self.previous[binding['tag_id']]=record
                else:record={**record,'value':None,'quality':'bad'}
                records.append(record)
        return records

def token_matches(provided:str|None,expected:str|None):
    if not provided or not expected:return False
    return hmac.compare_digest(hashlib.sha256(provided.encode()).digest(),hashlib.sha256(expected.encode()).digest())
