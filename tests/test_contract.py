from pipeline.io.contract import validate_rows


def test_good_rows_accepted():
    report=validate_rows([{'case_id':'PL-01','family':'healthy','seed':'1000','severity':'1','noise':'1','steps':'160'}])
    assert len(report.accepted)==1 and not report.rejected

def test_adversarial_bad_rows_rejected_not_coerced():
    rows=[None,{}, {'case_id':'../escape','family':'healthy'}, {'case_id':'bad','family':'unknown'}, {'case_id':'bad','severity':float('nan')},{'case_id':'bad','seed':True},{'case_id':'bad','steps':10}]
    report=validate_rows(rows)
    assert len(report.rejected)==len(rows) and not report.accepted
    assert all(r['reason'] for r in report.rejected)

def test_outlier_flagged_but_accepted():
    report=validate_rows([{'case_id':'hot','family':'healthy','severity':4}])
    assert len(report.accepted)==1 and report.flagged
