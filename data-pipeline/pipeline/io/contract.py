"""Contract 1: reject malformed scenario inputs before any model executes."""
import math
import re
from dataclasses import dataclass

from ..cases.definitions import FAMILIES
from .schema import PlantParams


@dataclass
class ValidationReport:
    accepted:list
    rejected:list
    flagged:list
def validate_rows(rows):
    good=[];bad=[];flags=[]
    for i,row in enumerate(rows):
        identity = row.get('case_id',str(i)) if isinstance(row,dict) else str(i)
        try:
            row=dict(row)
            for key in ('seed','steps'):
                if key in row and isinstance(row[key],str):
                    if not row[key].isdigit():raise ValueError('invalid integer field')
                    row[key]=int(row[key])
            for key in ('severity','noise'):
                if key in row and isinstance(row[key],str):row[key]=float(row[key])
            p=PlantParams(**row)
            if p.family not in {f[0] for f in FAMILIES}:raise ValueError('unknown plant scenario')
            if isinstance(p.seed,bool) or not isinstance(p.seed,int) or not 0<=p.seed<2**32:raise ValueError('invalid seed')
            if not isinstance(p.case_id,str) or not re.fullmatch(r'[A-Za-z][A-Za-z0-9_-]{0,63}',p.case_id):raise ValueError('invalid case identity')
            if not all(isinstance(v,(float,int)) and not isinstance(v,bool) and math.isfinite(v) for v in (p.severity,p.noise)):raise ValueError('non-finite intensity')
            if not .1<=p.severity<=5 or not 0<=p.noise<=5 or not isinstance(p.steps,int) or not 100<=p.steps<=2000:raise ValueError('scenario outside declared envelope')
            good.append(p)
            if p.severity>2:flags.append({'row':i,'reason':'high synthetic disturbance intensity'})
        except (TypeError,ValueError) as exc:bad.append({'row':i,'case_id':identity,'reason':str(exc)})
    return ValidationReport(good,bad,flags)
