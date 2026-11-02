import { useShellLang } from '@fasl-work/caos-app-shell';
import { areaForAsset, PLANT_AREAS } from './areas';
import type { ViewState } from './views';
import { assetState, evidenceStep, formatValue, liveValue, snapshotValue } from './model';
import { streamMaterialLabel } from './stream-material';

const SIGNAL_SLOTS: Record<string, { en: string[]; es: string[] }> = {
  PIT: { en: ['Ore production / loading rate', 'Ore grade and hardness'], es: ['Producción / tasa de carguío', 'Ley y dureza del mineral'] },
  SHV: { en: ['Payload and loading cycle', 'Availability / utilization'], es: ['Carga útil y ciclo de carguío', 'Disponibilidad / utilización'] },
  TRK: { en: ['Payload and haul cycle', 'Availability / utilization'], es: ['Carga útil y ciclo de transporte', 'Disponibilidad / utilización'] },
  CR1: { en: ['Feed and product rate', 'Drive power / energy'], es: ['Caudal de alimentación y producto', 'Potencia / energía del accionamiento'] },
  CR2: { en: ['Recycle feed and product rate', 'Drive power / energy'], es: ['Caudal de recirculación y producto', 'Potencia / energía del accionamiento'] },
  SAG: { en: ['Fresh and total feed', 'Drive power', 'Product size / cyclone feed'], es: ['Alimentación fresca y total', 'Potencia del accionamiento', 'Tamaño de producto / alimentación a ciclones'] },
  BAL: { en: ['Mill feed and drive power', 'Product size'], es: ['Alimentación y potencia del molino', 'Tamaño de producto'] },
  CY1: { en: ['Feed pressure and rate', 'Overflow size', 'Underflow / recycle rate'], es: ['Presión y caudal de alimentación', 'Tamaño del rebalse', 'Caudal de descarga inferior / recirculación'] },
  FL1: { en: ['Feed rate and grade', 'Air rate / froth level', 'Concentrate grade and recovery'], es: ['Caudal y ley de alimentación', 'Caudal de aire / nivel de espuma', 'Ley y recuperación de concentrado'] },
  FL2: { en: ['Feed and concentrate grade', 'Air rate / froth level', 'Recovery'], es: ['Caudal y ley de alimentación', 'Caudal de aire / nivel de espuma', 'Recuperación'] },
  RGM: { en: ['Feed rate and drive power', 'Product size'], es: ['Caudal y potencia del accionamiento', 'Tamaño de producto'] },
  LCH: { en: ['Solution flow and pH', 'Temperature / acid concentration'], es: ['Caudal de solución y pH', 'Temperatura / concentración de ácido'] },
  SX1: { en: ['Aqueous / organic flow', 'Copper transfer / phase quality'], es: ['Caudal acuoso / orgánico', 'Transferencia de cobre / calidad de fases'] },
  SX2: { en: ['Electrolyte flow and copper concentration', 'Acid concentration'], es: ['Caudal de electrolito y concentración de cobre', 'Concentración de ácido'] },
  EW1: { en: ['Current / voltage', 'Electrolyte flow and cathode production'], es: ['Corriente / voltaje', 'Caudal de electrolito y producción de cátodos'] },
  CTH: { en: ['Feed rate and density', 'Underflow density', 'Overflow solids / inventory'], es: ['Caudal y densidad de alimentación', 'Densidad de descarga inferior', 'Sólidos de rebalse / inventario'] },
  TTH: { en: ['Feed rate and density', 'Underflow density', 'Overflow solids / inventory'], es: ['Caudal y densidad de alimentación', 'Densidad de descarga inferior', 'Sólidos de rebalse / inventario'] },
  FIL: { en: ['Feed solids', 'Cake moisture / filtration rate', 'Cycle time'], es: ['Sólidos de alimentación', 'Humedad de torta / tasa de filtración', 'Tiempo de ciclo'] },
  MWT: { en: ['Make-up water flow'], es: ['Caudal de agua de reposición'] },
  PU2: { en: ['Reclaimed water flow', 'Pump state / power'], es: ['Caudal de agua recuperada', 'Estado / potencia de bomba'] },
  PWT: { en: ['Tank level / inventory', 'Inflow and outflow'], es: ['Nivel / inventario del estanque', 'Caudal de entrada y salida'] },
  TSF: { en: ['Tailings deposition / pond level', 'Monitoring observations (separate geotechnical source)'], es: ['Deposición de relaves / nivel de laguna', 'Observaciones de monitoreo (fuente geotécnica separada)'] },
  SUB: { en: ['Electrical load / demand'], es: ['Carga / demanda eléctrica'] },
};
const KIND_SLOTS: Record<string, { en: string[]; es: string[] }> = {
  stockpile:{en:['Inventory / level','Feed rate'],es:['Inventario / nivel','Caudal de alimentación']},
  conveyor:{en:['Belt feed rate','Drive state / power'],es:['Caudal de correa','Estado / potencia del accionamiento']},
  screen:{en:['Feed rate','Oversize / undersize split'],es:['Caudal de alimentación','Separación sobretamaño / bajotamaño']},
  bin:{en:['Inventory / level','Discharge rate'],es:['Inventario / nivel','Caudal de descarga']},
  pump:{en:['Flow and discharge pressure','Pump state / power'],es:['Caudal y presión de descarga','Estado / potencia de bomba']},
  cyclone:{en:['Feed pressure / rate','Overflow size','Underflow / recycle rate'],es:['Presión / caudal de alimentación','Tamaño de rebalse','Caudal de descarga inferior / recirculación']},
  flotation:{en:['Feed grade / rate','Air rate / froth level','Concentrate grade / recovery'],es:['Ley / caudal de alimentación','Caudal de aire / nivel de espuma','Ley / recuperación de concentrado']},
  mill:{en:['Feed rate','Drive power','Product size'],es:['Caudal de alimentación','Potencia del accionamiento','Tamaño del producto']},
  thickener:{en:['Feed density','Underflow density','Overflow solids / inventory'],es:['Densidad de alimentación','Densidad de descarga inferior','Sólidos de rebalse / inventario']},
  filter:{en:['Feed solids','Cake moisture / filtration rate','Cycle time'],es:['Sólidos de alimentación','Humedad de torta / tasa de filtración','Tiempo de ciclo']},
  truck:{en:['Payload / haul rate','Availability / cycle time'],es:['Carga útil / tasa de transporte','Disponibilidad / tiempo de ciclo']},
  shovel:{en:['Loading rate / payload','Availability / cycle time'],es:['Tasa de carguío / carga útil','Disponibilidad / tiempo de ciclo']},
  heap:{en:['Irrigation flow / solution grade','Acid concentration'],es:['Caudal de riego / ley de solución','Concentración de ácido']},
  leach:{en:['Solution flow / pH','Temperature / acid concentration'],es:['Caudal de solución / pH','Temperatura / concentración de ácido']},
  sx:{en:['Aqueous / organic flow','Copper transfer / phase quality'],es:['Caudal acuoso / orgánico','Transferencia de cobre / calidad de fases']},
  electrowin:{en:['Current / voltage','Electrolyte flow / cathode production'],es:['Corriente / voltaje','Caudal de electrolito / producción de cátodos']},
  pond:{en:['Solution inventory / level','Inflow / outflow'],es:['Inventario / nivel de solución','Caudal de entrada / salida']},
  tank:{en:['Tank level / inventory','Inflow / outflow'],es:['Nivel / inventario del estanque','Caudal de entrada / salida']},
  sensor:{en:['Measured variable / status'],es:['Variable medida / estado']},
};
const SLOT_BINDINGS:Record<string,Record<string,string[]>>={
  ROM:{'Feed rate':['ROM.feed']},CR1:{'Feed and product rate':['CR1.product']},SAG:{'Fresh and total feed':['SAG.feed']},CY1:{'Feed pressure and rate':['CY1.feed'],'Underflow / recycle rate':['CY1.recycle']},
  FL1:{'Feed rate and grade':['FL1.feed'],'Concentrate dry solids':['FL1.concentrate'],'Tailings dry solids':['FL1.tailings']},
  CTH:{'Feed rate and density':['CTH.feed'],'Underflow density':['CTH.underflow']},TTH:{'Feed rate and density':['TTH.feed'],'Underflow density':['TTH.underflow']},
  MWT:{'Make-up water flow':['MWT.flow']},PU2:{'Reclaimed water flow':['PU2.flow']},PWT:{'Inflow and outflow':['PWT.in','PWT.out']},
};

function fmtTime(value: string | null | undefined, lang: string) {
  if (!value) return lang === 'es' ? 'sin hora de origen' : 'no source timestamp';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(lang, { dateStyle: 'medium', timeStyle: 'medium' });
}

function ageSeconds(value: string | null | undefined, now: number) {
  if (!value) return null;
  const at = Date.parse(value);
  return Number.isFinite(at) ? Math.max(0, Math.round((now - at) / 1000)) : null;
}

export function AssetInspector({ s, assetId = s.selected, focus = false }: { s: ViewState; assetId?: string; focus?: boolean }) {
  const lang = useShellLang();
  const asset = s.plant.assets.find((row) => row.id === assetId);
  if (!asset) return null;
  const assetAreaId = areaForAsset(s.plant, asset.id);
  const assetArea = PLANT_AREAS.find((row) => row.id === assetAreaId);
  const tags = s.plant.tags.filter((tag) => tag.asset_id === asset.id);
  const liveRecords = s.live?.filter((record) => record.asset_id === asset.id) ?? [];
  const status = assetState(asset, s.trace, s.step, s.method, s.live, s.now, s.plant);
  const linkedEngines = s.engines.records.filter((record) => record.asset_id === asset.id);
  const relatedStreams = s.plant.streams.filter((stream) => stream.source === asset.id || stream.target === asset.id);
  const signalSlots = SIGNAL_SLOTS[asset.id]?.[lang] ?? KIND_SLOTS[asset.kind]?.[lang] ?? [];
  const tagFor = (tagId: string) => liveRecords.find((record) => record.tag_id === tagId);
  return <aside className={`ob-asset-inspector ${focus ? 'focus' : ''}`} aria-label={lang === 'es' ? 'Detalle del equipo seleccionado' : 'Selected equipment detail'} data-asset-inspector={asset.id}>
    <header className="ob-inspector-header">
      <div><span className="ob-eyebrow">{lang === 'es' ? 'EQUIPO SELECCIONADO' : 'SELECTED EQUIPMENT'}</span><h2><code>{asset.id}</code> · {asset.name[lang]}</h2></div>
      <span className={`ob-inspector-state ${status}`}><i className={`ob-dot ${status}`}/>{status === 'normal' ? (s.live === null ? (lang === 'es' ? 'Dentro del umbral del replay' : 'Within replay threshold') : (lang === 'es' ? 'Observación válida' : 'Valid observation')) : status === 'alarm' ? (lang === 'es' ? 'Discrepancia del replay' : 'Replay discrepancy') : status === 'context' ? (lang === 'es' ? 'Contexto de referencia' : 'Reference context') : (lang === 'es' ? 'Sin observación válida' : 'No valid observation')}</span>
    </header>
    <p className="ob-inspector-description">{asset.description[lang]}</p>
    <div className="ob-inspector-context"><span>{lang === 'es' ? 'Área' : 'Area'} <strong>{assetArea?.name[lang] ?? (lang === 'es' ? 'Compartido / contexto' : 'Shared / context')}</strong></span><span>{lang === 'es' ? 'Tipo' : 'Type'} <strong>{asset.kind.replaceAll('_', ' ')}</strong></span><span>{lang === 'es' ? 'Fuente mostrada' : 'Displayed source'} <strong>{s.live === null ? (lang === 'es' ? 'Replay sintético' : 'Synthetic replay') : (lang === 'es' ? 'Gateway de solo lectura' : 'Read-only gateway')}</strong></span></div>

    <section className="ob-inspector-section"><h3>{lang === 'es' ? 'Variables vinculadas' : 'Bound variables'} <small>{tags.length} {lang === 'es' ? 'canales' : 'channels'}</small></h3>
      {tags.length ? <div className="ob-inspector-signals">{tags.map((tag) => {
        const record = tagFor(tag.tag_id);
        const channel = s.trace.channels.findIndex((row) => row.asset_id === asset.id && (row.id === tag.tag_id || row.label.en === tag.label.en));
        const replayValue = channel >= 0 ? snapshotValue(s.trace, s.step, s.method, channel) : null;
        const value = s.live === null ? replayValue : record ? liveValue(record, s.now, s.plant) : null;
        const valid = s.live === null ? channel >= 0 && replayValue !== null : !!record && liveValue(record, s.now, s.plant) !== null;
        const sourceTime = record?.source_time ?? record?.server_time;
        const age = ageSeconds(sourceTime, s.now);
        return <article key={tag.tag_id} className={`ob-inspector-signal ${valid ? 'valid' : 'missing'}`}><div><strong>{tag.label[lang]}</strong><small><code>{tag.tag_id}</code></small></div><b>{formatValue(value, lang)} <small>{tag.unit}</small></b><span>{s.live === null ? (channel >= 0 ? `${lang === 'es' ? 'evidencia replay' : 'replay evidence'} · ${s.trace.time_s[evidenceStep(s.trace, s.step, s.method, channel)] ?? '—'} s` : (lang === 'es' ? 'sin canal de replay' : 'no replay channel')) : record ? `${record.quality} · ${fmtTime(sourceTime, lang)}${age === null ? '' : ` · ${age} s`}` : (lang === 'es' ? 'sin lectura de la fuente' : 'no reading from source')}</span></article>;
      })}</div> : <p className="ob-inspector-empty">{lang === 'es' ? 'Este equipo no tiene tags de planta enlazados en el contrato actual.' : 'No plant tags are bound to this equipment in the current contract.'}</p>}
      {s.live !== null && liveRecords.length === 0 && <p className="ob-inspector-empty">{lang === 'es' ? 'La conexión está configurada, pero no entregó observaciones para este equipo.' : 'A source is configured, but it returned no observations for this equipment.'}</p>}
    </section>

      {signalSlots.length > 0 && <section className="ob-inspector-section"><h3>{lang === 'es' ? 'Variables relevantes sin enlace' : 'Relevant variables without a binding'}</h3><p className="ob-inspector-note">{lang === 'es' ? 'Variables de interés de proceso; no existen tags enlazados para estas en el contrato actual.' : 'Process variables of interest; no tag bindings for these exist in the current contract.'}</p><ul className="ob-inspector-unbound">{signalSlots.filter((_, index) => { const englishSlots = SIGNAL_SLOTS[asset.id]?.en ?? KIND_SLOTS[asset.kind]?.en ?? []; const slot = englishSlots[index]; return !(SLOT_BINDINGS[asset.id]?.[slot] ?? []).some((tagId) => tags.some((tag) => tag.tag_id === tagId)); }).map((slot) => <li key={slot}><i/> {slot}</li>)}</ul></section>}

    <section className="ob-inspector-section"><h3>{lang === 'es' ? 'Conexiones de proceso' : 'Process connections'} <small>{relatedStreams.length}</small></h3>
      {relatedStreams.length ? <div className="ob-inspector-streams">{relatedStreams.map((stream) => <div key={stream.id} className={stream.source === asset.id ? 'outgoing' : 'incoming'}><span>{stream.source === asset.id ? 'OUT' : 'IN'}</span><strong>{stream.source === asset.id ? stream.target : stream.source} · {streamMaterialLabel(stream.material, lang)}</strong><b>{formatValue(stream.nominal, lang, 1)} <small>{stream.unit}</small></b><em>{lang === 'es' ? 'Tasa de referencia' : 'Reference rate'}{stream.water_m3_h > 0 ? ` · ${formatValue(stream.water_m3_h, lang, 1)} m³/h ${lang === 'es' ? 'aporte de agua' : 'water contribution'}` : ''}</em></div>)}</div> : <p className="ob-inspector-empty">{lang === 'es' ? 'No hay corrientes enlazadas en el grafo.' : 'No streams are linked in the graph.'}</p>}
    </section>

    <section className="ob-inspector-section"><h3>{lang === 'es' ? 'Evidencia CAOS vinculada' : 'Linked CAOS evidence'} <small>{linkedEngines.length}</small></h3>{linkedEngines.length ? linkedEngines.map((record) => <article className="ob-inspector-engine" key={record.id}><strong>{record.id}</strong><span>{record.version} · {record.provenance}</span>{record.metrics.slice(0, 3).map((metric) => <small key={`${record.id}-${metric.path}`}>{metric.label}: {formatValue(metric.value, lang)} {metric.unit}</small>)}</article>) : <p className="ob-inspector-empty">{lang === 'es' ? 'No hay artefactos CAOS vinculados directamente a este equipo.' : 'No CAOS artifacts are directly linked to this equipment.'}</p>}</section>
    <footer>{s.live === null ? (lang === 'es' ? 'El replay y las tasas de referencia son datos sintéticos; no son mediciones de la planta.' : 'Replay and reference rates are synthetic data; they are not plant measurements.') : (lang === 'es' ? 'Fuente de solo lectura. Calidad, unidad y antigüedad se validan por observación.' : 'Read-only source. Quality, unit and freshness are validated per observation.')}</footer>
  </aside>;
}
