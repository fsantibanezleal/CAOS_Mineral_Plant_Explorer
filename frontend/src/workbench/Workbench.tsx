import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useShellLang } from '@fasl-work/caos-app-shell';
import { getJSON, loadCase, loadIndex, useArtifact, type CaseData } from '../api/artifacts';
import type { Plant, EngineEvidence, Observation, SiteSample } from '../lib/contract.types';
import { acceptSnapshot, linked, METHODS, safeStep } from './model';
import { AssetValues, EvidenceView, ModelView, SceneView, TrendsView, type ViewState } from './views';
import { PlantOverviewView, ProcessSchematicView, SitePlanView } from './AreaVisuals';
import type { PlantScope } from './areas';
import { buildAreaModel, PLANT_AREAS } from './areas';
import { ProcessRail, type ProcessControls } from './ProcessView';
import './plant.css';

type PlantView = 'overview' | 'site-plan' | 'schematic' | '3d' | 'trends' | 'engines';
const VIEWS: Array<{ id: PlantView; en: string; es: string }> = [
  { id: 'overview', en: 'Global overview', es: 'Vista global' },
  { id: 'site-plan', en: '2D site plan', es: 'Plano 2D' },
  { id: 'schematic', en: 'Process schematic', es: 'Esquema de proceso' },
  { id: '3d', en: '3D plant', es: 'Planta 3D' },
  { id: 'trends', en: 'Trends', es: 'Tendencias' },
  { id: 'engines', en: 'CAOS engines', es: 'Motores CAOS' },
];
const asView = (value: string | null): PlantView => value === 'map' ? 'overview' : value === 'diagram' ? 'schematic' : VIEWS.some((view) => view.id === value) ? value as PlantView : 'overview';
const asScope = (value: string | null): PlantScope => value === 'global' || PLANT_AREAS.some((area) => area.id === value) ? value as PlantScope : 'global';

export function Workbench() {
 const lang=useShellLang(), t=(en:string,es:string)=>lang==='es'?es:en;
 const [search,setSearch]=useSearchParams();
 const index=useArtifact(s=>loadIndex(s),[]),graph=useArtifact(s=>getJSON<Plant>('plant.json',s),[]),engines=useArtifact(s=>getJSON<EngineEvidence>('engine-evidence.json',s),[]);
 const [caseId,setCaseId]=useState(()=>search.get('case')??'');
 const selectedCase=caseId||(index.state==='ready'?index.data.default_case:'');
 const loaded=useArtifact(s=>selectedCase?loadCase(selectedCase,s):new Promise<CaseData>(()=>undefined),[selectedCase]);
 const [scope,setScopeState]=useState<PlantScope>(()=>asScope(search.get('area')));
 const [view,setViewState]=useState<PlantView>(()=>asView(search.get('view')));
 const [selected,setSelectedState]=useState(()=>search.get('asset')||'SAG');
 const [step,setStepState]=useState(()=>safeStep(Number(search.get('step')??80),160));
 const [playing,setPlaying]=useState(false),[method,setMethodState]=useState(search.get('method')||'threshold');
 const [analysisMode,setAnalysisMode]=useState<'engines'|'models'>('engines');
 const [overlay,setOverlay]=useState<'observations'|'engines'>('observations');
 const [processControls,setProcessControls]=useState<ProcessControls>({tau:6,current:400,acid:700});
 const [url,setUrl]=useState(''),[token,setToken]=useState(''),[live,setLive]=useState<Observation[]|null>(null),[history,setHistory]=useState<SiteSample[]>([]),[connected,setConnected]=useState(false),[sourceError,setSourceError]=useState(''),[now,setNow]=useState(Date.now());
 useEffect(()=>{if(!connected)return;const id=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(id);},[connected]);
 useEffect(()=>{if(!playing)return;const id=setInterval(()=>setStepState(s=>{if(s>=159){setPlaying(false);return 159;}return s+1;}),250);return()=>clearInterval(id);},[playing]);
 useEffect(()=>{
   if(!connected||graph.state!=='ready')return;const abort=new AbortController();let busy=false;const previous=new Map<string,Observation>();
   async function poll(){if(busy)return;busy=true;try{const u=new URL(url);if(u.protocol!=='https:'&&!(u.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(u.hostname)))throw Error('HTTPS gateway or local test endpoint required');
     const r=await fetch(`${url.replace(/\/$/,'')}/api/observations`,{headers:{Authorization:`Bearer ${token}`},signal:abort.signal,cache:'no-store'});if(!r.ok)throw Error(`Gateway HTTP ${r.status}`);const data=await r.json();if(data.schema!=='orebridge.observations/v1'||(graph.state==='ready'&&data.graph_revision!==graph.data.revision)||!Array.isArray(data.records))throw Error('Observation contract mismatch');
     const records=acceptSnapshot(graph.state==='ready'?graph.data: (()=>{throw Error('Graph unavailable');})(),data.records,previous,Date.now());
     if(!abort.signal.aborted){setLive(records);setNow(Date.now());setHistory(h=>[...h,{receivedAt:Date.now(),records}].slice(-180));setSourceError('');}
   }catch(e){if(!abort.signal.aborted){setSourceError(String(e));setLive([]);setHistory(h=>[...h,{receivedAt:Date.now(),records:[]}].slice(-180));}}finally{busy=false;}}
   void poll();const timer=setInterval(()=>void poll(),2000);return()=>{abort.abort();clearInterval(timer);};
 },[connected,url,token,graph.state]);
 const data=loaded.state==='ready'&&loaded.data.manifest.case_id===selectedCase?loaded.data:null;
 const highlight=useMemo(()=>graph.state==='ready'&&selected&&view?linked(graph.data,selected,'downstream'):new Set<string>(),[graph,selected,view]);
 const updateQuery=(values:Record<string,string|null>)=>setSearch(previous=>{const next=new URLSearchParams(previous);for(const [key,value] of Object.entries(values))value===null?next.delete(key):next.set(key,value);return next;},{replace:true});
 useEffect(()=>{if(graph.state!=='ready'||scope==='global')return;const core=buildAreaModel(graph.data,scope).coreAssets;if(core.some(asset=>asset.id===selected)||!core[0])return;setSelectedState(core[0].id);updateQuery({asset:core[0].id});},[graph,scope,selected]);
 const chooseView=(next:PlantView)=>{setViewState(next);updateQuery({view:next});};
 const chooseScope=(next:PlantScope)=>{setScopeState(next);let nextAsset=selected;if(next!=='global'&&graph.state==='ready'){const core=buildAreaModel(graph.data,next).coreAssets;if(!core.some(asset=>asset.id===selected)&&core[0])nextAsset=core[0].id;}if(nextAsset!==selected)setSelectedState(nextAsset);updateQuery({area:next==='global'?null:next,asset:nextAsset});};
 const chooseAsset=(id:string)=>{setSelectedState(id);updateQuery({asset:id});};
 const setStep=(next:number)=>{const safe=safeStep(next,160);setStepState(safe);updateQuery({step:String(safe)});};
 const setMethod=(next:string)=>{setMethodState(next);updateQuery({method:next});};
 const chooseCase=(id:string)=>{setCaseId(id);setPlaying(false);setStep(80);updateQuery({case:id});};
 const s:ViewState|null=graph.state==='ready'&&engines.state==='ready'&&data?{plant:graph.data,trace:data.trace,engines:engines.data,selected,step,method,highlight,playing,live,now,onSelect:chooseAsset,history,processControls,overlay,onOverlay:setOverlay,scope,onScopeChange:chooseScope}:null;
 const pending=<p data-state={loaded.state==='error'?'unavailable':'loading'} className="caos-pending" role="status">{loaded.state==='error'?loaded.error:t('Loading plant and verified replay artifacts…','Cargando planta y artefactos verificados…')}</p>;
 const scopeName=scope==='global'?t('Whole plant','Planta completa'):PLANT_AREAS.find(area=>area.id===scope)?.name[lang]??scope;
 const availableCases=index.state==='ready'?index.data.cases:[];
 let content:React.ReactNode=pending;
 if(s){
   if(view==='overview')content=<PlantOverviewView s={s}/>;
   else if(view==='site-plan')content=<SitePlanView s={s}/>;
   else if(view==='schematic')content=<ProcessSchematicView s={s}/>;
   else if(view==='3d')content=<SceneView s={s}/>;
   else if(view==='trends')content=<TrendsView s={s}/>;
   else content=<div className="ob-analysis-view"><div className="ob-area-nav" role="tablist" aria-label={t('Engine views','Vistas de motores')}><button type="button" role="tab" aria-selected={analysisMode==='engines'} className={`ob-area-chip ${analysisMode==='engines'?'active':''}`} onClick={()=>setAnalysisMode('engines')}>{t('CAOS engine evidence','Evidencia de motores CAOS')}</button><button type="button" role="tab" aria-selected={analysisMode==='models'} className={`ob-area-chip ${analysisMode==='models'?'active':''}`} onClick={()=>setAnalysisMode('models')}>{t('Method comparison','Comparar métodos')}</button></div>{analysisMode==='engines'?<EvidenceView s={s}/>:<ModelView s={s}/>}</div>;
 }

 return <section className="ob-explorer" aria-label={t('Mineral plant workspace','Espacio de trabajo de planta mineral')}>
   <header className="ob-explorer-toolbar">
     <label className="ob-area-control"><span>{t('Area','Área')}</span><select aria-label={t('Plant area','Área de planta')} value={scope} onChange={event=>chooseScope(event.target.value as PlantScope)}><option value="global">{t('Whole plant','Planta completa')}</option>{PLANT_AREAS.map(area=><option key={area.id} value={area.id}>{area.name[lang]}</option>)}</select></label>
     <nav className="ob-view-tabs" role="tablist" aria-label={t('Plant views','Vistas de planta')}>{VIEWS.map(item=><button key={item.id} type="button" role="tab" aria-selected={view===item.id} className={view===item.id?'active':''} onClick={()=>chooseView(item.id)}>{item[lang]}</button>)}</nav>
     <span className={`ob-live-state ${live===null?'synthetic':sourceError?'unavailable':'live'}`}><i/>{live===null?t('Synthetic reference','Referencia sintética'):sourceError?t('Source unavailable','Fuente no disponible'):t('Read-only plant source','Fuente de planta de solo lectura')}</span>
   </header>
   <div className="ob-explorer-grid">
     <aside className="ob-explorer-side" aria-label={t('Plant inspection and replay controls','Inspección de planta y reproducción')}>
       <section className="ob-side-section"><span className="ob-eyebrow">{t('CURRENT AREA','ÁREA ACTUAL')}</span><h2>{scopeName}</h2><p>{scope==='global'?t('Open an area to inspect its dedicated process diagram, assets, boundaries and connected engine evidence.','Abra un área para inspeccionar su diagrama de proceso, equipos, límites y evidencia de motores.'):PLANT_AREAS.find(area=>area.id===scope)?.purpose[lang]}</p></section>
       <label className="ob-control">{t('Equipment','Equipo')}<select aria-label={t('Equipment','Equipo')} value={selected} onChange={event=>chooseAsset(event.target.value)}>{graph.state==='ready'&&(scope==='global'?graph.data.assets:buildAreaModel(graph.data,scope).coreAssets).map(asset=><option key={asset.id} value={asset.id}>{asset.id} · {asset.name[lang]}</option>)}</select></label>
       {s&&<AssetValues s={s}/>}
       <details className="ob-side-section" open><summary>{t('Replay and methods','Reproducción y métodos')}</summary>
         <label className="ob-control">{t('Replay case','Caso de reproducción')}<select aria-label={t('Replay case','Caso de reproducción')} value={selectedCase} onChange={event=>chooseCase(event.target.value)}>{availableCases.map(item=><option key={item.case_id} value={item.case_id}>{item.case_id} · {item.title[lang]}</option>)}</select></label>
         <label className="ob-control">{t('Replay time','Tiempo de reproducción')} · {step} s<input type="range" aria-label={t('Replay time','Tiempo de reproducción')} min="0" max="159" step="1" value={step} disabled={live!==null} onChange={event=>{setStep(+event.target.value);setPlaying(false);}}/></label>
         <div className="ob-toolbar"><button disabled={live!==null} onClick={()=>setPlaying(!playing)} aria-pressed={playing}>{playing?t('Pause','Pausar'):t('Play replay','Reproducir')}</button><button disabled={live!==null} onClick={()=>{setStep(0);setPlaying(false);}}>{t('Reset','Reiniciar')}</button></div>
         <label className="ob-control">{t('Discrepancy method','Método de discrepancia')}<select aria-label={t('Discrepancy method','Método de discrepancia')} value={method} disabled={live!==null} onChange={event=>setMethod(event.target.value)}>{METHODS.map(item=><option key={item}>{item}</option>)}</select></label>
       </details>
       <details className="ob-side-section"><summary>{t('Process model controls','Controles del modelo de proceso')}</summary><ProcessRail value={processControls} onChange={setProcessControls}/></details>
       <details className="ob-side-section"><summary>{t('Connect read-only plant source','Conectar fuente de planta de solo lectura')}</summary><p className="ob-note">{t('Credentials stay in memory. Plant observations are never used to run synthetic replay models.','Las credenciales permanecen en memoria. Las observaciones de planta nunca se usan para ejecutar modelos de reproducción sintética.')}</p><label className="ob-control">{t('Gateway URL','URL del gateway')}<input type="url" value={url} disabled={connected} onChange={event=>setUrl(event.target.value)} placeholder="https://gateway.example"/></label><label className="ob-control">{t('Access token','Token de acceso')}<input type="password" autoComplete="off" value={token} disabled={connected} onChange={event=>setToken(event.target.value)}/></label><button disabled={!connected&&(!url||!token)} onClick={()=>{if(connected){setConnected(false);setLive(null);setHistory([]);setToken('');setSourceError('');}else{setPlaying(false);setLive([]);setHistory([]);setConnected(true);}}}>{connected?t('Disconnect','Desconectar'):t('Connect read-only','Conectar solo lectura')}</button>{sourceError&&<p role="alert">{sourceError}</p>}</details>
     </aside>
     <main className="ob-explorer-stage" id="main" aria-label={`${scopeName} · ${VIEWS.find(item=>item.id===view)?.[lang]}`}>
       {content}
     </main>
   </div>
 </section>;
}
