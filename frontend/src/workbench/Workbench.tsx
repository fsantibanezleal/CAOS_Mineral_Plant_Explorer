import { Children, useEffect, useMemo, useState } from 'react';
import { CaseWorkbench, useShellLang, type CaseDef } from '@fasl-work/caos-app-shell';
import { getJSON, loadCase, loadIndex, useArtifact, type CaseData } from '../api/artifacts';
import type { Plant, EngineEvidence, Observation, SiteSample } from '../lib/contract.types';
import { acceptSnapshot, linked, METHODS, safeStep } from './model';
import { AssetValues, DiagramView, EvidenceView, ModelView, SceneView, TrendsView, type ViewState } from './views';
import { ProcessRail, type ProcessControls } from './ProcessView';
import './plant.css';
export function Workbench() {
 const lang=useShellLang();const t=(en:string,es:string)=>lang==='es'?es:en;
 const index=useArtifact(s=>loadIndex(s),[]),graph=useArtifact(s=>getJSON<Plant>('plant.json',s),[]),engines=useArtifact(s=>getJSON<EngineEvidence>('engine-evidence.json',s),[]);
 const [overlay,setOverlay]=useState<'observations'|'engines'>('observations');
 const [caseId,setCaseId]=useState(''),[selected,setSelected]=useState('SAG'),[step,setStep]=useState(80),[playing,setPlaying]=useState(false),[method,setMethod]=useState('threshold'),[direction,setDirection]=useState<'none'|'upstream'|'downstream'>('none');
 const selectedCase=caseId||(index.state==='ready'?index.data.default_case:'');
 const loaded=useArtifact(s=>selectedCase?loadCase(selectedCase,s):new Promise<CaseData>(()=>undefined),[selectedCase]);
 const [processControls,setProcessControls]=useState<ProcessControls>({tau:6,current:400,acid:700});
 const [url,setUrl]=useState(''),[token,setToken]=useState(''),[live,setLive]=useState<Observation[]|null>(null),[history,setHistory]=useState<SiteSample[]>([]),[connected,setConnected]=useState(false),[sourceError,setSourceError]=useState(''),[now,setNow]=useState(Date.now());
 useEffect(()=>{if(!connected)return;const id=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(id);},[connected]);
 useEffect(()=>{if(!playing)return;const id=setInterval(()=>setStep(s=>{if(s>=159){setPlaying(false);return 159;}return s+1;}),250);return()=>clearInterval(id);},[playing]);
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
 const highlight=useMemo(()=>graph.state==='ready'&&direction!=='none'?linked(graph.data,selected,direction):new Set<string>(),[graph,selected,direction]);
 const s:ViewState|null=graph.state==='ready'&&engines.state==='ready'&&data?{plant:graph.data,trace:data.trace,engines:engines.data,selected,step,method,highlight,playing,live,now,onSelect:setSelected,history,processControls,overlay,onOverlay:setOverlay}:null;
 const cases:CaseDef[]=index.state==='ready'?index.data.cases.map(c=>({id:c.case_id,name:c.title[lang],category:c.category[lang]})):[];
 const rail=<>
   <p className="ob-source"><i className={`ob-dot ${live===null?'context':sourceError?'unavailable':'normal'}`}/>{live===null?t('Synthetic replay · paused by default','Reproducción sintética · inicio en pausa'):t('Site gateway · read-only','Gateway de planta · solo lectura')}</p>
   <label className="ob-control">{t('Equipment','Equipo')}<select aria-label={t('Equipment','Equipo')} value={selected} onChange={e=>setSelected(e.target.value)}>{graph.state==='ready'&&graph.data.assets.map(a=><option key={a.id} value={a.id}>{a.id} · {a.name[lang]}</option>)}</select></label>
   <label className="ob-control">{t('Trace connections','Seguir conexiones')}<select aria-label={t('Trace connections','Seguir conexiones')} value={direction} onChange={e=>setDirection(e.target.value as typeof direction)}><option value="none">{t('Selected asset','Equipo seleccionado')}</option><option value="upstream">{t('Upstream','Aguas arriba')}</option><option value="downstream">{t('Downstream','Aguas abajo')}</option></select></label>
   <label className="ob-control">{t('Replay time','Tiempo de reproducción')} · {step} s<input type="range" aria-label={t('Replay time','Tiempo de reproducción')} min="0" max="159" step="1" value={step} disabled={live!==null} onChange={e=>{setStep(safeStep(+e.target.value,160));setPlaying(false);}}/></label>
   <div className="ob-toolbar"><button disabled={live!==null} onClick={()=>setPlaying(!playing)} aria-pressed={playing}>{playing?t('Pause','Pausar'):t('Play replay','Reproducir')}</button><button disabled={live!==null} onClick={()=>{setStep(0);setPlaying(false);}}>{t('Reset time','Reiniciar tiempo')}</button></div>
   <label className="ob-control">{t('Discrepancy method','Método de discrepancia')}<select aria-label={t('Discrepancy method','Método de discrepancia')} value={method} disabled={live!==null} onChange={e=>setMethod(e.target.value)}>{METHODS.map(m=><option key={m}>{m}</option>)}</select></label>
   {s&&<AssetValues s={s}/>}
   <details className="ob-connect"><summary>{t('Connect plant source','Conectar fuente de planta')}</summary><p className="ob-note">{t('Use the configured read-only gateway. The token stays in memory. Replay models do not run on site data.','Use el gateway de solo lectura configurado. El token permanece en memoria. Los modelos de reproducción no se aplican a datos de planta.')}</p><label className="ob-control">{t('Gateway URL','URL del gateway')}<input type="url" value={url} disabled={connected} onChange={e=>setUrl(e.target.value)} placeholder="https://gateway.example"/></label><label className="ob-control">{t('Access token','Token de acceso')}<input type="password" autoComplete="off" value={token} disabled={connected} onChange={e=>setToken(e.target.value)}/></label><button onClick={()=>{if(connected){setConnected(false);setLive(null);setHistory([]);setToken('');setSourceError('');}else{setPlaying(false);setLive([]);setHistory([]);setConnected(true);}}} disabled={!connected&&(!url||!token)}>{connected?t('Disconnect','Desconectar'):t('Connect read-only','Conectar solo lectura')}</button>{sourceError&&<p role="alert">{sourceError}</p>}</details>
 </>;
 const pending=<p data-state={loaded.state==='error'?'unavailable':'loading'} className="caos-pending" role="status">{loaded.state==='error'?loaded.error:t('Loading plant and verified replay artifacts…','Cargando planta y artefactos verificados…')}</p>;
 const controls=Children.toArray(rail.props.children);
 return <CaseWorkbench caseId={selectedCase} source={live?'real':'synthetic'} cases={{cases,selectedId:selectedCase,onSelect:id=>{setCaseId(id);setPlaying(false);setStep(80);},layout:'select',deepLink:true}} controls={{asset:selected,time:step,method,trace:direction,source:live?'site':'replay',liveSequence:live?.[0]?.sequence??0,overlay,...processControls}} rail={[
 {id:'inspect',label:{en:'Inspect',es:'Inspeccionar'},content:<>{controls.filter((_,i)=>[0,1,2,6].includes(i))}</>},
 {id:'replay',label:{en:'Replay',es:'Reproducir'},content:<>{controls.slice(3,6)}</>},
 {id:'process',label:{en:'Process',es:'Proceso'},content:<ProcessRail value={processControls} onChange={setProcessControls}/>},
 {id:'source',label:{en:'Source',es:'Fuente'},content:controls[7]},
 ]} focus groups={[
  {id:'plant',label:{en:'3D plant',es:'Planta 3D'},lane:overlay==='engines'?'replay':live?'live':'replay',provenance:overlay==='engines'?'published':live?'real':'synthetic',content:s?<SceneView s={s}/>:pending},
  {id:'diagram',label:{en:'Process diagram',es:'Diagrama de proceso'},lane:live?'live':'replay',provenance:live?'real':'synthetic',content:s?<DiagramView s={s}/>:pending},
  {id:'trends',label:{en:'Trends',es:'Tendencias'},lane:live?'live':'replay',provenance:live?'real':'synthetic',content:s?<TrendsView s={s}/>:pending},
  {id:'engines',label:{en:'Engine evidence',es:'Evidencia de motores'},lane:'replay',provenance:'published',content:s?<EvidenceView s={s}/>:pending},
  {id:'models',label:{en:'Method comparison',es:'Comparar métodos'},lane:'replay',provenance:'synthetic',content:s?<ModelView s={s}/>:pending},
 ]} context={{content:<div className="ob-scroll"><h3>{t('Read this case','Leer este caso')}</h3><p>{data?.manifest.title[lang]}</p><p>{data?.manifest.expected_band[lang]}</p><p>{t('Select equipment to inspect process connections and exact engine evidence. The timeline controls synthetic replay. Source quality and numerical disagreement are separate.','Seleccione equipos para inspeccionar conexiones y evidencia exacta. El tiempo controla la reproducción sintética. Calidad de fuente y discrepancia numérica son distintas.')}</p><a href="/methodology">{t('Methods and assumptions','Métodos e hipótesis')}</a></div>}}/>;
}
