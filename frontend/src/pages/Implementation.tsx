import { DocPage, DocSection, Equation, Callout, TabGroups } from '@fasl-work/caos-app-shell';
import { P, useT } from '../content/bi';
import { bi, PlantFlow } from '../content/plant-doc';
import topics from '../content/implementation.json';
export function Implementation(){
 const t=useT();
 const tabs=topics.map(x=>({id:x.id,label:t(x.title.en,x.title.es),content:<DocSection area={x.area} title={x.title} refs={x.refs}>
 {x.paragraphs.map((p,i)=><P key={i} en={p.en} es={p.es}/>)}
 {'equation' in x&&x.equation&&<Equation tex={x.equation} caption={x.caption?t(x.caption.en,x.caption.es):''}/>}
 {x.id==='architecture'&&<PlantFlow/>}
 {'note' in x&&x.note&&<Callout variant="note">{t(x.note.en,x.note.es)}</Callout>}
 {x.id==='contracts'&&<table className="caos-table"><thead><tr><th>{t('Boundary','Límite')}</th><th>{t('Identity','Identidad')}</th><th>{t('Failure behavior','Error')}</th></tr></thead><tbody><tr><td>{t('Observation','Observación')}</td><td>tag_id / asset_id / unit</td><td>{t('Refuse and preserve missing state','Rechazar y conservar ausencia')}</td></tr><tr><td>{t('Trace','Secuencia')}</td><td>case_id / SHA-256</td><td>{t('Explicit unavailable state','Ausencia explícita')}</td></tr><tr><td>{t('Graph','Grafo')}</td><td>revision / assetId</td><td>{t('Refuse incompatible identity','Rechazar identidad incompatible')}</td></tr></tbody></table>}
 </DocSection>}));
 const groups=[{id:'plant',label:t('Plant context','Contexto de planta'),ids:['architecture','geometry','lanes']},{id:'science',label:t('Scientific computation','Cálculo científico'),ids:['reproduction','state','copper']},{id:'delivery',label:t('Contracts and delivery','Contratos y entrega'),ids:['contracts','deployment']}].map(g=>({id:g.id,label:g.label,tabs:tabs.filter(x=>g.ids.includes(x.id))}));
 return <DocPage title={bi('Implementation','Implementación')} lede={t('Follow a plant snapshot from immutable evidence through offline estimation to synchronized geometry, diagrams and trends. These eight views explain reproducible calculations, typed data boundaries, browser interaction and optional source access, including the actual limits of each execution lane and its commissioning requirements.','Siga una instantánea desde fuentes inmutables y estimación hasta geometría, diagramas y tendencias sincronizados. Estas ocho vistas explican cálculos reproducibles, contratos, interacción y acceso opcional, con los límites de cada ejecución y la separación entre referencia pública y conexión real de planta.')}><TabGroups groups={groups} ariaLabel={t('Implementation topics','Temas de implementación')}/></DocPage>;
}
