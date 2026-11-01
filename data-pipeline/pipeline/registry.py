"""The connected plant's deterministic case registry."""
from .cases.plant_cases import CASES, DEFAULT_CASE


def list_cases():return list(CASES)
def get_case(case_id):
    for case in CASES:
        if case.id==case_id:return case
    raise KeyError(case_id)
def default_case():return DEFAULT_CASE
def list_categories():
    out={}
    for c in CASES:out.setdefault(c.category['en'],[]).append(c.id)
    return out
