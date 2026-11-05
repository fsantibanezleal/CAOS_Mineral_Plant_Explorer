import { useShellLang } from '@fasl-work/caos-app-shell';
import type { ViewState } from './views';
import { assetState, channelIndices, formatValue, liveValue, snapshotValue } from './model';

const SOURCE = 'https://www.metso.com/globalassets/insights/ebooks/ebook-mill-liners-4491-01-2022-en-cns-lores.pdf';

/** Engineering section for the authored SAG mill asset. Geometry is explanatory and not to scale or a plant survey. */
export function ComponentSection({ s, showSource = true, showReading = true }: { s: ViewState; showSource?: boolean; showReading?: boolean }) {
  const lang = useShellLang();
  const mill = s.plant.assets.find((asset) => asset.id === s.selected);
  if (!mill || mill.kind !== 'mill') return <section className="ob-component-section ob-fill" aria-label={lang === 'es' ? 'Sección del componente' : 'Component section'}>
    <p className="ob-component-empty">{lang === 'es' ? 'Seleccione un molino del área de molienda para inspeccionar su sección de referencia.' : 'Select a mill in the grinding area to inspect its reference section.'}</p>
  </section>;
  const channel = channelIndices(s.trace, mill.id)[0];
  const liveRecord = s.live?.find((record) => record.asset_id === mill.id && liveValue(record, s.now, s.plant) !== null);
  const reading = s.live !== null ? liveRecord ? liveValue(liveRecord, s.now, s.plant) : null : channel === undefined ? null : snapshotValue(s.trace, s.step, s.method, channel);
  const unit = s.live !== null ? liveRecord?.unit : s.trace.channels[channel ?? -1]?.unit;
  const status = assetState(mill, s.trace, s.step, s.method, s.live, s.now, s.plant);
  const incoming = s.plant.streams.filter((stream) => stream.target === mill.id);
  const outgoing = s.plant.streams.filter((stream) => stream.source === mill.id);
  const t = (en: string, es: string) => lang === 'es' ? es : en;

  return <section className="ob-component-section ob-fill" aria-label={t('SAG mill engineering section', 'Sección de ingeniería del molino SAG')} data-component-section="SAG">
    <header className="ob-component-heading"><div><span className="ob-eyebrow">{t('REFERENCE SECTION · NOT TO SCALE', 'SECCIÓN DE REFERENCIA · NO A ESCALA')}</span><h2><code>{mill.id}</code> · {mill.name[lang]}</h2><p>{t('Lifters raise the ore and grinding-media charge; the lifted charge then falls and cascades through the mill.', 'Los levantadores elevan la carga de mineral y medios de molienda; luego la carga cae y fluye en cascada dentro del molino.')}</p></div>
      {showReading && <div className={`ob-component-reading ${status}`}><span>{liveRecord?.tag_id ?? (channel === undefined ? t('BOUND CHANNEL', 'CANAL ENLAZADO') : s.trace.channels[channel]?.id)}</span><strong>{reading === null ? t('No valid reading', 'Sin lectura válida') : `${formatValue(reading, lang)} ${unit ?? ''}`}</strong><small>{s.live === null ? t('Synthetic replay', 'Replay sintético') : liveRecord ? t('Read-only gateway observation', 'Observación de gateway de solo lectura') : t('No accepted observation for this asset', 'Sin observación aceptada para este equipo')}</small></div>}</header>
    <div className="ob-component-drawing-wrap"><svg className="ob-component-drawing" viewBox="0 0 1120 500" role="img" aria-label={t('SAG mill cross section with shell, liner plates, lifter bars, ore and steel media charge, feed and discharge trunnions', 'Corte transversal de molino SAG con carcasa, placas de revestimiento, levantadores, carga de mineral y bolas, muñón de alimentación y descarga')}>
      <defs><linearGradient id="sag-shell" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--color-surface-2)"/><stop offset="1" stopColor="var(--color-surface)"/></linearGradient><linearGradient id="sag-charge" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--color-accent-soft)"/><stop offset="1" stopColor="var(--color-accent)" stopOpacity=".56"/></linearGradient><marker id="sag-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="var(--color-accent)"/></marker></defs>
      <path className="ob-sag-trunnion" d="M122 250H233M887 250H998"/><circle className="ob-sag-shell" cx="560" cy="250" r="197"/><path className="ob-sag-opening" d="M560 250L560 53A197 197 0 0 1 718 132L560 250Z"/>
      <path className="ob-sag-charge" d="M380 327C394 254 441 203 503 168C566 132 625 104 687 114C719 164 725 201 717 240C706 294 672 337 623 365C545 408 439 394 380 327Z"/>
      {[0,1,2,3,4,5,6,7,8,9,10,11].map((n)=>{const a=(n*30-135)*Math.PI/180;const x1=560+174*Math.cos(a),y1=250+174*Math.sin(a),x2=560+194*Math.cos(a),y2=250+194*Math.sin(a);return <g key={n}><line className="ob-sag-liner" x1={x1} y1={y1} x2={x2} y2={y2}/><circle className="ob-sag-lifter" cx={x2} cy={y2} r="7"/></g>;})}
      {[0,1,2,3,4,5,6,7,8].map((n)=><circle key={n} className="ob-sag-media" cx={430+(n%4)*54+(Math.floor(n/4)%2)*20} cy={274+Math.floor(n/4)*39} r={n%3===0?7:5}/>)}
      <path className="ob-sag-rotation" d="M454 62A202 202 0 0 1 736 132" markerEnd="url(#sag-arrow)"/>
      <g className="ob-sag-label"><path d="M403 87L290 38H110"/><text x="16" y="34">{t('Feed trunnion', 'Muñón de alimentación')}</text><path d="M694 393L810 456H1005"/><text x="822" y="484">{t('Discharge end', 'Extremo de descarga')}</text><path d="M427 352L290 422H128"/><text x="16" y="438">{t('Ore + media charge', 'Carga de mineral + medios')}</text><path d="M694 177L817 103H1008"/><text x="824" y="91">{t('Lifter bars', 'Levantadores')}</text><path d="M560 62V22H767"/><text x="777" y="27">{t('Liner plates', 'Placas de revestimiento')}</text></g>
      <text className="ob-sag-center-note" x="560" y="471" textAnchor="middle">{t('Charge motion is a reference explanation; no mill speed or geometry is inferred.', 'El movimiento de carga es una explicación de referencia; no se infiere velocidad ni geometría del molino.')}</text>
    </svg></div>
    <div className="ob-component-boundaries"><section><span className="ob-eyebrow">{t('FEED BOUNDARY', 'LÍMITE DE ALIMENTACIÓN')}</span>{incoming.length ? incoming.map((stream) => <p key={stream.id}><strong>{stream.source}</strong> · {formatValue(stream.nominal, lang, 1)} {stream.unit}<small>{t('Authored reference rate', 'Tasa de referencia declarada')}</small></p>) : <p>{t('No authored incoming stream', 'No hay corriente de entrada declarada')}</p>}</section><section><span className="ob-eyebrow">{t('PRODUCT BOUNDARY', 'LÍMITE DE PRODUCTO')}</span>{outgoing.length ? outgoing.map((stream) => <p key={stream.id}><strong>{stream.target}</strong> · {formatValue(stream.nominal, lang, 1)} {stream.unit}<small>{t('Authored reference rate', 'Tasa de referencia declarada')}</small></p>) : <p>{t('No authored outgoing stream', 'No hay corriente de salida declarada')}</p>}</section>{showSource && <a href={SOURCE} target="_blank" rel="noreferrer">{t('Geometry basis: Metso mill-liner design guide', 'Base geométrica: guía de diseño de revestimientos Metso')}</a>}</div>
  </section>;
}
