"""Authored copper-complex asset graph shared by the spatial and process views.

Coordinates are metres, with Y vertical. This is a synthetic engineering layout,
not the geometry or operating data of a named mine. Different ore routes remain
distinct: sulfide feed enters the concentrator; oxide feed may enter leaching.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from math import isfinite

from .tags import CHANNELS


@dataclass(frozen=True)
class Asset:
    id: str
    name: dict[str, str]
    stage: str
    kind: str
    position: tuple[float, float, float]
    size: tuple[float, float, float]
    description: dict[str, str]


@dataclass(frozen=True)
class Stream:
    id: str
    source: str
    target: str
    material: str
    nominal: float
    unit: str
    delay_s: float


def reference_plant() -> dict:
    rows = [
        (
            "PIT",
            "Ore source",
            "Fuente de mineral",
            "extraction",
            "pit",
            (-125, 0, -20),
            (44, 18, 42),
            "Authored stepped pit; geological context only.",
            "Rajo escalonado de referencia; solo contexto geológico.",
        ),
        (
            "SHV",
            "Loading shovel",
            "Pala de carguío",
            "extraction",
            "shovel",
            (-106, 0, 3),
            (7, 7, 7),
            "MineHaul equipment context, no OEM calibration.",
            "Contexto de equipo MineHaul sin calibración de fabricante.",
        ),
        (
            "TRK",
            "Haul truck",
            "Camión de extracción",
            "extraction",
            "truck",
            (-94, 0, 4),
            (8, 5, 4),
            "A vehicle links the source and run-of-mine stockpile.",
            "Un vehículo conecta la fuente y el acopio de mineral.",
        ),
        (
            "ROM",
            "Run-of-mine stockpile",
            "Acopio de mineral",
            "stockpiling",
            "stockpile",
            (-75, 0, 0),
            (31, 13, 26),
            "Authored stockpile geometry; actual BedBlend terrain and load outputs retain their separate case identity.",
            "Geometría de acopio de referencia; el terreno y las cargas de BedBlend conservan su identidad de caso.",
        ),
        (
            "CV1",
            "Primary feed conveyor",
            "Correa de alimentación",
            "crushing",
            "conveyor",
            (-55, 0, 0),
            (23, 4, 3),
            "Moving material is an animated synthetic stream, not a measured belt image.",
            "El material animado es una corriente sintética, no una imagen de correa medida.",
        ),
        (
            "CR1",
            "Gyratory crusher",
            "Chancador giratorio",
            "crushing",
            "crusher",
            (-40, 0, 0),
            (10, 12, 10),
            "Mantle, bowl, feed hopper and discharge support a crusher context.",
            "Manto, taza, tolva y descarga representan el contexto del chancador.",
        ),
        (
            "SC1",
            "Sizing screen",
            "Harnero de clasificación",
            "crushing",
            "screen",
            (-25, 0, -8),
            (11, 5, 7),
            "Oversize returns to the secondary crushing circuit.",
            "El sobretamaño retorna al circuito de chancado secundario.",
        ),
        (
            "CR2",
            "Secondary cone crusher",
            "Chancador de cono",
            "crushing",
            "crusher",
            (-24, 0, 14),
            (7, 9, 7),
            "Closed crushing loop, distinct from the primary crusher.",
            "Lazo cerrado de chancado distinto del chancador primario.",
        ),
        (
            "BIN",
            "Mill feed bin",
            "Tolva de molienda",
            "grinding",
            "bin",
            (-7, 0, 0),
            (8, 12, 8),
            "Inventory buffers feed variations; instantaneous steady balance is not assumed.",
            "El inventario amortigua cambios; no se supone balance estacionario instantáneo.",
        ),
        (
            "SAG",
            "SAG mill",
            "Molino SAG",
            "grinding",
            "mill",
            (10, 0, 0),
            (16, 11, 11),
            "Grinding circuit proxy: fresh SAG feed plus ball-mill recycle. MillDEM gives charge geometry; OreFlow gives reference power.",
            "Referencia del circuito SAG y bolas: MillDEM aporta geometría de carga y OreFlow potencia de referencia.",
        ),
        (
            "BAL",
            "Ball mill",
            "Molino de bolas",
            "grinding",
            "mill",
            (12, 0, 18),
            (15, 8, 8),
            "Secondary grinding receives cyclone underflow.",
            "La molienda secundaria recibe la descarga inferior de ciclones.",
        ),
        (
            "PU1",
            "Cyclone feed pump",
            "Bomba de ciclones",
            "grinding",
            "pump",
            (29, 0, 8),
            (5, 4, 4),
            "Pump state and motor condition remain separate evidence channels.",
            "Estado de bomba y condición del motor son canales separados.",
        ),
        (
            "CY1",
            "Cyclone cluster",
            "Batería de ciclones",
            "grinding",
            "cyclone",
            (38, 0, 8),
            (8, 12, 8),
            "Overflow feeds flotation; underflow returns to the ball mill.",
            "El rebalse alimenta flotación y la descarga retorna al molino.",
        ),
        (
            "FL1",
            "Rougher flotation bank",
            "Banco de flotación rougher",
            "flotation",
            "flotation",
            (59, 0, 0),
            (24, 6, 11),
            "Connected cell bank with size, grade, froth and water context.",
            "Banco de celdas con contexto de tamaño, ley, espuma y agua.",
        ),
        (
            "FL2",
            "Cleaner flotation bank",
            "Banco de limpieza",
            "flotation",
            "flotation",
            (61, 0, 20),
            (18, 5, 8),
            "Cleaner concentrate and tail streams remain distinct.",
            "El concentrado y la cola de limpieza permanecen distintos.",
        ),
        (
            "RGM",
            "Regrind mill",
            "Molino de remolienda",
            "flotation",
            "mill",
            (81, 0, 20),
            (8, 6, 6),
            "Optional regrind context; model applicability is checked per source.",
            "Contexto de remolienda; se verifica la aplicabilidad del modelo.",
        ),
        (
            "CTH",
            "Concentrate thickener",
            "Espesador de concentrado",
            "thickening",
            "thickener",
            (97, 0, 9),
            (19, 8, 19),
            "Clarified water returns to process water; solids report to filtration.",
            "El agua retorna al proceso y los sólidos pasan a filtración.",
        ),
        (
            "FIL",
            "Concentrate filter",
            "Filtro de concentrado",
            "thickening",
            "filter",
            (117, 0, 9),
            (11, 6, 8),
            "Filter cake and filtrate are explicitly different streams.",
            "La torta y el filtrado son corrientes explícitamente distintas.",
        ),
        (
            "CON",
            "Concentrate storage",
            "Almacén de concentrado",
            "refining",
            "warehouse",
            (135, 0, 9),
            (16, 9, 13),
            "Saleable concentrate boundary; no smelter is implied.",
            "Límite de concentrado comercial; no implica una fundición.",
        ),
        (
            "TTH",
            "Tailings thickener",
            "Espesador de relaves",
            "thickening",
            "thickener",
            (81, 0, -32),
            (28, 9, 28),
            "Settling and water-recovery context, not facility stability assurance.",
            "Contexto de sedimentación y recuperación de agua, no garantía de estabilidad.",
        ),
        (
            "PU2",
            "Return water pump",
            "Bomba de agua recuperada",
            "utilities",
            "pump",
            (50, 0, -29),
            (5, 4, 4),
            "Return water enters the shared process-water tank.",
            "El agua recuperada ingresa al estanque de agua de proceso.",
        ),
        (
            "PWT",
            "Process water tank",
            "Estanque de agua de proceso",
            "utilities",
            "tank",
            (27, 0, -28),
            (13, 11, 13),
            "Inventory and water supply are time-dependent state variables.",
            "Inventario y suministro de agua son variables de estado temporales.",
        ),
        (
            "MWT",
            "Make-up water",
            "Agua de reposición",
            "utilities",
            "tank",
            (6, 0, -29),
            (10, 9, 10),
            "Make-up water is separately metered from recycled water.",
            "El agua de reposición se mide por separado del agua reciclada.",
        ),
        (
            "HEP",
            "Oxide leach heap",
            "Pila de lixiviación de óxidos",
            "leaching",
            "heap",
            (-48, 0, 48),
            (48, 10, 30),
            "Oxide route bypasses the sulfide flotation bank.",
            "La ruta de óxidos no atraviesa el banco de flotación de sulfuros.",
        ),
        (
            "LCH",
            "Agitated leach tanks",
            "Estanques de lixiviación",
            "leaching",
            "leach",
            (-5, 0, 48),
            (24, 11, 14),
            "Residence-time and acid-limited reaction model; no mineral-general kinetics.",
            "Modelo de residencia y reacción limitada por ácido; no cinética universal.",
        ),
        (
            "PLS",
            "Pregnant solution pond",
            "Piscina de solución rica",
            "leaching",
            "pond",
            (22, 0, 50),
            (21, 3, 19),
            "Solution inventory carries dissolved copper rather than solids grade.",
            "El inventario contiene cobre disuelto, no ley de sólidos.",
        ),
        (
            "SX1",
            "Solvent extraction",
            "Extracción por solventes",
            "refining",
            "sx",
            (47, 0, 50),
            (21, 5, 16),
            "Mixer-settlers with explicit aqueous and organic phase flows.",
            "Mezcladores decantadores con caudales acuosos y orgánicos explícitos.",
        ),
        (
            "SX2",
            "Stripping stage",
            "Etapa de reextracción",
            "refining",
            "sx",
            (74, 0, 50),
            (16, 5, 13),
            "Stripping links the organic circuit and electrolyte.",
            "La reextracción conecta el circuito orgánico y el electrolito.",
        ),
        (
            "EW1",
            "Electrowinning cells",
            "Celdas de electroobtención",
            "refining",
            "electrowin",
            (99, 0, 50),
            (22, 6, 16),
            "Copper deposition follows Faraday charge accounting.",
            "La deposición de cobre sigue el balance de carga de Faraday.",
        ),
        (
            "CAT",
            "Copper cathode",
            "Cátodo de cobre",
            "refining",
            "cathode",
            (124, 0, 50),
            (9, 4, 8),
            "Cathode is an independent product boundary from concentrate.",
            "El cátodo es un producto independiente del concentrado.",
        ),
        (
            "RAF",
            "Raffinate pond",
            "Piscina de refino",
            "leaching",
            "pond",
            (45, 0, 74),
            (22, 3, 16),
            "Raffinate returns to the leach irrigation loop.",
            "El refino retorna al riego de lixiviación.",
        ),
        (
            "ACD",
            "Acid storage",
            "Almacenamiento de ácido",
            "utilities",
            "tank",
            (-7, 0, 74),
            (10, 10, 10),
            "Chemical consumption is scenario input, not an operating prescription.",
            "El consumo químico es entrada de escenario, no una prescripción operativa.",
        ),
        (
            "TSF",
            "Tailings facility",
            "Depósito de relaves",
            "tailings",
            "tailings",
            (119, 0, -45),
            (55, 9, 40),
            "Authored embankment and water surface with read-only monitoring context.",
            "Muro y superficie de agua de referencia con monitoreo de lectura.",
        ),
        (
            "MON",
            "Tailings instrument",
            "Instrumento de relaves",
            "tailings",
            "sensor",
            (104, 0, -66),
            (2, 3, 2),
            "Movement evidence from TailWatch is separate from process mass flow.",
            "La evidencia de movimiento de TailWatch se separa del caudal de proceso.",
        ),
        (
            "SUB",
            "Electrical substation",
            "Subestación eléctrica",
            "utilities",
            "substation",
            (-6, 0, -52),
            (16, 8, 11),
            "Electrical power is shown as an engineering quantity, not site metering.",
            "La potencia es una magnitud de ingeniería, no una medición real del sitio.",
        ),
        (
            "MOT",
            "Mill drive",
            "Accionamiento del molino",
            "grinding",
            "motor",
            (10, 0, -11),
            (7, 6, 5),
            "RotorVitals model evidence retains its own dataset and validity.",
            "La evidencia RotorVitals conserva su conjunto de datos y validez.",
        ),
    ]
    assets = [
        asdict(Asset(i, {"en": en, "es": es}, stage, kind, pos, size, {"en": de, "es": ds}))
        for i, en, es, stage, kind, pos, size, de, ds in rows
    ]
    links = [
        ("PIT", "SHV", "ore", 600, 30),
        ("SHV", "TRK", "ore", 600, 60),
        ("TRK", "ROM", "ore", 600, 180),
        ("ROM", "CV1", "ore", 500, 20),
        ("CV1", "CR1", "ore", 500, 10),
        ("CR1", "SC1", "ore", 500, 8),
        ("SC1", "CR2", "ore", 100, 8),
        ("CR2", "SC1", "ore", 100, 8),
        ("SC1", "BIN", "ore", 500, 10),
        ("BIN", "SAG", "ore", 500, 30),
        ("SAG", "PU1", "slurry", 750, 20),
        ("BAL", "PU1", "slurry", 250, 20),
        ("PU1", "CY1", "slurry", 1000, 3),
        ("CY1", "BAL", "slurry", 250, 5),
        ("CY1", "FL1", "slurry", 750, 10),
        ("FL1", "FL2", "concentrate", 70, 20),
        ("FL2", "RGM", "concentrate", 30, 10),
        ("RGM", "FL2", "concentrate", 30, 20),
        ("FL2", "CTH", "concentrate", 40, 10),
        ("CTH", "FIL", "concentrate", 32, 20),
        ("FIL", "CON", "concentrate", 25, 10),
        ("FL1", "TTH", "tailings", 680, 15),
        ("FL2", "TTH", "tailings", 30, 10),
        ("TTH", "TSF", "tailings", 460, 40),
        ("TTH", "PU2", "water", 250, 15),
        ("CTH", "PU2", "water", 8, 10),
        ("FIL", "PU2", "water", 7, 5),
        ("PU2", "PWT", "water", 265, 10),
        ("MWT", "PWT", "water", 150, 10),
        ("PWT", "SAG", "water", 150, 10),
        ("PWT", "FL1", "water", 100, 10),
        ("ROM", "HEP", "ore", 100, 120),
        ("HEP", "PLS", "solution", 120, 600),
        ("ACD", "LCH", "acid", 8, 20),
        ("HEP", "LCH", "ore", 20, 300),
        ("LCH", "PLS", "solution", 30, 120),
        ("PLS", "SX1", "solution", 150, 40),
        ("SX1", "SX2", "organic", 130, 60),
        ("SX2", "EW1", "electrolyte", 110, 30),
        ("EW1", "CAT", "copper", 1.2, 240),
        ("EW1", "SX2", "electrolyte", 108.8, 30),
        ("SX1", "RAF", "solution", 150, 20),
        ("RAF", "HEP", "solution", 120, 40),
    ]
    # One authored nominal concentrator basis: dry solids and water remain distinct.
    nominal = {
        ("PIT", "SHV"): 820,
        ("SHV", "TRK"): 820,
        ("TRK", "ROM"): 820,
        ("ROM", "CV1"): 720,
        ("CV1", "CR1"): 720,
        ("CR1", "SC1"): 720,
        ("SC1", "CR2"): 144,
        ("CR2", "SC1"): 144,
        ("SC1", "BIN"): 720,
        ("BIN", "SAG"): 720,
        ("SAG", "PU1"): 720,
        ("BAL", "PU1"): 1800,
        ("PU1", "CY1"): 2520,
        ("CY1", "BAL"): 1800,
        ("CY1", "FL1"): 720,
        ("FL1", "FL2"): 18.5991410176,
        ("FL2", "CTH"): 18.5991410176,
        ("CTH", "FIL"): 18.5991410176,
        ("FIL", "CON"): 18.5991410176,
        ("FL1", "TTH"): 701.4008589824,
        ("FL2", "TTH"): 0,
        ("TTH", "TSF"): 701.4008589824,
        ("PWT", "SAG"): 265,
        ("PWT", "FL1"): 150,
        ("ACD", "LCH"): 700,
        ("SX1", "SX2"): 240,
        ("SX2", "EW1"): 110,
        ("EW1", "SX2"): 110,
        ("EW1", "CAT"): 0.3503065945,
    }
    links = [(a, b, m, nominal.get((a, b), q), delay) for a, b, m, q, delay in links]
    links += [
        ("RAF", "LCH", "solution", 30, 40),
        ("HEP", "TSF", "leach_residue", 79.671101, 600),
        ("LCH", "TSF", "leach_residue", 19.9177753, 120),
        ("SX2", "SX1", "organic", 240, 60),
    ]
    streams = [
        asdict(
            Stream(
                f"S{i + 1:02}",
                s,
                t,
                m,
                q,
                "kg/h"
                if m == "acid"
                else "m3/h"
                if m in ("water", "solution", "organic", "electrolyte")
                else "t/h",
                delay,
            )
        )
        for i, (s, t, m, q, delay) in enumerate(links)
    ]
    water = {
        ("SAG", "PU1"): 265,
        ("BAL", "PU1"): 600,
        ("PU1", "CY1"): 865,
        ("CY1", "BAL"): 600,
        ("CY1", "FL1"): 265,
        ("FL1", "FL2"): 30,
        ("FL2", "RGM"): 15,
        ("RGM", "FL2"): 15,
        ("FL2", "CTH"): 30,
        ("CTH", "FIL"): 22,
        ("FIL", "CON"): 15,
        ("FL1", "TTH"): 385,
        ("FL2", "TTH"): 0,
        ("TTH", "TSF"): 135,
    }
    for stream in streams:
        stream["water_m3_h"] = (
            stream["nominal"]
            if stream["material"] in ("water", "solution", "electrolyte")
            else water.get((stream["source"], stream["target"]), 0)
        )
    graph = {
        "schema": "orebridge.plant/v1",
        "id": "copper-complex",
        "revision": "2.0.0",
        "provenance": "authored_synthetic",
        "coordinate_unit": "m",
        "assets": assets,
        "streams": streams,
        "tags": [
            {"tag_id": i, "asset_id": a, "label": {"en": en, "es": es}, "unit": u, "minimum": 0}
            for i, a, en, es, u, _, _ in CHANNELS
        ],
    }
    validate_graph(graph)
    return graph


def validate_graph(graph: dict) -> None:
    assets = graph["assets"]
    ids = [a["id"] for a in assets]
    if len(set(ids)) != len(ids):
        raise ValueError("duplicate asset identity")
    for a in assets:
        if (
            len(a["position"]) != 3
            or len(a["size"]) != 3
            or not all(isfinite(v) for v in (*a["position"], *a["size"]))
        ):
            raise ValueError("non-finite geometry")
        if any(v <= 0 for v in a["size"]):
            raise ValueError("nonpositive equipment dimension")
        if not all(a["name"].get(k) for k in ("en", "es")):
            raise ValueError("missing asset translation")
    streams = graph["streams"]
    sids = [s["id"] for s in streams]
    if len(set(sids)) != len(sids):
        raise ValueError("duplicate stream identity")
    for s in streams:
        if s["source"] not in ids or s["target"] not in ids:
            raise ValueError("dangling process stream")
        if s["source"] == s["target"] or any(
            not isfinite(s[k]) or s[k] < 0 for k in ("nominal", "delay_s", "water_m3_h")
        ):
            raise ValueError("invalid process stream")
        expected_unit = (
            "kg/h"
            if s["material"] == "acid"
            else "m3/h"
            if s["material"] in ("water", "solution", "organic", "electrolyte")
            else "t/h"
        )
        if s["unit"] != expected_unit:
            raise ValueError("incompatible stream unit")
    from .observations import UNITS

    tags = graph["tags"]
    if len({t["tag_id"] for t in tags}) != len(tags):
        raise ValueError("duplicate tag identity")
    for tag in tags:
        if tag["asset_id"] not in ids or tag["unit"] not in UNITS or not isfinite(tag["minimum"]):
            raise ValueError("invalid semantic tag binding")


def neighbors(graph: dict, asset_id: str, *, upstream: bool = False) -> list[str]:
    if asset_id not in {a["id"] for a in graph["assets"]}:
        raise KeyError(asset_id)
    seen = {asset_id}
    frontier = [asset_id]
    while frontier:
        current = frontier.pop()
        for s in graph["streams"]:
            source, target = (s["target"], s["source"]) if upstream else (s["source"], s["target"])
            if source == current and target not in seen:
                seen.add(target)
                frontier.append(target)
    return sorted(seen - {asset_id})
