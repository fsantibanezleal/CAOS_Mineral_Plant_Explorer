"""Typed operating/scenario inputs, separate from observations and artifacts."""
from dataclasses import dataclass


@dataclass(frozen=True)
class PlantParams:
    case_id:str
    family:str
    seed:int=1000
    severity:float=1.0
    noise:float=1.0
    steps:int=160
