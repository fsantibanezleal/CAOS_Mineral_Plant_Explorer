import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { LinkedViewProvider, SceneCallouts, StoryFrame, useLinkedView, useShellLang, type SceneCalloutDef, type StoryStep } from '@fasl-work/caos-app-shell';
import { getJSON, loadCase, loadIndex, useArtifact } from '../api/artifacts';
import type { EngineEvidence, Plant, Trace } from '../lib/contract.types';
import { ComponentSection } from './ComponentSection';
import { buildAreaModel, PLANT_AREAS, type PlantScope } from './areas';
import { channelIndices, snapshotValue } from './model';
import { AreaSchematicDiagram, GlobalProcessMap } from './AreaVisuals';
import type { ViewState } from './views';
import './visualization.css';

const STEPS = ['context', 'separation', 'grinding'] as const;
type StoryId = typeof STEPS[number];

const sourceLabel = {
  reference: { en: 'Authored plant reference', es: 'Referencia de planta declarada' },
  replay: { en: 'Synthetic case replay', es: 'Replay de caso sintético' },
};
const MILL_BASIS = 'https://www.metso.com/globalassets/insights/ebooks/ebook-mill-liners-4491-01-2022-en-cns-lores.pdf';

function number(value: number, lang: 'en' | 'es') {
  return value.toLocaleString(lang, { maximumFractionDigits: 1 });
}

function areaViewState(plant: Plant, trace: Trace, engines: EngineEvidence, scope: PlantScope, selected: string, step: number, onSelect: (id: string) => void, onLinkedSelect: (id: string) => void): ViewState {
  return {
    history: [], overlay: 'observations', onOverlay: () => undefined,
    processControls: { tau: 6, current: 400, acid: 700 }, plant, trace, engines,
    selected, hoveredAsset: null, onHoverAsset: () => undefined, step, method: 'threshold',
    highlight: new Set(), playing: false, live: null, now: Date.now(), onSelect,
    scope, onScopeChange: (id) => onLinkedSelect(id),
  };
}

function boundaries(plant: Plant) {
  const flotation = buildAreaModel(plant, 'flotation');
  const feed = flotation.incoming.find((stream) => stream.unit === 't/h' && stream.nominal >= 700);
  const water = flotation.incoming.find((stream) => /m3\/h/i.test(stream.unit) && (stream.water_m3_h ?? stream.nominal) >= 100);
  const concentrate = flotation.outgoing.filter((stream) => stream.unit === 't/h' && stream.nominal > 0).find((stream) => stream.nominal < 100);
  const tailings = flotation.outgoing.filter((stream) => stream.unit === 't/h').find((stream) => stream.nominal >= 500);
  return { flotation, feed, water, concentrate, tailings };
}

function referenceCallouts(plant: Plant, trace: Trace, id: StoryId, lang: 'en' | 'es', step: number): SceneCalloutDef[] {
  if (id === 'context') return [
    { id: 'asset-count', eyebrow: { en: 'PLANT ASSETS', es: 'ACTIVOS DE PLANTA' }, value: String(plant.assets.length), unit: { en: 'assets', es: 'activos' }, state: 'selected', anchor: { x: .18, y: .2 }, source: sourceLabel.reference },
    { id: 'stream-count', eyebrow: { en: 'PROCESS NETWORK', es: 'RED DE PROCESO' }, value: String(plant.streams.length), unit: { en: 'streams', es: 'corrientes' }, state: 'normal', anchor: { x: .51, y: .48 }, source: sourceLabel.reference },
    { id: 'area-count', eyebrow: { en: 'OPERATING AREAS', es: 'ÁREAS OPERACIONALES' }, value: String(PLANT_AREAS.length), unit: { en: 'areas', es: 'áreas' }, state: 'normal', anchor: { x: .83, y: .24 }, source: sourceLabel.reference },
  ];
  if (id === 'separation') {
    const b = boundaries(plant);
    return [
      { id: 'flotation-feed', eyebrow: { en: 'SLURRY IN', es: 'PULPA DE ENTRADA' }, value: b.feed ? number(b.feed.nominal, lang) : 'N/A', unit: { en: b.feed?.unit ?? 't/h', es: b.feed?.unit ?? 't/h' }, state: 'normal', anchor: { x: .25, y: .38 }, source: sourceLabel.reference },
      { id: 'flotation-concentrate', eyebrow: { en: 'CONCENTRATE OUT', es: 'CONCENTRADO DE SALIDA' }, value: b.concentrate ? number(b.concentrate.nominal, lang) : 'N/A', unit: { en: b.concentrate?.unit ?? 't/h', es: b.concentrate?.unit ?? 't/h' }, state: 'selected', anchor: { x: .68, y: .30 }, source: sourceLabel.reference },
      { id: 'flotation-tailings', eyebrow: { en: 'TAILINGS OUT', es: 'RELAVES DE SALIDA' }, value: b.tailings ? number(b.tailings.nominal, lang) : 'N/A', unit: { en: b.tailings?.unit ?? 't/h', es: b.tailings?.unit ?? 't/h' }, state: 'warning', anchor: { x: .7, y: .72 }, source: sourceLabel.reference },
    ];
  }
  const index = channelIndices(trace, 'SAG')[0];
  const replay = index === undefined ? null : snapshotValue(trace, step, 'threshold', index);
  const feed = plant.streams.find((stream) => stream.target === 'SAG' && stream.unit === 't/h');
  const water = plant.streams.find((stream) => stream.target === 'SAG' && /m3\/h/i.test(stream.unit));
  const t = (en: string, es: string) => lang === 'es' ? es : en;
  return [
    { id: 'mill-feed', eyebrow: { en: 'SAG FEED', es: 'ALIMENTACIÓN SAG' }, value: feed ? number(feed.nominal, lang) : 'N/A', unit: { en: feed?.unit ?? 't/h', es: feed?.unit ?? 't/h' }, state: 'normal', anchor: { x: .2, y: .34 }, source: sourceLabel.reference },
    { id: 'mill-water', eyebrow: { en: 'PROCESS WATER', es: 'AGUA DE PROCESO' }, value: water ? number(water.nominal, lang) : 'N/A', unit: { en: water?.unit ?? 'm³/h', es: water?.unit ?? 'm³/h' }, state: 'selected', anchor: { x: .68, y: .22 }, source: sourceLabel.reference },
    { id: 'mill-replay', eyebrow: { en: 'SYNTHETIC REPLAY', es: 'REPLAY SINTÉTICO' }, value: replay === null ? t('No channel', 'Sin canal') : number(replay, lang), unit: { en: replay === null ? 'available' : trace.channels[index!]?.unit ?? '', es: replay === null ? 'disponible' : trace.channels[index!]?.unit ?? '' }, state: replay === null ? 'inactive' : 'normal', anchor: { x: .78, y: .72 }, source: sourceLabel.replay },
  ];
}

function StoryPanel({ plant, trace, id, lang, step, onStepChange, selectedId, onSelect }: { plant: Plant; trace: Trace; id: StoryId; lang: 'en' | 'es'; step: number; onStepChange: (step: number) => void; selectedId: string | null; onSelect: (id: string) => void }) {
  const t = (en: string, es: string) => lang === 'es' ? es : en;
  const b = boundaries(plant);
  const streams = id === 'separation' ? [b.feed, b.water, b.concentrate, b.tailings].filter(Boolean) : [];
  const sagChannel = channelIndices(trace, 'SAG')[0];
  const sagValue = sagChannel === undefined ? null : snapshotValue(trace, step, 'threshold', sagChannel);
  const validReplay = sagChannel === undefined ? [] : trace.observed.flatMap((row, index) => trace.valid[index]?.[sagChannel] && Number.isFinite(row?.[sagChannel]) ? [{ index, value: row![sagChannel]! }] : []);
  const replayMin = Math.min(...validReplay.map((point) => point.value));
  const replayMax = Math.max(...validReplay.map((point) => point.value));
  const replayY = (value: number) => 48 - ((value - replayMin) / Math.max(1e-9, replayMax - replayMin)) * 36;
  const replayPath = validReplay.map((point, index) => `${index ? 'L' : 'M'}${12 + point.index / Math.max(1, trace.time_s.length - 1) * 276} ${replayY(point.value)}`).join(' ');
  const selectedValue = sagChannel === undefined ? null : snapshotValue(trace, step, 'threshold', sagChannel);
  const cursorY = selectedValue === null || validReplay.length === 0 ? 30 : replayY(selectedValue);
  const headline = id === 'context'
    ? t(`${plant.assets.length} authored assets connect through ${plant.streams.length} process streams`, `${plant.assets.length} activos declarados conectados por ${plant.streams.length} corrientes`)
    : id === 'separation'
      ? t(`${number(b.feed?.nominal ?? 0, lang)} t/h slurry enters the flotation boundary`, `La pulpa entra al límite de flotación a ${number(b.feed?.nominal ?? 0, lang)} t/h`)
      : t(`SAG replay value ${sagValue === null ? 'is unavailable' : `${number(sagValue, lang)} ${trace.channels[sagChannel!]?.unit ?? ''}`}`, `El replay SAG ${sagValue === null ? 'no tiene valor disponible' : 'indica ' + number(sagValue, lang) + ' ' + (trace.channels[sagChannel!]?.unit ?? '')}`);
  return <section className="ob-story-panel" aria-label={t('Evidence for this step', 'Evidencia de este paso')}>
    <span className="ob-eyebrow">{t('READOUT · SOURCE-BOUND', 'LECTURA · VINCULADA A FUENTE')}</span>
    <h2>{headline}</h2>
    {id === 'context' && <><p>{t('The process model connects all declared assets and streams. Geometry and reference rates are authored context; this view is not a site survey.', 'El modelo conecta todos los activos y corrientes declarados. La geometría y las tasas son contexto de referencia, no un levantamiento de planta.')}</p><dl><div><dt>{t('Asset nodes', 'Activos')}</dt><dd>{plant.assets.length}</dd></div><div><dt>{t('Directed streams', 'Corrientes dirigidas')}</dt><dd>{plant.streams.length}</dd></div><div><dt>{t('Named areas', 'Áreas nombradas')}</dt><dd>{PLANT_AREAS.length}</dd></div><div><dt>{t('Linked area', 'Área enlazada')}</dt><dd>{PLANT_AREAS.find((area) => area.id === selectedId)?.name[lang] ?? t('Whole plant', 'Planta completa')}</dd></div></dl><div className="ob-story-area-links" aria-label={t('Select a process area', 'Seleccione un área de proceso')}>{PLANT_AREAS.map((area) => <button key={area.id} type="button" data-linked-id={area.id} data-linked-view="panel" data-linked-selected={selectedId === area.id ? 'true' : 'false'} aria-pressed={selectedId === area.id} onClick={() => onSelect(area.id)}>{area.name[lang]}</button>)}</div></>}
    {id === 'separation' && <><p>{t('Boundary values are authored reference rates from the connected plant graph. Solids and water keep their own units.', 'Los valores límite son tasas de referencia declaradas en el grafo de planta. Los sólidos y el agua conservan sus unidades.')}</p><div className="ob-story-legend"><span><i className="ob-solid"/>{t('Ore / concentrate', 'Mineral / concentrado')}</span><span><i className="ob-water"/>{t('Water / solution', 'Agua / solución')}</span><span><i className="ob-tailings"/>{t('Tailings', 'Relaves')}</span></div><ul>{streams.map((stream) => <li key={stream!.id}><b>{stream!.source} → {stream!.target}</b><span>{number(stream!.nominal, lang)} {stream!.unit}{stream!.water_m3_h ? ` · ${number(stream!.water_m3_h, lang)} m³/h` : ''}</span></li>)}</ul></>}
    {id === 'grinding' && <><p>{t('The cross-section names the trunnions, shell liners, lifters and charge. Its geometry is explanatory and not to scale.', 'El corte identifica muñones, revestimientos, levantadores y carga. La geometría es explicativa y no está a escala.')}</p><dl><div><dt>{t('Replay case', 'Caso replay')}</dt><dd>{trace.case_id}</dd></div><div><dt>{t('Replay time', 'Tiempo replay')}</dt><dd>{number(trace.time_s[step] ?? 0, lang)} s</dd></div><div><dt>{t('SAG channel', 'Canal SAG')}</dt><dd>{sagChannel === undefined ? t('Not available', 'No disponible') : trace.channels[sagChannel]?.id}</dd></div></dl><small>{t('Synthetic case replay, not plant telemetry.', 'Replay de caso sintético, no telemetría de planta.')}</small><a href={MILL_BASIS} target="_blank" rel="noreferrer">{t('Geometry basis: Metso mill-liner design guide', 'Base geométrica: guía de diseño de revestimientos Metso')}</a></>}
    {sagChannel !== undefined && <figure className="ob-story-trend"><figcaption>{t('SAG replay · ', 'Replay SAG · ')}{trace.channels[sagChannel]?.id} · {trace.channels[sagChannel]?.unit} · {t('synthetic', 'sintético')}</figcaption><svg viewBox="0 0 300 60" role="img" aria-label={t('SAG synthetic replay trend with linked time marker', 'Tendencia del replay sintético SAG con marcador de tiempo enlazado')}><path d={replayPath} fill="none" stroke="var(--color-accent)" strokeWidth="2"/><line x1={12 + step / Math.max(1, trace.time_s.length - 1) * 276} x2={12 + step / Math.max(1, trace.time_s.length - 1) * 276} y1="8" y2="52" stroke="var(--color-fg-faint)" strokeDasharray="3 3"/><circle cx={12 + step / Math.max(1, trace.time_s.length - 1) * 276} cy={cursorY} r="4" fill="var(--color-accent)" data-linked-cursor-marker="" data-linked-cursor-position={step}/></svg><small>{t('Source: accepted synthetic trace sample; invalid/missing samples are omitted.', 'Fuente: muestra válida de traza sintética; las muestras inválidas o ausentes se omiten.')}</small></figure>}
    <label className="ob-story-scrubber">{t('Replay time', 'Tiempo de replay')} · <strong>{number(trace.time_s[step] ?? 0, lang)} s</strong><input aria-label={t('Scrub plant replay time', 'Mover el tiempo de replay de planta')} data-linked-cursor="" type="range" min={0} max={Math.max(0, trace.time_s.length - 1)} value={step} onChange={(event) => onStepChange(Number(event.currentTarget.value))}/></label>
    {id !== 'grinding' && <p className="ob-story-scroll-hint">{t('Scroll the diagram horizontally to inspect the full process route.', 'Desplace el diagrama horizontalmente para revisar toda la ruta de proceso.')}</p>}
  </section>;
}

function ShowcaseStoryContent() {
  const { step = 'context' } = useParams();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const lang = useShellLang() === 'es' ? 'es' : 'en';
  const linkedSelection = useLinkedView((state) => state.selectedId);
  const selectLinked = useLinkedView((state) => state.select);
  const linkedCursor = useLinkedView((state) => state.cursor);
  const scrubLinked = useLinkedView((state) => state.scrub);
  const index = useArtifact((signal) => loadIndex(signal), []);
  const plantDoc = useArtifact((signal) => getJSON<Plant>('plant.json', signal), []);
  const enginesDoc = useArtifact((signal) => getJSON<EngineEvidence>('engine-evidence.json', signal), []);
  const caseId = index.state === 'ready' ? index.data.default_case : 'PL-01';
  const caseDoc = useArtifact((signal) => loadCase(caseId, signal), [caseId]);
  const [selected, setSelected] = useState('SAG');
  const id: StoryId = STEPS.includes(step as StoryId) ? step as StoryId : 'context';
  const plant = plantDoc.state === 'ready' ? plantDoc.data : null;
  const engines = enginesDoc.state === 'ready' ? enginesDoc.data : null;
  const loaded = caseDoc.state === 'ready' ? caseDoc.data : null;
  const returnPath = search.get('from');
  const safeReturnPath = returnPath?.startsWith('/app?') && !returnPath.startsWith('//') ? returnPath : null;
  const scope: PlantScope = id === 'separation' ? 'flotation' : id === 'grinding' ? 'grinding' : 'global';
  const replayStep = Math.max(0, Math.min((loaded?.trace.time_s.length ?? 1) - 1, linkedCursor ?? 80));
  const chooseLinkedArea = (areaId: string) => selectLinked(areaId, 'scene');
  const onStepChange = (next: number) => { scrubLinked(next); };
  const s = useMemo(() => plant && engines && loaded ? areaViewState(plant, loaded.trace, engines, scope, selected, replayStep, (id) => { setSelected(id); selectLinked(id, 'scene'); }, chooseLinkedArea) : null, [plant, engines, loaded, scope, selected, replayStep]);
  const steps = useMemo<StoryStep[]>(() => {
    if (!plant || !engines || !loaded || !s) return [];
    const definitions: Array<{ id: StoryId; n: number; verb: [string, string]; summary: [string, string]; accent: 1 | 2 | 3 }> = [
      { id: 'context', n: 1, verb: ['Map the process', 'Mapear el proceso'], summary: ['Start with the authored whole-plant network and its area boundaries.', 'Comience con la red declarada de planta y sus límites por área.'], accent: 1 },
      { id: 'separation', n: 2, verb: ['Inspect flotation', 'Inspeccionar flotación'], summary: ['Read the flotation flowsheet and its separate solids and water boundaries.', 'Lea el esquema de flotación y sus límites separados de sólidos y agua.'], accent: 2 },
      { id: 'grinding', n: 3, verb: ['Open the mill', 'Abrir el molino'], summary: ['Inspect the SAG section and distinguish reference rates from the synthetic replay.', 'Inspeccione el corte SAG y distinga las tasas de referencia del replay sintético.'], accent: 3 },
    ];
    return definitions.map((d) => {
      const localScope: PlantScope = d.id === 'separation' ? 'flotation' : d.id === 'grinding' ? 'grinding' : 'global';
      const local = areaViewState(plant, loaded.trace, engines, localScope, d.id === 'grinding' ? 'SAG' : d.id === 'separation' ? 'FL1' : 'SAG', replayStep, (id) => { setSelected(id); selectLinked(id, 'scene'); }, chooseLinkedArea);
      const callouts = referenceCallouts(plant, loaded.trace, d.id, lang, replayStep);
      const stage = <div className="ob-story-visual" data-story-stage-id={d.id}>
        {d.id === 'context' ? <GlobalProcessMap s={local} linkedSelection={linkedSelection} onLinkedSelect={chooseLinkedArea}/> : d.id === 'separation' ? <AreaSchematicDiagram s={local} model={buildAreaModel(plant, 'flotation')} interactiveBoundaries={false}/> : <ComponentSection s={local} showSource={false} showReading={false}/>}
        <SceneCallouts items={callouts} placement="header"/>
      </div>;
      const headline = d.id === 'context'
        ? { en: `${plant.assets.length} authored assets connect through ${plant.streams.length} streams`, es: `${plant.assets.length} activos declarados conectados por ${plant.streams.length} corrientes` }
        : d.id === 'separation'
          ? (() => { const f = boundaries(plant).feed; const v = number(f?.nominal ?? 0, lang); return { en: `${v} t/h slurry reaches the flotation boundary`, es: `La pulpa llega a flotación a ${v} t/h` }; })()
          : (() => { const ch = channelIndices(loaded.trace, 'SAG')[0]; const v = ch === undefined ? null : snapshotValue(loaded.trace, 80, 'threshold', ch); const n = v === null ? 'N/A' : number(v, lang); return { en: v === null ? 'SAG replay has no bound channel' : `SAG replay reads ${n} ${loaded.trace.channels[ch!]?.unit ?? ''}`, es: v === null ? 'El replay SAG no tiene canal vinculado' : `El replay SAG indica ${n} ${loaded.trace.channels[ch!]?.unit ?? ''}` }; })();
      const params = new URLSearchParams({ case: loaded.manifest.case_id });
      if (safeReturnPath) params.set('from', safeReturnPath);
      const href = `/story/${d.id}?${params.toString()}`;
      return { id: d.id, number: d.n, verb: { en: d.verb[0], es: d.verb[1] }, headline, summary: { en: d.summary[0], es: d.summary[1] }, href, accent: d.accent, stage, panel: <StoryPanel plant={plant} trace={loaded.trace} id={d.id} lang={lang} step={replayStep} onStepChange={onStepChange} selectedId={linkedSelection} onSelect={(id) => selectLinked(id, 'panel')}/> };
    });
  }, [plant, engines, loaded, s, lang, safeReturnPath, replayStep, linkedSelection]);
  if (!plant || !engines || !loaded || !s) return <section className="ob-story-state" data-state="loading" role="status">{lang === 'es' ? 'Cargando modelo de planta, caso y evidencia…' : 'Loading plant model, case and evidence…'}</section>;
  const fallback = `/app?case=${encodeURIComponent(loaded.manifest.case_id)}&asset=${encodeURIComponent(id === 'separation' ? 'FL1' : 'SAG')}&area=${id === 'separation' ? 'flotation' : id === 'grinding' ? 'grinding' : 'global'}&view=${id === 'context' ? 'overview' : id === 'separation' ? 'schematic' : '3d'}&step=80&method=threshold`;
  return <StoryFrame className="ob-story-mode" steps={steps} activeId={STEPS.includes(step as StoryId) ? step : 'context'} onStepChange={(next) => { const params = new URLSearchParams({ case: loaded.manifest.case_id }); if (safeReturnPath) params.set('from', safeReturnPath); navigate(`/story/${next}?${params.toString()}`); }} onExit={() => navigate(safeReturnPath ?? fallback)}/>;
}

export function ShowcaseStory() {
  return <LinkedViewProvider initial={{ selectedId: 'water-balance', cursor: 80 }}><ShowcaseStoryContent/></LinkedViewProvider>;
}
