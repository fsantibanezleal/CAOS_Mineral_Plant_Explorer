import pytest
from pipeline.core.expect import ExpectationError, check


def test_a_value_outside_its_range_is_named():
    with pytest.raises(ExpectationError,match='closure'):
        check('PL',{'closure':(-1e-9,1e-9)},{'closure':.01})

def test_adversarial_a_case_without_expectations_or_with_an_unknown_metric_fails():
    with pytest.raises(ExpectationError):
        check('PL',{}, {})
    with pytest.raises(ExpectationError):
        check('PL',{'closure':(0,1)},{'closure':float('nan')})
    with pytest.raises(ExpectationError):
        check('PL',{'closure':(0,1)},{'other':0})
