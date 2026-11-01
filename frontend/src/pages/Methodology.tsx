import { DocPage, DocSection, Equation, Callout, TabGroups, Figure } from '@fasl-work/caos-app-shell';
import { P, useT } from '../content/bi';
import { bi } from '../content/plant-doc';
import { FlowFigure } from '../content/figures';
import content from '../content/methodology.json';
import ridge from '../content/ridge.json';

export function Methodology() {
 const t=useT();
 const methods=[...content.methods,ridge];
 const tabs=methods.map(m=>({id:m.id,label:t(m.title.en,m.title.es),content:
  <DocSection area="method" kind={m.kind as 'classical'|'learned'} title={m.title} refs={m.refs}>
   {m.paragraphs.map((p,i)=><P key={i} en={p.en} es={p.es}/>)}
   {m.equations.map((e,i)=><Equation key={i} tex={e.tex} caption={t(e.caption.en,e.caption.es)}/>)}
   <Figure caption={t(m.title.en,m.title.es)}><FlowFigure label={t(m.title.en,m.title.es)} stages={m.stages.map(s=>t(s.en,s.es))}/></Figure>
   <Callout variant="honest">{t(m.limitation.en,m.limitation.es)}</Callout>
  </DocSection>
 }));
 const groups=[
  {id:'reconcile',label:t('Reconcile observations','Conciliar observaciones'),ids:['quality-threshold','weighted-reconciliation','huber-reconciliation']},
  {id:'predict',label:t('Predict normal behavior','Predecir comportamiento normal'),ids:['causal-forecast','causal-ridge-forecast']},
  {id:'physical',label:t('Connect physical models','Conectar modelos físicos'),ids:['transport-aware-coherence','downstream-reference']},
 ].map(g=>({id:g.id,label:g.label,tabs:tabs.filter(x=>g.ids.includes(x.id))}));
 return <DocPage title={bi('Methodology','Metodología')} lede={t(
  'Follow method families, including two fitted causal predictors, from accepted observations to constrained state, learned prediction and bounded downstream references. The equations, constants and limitations describe the running implementations. Their separate roles help distinguish a valid reading, an estimate, a numerical discrepancy and a proven physical explanation.',
  'Explore familias, incluidos dos predictores causales ajustados, desde observaciones aceptadas hasta estado restringido, predicción y referencias de procesos conectados. Ecuaciones, constantes y límites describen implementaciones reales. Sus funciones separadas permiten distinguir lectura válida, estimación, discrepancia numérica y explicación física demostrada, antes de interpretar colores o comparar resultados.'
 )}><TabGroups groups={groups} ariaLabel={t('Method families','Familias de métodos')}/></DocPage>;
}
