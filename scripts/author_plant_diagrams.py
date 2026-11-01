"""Original bilingual, themed diagrams for the connected-plant product."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def architecture():
    tabs = [
        (
            "01-the-app",
            "app",
            "Connected instruments",
            "Instrumentos conectados",
            ["Asset and time", "3D plant", "Process diagram", "Trends and evidence"],
            ["Equipo y tiempo", "Planta 3D", "Diagrama de proceso", "Tendencias y evidencia"],
        ),
        (
            "02-lanes",
            "lanes",
            "Execution lanes",
            "Carriles de ejecución",
            ["Pinned CAOS engines", "Offline model bake", "Public synthetic replay", "Local read-only OPC"],
            [
                "Motores CAOS fijados",
                "Modelos fuera de línea",
                "Reproducción sintética",
                "OPC local solo lectura",
            ],
        ),
        (
            "03-web-flow",
            "flow",
            "Shared visual state",
            "Estado visual compartido",
            ["Graph and case index", "Selected equipment", "Quality and time", "Synchronized views"],
            ["Grafo e índice", "Equipo seleccionado", "Calidad y tiempo", "Vistas sincronizadas"],
        ),
        (
            "04-the-science",
            "science",
            "Coherence models",
            "Modelos de coherencia",
            ["Units and freshness", "Causal alignment", "Robust constrained state", "Faults and refusals"],
            ["Unidades y vigencia", "Alineación causal", "Estado robusto restringido", "Fallas y rechazos"],
        ),
        (
            "05-data-contracts",
            "contracts",
            "Typed boundaries",
            "Contratos tipados",
            [
                "Graph and observations",
                "Engine provenance",
                "Trace and model manifest",
                "Schema and hash checks",
            ],
            ["Grafo y observaciones", "Procedencia de motores", "Traza y manifiesto", "Esquema y hashes"],
        ),
    ]
    index = ["import type { ArchitectureConfig } from '@fasl-work/caos-app-shell';"]
    for file, ident, *_ in tabs:
        index.append(f"import {ident} from './{file}.svg?raw';")
    index.append("export const architecture:ArchitectureConfig={tabs:[")
    for file, ident, en, es, labels_en, labels_es in tabs:
        svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 430" class="arch-svg" role="img">'
        svg += "<style>.arch-svg text{fill:var(--color-fg)}.arch-svg .line{fill:none;stroke:var(--color-accent);stroke-width:2}</style>"
        for lang, title in [("en", en), ("es", es)]:
            svg += f'<text class="l-{lang}" x="30" y="38" font-size="22">{title}</text>'
        for i, (en_label, es_label) in enumerate(zip(labels_en, labels_es)):
            x = 35 + i * 220
            svg += f'<rect x="{x}" y="120" width="185" height="125" rx="10" fill="var(--color-surface-2)" stroke="var(--color-border)"/>'
            # Original equipment glyph: tank, pipe, instrument and retained identity.
            svg += f'<path d="M{x + 35} 190v-35q35-20 70 0v35q-35 20-70 0z M{x + 105} 175h40v30" class="line"/><circle cx="{x + 145}" cy="205" r="9" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>'
            for lang, label in [("en", en_label), ("es", es_label)]:
                svg += f'<text class="l-{lang}" x="{x + 92}" y="275" text-anchor="middle" font-size="12">{label}</text>'
            if i < 3:
                svg += f'<path d="M{x + 188} 180h25m-6-6 6 6-6 6" class="line"/>'
        for lang, text in [
            ("en", "Stable identity · explicit provenance · no control writes"),
            ("es", "Identidad estable · procedencia explícita · sin escritura de control"),
        ]:
            svg += f'<text class="l-{lang}" x="30" y="365" font-size="14">{text}</text>'
        svg += '<text data-lang="en" x="50" y="110">Plant equipment and source evidence</text><text data-lang="es" x="50" y="110">Equipos de planta y evidencia de origen</text><text data-lang="en" x="590" y="265">Source time</text><text data-lang="es" x="590" y="265">Tiempo de origen</text><text data-lang="en" x="590" y="285">Equipment identity</text><text data-lang="es" x="590" y="285">Identidad de equipo</text><text data-lang="en" x="50" y="420">Shared equipment and observation context</text><text data-lang="es" x="50" y="420">Contexto compartido de equipo y observación</text></svg>'
        (ROOT / f"frontend/src/architecture/{file}.svg").write_text(svg, encoding="utf-8")
        index.append(
            f"{{id:'{ident}',en:{en!r},es:{es!r},svg:{ident},body_en:{'The asset graph binds each instrument to the same equipment, source quality and selected time. Public evidence is synthetic replay; a configured local gateway reads site observations without control writes.'!r},body_es:{'El grafo vincula instrumentos al mismo equipo, calidad y tiempo. La evidencia pública es reproducción sintética; un gateway local configurado lee observaciones sin escritura de control.'!r}}},"
        )
    index.append("]};")
    (ROOT / "frontend/src/architecture/index.ts").write_text("\n".join(index), encoding="utf-8")


def executive():
    for name in ["pain", "situation", "proposal"]:
        good = name == "proposal"
        color = "--color-good" if good else "--color-bad"
        svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 440" role="img">'
        svg += "<style>text{fill:var(--color-fg)}.pulse{animation:arrival 6s ease both}@keyframes arrival{from{opacity:.2;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}@media (prefers-reduced-motion: reduce){.pulse{animation:none;transform:none;opacity:1}}</style>"
        svg += '<rect x="20" y="70" width="860" height="330" rx="12" fill="var(--color-surface-2)" stroke="var(--color-border)"/><rect x="40" y="95" width="500" height="160" fill="var(--color-surface)" stroke="var(--color-border)"/>'
        # The same plant room and people in the pain and proposal, with different evidence paths.
        for i in range(7):
            x = 65 + i * 65
            svg += f'<rect x="{x}" y="{145 + i % 2 * 14}" width="38" height="55" rx="4" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/><path d="M{x + 3} 145q16-12 32 0 M{x + 19} 200v20h32" fill="none" stroke="var(--color-accent)"/>'
            svg += f'<circle cx="{x + 19}" cy="{165 + i % 2 * 14}" r="7" fill="var({color})"/>'
        for i in range(6):
            x = 85 + i * 125
            svg += f'<circle cx="{x}" cy="296" r="12" fill="var(--color-fg-subtle)"/><path d="M{x - 18} 348v-30q18-16 36 0v30 M{x - 8} 348l-8 28 M{x + 8} 348l8 28" fill="none" stroke="var(--color-fg-subtle)" stroke-width="6"/>'
            for dx in [-4, 4]:
                svg += f'<circle cx="{x + dx}" cy="294" r="1" fill="var(--color-surface)"/>'
            svg += f'<rect x="{x + 13}" y="321" width="25" height="17" fill="var(--color-surface)" stroke="var(--color-border)"/>'
            for j in range(4):
                svg += f'<path d="M{x + 16} {325 + j * 3}h18" stroke="var({color})"/>'
        for i in range(7):
            x = 590 + i % 3 * 75
            y = 120 + i // 3 * 40
            svg += f'<rect class="pulse" x="{x}" y="{y}" width="55" height="25" rx="3" fill="var(--color-surface)" stroke="var({color})"/>'
        labels = {
            "pain": ("Fragmented plant information", "Información de planta fragmentada"),
            "situation": ("Operators connect evidence manually", "Operadores conectan evidencia manualmente"),
            "proposal": (
                "One shared equipment and time context",
                "Un contexto compartido de equipo y tiempo",
            ),
        }
        for lang, text in zip(["en", "es"], labels[name]):
            svg += f'<text data-lang="{lang}" x="35" y="36" font-size="20">{text}</text>'
        svg += '<text data-lang="en" x="50" y="110">Plant equipment and source evidence</text><text data-lang="es" x="50" y="110">Equipos de planta y evidencia de origen</text><text data-lang="en" x="590" y="265">Source time</text><text data-lang="es" x="590" y="265">Tiempo de origen</text><text data-lang="en" x="590" y="285">Equipment identity</text><text data-lang="es" x="590" y="285">Identidad de equipo</text><text data-lang="en" x="50" y="420">Shared equipment and observation context</text><text data-lang="es" x="50" y="420">Contexto compartido de equipo y observación</text></svg>'
        (ROOT / f"frontend/public/executive/{name}.svg").write_text(svg, encoding="utf-8")


if __name__ == "__main__":
    architecture()
    executive()
