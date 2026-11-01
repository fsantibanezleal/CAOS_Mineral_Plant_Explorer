# OreBridge scientific notebooks / Notebooks científicos

These worked lessons investigate connected plant state inference with the implemented OreBridge methods and authored
synthetic data. Follow [English](en/README.md) or [Español](es/README.md) in order. Each tree contains four progressive
lessons: material reconciliation, transport and storage, fitted causal prediction, then TASC evidence and refusal.

Estas lecciones investigan inferencia del estado de una planta conectada con métodos implementados de OreBridge y datos
sintéticos de autoría del proyecto. Sigue [English](en/README.md) o [Español](es/README.md) en orden. Cada árbol contiene
cuatro lecciones progresivas: conciliación material, transporte e inventario, predicción causal ajustada y evidencia de TASC.

Use the repository's notebook environment and `requirements.txt`. Run CPU computations with numerical thread counts set
to one. From the repository root, `python scripts/run_notebooks.py` executes the canonical notebooks; the independent
release process uses `python scripts/run_notebooks.py --check --tmp <external-temp-root>` after outputs are written.

Usa el entorno de notebooks del repositorio y `requirements.txt`. Ejecuta los cálculos de CPU con un hilo numérico.
Desde la raíz, `python scripts/run_notebooks.py` ejecuta los notebooks canónicos; la verificación independiente usa
`python scripts/run_notebooks.py --check --tmp <raíz-temporal-externa>` después de escribir las salidas.

No actual site measurements or geometry have been supplied. The notebooks distinguish observations, model estimates,
source quality and causal claims. They preserve null ratios, unobservable states, false alerts and unfavorable comparisons.

No se han suministrado mediciones ni geometría reales de un sitio. Los notebooks distinguen observaciones, estimaciones,
calidad de origen y afirmaciones causales. Conservan razones nulas, estados no observables, falsas alertas y resultados desfavorables.
