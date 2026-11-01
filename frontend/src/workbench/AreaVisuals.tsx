import { useMemo, type CSSProperties, type ReactNode } from 'react';
import { useShellLang } from '@fasl-work/caos-app-shell';
import type { Asset, Plant } from '../lib/contract.types';
import { aggregateWaterRoutes, AreaId, AreaModel, PLANT_AREAS, PlantScope, buildAreaModel } from './areas';
import { EquipmentGlyph } from './EquipmentGlyph';
import type { ViewState } from './views';
import { assetState, formatValue, liveValue } from './model';
import { labelRect, placeDiagramLabel, type DiagramRect } from './diagram-layout';
import { streamMaterialLabel } from './stream-material';

const W = 1480;
const H = 760;
type XY = { x: number; y: number };

function AtlasFrame({ s, title, children }: { s: ViewState; title: { en: string; es: string }; children: ReactNode }) {
  const lang = useShellLang();
  return <section className="ob-view-surface" aria-label={title[lang]} data-source={s.live === null ? 'synthetic' : 'read-only'}>
    <div className="ob-view-content">{children}</div>
  </section>;
}

const AREA_POS: Record<AreaId, XY> = {
  'mine-extraction': { x: 155, y: 186 },
  'crushing-stockpiling': { x: 405, y: 186 },
  grinding: { x: 665, y: 186 },
  flotation: { x: 925, y: 186 },
  'thickening-filtration': { x: 1182, y: 186 },
  'leach-sx-ew': { x: 405, y: 380 },
  'water-balance': { x: 760, y: 380 },
  tailings: { x: 1110, y: 380 },
  utilities: { x: 1320, y: 380 },
};

const DETAIL_LAYOUT: Partial<Record<AreaId, Record<string, XY>>> = {
  'mine-extraction': { PIT:{x:390,y:380}, SHV:{x:650,y:380}, TRK:{x:910,y:380} },
  'crushing-stockpiling': { ROM:{x:300,y:380}, CV1:{x:520,y:380}, CR1:{x:740,y:380}, SC1:{x:990,y:250}, CR2:{x:990,y:510} },
  grinding: { BIN:{x:300,y:300}, SAG:{x:550,y:300}, MOT:{x:550,y:550}, PU1:{x:800,y:300}, CY1:{x:1080,y:300}, BAL:{x:800,y:550} },
  flotation: { FL1:{x:470,y:380}, FL2:{x:810,y:260}, RGM:{x:810,y:540} },
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

function FlowPath({ from, to, color, label, dashed = false }: { from: XY; to: XY; color: string; label?: string; dashed?: boolean }) {
  const mid = (from.x + to.x) / 2;
  const d = `M${from.x} ${from.y}H${mid}V${to.y}H${to.x}`;
  return <g className="ob-flow-path"><path d={d} fill="none" stroke={color} strokeWidth={3.4} strokeDasharray={dashed ? '8 8' : undefined} markerEnd="url(#ob-plan-arrow)"/>{label && <text x={mid} y={(from.y + to.y) / 2 - 8} className="ob-flow-text">{label}</text>}</g>;
}

function AreaCard({ s, area, position, onOpen }: { s: ViewState; area: (typeof PLANT_AREAS)[number]; position: XY; onOpen: () => void }) {
  const lang = useShellLang();
  const model = useMemo(() => buildAreaModel(s.plant, area.id), [s.plant, area.id]);
  const representatives = model.coreAssets.slice(0, 3);
  return <g className={`ob-plan-area ${s.scope === area.id ? 'active' : ''}`} role="button" tabIndex={0} aria-label={`${area.name[lang]} · ${lang === 'es' ? 'abrir área' : 'open area'}`} aria-pressed={s.scope === area.id}
    transform={`translate(${position.x - 112},${position.y - 75})`} onClick={onOpen} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(); } }}>
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
  const model = buildAreaModel(s.plant, s.scope);
  const isGlobal = s.scope === 'global';
  return <AtlasFrame s={s} title={{ en: isGlobal ? 'Connected plant overview' : `${model.area!.name.en} · area workspace`, es: isGlobal ? 'Vista general de planta conectada' : `${model.area!.name.es} · área de trabajo` }}>
    <div className="ob-atlas-view">
      {!isGlobal && <AreaSelector s={s}/>}
      <header className="ob-atlas-heading"><div><span className="ob-eyebrow">{isGlobal ? (lang === 'es' ? 'MINA → PLANTA' : 'MINE → PLANT') : (lang === 'es' ? 'ÁREA DE PROCESO' : 'PROCESS AREA')}</span><h2>{isGlobal ? (lang === 'es' ? 'Operación minera y planta de procesos' : 'Mine and mineral processing plant') : model.area!.name[lang]}</h2><p>{isGlobal ? (lang === 'es' ? 'Seleccione un área para abrir su vista de proceso, información y evidencia.' : 'Select an area to open its process views, information and evidence.') : model.area!.purpose[lang]}</p></div><span className={`ob-source-badge ${s.live === null ? 'synthetic' : 'live'}`}><i/>{s.live === null ? (lang === 'es' ? 'REPRODUCCIÓN SINTÉTICA' : 'SYNTHETIC REPLAY') : (lang === 'es' ? 'GATEWAY SOLO LECTURA' : 'READ-ONLY GATEWAY')}</span></header>
      {isGlobal && <AreaInformation s={s} model={model}/>}
      {isGlobal ? <div className="ob-overview-body">
        <div className="ob-overview-card"><div className="ob-section-title"><h3>{lang === 'es' ? 'Mapa de áreas' : 'Area map'}</h3><span>{lang === 'es' ? 'Seleccione una zona para abrirla' : 'Select a zone to open it'}</span></div>
          <span className="ob-diagram-scroll-hint">{lang === 'es' ? 'Deslice para recorrer el mapa completo' : 'Scroll horizontally to inspect the full map'}</span><div className="ob-diagram-scroll" role="region" tabIndex={0} aria-label={lang === 'es' ? 'Mapa global desplazable' : 'Scrollable global area map'}><svg className="ob-overview-map" viewBox={`0 0 ${W} 620`} role="img" aria-label={lang === 'es' ? 'Áreas de planta conectadas' : 'Connected plant areas'}>
            <defs><marker id="ob-plan-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0 0 10 5 0 10z" fill="context-stroke"/></marker></defs>
            <path className="ob-overview-lane" d="M45 285H1435"/>
            <FlowPath from={{x:267,y:186}} to={{x:293,y:186}} color="#c58e5b"/>
            <FlowPath from={{x:517,y:186}} to={{x:553,y:186}} color="#bd986a"/>
            <FlowPath from={{x:777,y:186}} to={{x:813,y:186}} color="#c7a46a"/>
            <FlowPath from={{x:1037,y:186}} to={{x:1070,y:186}} color="#9cb28e"/>
            <FlowPath from={{x:517,y:220}} to={{x:520,y:305}} color="#48a8bc"/>
            <FlowPath from={{x:1037,y:225}} to={{x:1090,y:305}} color="#a09583"/>
            <FlowPath from={{x:1195,y:261}} to={{x:1195,y:305}} color="#3e9fba" dashed/>
            {PLANT_AREAS.filter((area) => area.id !== 'water-balance' && area.id !== 'utilities').map((area) => <AreaCard key={area.id} s={s} area={area} position={AREA_POS[area.id]} onOpen={() => s.onScopeChange(area.id)}/>)}
            {PLANT_AREAS.filter((area) => area.id === 'water-balance' || area.id === 'utilities').map((area) => <AreaCard key={area.id} s={s} area={area} position={AREA_POS[area.id]} onOpen={() => s.onScopeChange(area.id)}/>)}
          </svg></div>
        </div>
        <aside className="ob-overview-side"><h3>{lang === 'es' ? 'Lectura de la planta' : 'Plant context'}</h3><p>{lang === 'es' ? 'El circuito concentrador y la ruta de lixiviación son rutas de proceso separadas que comparten servicios y contexto de alimentación. Los flujos dibujados como referencia no son mediciones de sitio.' : 'The concentrator and leach route are separate process paths that share services and feed context. Authored reference flows are not site measurements.'}</p><div className="ob-side-facts"><span>{lang === 'es' ? 'Origen de datos' : 'Data class'}</span><strong>{s.live === null ? (lang === 'es' ? 'Sintético y reproducible' : 'Synthetic replay') : (lang === 'es' ? 'Observación de solo lectura' : 'Read-only observations')}</strong><span>{lang === 'es' ? 'Equipos con tags' : 'Assets with tags'}</span><strong>{s.plant.tags.length} {lang === 'es' ? 'vínculos de tag' : 'tag bindings'}</strong><span>{lang === 'es' ? 'Evidencia CAOS' : 'CAOS evidence'}</span><strong>{s.engines.records.length} {lang === 'es' ? 'artefactos trazables' : 'traceable artifacts'}</strong></div></aside>
      </div> : <>
        <AreaSchematicDiagram s={s} model={model}/>
        <AreaInformation s={s} model={model}/>
        <div className="ob-area-workspace">
        <div className="ob-area-workspace-main"><div className="ob-section-title"><h3>{lang === 'es' ? 'Activos y límites del área' : 'Area assets and boundaries'}</h3><span>{model.coreAssets.length} {lang === 'es' ? 'equipos internos' : 'core assets'}</span></div>
          <div className="ob-area-asset-grid">{model.coreAssets.map((asset) => { const status = assetState(asset, s.trace, s.step, s.method, s.live, s.now, s.plant); const metric = s.trace.channels.find((channel) => channel.asset_id === asset.id); const value = metric ? s.trace.observed[s.step]?.[s.trace.channels.indexOf(metric)] ?? null : null; return <button key={asset.id} type="button" className={`ob-asset-card ${status}`} onClick={() => s.onSelect(asset.id)} aria-pressed={s.selected === asset.id}>
            <span className="ob-asset-symbol"><EquipmentGlyph asset={asset}/></span><span className="ob-asset-copy"><small>{asset.id} · {asset.kind.replaceAll('_', ' ')}</small><strong>{asset.name[lang]}</strong><span className="ob-asset-status"><i className={`ob-dot ${status}`}/>{status === 'normal' ? (lang === 'es' ? 'Dentro del umbral' : 'Within model threshold') : status === 'alarm' ? (lang === 'es' ? 'Discrepancia' : 'Model discrepancy') : status === 'unavailable' ? (lang === 'es' ? 'Sin dato evaluable' : 'Unavailable') : (lang === 'es' ? 'Contexto' : 'Context')}</span>{metric && <b>{formatValue(value, lang)} <small>{metric.unit}</small></b>}</span>
          </button>; })}</div>
        </div>
        <aside className="ob-area-workspace-side"><div className="ob-section-title"><h3>{lang === 'es' ? 'Límites del proceso' : 'Process boundaries'}</h3></div><div className="ob-boundary-list"><h4>{lang === 'es' ? 'Entradas' : 'Incoming'}</h4><ReferenceFlows model={{...model, outgoing: [], incoming: model.incoming}} lang={lang} max={5}/><h4>{lang === 'es' ? 'Salidas' : 'Outgoing'}</h4><ReferenceFlows model={{...model, incoming: [], outgoing: model.outgoing}} lang={lang} max={5}/></div><div className="ob-engine-summary"><span>{lang === 'es' ? 'Motores CAOS relacionados' : 'Related CAOS engines'}</span><strong>{areaEvidenceCount(s, model)}</strong><button type="button" onClick={() => Array.from(document.querySelectorAll<HTMLButtonElement>('[role="tab"]')).find((tab) => /Engine integrations|Integraciones de motores/i.test(tab.textContent ?? ''))?.click()}>{lang === 'es' ? 'Abrir evidencia' : 'Open engine evidence'}</button></div></aside>
        </div>
      </>}
    </div>
  </AtlasFrame>;
}

export function SitePlanView({ s }: { s: ViewState }) {
  const lang = useShellLang();
  const model = buildAreaModel(s.plant, s.scope);
  const selectedArea = s.scope === 'global' ? null : model.area;
  const visibleAreas = selectedArea ? [selectedArea] : PLANT_AREAS;
  const positions = useMemo(() => layoutFor(model), [model]);
  return <AtlasFrame s={s} title={{ en: '2D site plan', es: 'Plano 2D de planta' }}>
    <div className="ob-atlas-view"><div className="ob-view-caption"><div><span className="ob-eyebrow">{lang === 'es' ? 'DISTRIBUCIÓN ESPACIAL' : 'SPATIAL LAYOUT'}</span><h2>{areaName(s.scope, lang)}</h2></div><span>{s.scope === 'global' ? (lang === 'es' ? 'Vista superior de toda la instalación' : 'Top-down site overview') : (lang === 'es' ? 'Área enfocada · seleccione un activo para abrir su detalle' : 'Focused area · select an asset to open its detail')}</span></div>
      <span className="ob-diagram-scroll-hint">{lang === 'es' ? 'Deslice para recorrer el plano completo' : 'Scroll horizontally to inspect the full plan'}</span><div className="ob-diagram-scroll" role="region" tabIndex={0} aria-label={lang === 'es' ? 'Plano espacial desplazable' : 'Scrollable spatial plan'}><svg className="ob-site-plan" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={lang === 'es' ? `Plano espacial ${areaName(s.scope, lang)}` : `${areaName(s.scope, lang)} spatial plan`}>
        <defs><pattern id="ob-site-grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="var(--ob-grid)" strokeWidth="1"/></pattern></defs><rect width={W} height={H} fill="url(#ob-site-grid)"/>
        {s.scope === 'global' ? visibleAreas.map((area) => {
          const group = s.plant.assets.filter((asset) => area.assetIds.includes(asset.id));
          const p = AREA_POS[area.id];
          const assets = group.slice(0, 4);
          return <g key={area.id} className="ob-plan-area" role="button" tabIndex={0} aria-label={`${area.name[lang]} · open area`} onClick={() => s.onScopeChange(area.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s.onScopeChange(area.id); } }} transform={`translate(${p.x - 105},${p.y - 68})`}>
            <rect className="ob-area-zone" width="210" height="136" rx="16" style={{ '--area-color': area.color } as CSSProperties}/><text className="ob-plan-title" x="16" y="25">{area.name[lang]}</text><text className="ob-plan-count" x="16" y="43">{group.length} {lang === 'es' ? 'equipos' : 'assets'} · {lang === 'es' ? 'abrir' : 'open'} ↗</text>
            {assets.map((asset, index) => <g key={asset.id} transform={`translate(${10 + index * 48},57)`} className="ob-plan-asset" onClick={(e) => { e.stopPropagation(); s.onSelect(asset.id); s.onScopeChange(area.id); }}><EquipmentGlyph asset={asset} compact/><text x="30" y="57" textAnchor="middle">{asset.id}</text></g>)}
          </g>;
        }) : model.assets.map((asset) => {
          const point = positions.get(asset.id) ?? sortedFallback(model, asset, 0); const core = model.coreAssets.some((item) => item.id === asset.id); const status = assetState(asset, s.trace, s.step, s.method, s.live, s.now, s.plant);
          return <g key={asset.id} className={`ob-plan-asset-dot ${core ? 'core' : 'boundary'} ${s.selected === asset.id ? 'selected' : ''}`} transform={`translate(${point.x} ${point.y})`} role="button" tabIndex={0} aria-label={`${asset.id} ${asset.name[lang]}`} aria-pressed={s.selected === asset.id} onClick={() => s.onSelect(asset.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s.onSelect(asset.id); } }}><circle className={`state-${status}`} r={core ? 27 : 21}/><foreignObject x="-28" y="-23" width="56" height="42"><div className="ob-site-symbol"><EquipmentGlyph asset={asset} compact/></div></foreignObject><text y="45" textAnchor="middle">{asset.id}</text><title>{asset.name[lang]} · {status}</title></g>;
        })}
        {s.scope !== 'global' && model.streams.map((stream) => { const from = positions.get(stream.source), to = positions.get(stream.target); if (!from || !to) return null; return <line key={stream.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} className={`ob-plan-stream ${stream.water_m3_h > 0 ? 'water' : 'solid'}`}/>; })}
      </svg></div>
      <div className="ob-plan-legend"><span><i className="ob-plan-swatch mine"/>{lang === 'es' ? 'Minería' : 'Mining'}</span><span><i className="ob-plan-swatch process"/>{lang === 'es' ? 'Proceso' : 'Process'}</span><span><i className="ob-plan-swatch water"/>{lang === 'es' ? 'Agua/solución' : 'Water/solution'}</span><span>{lang === 'es' ? 'Los valores de referencia no son telemetría de sitio.' : 'Authored reference values are not site telemetry.'}</span></div>
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
  const nameY = lines.length > 1 ? 98 : 105;
  return <g className={`ob-schematic-node ${core ? 'core' : 'boundary'} ${status} ${s.selected === asset.id ? 'selected' : ''}`} transform={`translate(${position.x} ${position.y})`} role="button" tabIndex={0} aria-label={`${asset.id} ${asset.name[lang]} · ${status}`} aria-pressed={s.selected === asset.id}
    onClick={() => s.onSelect(asset.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s.onSelect(asset.id); } }}>
    <rect className="ob-node-body" x="-82" y="-68" width="164" height="206" rx="15"/>
    <EquipmentGlyph asset={asset} schematic/>
    <text className="ob-node-id" y="78" textAnchor="middle">{asset.id}</text>
    <text className="ob-node-name" y={nameY} textAnchor="middle">{lines.map((line, index) => <tspan key={`${asset.id}-name-${index}`} x="0" dy={index === 0 ? 0 : 14}>{line}</tspan>)}</text>
    <text className="ob-node-context" y={lines.length > 1 ? 130 : 120} textAnchor="middle">{streamCount} {lang === 'es' ? 'conexiones' : 'connections'}</text>
    <circle className={`ob-status-mark ${status}`} cx="63" cy="-54" r="7"/>
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
  const positions = useMemo(() => layoutFor(model), [model]);
  if (model.scope === 'water-balance') return <WaterBalanceDiagram s={s} model={model}/>;
  const coreIds = new Set(model.coreAssets.map((asset) => asset.id));
  const boundaries = model.streams.filter((stream) => coreIds.has(stream.source) !== coreIds.has(stream.target));
  const visibleInternalStreams = model.internalStreams.filter((stream) => stream.nominal > 0 || stream.water_m3_h > 0);
  const portY = (index: number) => 125 + index * Math.min(100, 500 / Math.max(1, boundaries.length - 1));
  const blockedLabels: DiagramRect[] = [
    ...model.coreAssets.map((asset) => { const p = positions.get(asset.id) ?? sortedFallback(model, asset, 0); return { x: p.x - 82, y: p.y - 68, width: 164, height: 206 }; }),
    ...boundaries.map((stream, index) => { const incoming = coreIds.has(stream.target); return { x: incoming ? 10 : 1250, y: portY(index) - 56, width: 220, height: 112 }; }),
  ];
  const occupiedLabels: DiagramRect[] = [];
  return <section className="ob-area-inline-schematic" aria-label={lang === 'es' ? 'Esquema detallado del área' : 'Detailed area schematic'}>
    <div className="ob-section-title"><h3>{lang === 'es' ? 'Esquema de proceso del área' : 'Area process schematic'}</h3><span>{model.coreAssets.length} {lang === 'es' ? 'equipos internos' : 'in-area assets'} · {visibleInternalStreams.length} {lang === 'es' ? 'corrientes internas activas' : 'active internal streams'} · {boundaries.length} {lang === 'es' ? 'conectores entre áreas' : 'inter-area connectors'}</span></div>
    <span className="ob-diagram-scroll-hint">{lang === 'es' ? 'Deslice para recorrer el esquema completo' : 'Scroll horizontally to inspect the full schematic'}</span><div className="ob-diagram-scroll" role="region" tabIndex={0} aria-label={lang === 'es' ? 'Esquema desplazable' : 'Scrollable process schematic'}><svg className="ob-process-schematic" viewBox="0 0 1480 760" role="img" aria-label={`${areaName(s.scope, lang)} ${lang === 'es' ? 'esquema detallado' : 'detailed process schematic'}`} data-testid={`area-schematic-${s.scope}`}>
      <defs><marker id="ob-area-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0 0 10 5 0 10z" fill="context-stroke"/></marker></defs>
      <rect className="ob-schematic-sheet" x="8" y="8" width="1464" height="744" rx="18"/>
      <g className="ob-schematic-key"><circle cx="34" cy="34" r="6" fill="#bd9967"/><text x="48" y="38">{lang === 'es' ? 'Mineral y concentrado' : 'Ore and concentrate'}</text><circle cx="238" cy="34" r="6" fill="#39a8c8"/><text x="252" y="38">{lang === 'es' ? 'Agua y solución' : 'Water and solution'}</text><circle cx="405" cy="34" r="6" fill="#9a806b"/><text x="419" y="38">{lang === 'es' ? 'Relaves' : 'Tailings'}</text><text x="1440" y="38" textAnchor="end">{lang === 'es' ? 'TASAS DE REFERENCIA SINTÉTICAS' : 'SYNTHETIC REFERENCE RATES'}</text></g>
      {visibleInternalStreams.map((stream, index) => {
        const a = positions.get(stream.source), b = positions.get(stream.target); if (!a || !b) return null;
        const dx = b.x - a.x, vertical = Math.abs(dx) <= 30 && b.y > a.y, backflow = dx < -30 || (Math.abs(dx) <= 30 && b.y < a.y);
        const laneY = 710 - (index % 3) * 20;
        let path = backflow
          ? Math.abs(dx) <= 30
            ? `M${a.x} ${a.y + 68} V${laneY} H${a.x + 130} V${b.y + 68} H${b.x}`
            : `M${a.x} ${a.y + 68} V${laneY} H${b.x} V${b.y + 68}`
          : vertical ? `M${a.x} ${a.y + 68} V${b.y - 68}`
            : `M${a.x + 78} ${a.y} C${a.x + Math.max(90, dx * .34)} ${a.y},${b.x - Math.max(90, dx * .34)} ${b.y},${b.x - 78} ${b.y}`;
        let labelX = backflow && Math.abs(dx) <= 30 ? a.x - 130 : vertical ? a.x + 118 : (a.x + b.x) / 2;
        let labelY = backflow ? laneY - 24 : (a.y + b.y) / 2 + (vertical ? 0 : ((index % 3) - 1) * 31);
        if (model.scope === 'flotation') {
          if (stream.id === 'S17') { labelX = a.x + 165; labelY = (a.y + b.y) / 2; }
          if (stream.id === 'S18') { labelX = a.x - 190; labelY = laneY - 22; }
        }
        const label = placeDiagramLabel({ x: labelX, y: labelY }, blockedLabels, occupiedLabels, { width: 156, height: 40 });
        occupiedLabels.push(labelRect(label, { width: 156, height: 40 }));
        const color = streamColor(stream), noFlow = stream.nominal === 0 && stream.water_m3_h === 0;
        return <g key={stream.id} className={`ob-process-stream ${stream.water_m3_h > 0 ? 'water' : 'material'} ${noFlow ? 'no-flow' : ''}`}>
          <path d={path} fill="none" stroke={color} strokeWidth={stream.water_m3_h > 0 ? 3.5 : 4.2} strokeDasharray={stream.material === 'organic' || noFlow ? '9 7' : undefined} markerEnd="url(#ob-area-arrow)"/>
          <rect x={label.x - 78} y={label.y - 20} width="156" height="40" rx="9"/><text x={label.x} y={label.y - 3} textAnchor="middle" className="ob-stream-name">{streamMaterialLabel(stream.material, lang)}</text><text x={label.x} y={label.y + 13} textAnchor="middle" className="ob-stream-value">{streamValue(stream, lang)} · {stream.id}</text>
        <title>{stream.id} · {stream.source} → {stream.target} · {streamMaterialLabel(stream.material, lang)} · {streamValue(stream, lang)}{stream.water_m3_h > 0 ? ` · ${formatValue(stream.water_m3_h, lang, 1)} m³/h ${lang === 'es' ? 'agua' : 'water'}` : ''} · ${stream.delay_s} s</title>
        </g>;
      })}
      {boundaries.map((stream, index) => {
        const incoming = coreIds.has(stream.target), assetId = incoming ? stream.target : stream.source, node = positions.get(assetId);
        if (!node) return null;
        const port = { x: incoming ? 230 : 1250, y: portY(index) };
        const nodePort = { x: incoming ? node.x - 80 : node.x + 80, y: node.y };
        const midX = (port.x + nodePort.x) / 2, color = streamColor(stream);
        let path = incoming ? `M${port.x} ${port.y} C${midX} ${port.y},${midX} ${nodePort.y},${nodePort.x} ${nodePort.y}` : `M${nodePort.x} ${nodePort.y} C${midX} ${nodePort.y},${midX} ${port.y},${port.x} ${port.y}`;
        if (model.scope === 'flotation') {
          if (stream.id === 'S19') path = `M${nodePort.x} ${nodePort.y} H1160 V${port.y} H${port.x}`;
          if (stream.id === 'S22') path = `M${nodePort.x} ${nodePort.y} H600 V690 H1210 V${port.y} H${port.x}`;
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
  const waterLabelSize = { width: 144, height: 34 };
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
        const edgePoint = (origin: XY, x: number, y: number) => { const scale = Math.min(108 / Math.max(1, Math.abs(x)), 76 / Math.max(1, Math.abs(y))); return { x: origin.x + x * scale, y: origin.y + y * scale }; };
        const start = edgePoint(a, dx, dy), end = edgePoint(b, -dx, -dy);
        const middleX = (start.x + end.x) / 2, middleY = (start.y + end.y) / 2 + ((index % 3) - 1) * 42;
        const path = `M${start.x} ${start.y} Q${middleX} ${middleY} ${end.x} ${end.y}`;
        const labelPoint = placeDiagramLabel({ x: middleX, y: middleY }, blockedWaterLabels, occupiedWaterLabels, waterLabelSize, { left: 90, top: 65, right: 1390, bottom: 585 });
        occupiedWaterLabels.push(labelRect(labelPoint, waterLabelSize));
        return <g key={route.id} className="ob-water-route"><path d={path} markerEnd="url(#ob-water-arrow)"/><rect x={labelPoint.x - 72} y={labelPoint.y - 17} width="144" height="34" rx="9"/><text x={labelPoint.x} y={labelPoint.y - 2} textAnchor="middle">{formatValue(route.water_m3_h, lang, 1)} m³/h</text><text x={labelPoint.x} y={labelPoint.y + 11} textAnchor="middle" className="ob-water-route-count">{route.streamIds.length} {lang === 'es' ? 'corrientes' : 'streams'}</text><title>{label(route.sourceArea)} → {label(route.targetArea)} · {route.streamIds.join(', ')}</title></g>;
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
    <div className="ob-atlas-view"><div className="ob-view-caption"><div><span className="ob-eyebrow">{lang === 'es' ? 'DIAGRAMA DE PROCESO' : 'PROCESS SCHEMATIC'}</span><h2>{areaName(s.scope, lang)}</h2></div><span>{s.scope === 'global' ? (lang === 'es' ? 'Seleccione una zona para abrir su propio esquema detallado.' : 'Select an area to open its own detailed schematic.') : model.area!.purpose[lang]}</span></div>
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
      </svg></div></> : <AreaSchematicDiagram s={s} model={model}/>}
    </div>
  </AtlasFrame>;
}

