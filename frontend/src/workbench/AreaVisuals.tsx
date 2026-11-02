import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useShellLang } from '@fasl-work/caos-app-shell';
import type { Asset, Plant } from '../lib/contract.types';
import { aggregateWaterRoutes, AreaId, AreaModel, PLANT_AREAS, PlantScope, buildAreaModel } from './areas';
import { EquipmentGlyph } from './EquipmentGlyph';
import type { ViewState } from './views';
import { assetState, formatValue, liveValue } from './model';
import { labelRect, placeDiagramLabel, type DiagramRect } from './diagram-layout';
import { streamMaterialLabel } from './stream-material';
import { AREA_GUIDE } from './area-content';

const W = 1480;
const H = 760;
type XY = { x: number; y: number };

function AtlasFrame({ s, title, children }: { s: ViewState; title: { en: string; es: string }; children: ReactNode }) {
  const lang = useShellLang();
  return <section className="ob-view-surface" aria-label={title[lang]} data-source={s.live === null ? 'synthetic' : 'read-only'}>
    <div className="ob-view-content">{children}</div>
  </section>;
}

const OVERVIEW_POS: Record<AreaId, XY> = {
  'mine-extraction': { x: 155, y: 155 },
  'crushing-stockpiling': { x: 405, y: 155 },
  grinding: { x: 665, y: 155 },
  flotation: { x: 925, y: 155 },
  'thickening-filtration': { x: 1182, y: 155 },
  'leach-sx-ew': { x: 405, y: 340 },
  'water-balance': { x: 760, y: 340 },
  tailings: { x: 1110, y: 340 },
  utilities: { x: 1360, y: 340 },
};
const AREA_POS: Record<AreaId, XY> = {
  'mine-extraction': { x: 155, y: 186 },
  'crushing-stockpiling': { x: 405, y: 186 },
  grinding: { x: 665, y: 186 },
  flotation: { x: 925, y: 186 },
  'thickening-filtration': { x: 1182, y: 186 },
  'leach-sx-ew': { x: 405, y: 380 },
  'water-balance': { x: 760, y: 380 },
  tailings: { x: 1110, y: 380 },
  utilities: { x: 1360, y: 380 },
};

const DETAIL_LAYOUT: Partial<Record<AreaId, Record<string, XY>>> = {
  'mine-extraction': { PIT:{x:390,y:380}, SHV:{x:650,y:380}, TRK:{x:910,y:380} },
  'crushing-stockpiling': { ROM:{x:300,y:380}, CV1:{x:520,y:380}, CR1:{x:740,y:380}, SC1:{x:990,y:250}, CR2:{x:990,y:510} },
  grinding: { BIN:{x:300,y:300}, SAG:{x:550,y:300}, MOT:{x:550,y:550}, PU1:{x:800,y:300}, CY1:{x:1080,y:300}, BAL:{x:800,y:550} },
  flotation: { FL1:{x:420,y:360}, FL2:{x:820,y:220}, RGM:{x:820,y:500} },
  'leach-sx-ew': { HEP:{x:330,y:230}, LCH:{x:330,y:520}, PLS:{x:560,y:375}, SX1:{x:780,y:280}, SX2:{x:990,y:280}, EW1:{x:1160,y:280}, CAT:{x:1160,y:530}, RAF:{x:780,y:530} },
  'thickening-filtration': { CTH:{x:430,y:380}, FIL:{x:740,y:380}, CON:{x:1050,y:380} },
  tailings: { TTH:{x:430,y:380}, TSF:{x:800,y:380}, MON:{x:1120,y:260} },
  utilities: { MWT:{x:330,y:230}, PWT:{x:660,y:230}, PU2:{x:990,y:230}, ACD:{x:330,y:520}, SUB:{x:660,y:520} },
};

const areaName = (scope: PlantScope, lang: string) => scope === 'global'
  ? lang === 'es' ? 'Planta completa' : 'Whole plant'
  : PLANT_AREAS.find((area) => area.id === scope)?.name[lang === 'es' ? 'es' : 'en'] ?? scope;

function sortedFallback(model: AreaModel, asset: Asset, index: number): XY {
  const core = model.coreAssets;
  const minX = Math.min(...core.map((item) => item.position[0]));
  const maxX = Math.max(...core.map((item) => item.position[0]));
  const minZ = Math.min(...core.map((item) => item.position[2]));
  const maxZ = Math.max(...core.map((item) => item.position[2]));
  const spanX = Math.max(1, maxX - minX), spanZ = Math.max(1, maxZ - minZ);
  if (!model.coreAssets.some((item) => item.id === asset.id)) {
    const incoming = model.incoming.some((edge) => edge.source === asset.id);
    return { x: incoming ? 100 : 1370, y: 175 + (index % 4) * 145 };
  }
  const sameColumn = core.filter((item) => Math.abs(item.position[0] - asset.position[0]) < spanX * .12);
  const offset = sameColumn.findIndex((item) => item.id === asset.id);
  return { x: 210 + ((asset.position[0] - minX) / spanX) * 1050, y: 195 + ((asset.position[2] - minZ) / spanZ) * 365 + offset * 28 };
}

function layoutFor(model: AreaModel): Map<string, XY> {
  const manual = model.scope === 'global' ? undefined : DETAIL_LAYOUT[model.scope];
  const positions = new Map<string, XY>();
  model.assets.forEach((asset, index) => {
    positions.set(asset.id, manual?.[asset.id] ?? sortedFallback(model, asset, index));
  });
  return positions;
}

function liveCount(s: ViewState, model: AreaModel) {
  if (s.live === null) return null;
  const ids = new Set(model.coreAssets.map((asset) => asset.id));
  const records = s.live.filter((item) => ids.has(item.asset_id));
  const accepted = records.filter((item) => liveValue(item, s.now, s.plant) !== null).length;
  return { accepted, total: records.length };
}

function areaEvidenceCount(s: ViewState, model: AreaModel) {
  const ids = new Set(model.coreAssets.map((asset) => asset.id));
  return s.engines.records.filter((record) => ids.has(record.asset_id)).length;
}

function representativeAssets(model: AreaModel, limit: number) {
  if (model.scope !== 'water-balance') return model.coreAssets.slice(0, limit);
  const contribution = new Map<string, number>();
  for (const stream of model.streams) {
    const rate = stream.water_m3_h ?? 0;
    contribution.set(stream.source, (contribution.get(stream.source) ?? 0) + rate);
    contribution.set(stream.target, (contribution.get(stream.target) ?? 0) + rate);
  }
  return [...model.coreAssets]
    .sort((a, b) => (contribution.get(b.id) ?? 0) - (contribution.get(a.id) ?? 0))
    .slice(0, limit);
}

function ReferenceFlows({ model, lang, max = 2 }: { model: AreaModel; lang: string; max?: number }) {
  const flows = [
    ...model.incoming.slice(0, max).map((stream) => ({ stream, direction: 'in' })),
    ...model.outgoing.slice(0, max).map((stream) => ({ stream, direction: 'out' })),
  ];
  if (!flows.length) return <span className="ob-area-empty">{lang === 'es' ? 'Sin corrientes de límite en el contrato' : 'No boundary streams in the contract'}</span>;
  return <div className="ob-area-flows">{flows.map(({ stream, direction }) => <div className="ob-area-flow" key={`${direction}-${stream.id}`}>
    <span className={`ob-flow-dir ${direction}`}>{direction === 'in' ? 'IN' : 'OUT'}</span>
    <span className="ob-flow-label">{model.scope === 'water-balance' ? `${streamMaterialLabel(stream.material, lang)} · ${lang === 'es' ? 'aporte de agua' : 'water contribution'}` : streamMaterialLabel(stream.material, lang)}</span>
    <strong>{formatValue(model.scope === 'water-balance' ? stream.water_m3_h : stream.nominal, lang, 1)} <small>{model.scope === 'water-balance' ? 'm³/h' : stream.unit}</small></strong>
  </div>)}</div>;
}

function AreaHoverInfo({ s, model }: { s: ViewState; model: AreaModel }) {
  const lang = useShellLang();
  const area = model.area;
  if (!area) return null;
  const live = liveCount(s, model);
  return <span className="ob-area-hover" role="tooltip">
    <strong>{area.name[lang]}</strong><span>{area.purpose[lang]}</span>
    <span>{model.coreAssets.length} {lang === 'es' ? 'equipos' : 'assets'} · {areaEvidenceCount(s, model)} {lang === 'es' ? 'vínculos CAOS' : 'CAOS links'}</span>
    {live && <span>{live.accepted}/{live.total} {lang === 'es' ? 'observaciones recientes válidas' : 'fresh accepted observations'}</span>}
    <ReferenceFlows model={model} lang={lang} max={1}/>
  </span>;
}

function AreaPreview({ s, areaId }: { s: ViewState; areaId: AreaId | null }) {
  const lang = useShellLang();
  if (!areaId) return <div className="ob-area-preview empty">{lang === 'es' ? 'Pase el cursor o enfoque un área para ver su circuito y límites.' : 'Hover or focus an area to inspect its circuit and boundaries.'}</div>;
  const model = buildAreaModel(s.plant, areaId), area = model.area!;
  const live = liveCount(s, model), engineCount = areaEvidenceCount(s, model);
  const guide = AREA_GUIDE[areaId];
  const waterRoutes = areaId === 'water-balance' ? aggregateWaterRoutes(s.plant).slice(0, 2) : [];
  const modelState = model.coreAssets.map((asset) => assetState(asset, s.trace, s.step, s.method, s.live, s.now, s.plant));
  const alerts = modelState.filter((status) => status === 'alarm' || status === 'unavailable').length;
  return <div className="ob-area-preview" role="status" aria-live="polite" data-preview-area={areaId}>
    <header><span>{area.name[lang]}</span><b>{s.live === null ? (lang === 'es' ? 'REPRODUCCIÓN DE REFERENCIA' : 'REFERENCE REPLAY') : (lang === 'es' ? 'FUENTE DE SOLO LECTURA' : 'READ-ONLY SOURCE')}</b></header>
    <p>{guide.route[lang]}</p>
    <div className="ob-area-preview-facts">
      <span>{lang === 'es' ? 'Equipos' : 'Assets'} <strong>{model.coreAssets.length}</strong></span>
      <span>{lang === 'es' ? 'Estado de referencia' : 'Replay status'} <strong>{alerts ? `${alerts} ${lang === 'es' ? 'alertas' : 'alerts'}` : (lang === 'es' ? 'sin alertas' : 'no alerts')}</strong></span>
      <span>{lang === 'es' ? 'Motores CAOS' : 'CAOS engines'} <strong>{engineCount}</strong></span>
      {live && <span>{lang === 'es' ? 'Observaciones' : 'Observations'} <strong>{live.accepted}/{live.total}</strong></span>}
    </div>
    {areaId === 'water-balance' ? <div className="ob-area-preview-routes">{waterRoutes.map((route) => <span key={route.id}>{route.sourceArea} → {route.targetArea}: <strong>{formatValue(route.water_m3_h, lang, 1)} m³/h</strong></span>)}</div> : <ReferenceFlows model={model} lang={lang} max={1}/>}
    <small>{s.live === null ? (lang === 'es' ? 'Los valores son sintéticos; no son telemetría de planta.' : 'Values are synthetic; this is not plant telemetry.') : (lang === 'es' ? 'Solo observación; verifique calidad y antigüedad al abrir el área.' : 'Read-only observations; inspect quality and age in the area detail.')}</small>
  </div>;
}

function AreaSelector({ s }: { s: ViewState }) {
  const lang = useShellLang();
  return <nav className="ob-area-nav" aria-label={lang === 'es' ? 'Áreas de planta' : 'Plant areas'}>
    <button type="button" className={`ob-area-chip ${s.scope === 'global' ? 'active' : ''}`} aria-pressed={s.scope === 'global'} onClick={() => s.onScopeChange('global')}>
      <span className="ob-chip-kicker">00</span><span>{lang === 'es' ? 'Vista general' : 'Overview'}</span>
    </button>
    {PLANT_AREAS.map((area, index) => {
      const model = buildAreaModel(s.plant, area.id);
      return <button type="button" key={area.id} className={`ob-area-chip ${s.scope === area.id ? 'active' : ''}`} aria-pressed={s.scope === area.id} onClick={() => s.onScopeChange(area.id)}>
        <span className="ob-chip-kicker">{String(index + 1).padStart(2, '0')}</span><span>{area.name[lang]}</span><AreaHoverInfo s={s} model={model}/>
      </button>;
    })}
  </nav>;
}

function Metric({ label, value, unit, note }: { label: string; value: string | number; unit?: string; note?: string }) {
  return <div className="ob-area-metric"><span>{label}</span><strong>{value}{unit && <small> {unit}</small>}</strong>{note && <em>{note}</em>}</div>;
}

function AreaInformation({ s, model }: { s: ViewState; model: AreaModel }) {
  const lang = useShellLang();
  const area = model.area;
  if (!area) return <div className="ob-overview-summary">
    <div><span>{lang === 'es' ? 'Áreas de proceso' : 'Process areas'}</span><strong>{PLANT_AREAS.length}</strong></div>
    <div><span>{lang === 'es' ? 'Equipos conectados' : 'Connected assets'}</span><strong>{s.plant.assets.length}</strong></div>
    <div><span>{lang === 'es' ? 'Corrientes dirigidas' : 'Directed streams'}</span><strong>{s.plant.streams.length}</strong></div>
    <div><span>{lang === 'es' ? 'Fuente actual' : 'Current source'}</span><strong>{s.live === null ? (lang === 'es' ? 'Reproducción sintética' : 'Synthetic replay') : (lang === 'es' ? 'Gateway de solo lectura' : 'Read-only gateway')}</strong></div>
  </div>;
  if (model.scope === 'water-balance') return <>
    <div className="ob-area-summary">
      <Metric label={lang === 'es' ? 'Equipos con aporte de agua' : 'Assets on water routes'} value={model.coreAssets.length}/>
      <Metric label={lang === 'es' ? 'Corrientes con aporte de agua' : 'Water-bearing streams'} value={model.streams.length} note={lang === 'es' ? 'pulpas, soluciones y agua' : 'slurry, solution and water'}/>
      <Metric label={lang === 'es' ? 'Vínculos de motores CAOS' : 'CAOS engine links'} value={areaEvidenceCount(s, model)} note={lang === 'es' ? 'evidencia ligada a equipos' : 'evidence bound to assets'}/>
      <Metric label={lang === 'es' ? 'Cierre de balance' : 'Balance closure'} value={lang === 'es' ? 'No calculado' : 'Not calculated'} note={lang === 'es' ? 'faltan límites completos de sitio' : 'complete site boundaries are absent'}/>
    </div>
    <div className="ob-area-boundaries"><h3>{lang === 'es' ? 'Transferencias de referencia con mayor aporte de agua' : 'Largest authored water-bearing transfers'}</h3><div className="ob-area-flows">{[...model.streams].sort((a, b) => (b.water_m3_h ?? 0) - (a.water_m3_h ?? 0)).slice(0, 5).map((stream) => <div className="ob-area-flow" key={stream.id}><span className="ob-flow-dir">{lang === 'es' ? 'FLUJO' : 'FLOW'}</span><span className="ob-flow-label">{stream.source} → {stream.target} · {streamMaterialLabel(stream.material, lang)}</span><strong>{formatValue(stream.water_m3_h, lang, 1)} <small>m³/h</small></strong></div>)}</div></div>
  </>;
  const live = liveCount(s, model);
  const stat = live ? `${live.accepted}/${live.total}` : `${model.coreAssets.length}`;
  const engineCount = areaEvidenceCount(s, model);
  const tags = s.plant.tags.filter((tag) => model.coreAssets.some((asset) => asset.id === tag.asset_id));
  return <>
    <div className="ob-area-summary">
      <Metric label={lang === 'es' ? 'Equipos del área' : 'Area assets'} value={model.coreAssets.length}/>
      <Metric label={lang === 'es' ? (s.live === null ? 'Canales de referencia' : 'Observaciones vigentes') : (s.live === null ? 'Reference channels' : 'Fresh observations')} value={live ? stat : tags.length} note={s.live === null ? (lang === 'es' ? 'no equivale a telemetría de planta' : 'not plant telemetry') : (lang === 'es' ? 'válidas / recibidas' : 'accepted / received')}/>
      <Metric label={lang === 'es' ? 'Vínculos de motores CAOS' : 'CAOS engine links'} value={engineCount} note={lang === 'es' ? 'evidencia ligada a equipos' : 'evidence bound to assets'}/>
      <Metric label={lang === 'es' ? 'Corrientes de límite' : 'Boundary streams'} value={model.incoming.length + model.outgoing.length} note={lang === 'es' ? 'tasas nominales de referencia' : 'authored reference rates'}/>
    </div>
    <div className="ob-area-boundaries"><h3>{lang === 'es' ? 'Entradas y salidas de referencia' : 'Reference boundary flows'}</h3><ReferenceFlows model={model} lang={lang} max={3}/></div>
  </>;
}

function AreaProcessGuide({ areaId }: { areaId: NonNullable<AreaModel['area']>['id'] }) {
  const lang = useShellLang();
  const guide = AREA_GUIDE[areaId];
  return <section className="ob-process-guide" aria-label={lang === 'es' ? 'Guía de lectura del proceso' : 'Process reading guide'}>
    <header><span className="ob-eyebrow">{lang === 'es' ? 'GUÍA DEL CIRCUITO' : 'CIRCUIT GUIDE'}</span><h3>{lang === 'es' ? 'Cómo leer esta área' : 'How to read this area'}</h3><p>{guide.route[lang]}</p></header>
    <div className="ob-process-guide-grid">
      <article><span>{lang === 'es' ? 'LECTURA DEL PROCESO' : 'PROCESS READING'}</span><p>{guide.read[lang]}</p></article>
      <article><span>{lang === 'es' ? 'COMPROBACIONES DE INGENIERÍA' : 'ENGINEERING CHECKS'}</span><ul>{guide.checks[lang].map((item) => <li key={item}>{item}</li>)}</ul></article>
      <article><span>{lang === 'es' ? 'LÍMITE Y EVIDENCIA' : 'BOUNDARY & EVIDENCE'}</span><p>{guide.boundary[lang]}</p></article>
    </div>
    <footer>{lang === 'es' ? 'Este circuito es una referencia ilustrativa. Las tasas sintéticas y los resultados de motores no son telemetría ni desempeño de la planta.' : 'This circuit is an illustrative reference. Synthetic rates and engine outputs are not plant telemetry or plant performance.'}</footer>
  </section>;
}

function FlowPath({ from, to, color, label, dashed = false }: { from: XY; to: XY; color: string; label?: string; dashed?: boolean }) {
  const mid = (from.x + to.x) / 2;
  const d = `M${from.x} ${from.y}H${mid}V${to.y}H${to.x}`;
  return <g className="ob-flow-path"><path d={d} fill="none" stroke={color} strokeWidth={3.4} strokeDasharray={dashed ? '8 8' : undefined} markerEnd="url(#ob-plan-arrow)"/>{label && <text x={mid} y={(from.y + to.y) / 2 - 8} className="ob-flow-text">{label}</text>}</g>;
}

function AreaCard({ s, area, position, onOpen, onPreview }: { s: ViewState; area: (typeof PLANT_AREAS)[number]; position: XY; onOpen: () => void; onPreview: (id: AreaId | null) => void }) {
  const lang = useShellLang();
  const model = useMemo(() => buildAreaModel(s.plant, area.id), [s.plant, area.id]);
  const representatives = representativeAssets(model, 3);
  return <g className={`ob-plan-area ${s.scope === area.id ? 'active' : ''}`} role="button" tabIndex={0} aria-label={`${area.name[lang]} · ${lang === 'es' ? 'abrir área' : 'open area'}`} aria-pressed={s.scope === area.id}
    transform={`translate(${position.x - 112},${position.y - 75})`} onMouseEnter={() => onPreview(area.id)} onMouseLeave={() => onPreview(null)} onFocus={() => onPreview(area.id)} onBlur={() => onPreview(null)} onClick={onOpen} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(); } }}>
    <rect className="ob-area-zone" width="224" height="150" rx="18" style={{ '--area-color': area.color } as CSSProperties}/>
    <text className="ob-plan-index" x="18" y="27">{String(PLANT_AREAS.indexOf(area) + 1).padStart(2, '0')}</text>
    <text className="ob-plan-title" x="18" y="51">{area.name[lang]}</text>
    <text className="ob-plan-count" x="18" y="71">{model.coreAssets.length} {lang === 'es' ? 'equipos' : 'assets'}</text>
    <g className="ob-mini-glyphs">{representatives.map((asset, index) => <g key={asset.id} transform={`translate(${16 + index * 64},78)`}>
      <EquipmentGlyph asset={asset} compact/><text x="30" y="61" textAnchor="middle">{asset.id}</text>
    </g>)}</g>
    <title>{area.name[lang]} · {area.purpose[lang]} · {model.coreAssets.length} assets · {areaEvidenceCount(s, model)} CAOS links</title>
  </g>;
}

export function PlantOverviewView({ s }: { s: ViewState }) {
  const lang = useShellLang();
  const [previewArea, setPreviewArea] = useState<AreaId | null>(null);
  const model = buildAreaModel(s.plant, s.scope);
  const isGlobal = s.scope === 'global';
  return <AtlasFrame s={s} title={{ en: isGlobal ? 'Connected plant overview' : `${model.area!.name.en} · area workspace`, es: isGlobal ? 'Vista general de planta conectada' : `${model.area!.name.es} · área de trabajo` }}>
    <div className="ob-atlas-view" data-scope={s.scope}>
      {!isGlobal && <AreaSelector s={s}/>}
      {!isGlobal && <header className="ob-atlas-heading"><div><span className="ob-eyebrow">{isGlobal ? (lang === 'es' ? 'MINA → PLANTA' : 'MINE → PLANT') : (lang === 'es' ? 'ÁREA DE PROCESO' : 'PROCESS AREA')}</span><h2>{isGlobal ? (lang === 'es' ? 'Operación minera y planta de procesos' : 'Mine and mineral processing plant') : model.area!.name[lang]}</h2><p>{isGlobal ? (lang === 'es' ? 'Seleccione un área para abrir su vista de proceso, información y evidencia.' : 'Select an area to open its process views, information and evidence.') : model.area!.purpose[lang]}</p></div><span className={`ob-source-badge ${s.live === null ? 'synthetic' : 'live'}`}><i/>{s.live === null ? (lang === 'es' ? 'REPRODUCCIÓN SINTÉTICA' : 'SYNTHETIC REPLAY') : (lang === 'es' ? 'GATEWAY SOLO LECTURA' : 'READ-ONLY GATEWAY')}</span></header>}
      {isGlobal && <AreaInformation s={s} model={model}/>}
      {isGlobal ? <div className="ob-overview-body">
        <div className="ob-overview-card"><div className="ob-section-title"><h3>{lang === 'es' ? 'Mapa de áreas' : 'Area map'}</h3><span>{lang === 'es' ? 'Seleccione una zona para abrirla' : '9 areas · select a zone to open its detailed process view'}</span></div>
          <span className="ob-diagram-scroll-hint">{lang === 'es' ? 'En pantallas estrechas, deslice para recorrer el mapa' : 'On narrow screens, scroll horizontally to inspect the full map'}</span><div className="ob-diagram-scroll" role="region" tabIndex={0} aria-label={lang === 'es' ? 'Mapa global desplazable' : 'Scrollable global area map'}><svg className="ob-overview-map" viewBox={`0 0 ${W} 470`} role="img" aria-label={lang === 'es' ? 'Áreas de planta conectadas' : 'Connected plant areas'}>
            <defs><marker id="ob-plan-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0 0 10 5 0 10z" fill="context-stroke"/></marker></defs>
            <path className="ob-overview-lane" d="M45 250H1435"/>
            <FlowPath from={{x:267,y:155}} to={{x:293,y:155}} color="#c58e5b"/>
            <FlowPath from={{x:517,y:155}} to={{x:553,y:155}} color="#bd986a"/>
            <FlowPath from={{x:777,y:155}} to={{x:813,y:155}} color="#c7a46a"/>
            <FlowPath from={{x:1037,y:155}} to={{x:1070,y:155}} color="#9cb28e"/>
            <FlowPath from={{x:517,y:190}} to={{x:520,y:265}} color="#48a8bc"/>
            <FlowPath from={{x:1037,y:190}} to={{x:1090,y:265}} color="#a09583"/>
            <FlowPath from={{x:1195,y:230}} to={{x:1195,y:265}} color="#3e9fba" dashed/>
            {PLANT_AREAS.filter((area) => area.id !== 'water-balance' && area.id !== 'utilities').map((area) => <AreaCard key={area.id} s={s} area={area} position={OVERVIEW_POS[area.id]} onOpen={() => s.onScopeChange(area.id)} onPreview={setPreviewArea}/>)}
            {PLANT_AREAS.filter((area) => area.id === 'water-balance' || area.id === 'utilities').map((area) => <AreaCard key={area.id} s={s} area={area} position={OVERVIEW_POS[area.id]} onOpen={() => s.onScopeChange(area.id)} onPreview={setPreviewArea}/>)}
          </svg></div>
        </div>
        <aside className="ob-overview-side"><h3>{lang === 'es' ? 'Detalle del área' : 'Area detail preview'}</h3><AreaPreview s={s} areaId={previewArea}/></aside>
      </div> : <>
        <AreaInformation s={s} model={model}/>
        <section className="ob-area-overview-grid" aria-label={lang === 'es' ? 'Resumen del área' : 'Area overview'}>
        <div className="ob-area-workspace-main"><div className="ob-section-title"><h3>{lang === 'es' ? 'Activos y límites del área' : 'Area assets and boundaries'}</h3><span>{model.coreAssets.length} {lang === 'es' ? 'equipos internos' : 'core assets'}</span></div>
          <div className="ob-area-asset-grid">{model.coreAssets.map((asset) => { const status = assetState(asset, s.trace, s.step, s.method, s.live, s.now, s.plant); const metric = s.trace.channels.find((channel) => channel.asset_id === asset.id); const value = metric ? s.trace.observed[s.step]?.[s.trace.channels.indexOf(metric)] ?? null : null; return <button key={asset.id} type="button" className={`ob-asset-card ${status}`} onClick={() => s.onSelect(asset.id)} aria-pressed={s.selected === asset.id}>
            <span className="ob-asset-symbol"><EquipmentGlyph asset={asset}/></span><span className="ob-asset-copy"><small>{asset.id} · {asset.kind.replaceAll('_', ' ')}</small><strong>{asset.name[lang]}</strong><span className="ob-asset-status"><i className={`ob-dot ${status}`}/>{status === 'normal' ? (lang === 'es' ? 'Dentro del umbral' : 'Within model threshold') : status === 'alarm' ? (lang === 'es' ? 'Discrepancia' : 'Model discrepancy') : status === 'unavailable' ? (lang === 'es' ? 'Sin dato evaluable' : 'Unavailable') : (lang === 'es' ? 'Contexto' : 'Context')}</span>{metric && <b>{formatValue(value, lang)} <small>{metric.unit}</small></b>}</span>
          </button>; })}</div>
        </div>
        <aside className="ob-area-workspace-side"><div className="ob-section-title"><h3>{lang === 'es' ? 'Límites del proceso' : 'Process boundaries'}</h3></div><div className="ob-boundary-list"><h4>{lang === 'es' ? 'Entradas' : 'Incoming'}</h4><ReferenceFlows model={{...model, outgoing: [], incoming: model.incoming}} lang={lang} max={5}/><h4>{lang === 'es' ? 'Salidas' : 'Outgoing'}</h4><ReferenceFlows model={{...model, incoming: [], outgoing: model.outgoing}} lang={lang} max={5}/></div><div className="ob-engine-summary"><span>{lang === 'es' ? 'Motores CAOS relacionados' : 'Related CAOS engines'}</span><strong>{areaEvidenceCount(s, model)}</strong><button type="button" onClick={() => Array.from(document.querySelectorAll<HTMLButtonElement>('[role="tab"]')).find((tab) => /Engine integrations|Integraciones de motores/i.test(tab.textContent ?? ''))?.click()}>{lang === 'es' ? 'Abrir evidencia' : 'Open engine evidence'}</button></div></aside>
        </section>
      </>}
    </div>
  </AtlasFrame>;
}

function PlanGlyph({ asset, width, height }: { asset: Asset; width: number; height: number }) {
  const kind = asset.kind;
  const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  let drawing: ReactNode;
  if (kind === 'stockpile' || kind === 'heap' || kind === 'pit') drawing = <>
    <path {...base} d="M8 62 Q19 52 28 51 Q38 24 57 31 Q75 17 90 40 Q103 44 112 62Z"/>
    <path {...base} d="M18 62 Q35 48 44 48 M28 62 Q47 43 58 43 M41 62 Q60 39 73 39 M60 62 Q79 42 90 42"/>
    <path {...base} d="M10 67H110"/>
  </>;
  else if (kind === 'conveyor') drawing = <>
    <path {...base} d="M10 55 91 21 108 35 27 66Z"/><path {...base} d="M24 49 90 22 M31 57 98 29"/>
    {[24,48,72,96].map((x) => <path key={x} {...base} d={`M${x} ${58-(x-24)*.38}v12`}/>)}
  </>;
  else if (kind === 'crusher') drawing = <>
    <rect {...base} x="26" y="15" width="68" height="52" rx="3"/><path {...base} d="M37 26H83L61 39 83 53H37L59 40Z"/>
    <path {...base} d="M8 41H26M94 41H112"/>
  </>;
  else if (kind === 'screen') drawing = <>
    <rect {...base} x="13" y="18" width="94" height="44" rx="2"/>
    {[29,43,57,71,85].map((x) => <path key={x} {...base} d={`M${x} 21v38`}/>)}
    <path {...base} d="M18 29H102M18 40H102M18 51H102"/>
  </>;
  else if (kind === 'mill' || kind === 'motor') drawing = <>
    <rect {...base} x="20" y="23" width="80" height="34" rx="16"/><path {...base} d="M30 19v42M90 19v42M14 40H20M100 40H108"/>
    <circle {...base} cx="61" cy="40" r="10"/><path {...base} d="M61 31v18M52 40h18"/>
  </>;
  else if (kind === 'flotation') drawing = <>
    <rect {...base} x="10" y="15" width="100" height="50" rx="3"/>
    {[24,48,72,96].map((x) => <g key={x}><circle {...base} cx={x} cy="40" r="8"/><path {...base} d={`M${x} 27v7m-4-4 4 4 4-4`}/></g>)}
    <path {...base} d="M14 57H106"/>
  </>;
  else if (kind === 'thickener' || kind === 'tailings' || kind === 'pond') drawing = <>
    <ellipse {...base} cx="60" cy="40" rx="42" ry="27"/><ellipse {...base} cx="60" cy="40" rx="32" ry="19"/>
    <path {...base} d="M19 40H101M60 14V66M60 40 30 56M60 40 90 56"/>
  </>;
  else if (kind === 'filter') drawing = <>
    <rect {...base} x="15" y="16" width="90" height="48" rx="2"/>
    {[27,39,51,63,75,87,99].map((x) => <path key={x} {...base} d={`M${x} 20v40`}/>)}
    <path {...base} d="M10 67H110"/>
  </>;
  else if (kind === 'pump') drawing = <>
    <circle {...base} cx="58" cy="40" r="20"/><circle {...base} cx="58" cy="40" r="7"/>
    <path {...base} d="M10 40H38M78 40H110M58 20V10M58 60V70M58 40 75 29"/>
  </>;
  else if (kind === 'tank' || kind === 'bin' || kind === 'sx' || kind === 'electrowin') drawing = <>
    {[35,84].map((x) => <g key={x}><circle {...base} cx={x} cy="40" r="20"/><circle {...base} cx={x} cy="40" r="12"/><path {...base} d={`M${x-12} 40H${x+12}`}/></g>)}
    <path {...base} d="M10 40H15M104 40H110"/>
  </>;
  else if (kind === 'truck' || kind === 'shovel') drawing = kind === 'truck' ? <>
    <rect {...base} x="18" y="20" width="62" height="40" rx="5"/><rect {...base} x="80" y="27" width="27" height="28" rx="3"/>
    <circle {...base} cx="35" cy="63" r="5"/><circle {...base} cx="70" cy="63" r="5"/><circle {...base} cx="94" cy="60" r="4"/>
  </> : <>
    <rect {...base} x="22" y="25" width="42" height="33"/><path {...base} d="M64 32 92 14 101 21 75 43 88 57M16 62H72"/><circle {...base} cx="36" cy="61" r="4"/><circle {...base} cx="57" cy="61" r="4"/>
  </>;
  else drawing = <>
    <rect {...base} x="20" y="18" width="80" height="46" rx="2"/><path {...base} d="M28 26H92M28 56H92M40 18v46M80 18v46"/>
  </>;
  return <svg className="ob-plan-glyph" x={-width/2} y={-height/2} width={width} height={height} viewBox="0 0 120 80" aria-hidden="true" data-kind={kind}>{drawing}</svg>;
}

export function SitePlanView({ s }: { s: ViewState }) {
  const lang = useShellLang();
  const [previewArea, setPreviewArea] = useState<AreaId | null>(null);
  const model = buildAreaModel(s.plant, s.scope);
  const selectedArea = s.scope === 'global' ? null : model.area;
  const visibleAreas = selectedArea ? [selectedArea] : PLANT_AREAS;
  const positions = useMemo(() => layoutFor(model), [model]);
  return <AtlasFrame s={s} title={{ en: '2D site plan', es: 'Plano 2D de planta' }}>
    <div className="ob-atlas-view" data-scope={s.scope}><div className="ob-view-caption"><div><span className="ob-eyebrow">{lang === 'es' ? 'DISTRIBUCIÓN ESPACIAL' : 'SPATIAL LAYOUT'}</span><h2>{areaName(s.scope, lang)}</h2></div><span>{s.scope === 'global' ? (lang === 'es' ? 'Vista superior de toda la instalación' : 'Top-down site overview') : (lang === 'es' ? 'Área enfocada · seleccione un activo para abrir su detalle' : 'Focused area · select an asset to open its detail')}</span></div>
      <span className="ob-diagram-scroll-hint">{lang === 'es' ? 'Deslice para recorrer el plano completo' : 'Scroll horizontally to inspect the full plan'}</span><div className="ob-diagram-scroll" role="region" tabIndex={0} aria-label={lang === 'es' ? 'Plano espacial desplazable' : 'Scrollable spatial plan'}><svg className="ob-site-plan" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={lang === 'es' ? `Plano espacial ${areaName(s.scope, lang)}` : `${areaName(s.scope, lang)} spatial plan`}>
        <defs>
          <pattern id="ob-site-grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="var(--ob-grid)" strokeWidth="1"/></pattern>
          <marker id="ob-site-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0 0 9 4.5 0 9Z" fill="context-stroke"/></marker>
        </defs>
        <rect width={W} height={H} fill="url(#ob-site-grid)"/>
        <rect className="ob-site-boundary" x="40" y="70" width="1400" height="640" rx="10"/>
        {s.scope === 'global' && <>
          <path className="ob-site-road" d="M70 300H1410M120 610H1390M320 90V690M760 90V690M1200 90V690"/>
          <path className="ob-site-road-center" d="M70 300H1410M120 610H1390M320 90V690M760 90V690M1200 90V690"/>
          <g className="ob-site-north" transform="translate(1370 118)"><path d="M0 34 15 0 30 34 15 26Z"/><text x="15" y="52" textAnchor="middle">N</text></g>
        </>}
        {s.scope === 'global' && <g className="ob-site-main-route">
          <path d="M150 258H365M535 258H628M800 258H900M1072 258H1190" markerEnd="url(#ob-site-arrow)"/>
          <path d="M472 330V516H702M1010 330V516H1252" markerEnd="url(#ob-site-arrow)"/>
        </g>}
        {s.scope !== 'global' && model.streams.map((stream) => {
          const from = positions.get(stream.source), to = positions.get(stream.target);
          if (!from || !to) return null;
          const midX = (from.x + to.x) / 2;
          return <path key={stream.id} d={`M${from.x} ${from.y} H${midX} V${to.y} H${to.x}`} className={`ob-plan-stream ${stream.water_m3_h > 0 ? 'water' : 'solid'}`} markerEnd="url(#ob-site-arrow)"><title>{stream.id} · {stream.source} → {stream.target} · {streamMaterialLabel(stream.material, lang)} · {streamValue(stream, lang)}</title></path>;
        })}
        {s.scope === 'global' ? visibleAreas.map((area) => {
          const areaModel = buildAreaModel(s.plant, area.id);
          const group = areaModel.coreAssets;
          const p = AREA_POS[area.id];
          const assets = representativeAssets(areaModel, 4);
          return <g key={area.id} data-area-id={area.id} className="ob-plan-area" role="button" tabIndex={0} aria-label={`${area.name[lang]} · open area`} onMouseEnter={() => setPreviewArea(area.id)} onMouseLeave={() => setPreviewArea(null)} onFocus={() => setPreviewArea(area.id)} onBlur={() => setPreviewArea(null)} onClick={() => s.onScopeChange(area.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s.onScopeChange(area.id); } }} transform={`translate(${p.x - 105},${p.y - 68})`}>
            <rect className="ob-area-zone" width="210" height="136" rx="16" style={{ '--area-color': area.color } as CSSProperties}/><text className="ob-plan-title" x="16" y="25">{area.name[lang]}</text><text className="ob-plan-count" x="16" y="43">{group.length} {lang === 'es' ? 'equipos' : 'assets'} · {lang === 'es' ? 'abrir' : 'open'} ↗</text>
            {assets.map((asset, index) => <g key={asset.id} transform={`translate(${10 + index * 48},57)`} className="ob-plan-asset" onClick={(e) => { e.stopPropagation(); s.onSelect(asset.id); s.onScopeChange(area.id); }}><EquipmentGlyph asset={asset} compact/><text x="30" y="57" textAnchor="middle">{asset.id}</text></g>)}
          </g>;
        }) : model.assets.map((asset) => {
          const point = positions.get(asset.id) ?? sortedFallback(model, asset, 0); const core = model.coreAssets.some((item) => item.id === asset.id); const status = assetState(asset, s.trace, s.step, s.method, s.live, s.now, s.plant);
          const footprintWidth = core ? Math.max(84, Math.min(168, asset.size[0] * 1.55)) : 64;
          const footprintDepth = core ? Math.max(64, Math.min(124, asset.size[2] * 1.55)) : 48;
          return <g key={asset.id} className={`ob-plan-asset-dot ${core ? 'core' : 'boundary'} ${s.selected === asset.id ? 'selected' : ''}`} transform={`translate(${point.x} ${point.y})`} role="button" tabIndex={0} aria-label={`${asset.id} ${asset.name[lang]}`} aria-pressed={s.selected === asset.id} onClick={() => s.onSelect(asset.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s.onSelect(asset.id); } }}>
            {core ? <>
              <rect className={`ob-site-footprint state-${status}`} x={-footprintWidth/2} y={-footprintDepth/2} width={footprintWidth} height={footprintDepth} rx="3"/>
              <PlanGlyph asset={asset} width={footprintWidth - 14} height={footprintDepth - 14}/>
              <text className="ob-site-asset-id" y={footprintDepth/2+17} textAnchor="middle">{asset.id}</text>
              <text className="ob-site-asset-name" y={footprintDepth/2+32} textAnchor="middle">{asset.name[lang]}</text>
            </> : <>
              <circle className={`state-${status}`} r="19"/><path className="ob-site-boundary-mark" d="M-7 0H7M0-7 7 0 0 7"/>
              <text className="ob-site-asset-id" y="31" textAnchor="middle">{asset.id}</text>
            </>}
            <title>{asset.name[lang]} · {status}</title>
          </g>;
        })}
      </svg></div>
      <div className="ob-plan-legend"><span><i className="ob-plan-swatch mine"/>{lang === 'es' ? 'Minería' : 'Mining'}</span><span><i className="ob-plan-swatch process"/>{lang === 'es' ? 'Proceso' : 'Process'}</span><span><i className="ob-plan-swatch water"/>{lang === 'es' ? 'Agua/solución' : 'Water/solution'}</span><span>{lang === 'es' ? 'Los valores de referencia no son telemetría de sitio.' : 'Authored reference values are not site telemetry.'}</span></div>
      {s.scope === 'global' && <AreaPreview s={s} areaId={previewArea}/>}
    </div>
  </AtlasFrame>;
}

function EquipmentNode({ s, model, asset, position }: { s: ViewState; model: AreaModel; asset: Asset; position: XY }) {
  const lang = useShellLang();
  const core = model.coreAssets.some((item) => item.id === asset.id);
  const status = assetState(asset, s.trace, s.step, s.method, s.live, s.now, s.plant);
  const streamCount = model.streams.filter((stream) => stream.source === asset.id || stream.target === asset.id).length;
  const name = asset.name[lang].split(/\s+/);
  const lines = name.reduce<string[]>((result, word) => { const last = result.at(-1); if (last && `${last} ${word}`.length <= 18) result[result.length - 1] = `${last} ${word}`; else result.push(word); return result; }, []);
  const nameY = 67;
  return <g className={`ob-schematic-node ${core ? 'core' : 'boundary'} ${status} ${s.selected === asset.id ? 'selected' : ''}`} transform={`translate(${position.x} ${position.y})`} role="button" tabIndex={0} aria-label={`${asset.id} ${asset.name[lang]} · ${status}`} aria-pressed={s.selected === asset.id}
    onClick={() => s.onSelect(asset.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s.onSelect(asset.id); } }}>
    <rect className="ob-node-hit-area" x="-86" y="-62" width="172" height="170" rx="8"/>
    <EquipmentGlyph asset={asset} schematic/>
    <line className="ob-node-port" x1="-80" y1="0" x2="-44" y2="0"/>
    <line className="ob-node-port" x1="44" y1="0" x2="80" y2="0"/>
    <circle className="ob-node-port-dot" cx="-44" cy="0" r="3.5"/><circle className="ob-node-port-dot" cx="44" cy="0" r="3.5"/>
    <rect className="ob-node-id-tag" x="-37" y="28" width="74" height="24" rx="3"/>
    <text className="ob-node-id" y="45" textAnchor="middle">{asset.id}</text>
    <text className="ob-node-name" y={nameY} textAnchor="middle">{lines.map((line, index) => <tspan key={`${asset.id}-name-${index}`} x="0" dy={index === 0 ? 0 : 14}>{line}</tspan>)}</text>
    <text className="ob-node-context" y={91 + Math.max(0, lines.length - 1) * 12} textAnchor="middle">{streamCount} {lang === 'es' ? 'conexiones' : 'connections'}</text>
    <circle className={`ob-status-mark ${status}`} cx="54" cy="-44" r="6"/>
    <title>{asset.name[lang]} · {asset.description[lang]} · {status}</title>
  </g>;
}

function streamColor(stream: Plant['streams'][number]) {
  if (stream.material === 'water' || (stream.water_m3_h > 0 && ['solution', 'electrolyte'].includes(stream.material))) return '#39a8c8';
  if (stream.material.includes('tailings') || stream.material === 'tailings') return '#9a806b';
  if (stream.material === 'concentrate' || stream.material === 'copper') return '#cb9a55';
  if (stream.material === 'acid') return '#d17d67';
  return '#bd9967';
}

function streamValue(stream: Plant['streams'][number], lang: string) {
  return `${formatValue(stream.nominal, lang, 1)} ${stream.unit}`;
}

function BoundaryPort({ s, stream, incoming, position }: { s: ViewState; stream: Plant['streams'][number]; incoming: boolean; position: XY }) {
  const lang = useShellLang();
  const externalId = incoming ? stream.source : stream.target;
  const external = s.plant.assets.find((asset) => asset.id === externalId);
  const areaId = external ? PLANT_AREAS.find((area) => area.assetIds.includes(external.id))?.id : null;
  const area = areaId ? PLANT_AREAS.find((item) => item.id === areaId) : null;
  const x = incoming ? 10 : 1250;
  const flow = (stream.water_m3_h ?? 0) > 0 && !['water', 'solution', 'electrolyte'].includes(stream.material)
    ? `${streamValue(stream, lang)} · ${formatValue(stream.water_m3_h, lang, 1)} m³/h ${lang === 'es' ? 'agua' : 'water'}`
    : streamValue(stream, lang);
  return <g className={`ob-boundary-port ${incoming ? 'incoming' : 'outgoing'}`} transform={`translate(${x} ${position.y - 47})`} role={areaId ? 'button' : undefined} tabIndex={areaId ? 0 : undefined}
    aria-label={`${incoming ? (lang === 'es' ? 'Entrada desde' : 'Incoming from') : (lang === 'es' ? 'Salida hacia' : 'Outgoing to')} ${externalId} · ${area?.name[lang] ?? (lang === 'es' ? 'límite del sitio' : 'site boundary')} · ${streamMaterialLabel(stream.material, lang)} · ${flow}`}
    onClick={areaId ? () => { s.onSelect(externalId); s.onScopeChange(areaId); } : undefined}
    onKeyDown={areaId ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); s.onSelect(externalId); s.onScopeChange(areaId); } } : undefined}>
    <rect width="220" height="112" rx="11"/>
    <text className="ob-boundary-kicker" x="14" y="20">{incoming ? (lang === 'es' ? 'ENTRADA DESDE' : 'INCOMING FROM') : (lang === 'es' ? 'SALIDA HACIA' : 'OUTGOING TO')}</text>
    <text className="ob-boundary-area" x="14" y="43">{area?.name[lang] ?? (lang === 'es' ? 'Límite del sitio' : 'Site boundary')}</text>
    <text className="ob-boundary-route" x="14" y="65">{stream.id} · {stream.source} → {stream.target}</text>
    <text className="ob-boundary-material" x="14" y="87">{streamMaterialLabel(stream.material, lang)}</text>
    <text className="ob-boundary-flow" x="14" y="104">{flow}</text>
    <title>{stream.id}: {stream.source} → {stream.target} · {flow} · {external?.name[lang] ?? ''} · {lang === 'es' ? 'Referencia sintética' : 'Synthetic reference'}</title>
  </g>;
}

function AreaSchematicDiagram({ s, model }: { s: ViewState; model: AreaModel }) {
  const lang = useShellLang();
  const positions = useMemo(() => new Map([...layoutFor(model)].map(([id, point]) => [id, { x: point.x, y: 40 + point.y * .72 }] as const)), [model]);
  if (model.scope === 'water-balance') return <WaterBalanceDiagram s={s} model={model}/>;
  const coreIds = new Set(model.coreAssets.map((asset) => asset.id));
  const boundaries = model.streams.filter((stream) => coreIds.has(stream.source) !== coreIds.has(stream.target));
  const visibleInternalStreams = model.internalStreams.filter((stream) => stream.nominal > 0 || stream.water_m3_h > 0);
  const incomingStreams = boundaries.filter((stream) => coreIds.has(stream.target));
  const outgoingStreams = boundaries.filter((stream) => coreIds.has(stream.source));
  const portPositions = new Map<string, number>();
  const assignPorts = (streams: typeof boundaries) => {
    const top = 130, bottom = 510;
    streams.forEach((stream, index) => {
      const y = streams.length === 1 ? (top + bottom) / 2 : top + index * (bottom - top) / (streams.length - 1);
      portPositions.set(stream.id, y);
    });
  };
  assignPorts(incomingStreams);
  assignPorts(outgoingStreams);
  const blockedLabels: DiagramRect[] = [
    ...model.coreAssets.map((asset) => { const p = positions.get(asset.id) ?? sortedFallback(model, asset, 0); return { x: p.x - 82, y: p.y - 68, width: 164, height: 206 }; }),
    ...boundaries.map((stream) => { const incoming = coreIds.has(stream.target); return { x: incoming ? 10 : 1250, y: (portPositions.get(stream.id) ?? 390) - 56, width: 220, height: 112 }; }),
  ];
  const occupiedLabels: DiagramRect[] = [];
  return <section className="ob-area-inline-schematic" aria-label={lang === 'es' ? 'Esquema detallado del área' : 'Detailed area schematic'}>
    <div className="ob-section-title"><h3>{lang === 'es' ? 'Esquema de proceso del área' : 'Area process schematic'}</h3><span>{model.coreAssets.length} {lang === 'es' ? 'equipos internos' : 'in-area assets'} · {visibleInternalStreams.length} {lang === 'es' ? 'corrientes internas activas' : 'active internal streams'} · {boundaries.length} {lang === 'es' ? 'conectores entre áreas' : 'inter-area connectors'}</span></div>
    <span className="ob-diagram-scroll-hint">{lang === 'es' ? 'Deslice para recorrer el esquema completo' : 'Scroll horizontally to inspect the full schematic'}</span><div className="ob-diagram-scroll" role="region" tabIndex={0} aria-label={lang === 'es' ? 'Esquema desplazable' : 'Scrollable process schematic'}><svg className="ob-process-schematic" viewBox="0 0 1480 640" role="img" aria-label={`${areaName(s.scope, lang)} ${lang === 'es' ? 'esquema detallado' : 'detailed process schematic'}`} data-testid={`area-schematic-${s.scope}`}>
      <defs><marker id="ob-area-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0 0 10 5 0 10z" fill="context-stroke"/></marker></defs>
      <rect className="ob-schematic-sheet" x="8" y="8" width="1464" height="624" rx="18"/>
      <g className="ob-schematic-key"><circle cx="34" cy="34" r="6" fill="#bd9967"/><text x="48" y="38">{lang === 'es' ? 'Mineral y concentrado' : 'Ore and concentrate'}</text><circle cx="238" cy="34" r="6" fill="#39a8c8"/><text x="252" y="38">{lang === 'es' ? 'Agua y solución' : 'Water and solution'}</text><circle cx="405" cy="34" r="6" fill="#9a806b"/><text x="419" y="38">{lang === 'es' ? 'Relaves' : 'Tailings'}</text><text x="1440" y="38" textAnchor="end">{lang === 'es' ? 'TASAS DE REFERENCIA SINTÉTICAS' : 'SYNTHETIC REFERENCE RATES'}</text></g>
      {visibleInternalStreams.map((stream, index) => {
        const a = positions.get(stream.source), b = positions.get(stream.target); if (!a || !b) return null;
        const dx = b.x - a.x, vertical = Math.abs(dx) <= 30 && b.y > a.y, backflow = dx < -30 || (Math.abs(dx) <= 30 && b.y < a.y);
        const laneY = 580 - (index % 3) * 20;
        let path = backflow
          ? Math.abs(dx) <= 30
            ? `M${a.x} ${a.y + 68} V${laneY} H${a.x + 130} V${b.y + 68} H${b.x}`
            : `M${a.x} ${a.y + 68} V${laneY} H${b.x} V${b.y + 68}`
          : vertical ? `M${a.x} ${a.y + 68} V${b.y - 68}`
            : `M${a.x + 78} ${a.y} C${a.x + Math.max(90, dx * .34)} ${a.y},${b.x - Math.max(90, dx * .34)} ${b.y},${b.x - 78} ${b.y}`;
        let labelX = backflow && Math.abs(dx) <= 30 ? a.x - 130 : vertical ? a.x + 118 : (a.x + b.x) / 2;
        let labelY = backflow ? laneY - 24 : (a.y + b.y) / 2 + (vertical ? 0 : ((index % 3) - 1) * 31);
        if (model.scope === 'flotation') {
          if (stream.id === 'S17') { path = `M${a.x + 44} ${a.y} H1100 V${b.y} H${b.x + 44}`; labelX = 1010; labelY = (a.y + b.y) / 2 - 34; }
          if (stream.id === 'S18') { path = `M${a.x + 44} ${a.y} H1180 V${b.y} H${b.x + 44}`; labelX = 1010; labelY = (a.y + b.y) / 2 + 34; }
        }
        const label = placeDiagramLabel({ x: labelX, y: labelY }, blockedLabels, occupiedLabels, { width: 156, height: 40 }, { left: 230, top: 58, right: 1250, bottom: 590 });
        occupiedLabels.push(labelRect(label, { width: 156, height: 40 }));
        const color = streamColor(stream), noFlow = stream.nominal === 0 && stream.water_m3_h === 0;
        return <g key={stream.id} className={`ob-process-stream ${stream.water_m3_h > 0 ? 'water' : 'material'} ${noFlow ? 'no-flow' : ''}`}>
          <path d={path} fill="none" stroke={color} strokeWidth={stream.water_m3_h > 0 ? 3.5 : 4.2} strokeDasharray={stream.material === 'organic' || noFlow ? '9 7' : undefined} markerEnd="url(#ob-area-arrow)"/>
          <rect x={label.x - 78} y={label.y - 20} width="156" height="40" rx="9"/><text x={label.x} y={label.y - 3} textAnchor="middle" className="ob-stream-name">{streamMaterialLabel(stream.material, lang)}</text><text x={label.x} y={label.y + 13} textAnchor="middle" className="ob-stream-value">{streamValue(stream, lang)} · {stream.id}</text>
        <title>{stream.id} · {stream.source} → {stream.target} · {streamMaterialLabel(stream.material, lang)} · {streamValue(stream, lang)}{stream.water_m3_h > 0 ? ` · ${formatValue(stream.water_m3_h, lang, 1)} m³/h ${lang === 'es' ? 'agua' : 'water'}` : ''} · ${stream.delay_s} s</title>
        </g>;
      })}
      {boundaries.map((stream) => {
        const incoming = coreIds.has(stream.target), assetId = incoming ? stream.target : stream.source, node = positions.get(assetId);
        if (!node) return null;
        const port = { x: incoming ? 230 : 1250, y: portPositions.get(stream.id) ?? 390 };
        const nodePort = { x: incoming ? node.x - 44 : node.x + 44, y: node.y };
        const midX = (port.x + nodePort.x) / 2, color = streamColor(stream);
        let path = incoming ? `M${port.x} ${port.y} C${midX} ${port.y},${midX} ${nodePort.y},${nodePort.x} ${nodePort.y}` : `M${nodePort.x} ${nodePort.y} C${midX} ${nodePort.y},${midX} ${port.y},${port.x} ${port.y}`;
        if (model.scope === 'flotation') {
          if (stream.id === 'S19') path = `M${nodePort.x} ${nodePort.y} H1160 V${port.y} H${port.x}`;
          if (stream.id === 'S22') path = `M${nodePort.x} ${nodePort.y} H600 V600 H1210 V${port.y} H${port.x}`;
          if (stream.id === 'S23') path = `M${nodePort.x} ${nodePort.y} H1100 V${port.y} H${port.x}`;
        }
        return <g key={`boundary-${stream.id}`} className={`ob-process-stream boundary ${stream.water_m3_h > 0 ? 'water' : 'material'}`}><path d={path} fill="none" stroke={color} strokeWidth={stream.water_m3_h > 0 ? 3.5 : 4.2} strokeDasharray={stream.nominal === 0 && stream.water_m3_h === 0 ? '9 7' : undefined} markerEnd="url(#ob-area-arrow)"/><BoundaryPort s={s} stream={stream} incoming={incoming} position={port}/></g>;
      })}
      {model.coreAssets.map((asset, index) => <EquipmentNode key={asset.id} s={s} model={model} asset={asset} position={positions.get(asset.id) ?? sortedFallback(model, asset, index)}/>)}
    </svg></div>
  </section>;
}

function WaterBalanceDiagram({ s, model }: { s: ViewState; model: AreaModel }) {
  const lang = useShellLang();
  const routes = useMemo(() => aggregateWaterRoutes(s.plant), [s.plant]);
  const xy: Partial<Record<AreaId, XY>> = {
    utilities: { x: 160, y: 160 }, grinding: { x: 425, y: 150 }, flotation: { x: 700, y: 150 },
    'thickening-filtration': { x: 990, y: 150 }, tailings: { x: 1270, y: 365 }, 'leach-sx-ew': { x: 700, y: 535 },
  };
  const activeAreaIds = new Set(routes.flatMap((route) => [route.sourceArea, route.targetArea]));
  const visibleAreas = PLANT_AREAS.filter((area) => activeAreaIds.has(area.id) && xy[area.id]);
  const internalRoutes = routes.filter((route) => route.sourceArea === route.targetArea);
  const transfers = routes.filter((route) => route.sourceArea !== route.targetArea);
  const waterLabelSize = { width: 180, height: 50 };
  const blockedWaterLabels: DiagramRect[] = visibleAreas.map((area) => { const p = xy[area.id]!; return { x: p.x - 108, y: p.y - 76, width: 216, height: 152 }; });
  const occupiedWaterLabels: DiagramRect[] = [];
  const makeUp = s.plant.streams.filter((stream) => stream.source === 'MWT' && (stream.water_m3_h ?? 0) > 0).reduce((sum, stream) => sum + (stream.water_m3_h ?? 0), 0);
  const recovered = s.plant.streams.filter((stream) => stream.target === 'PWT' && stream.source !== 'MWT' && (stream.water_m3_h ?? 0) > 0).reduce((sum, stream) => sum + (stream.water_m3_h ?? 0), 0);
  const routeStats = (areaId: AreaId) => ({
    incoming: routes.filter((route) => route.targetArea === areaId).reduce((sum, route) => sum + route.water_m3_h, 0),
    outgoing: routes.filter((route) => route.sourceArea === areaId).reduce((sum, route) => sum + route.water_m3_h, 0),
  });
  const label = (areaId: AreaId) => PLANT_AREAS.find((area) => area.id === areaId)!.name[lang];
  return <section className="ob-area-inline-schematic ob-water-balance" aria-label={lang === 'es' ? 'Diagrama de balance de agua' : 'Water balance diagram'}>
    <div className="ob-section-title"><h3>{lang === 'es' ? 'Rutas de agua y solución' : 'Water and solution routes'}</h3><span>{transfers.length} {lang === 'es' ? 'transferencias entre áreas' : 'inter-area transfers'} · {internalRoutes.length} {lang === 'es' ? 'usos internos' : 'in-area uses'} · {lang === 'es' ? 'cierre no calculado' : 'closure not calculated'}</span></div>
    <div className="ob-water-metrics"><Metric label={lang === 'es' ? 'Reposición fresca de referencia' : 'Reference fresh make-up'} value={formatValue(makeUp, lang, 1)} unit="m³/h" note={lang === 'es' ? 'MWT → PWT · aporte sintético' : 'MWT → PWT · authored synthetic flow'}/><Metric label={lang === 'es' ? 'Retorno recuperado de referencia' : 'Reference reclaimed return'} value={formatValue(recovered, lang, 1)} unit="m³/h" note={lang === 'es' ? 'PU2 → PWT · transferencia interna' : 'PU2 → PWT · internal transfer'}/><Metric label={lang === 'es' ? 'Corrientes con aporte de agua' : 'Water-bearing streams'} value={model.streams.length} note={lang === 'es' ? 'incluye pulpas y soluciones' : 'includes slurry and solution'}/></div>
    <span className="ob-diagram-scroll-hint">{lang === 'es' ? 'Deslice para recorrer el diagrama completo' : 'Scroll horizontally to inspect the full diagram'}</span><div className="ob-diagram-scroll" role="region" tabIndex={0} aria-label={lang === 'es' ? 'Balance de agua desplazable' : 'Scrollable water balance'}><svg className="ob-water-schematic" viewBox="0 0 1480 660" role="img" aria-label={lang === 'es' ? 'Corrientes agregadas de agua entre áreas de proceso' : 'Aggregated water transfers between process areas'}>
      <defs><marker id="ob-water-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0 0 10 5 0 10z" fill="#3e9fba"/></marker></defs>
      <rect className="ob-schematic-sheet" x="25" y="25" width={W - 50} height="610" rx="22"/>
      {transfers.map((route, index) => {
        const a = xy[route.sourceArea], b = xy[route.targetArea]; if (!a || !b) return null;
        const dx = b.x - a.x, dy = b.y - a.y;
        const portOffset = ((index % 5) - 2) * 14;
        const edgePoint = (origin: XY, x: number, y: number, offset: number) => Math.abs(x) >= Math.abs(y)
          ? { x: origin.x + Math.sign(x || 1) * 108, y: origin.y + offset }
          : { x: origin.x + offset, y: origin.y + Math.sign(y || 1) * 76 };
        const start = edgePoint(a, dx, dy, portOffset), end = edgePoint(b, -dx, -dy, -portOffset);
        const middleX = (start.x + end.x) / 2, middleY = (start.y + end.y) / 2 + ((index % 3) - 1) * 42;
        const path = `M${start.x} ${start.y} Q${middleX} ${middleY} ${end.x} ${end.y}`;
        const labelPoint = placeDiagramLabel({ x: middleX, y: middleY }, blockedWaterLabels, occupiedWaterLabels, waterLabelSize, { left: 90, top: 65, right: 1390, bottom: 585 });
        occupiedWaterLabels.push(labelRect(labelPoint, waterLabelSize));
        const areaCode: Record<AreaId,string> = { 'mine-extraction':'MINE', 'crushing-stockpiling':'CRUSH', grinding:'GRIND', flotation:'FLOT', 'leach-sx-ew':'LEACH', 'thickening-filtration':'THICK', 'water-balance':'WATER', tailings:'TAIL', utilities:'UTIL' };
        return <g key={route.id} className="ob-water-route"><path d={path} markerEnd="url(#ob-water-arrow)"/><rect x={labelPoint.x - 90} y={labelPoint.y - 25} width="180" height="50" rx="9"/><text x={labelPoint.x} y={labelPoint.y - 9} textAnchor="middle">{formatValue(route.water_m3_h, lang, 1)} m³/h</text><text x={labelPoint.x} y={labelPoint.y + 4} textAnchor="middle" className="ob-water-route-count">{route.streamIds.length} {lang === 'es' ? 'corrientes' : 'streams'}</text><text x={labelPoint.x} y={labelPoint.y + 18} textAnchor="middle" className="ob-water-route-name">{areaCode[route.sourceArea]} → {areaCode[route.targetArea]}</text><title>{label(route.sourceArea)} → {label(route.targetArea)} · {route.streamIds.join(', ')}</title></g>;
      })}
      {visibleAreas.map((area) => {
        const p = xy[area.id]!, stats = routeStats(area.id), inArea = internalRoutes.filter((route) => route.sourceArea === area.id).reduce((sum, route) => sum + route.water_m3_h, 0);
        return <g key={area.id} className="ob-water-area" role="button" tabIndex={0} aria-label={`${area.name[lang]} · ${lang === 'es' ? 'abrir detalle del área' : 'open area detail'}`} onClick={() => s.onScopeChange(area.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); s.onScopeChange(area.id); } }}>
          <rect x={p.x - 108} y={p.y - 76} width="216" height="152" rx="16" style={{ '--area-color': area.color } as CSSProperties}/>
          <text x={p.x - 88} y={p.y - 34} className="ob-water-area-kicker">{String(PLANT_AREAS.indexOf(area) + 1).padStart(2, '0')} · {lang === 'es' ? 'ÁREA DE PROCESO' : 'PROCESS AREA'}</text>
          <text x={p.x - 88} y={p.y - 8} className="ob-water-area-name">{area.name[lang]}</text>
          <text x={p.x - 88} y={p.y + 18} className="ob-water-area-value">{lang === 'es' ? 'Bruto entra' : 'Gross in'} {formatValue(stats.incoming, lang, 1)} m³/h</text>
          <text x={p.x - 88} y={p.y + 39} className="ob-water-area-value">{lang === 'es' ? 'Bruto sale' : 'Gross out'} {formatValue(stats.outgoing, lang, 1)} m³/h</text>
          {inArea > 0 && <text x={p.x - 88} y={p.y + 60} className="ob-water-area-value">{lang === 'es' ? 'Uso interno' : 'In-area use'} {formatValue(inArea, lang, 1)} m³/h</text>}
        </g>;
      })}
    </svg></div>
    <p className="ob-water-note">{lang === 'es' ? 'Transferencias brutas agregadas desde el aporte water_m3_h. No representan cierre de balance ni telemetría de sitio.' : 'Gross transfers aggregated from water_m3_h. They do not establish balance closure or represent site telemetry.'}</p>
  </section>;
}

export function ProcessSchematicView({ s }: { s: ViewState }) {
  const lang = useShellLang();
  const model = useMemo(() => buildAreaModel(s.plant, s.scope), [s.plant, s.scope]);
  return <AtlasFrame s={s} title={{ en: 'Process schematic', es: 'Esquema de proceso' }}>
    <div className="ob-atlas-view" data-scope={s.scope}>{s.scope === 'global' && <div className="ob-view-caption"><div><span className="ob-eyebrow">{lang === 'es' ? 'DIAGRAMA DE PROCESO' : 'PROCESS SCHEMATIC'}</span><h2>{areaName(s.scope, lang)}</h2></div><span>{lang === 'es' ? 'Seleccione una zona para abrir su propio esquema detallado.' : 'Select an area to open its own detailed schematic.'}</span></div>}
      {s.scope === 'global' ? <><span className="ob-diagram-scroll-hint">{lang === 'es' ? 'Deslice para recorrer el esquema completo' : 'Scroll horizontally to inspect the full schematic'}</span><div className="ob-diagram-scroll" role="region" tabIndex={0} aria-label={lang === 'es' ? 'Esquema global desplazable' : 'Scrollable global process schematic'}><svg className="ob-global-schematic" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={lang === 'es' ? 'Esquema global de proceso' : 'Global process schematic'}>
        <defs><marker id="ob-schematic-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0 0 10 5 0 10z" fill="context-stroke"/></marker></defs>
        <path className="ob-global-mainline" d="M260 230H325M500 230H590M765 230H855M1030 230H1110" markerEnd="url(#ob-schematic-arrow)"/>
        <path className="ob-global-altline" d="M420 278V500H720M1150 278V505H1260" markerEnd="url(#ob-schematic-arrow)"/>
        {PLANT_AREAS.filter((area) => !['utilities'].includes(area.id)).map((area) => { const p = AREA_POS[area.id]; const m = buildAreaModel(s.plant, area.id); return <g key={area.id} className="ob-global-unit" transform={`translate(${p.x - 87},${p.y - 60})`} role="button" tabIndex={0} aria-label={`${area.name[lang]} · ${lang === 'es' ? 'abrir esquema' : 'open schematic'}`} onClick={() => s.onScopeChange(area.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s.onScopeChange(area.id); } }}>
          <rect className="ob-global-unit-outline" width="174" height="120" rx="14" style={{ '--area-color': area.color } as CSSProperties}/><text className="ob-global-unit-number" x="15" y="22">AREA {String(PLANT_AREAS.indexOf(area) + 1).padStart(2, '0')}</text><text className="ob-global-unit-name" x="15" y="47">{area.name[lang]}</text><text className="ob-global-unit-count" x="15" y="68">{m.coreAssets.length} {lang === 'es' ? 'equipos' : 'assets'}</text>
          <g className="ob-global-unit-glyphs">{m.coreAssets.slice(0, 3).map((asset, i) => <g key={asset.id} transform={`translate(${12 + i * 49},73)`}><EquipmentGlyph asset={asset} compact/><text x="28" y="38">{asset.id}</text></g>)}</g>
          <title>{area.name[lang]} · {area.purpose[lang]} · {m.coreAssets.length} assets · {areaEvidenceCount(s, m)} CAOS links</title>
        </g>; })}
        <g className="ob-global-utility" role="button" tabIndex={0} onClick={() => s.onScopeChange('utilities')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') s.onScopeChange('utilities'); }}><rect x="1285" y="468" width="150" height="90" rx="12"/><text x="1300" y="495">{lang === 'es' ? 'Servicios' : 'Utilities'}</text><text x="1300" y="518">{PLANT_AREAS.find((area) => area.id === 'utilities')?.assetIds.length ?? 0} {lang === 'es' ? 'equipos' : 'assets'}</text><text x="1300" y="542">↗ {lang === 'es' ? 'Abrir área' : 'Open area'}</text></g>
      </svg></div></> : <><AreaSchematicDiagram s={s} model={model}/><AreaProcessGuide areaId={model.area!.id}/></>}
    </div>
  </AtlasFrame>;
}

