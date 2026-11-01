# Aprender a inferir el estado de una planta conectada

Recorre este tema único en orden. Cada notebook ejecuta los métodos implementados con entradas sintéticas efectivas de
OreBridge. La secuencia pasa de una ecuación de conservación a los límites de un experimento completo de inferencia.
El [árbol en inglés](../en/README.md) conserva las mismas rutas y cálculos; este árbol tiene prosa, comentarios y figuras en español.

| Tema | Nivel | Notebook | Qué enseña la lección desarrollada |
|---|---|---|---|
| 01 Estado de planta | 1 · Fundamentos | [Conciliar una parcela de flotación](01-plant-state/01-reconcile-a-flotation-parcel.ipynb) | Distribuir una corrección observada de cierre con WLS y examinar su sensibilidad a la confianza del medidor de alimentación. |
| 01 Estado de planta | 2 · El método en la práctica | [Tiempo, almacenamiento y robustez](01-plant-state/02-time-storage-and-robustness.ipynb) | Separar una transición sana de transporte y acumulación modelada de un sesgo inyectado, y comparar WLS con Huber. |
| 01 Estado de planta | 3 · Comparación con métodos publicados | [Predicción causal y estimación robusta](01-plant-state/03-causal-prediction-and-robust-estimation.ipynb) | Ajustar árboles potenciados por histogramas, inspeccionar retardos y calibración separada, y compararlos con Huber usando observaciones idénticas. |
| 01 Estado de planta | 4 · Métodos propuestos | [Evidencia y rechazo de TASC](01-plant-state/04-tasc-evidence-and-refusal.ipynb) | Ejecutar fusión y fronteras de calidad, exponer localización ambigua, evaluar ablaciones de tiempo/motor/topología y recalcular incertidumbre pareada conservando resultados negativos. |

El ajuste usa el estimador mantenido efectivo de scikit-learn. GDN se cita como antecedente de relaciones entre sensores;
no se presenta como comparador implementado. La matriz completa es un benchmark sintético registrado: la lección 04 ejecuta
casos seleccionados nuevos y recalcula el análisis de todos sus conteos. Ningún notebook afirma exactitud de campo o beneficio operativo.

La [entrada bilingüe](../README.md) explica preparación y ejecución. Las definiciones y alcance están en
`docs/design/SDD.md` y `docs/problem-types/02_state-coherence-experiment.md`.
