import { useEffect, useMemo, useRef, useState } from 'react';
import { usePausedViz, useShellLang } from '@fasl-work/caos-app-shell';
import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { Plant, Trace, Observation, EngineEvidence } from '../lib/contract.types';
import { assetState, liveValue, snapshotValue } from './model';
import { buildPlant, validateGLTF } from './scene';
import { sceneValueLabel } from './scene-label';
import { areaForAsset, buildAreaModel, PLANT_AREAS } from './areas';
import type { PlantScope } from './areas';
import type { ViewState } from './views';

type SceneHoverState=Omit<Pick<ViewState,'plant'|'trace'|'step'|'method'|'live'|'now'|'engines'|'overlay'>,'trace'> & {trace:Trace|null};
function SceneHoverCard({s,assetId}:{s:SceneHoverState;assetId:string}) {
  const lang=useShellLang();
  const asset=s.plant.assets.find(item=>item.id===assetId);
  if(!asset)return null;
  const index=s.trace?.channels.findIndex(channel=>channel.asset_id===asset.id)??-1;
  const live=s.live?.find(record=>record.asset_id===asset.id);
  const engine=s.engines.records.find(record=>record.asset_id===asset.id)?.metrics[0];
  const value=s.overlay==='engines'?(engine?.value??null):s.live?(live?liveValue(live,s.now,s.plant):null):(index>=0&&s.trace?snapshotValue(s.trace,s.step,s.method,index):null);
  const unit=s.overlay==='engines'?engine?.unit:s.live?live?.unit:index>=0&&s.trace?s.trace.channels[index].unit:'';
  const status=s.overlay==='engines'?'context':assetState(asset,s.trace,s.step,s.method,s.live,s.now,s.plant);
  const statusLabel=status==='normal'?(lang==='es'?'Dentro del umbral':'Within model threshold'):status==='alarm'?(lang==='es'?'Discrepancia del modelo':'Model discrepancy'):status==='unavailable'?(lang==='es'?'Sin dato evaluable':'Unavailable'):(lang==='es'?'Contexto de referencia':'Reference context');
  return <aside className="ob-scene-hovercard" role="status" aria-live="polite">
    <span>{lang==='es'?'EQUIPO':'EQUIPMENT'} · {asset.id}</span><strong>{asset.name[lang]}</strong>
    <div><i className={`ob-dot ${status}`}/>{statusLabel}</div>
    <b>{sceneValueLabel(value,unit,lang,s.overlay,!!s.live)}</b>
    <small>{s.live?(lang==='es'?'Fuente de planta · solo lectura':'Read-only plant source'):s.overlay==='engines'?(lang==='es'?'Referencia de motor CAOS':'CAOS engine reference'):(lang==='es'?'Reproducción sintética':'Synthetic replay')}</small>
  </aside>;
}
export function PlantScene({plant,trace,step,method,selected,onSelect,highlight,playing,live,now,engines,overlay,onOverlay,scope,onScopeChange}:{engines:EngineEvidence;overlay:'observations'|'engines';onOverlay:(v:'observations'|'engines')=>void;plant:Plant;trace:Trace|null;step:number;method:string;selected:string;onSelect:(id:string)=>void;highlight:Set<string>;playing:boolean;live:Observation[]|null;now:number;scope:PlantScope;onScopeChange:(scope:PlantScope)=>void}) {
  const lang=useShellLang();
  const areaModel=useMemo(()=>buildAreaModel(plant,scope),[plant,scope]);
  const host=useRef<HTMLDivElement>(null), root=useRef<T.Group|null>(null), assetObjects=useRef(new Map<string,T.Object3D>()), cameraRef=useRef<{camera:T.PerspectiveCamera;controls:OrbitControls}|null>(null), groundRef=useRef<T.Mesh|null>(null), gridRef=useRef<T.GridHelper|null>(null);
  const invalidate=useRef<()=>void>(()=>{}),syncAnchors=useRef<()=>void>(()=>{});
  const [hovered,setHovered]=useState<string|null>(null);
  const state=useRef({selected,onSelect,onScopeChange,highlight,playing,trace,step,method,live,now,engines,overlay,lang,scope,hovered,areaAssetIds:new Set(areaModel.coreAssets.map(a=>a.id)),areaStreamIds:new Set(areaModel.internalStreams.map(e=>e.id))});state.current={selected,onSelect,onScopeChange,highlight,playing,trace,step,method,live,now,engines,overlay,lang,scope,hovered,areaAssetIds:new Set(areaModel.coreAssets.map(a=>a.id)),areaStreamIds:new Set(areaModel.internalStreams.map(e=>e.id))};
  const draw=useRef<(elapsed:number)=>void>(()=>{});
  const {play:requestDraw,pause:pauseDraw}=usePausedViz((_dt,elapsed)=>{draw.current(elapsed);return state.current.playing;});
  const [error,setError]=useState(''); const [stats,setStats]=useState({triangles:0,ms:0}); const statsCaptured=useRef(false); const [imported,setImported]=useState(false);
  useEffect(()=>{
    if(!host.current)return;const element=host.current;let renderer:T.WebGLRenderer;
    statsCaptured.current=false;
    try{renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch{setError('WebGL unavailable; use the process diagram and asset selector. / WebGL no disponible; use el diagrama y selector.');return;}
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.domElement.setAttribute('aria-label','Connected plant 3D / Planta conectada 3D');element.appendChild(renderer.domElement);
    const scene=new T.Scene();const camera=new T.PerspectiveCamera(38,1,.1,2400);camera.position.set(175,150,195);
    const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(8,0,0);controls.enableDamping=false;controls.minDistance=15;controls.maxDistance=650;controls.maxPolarAngle=Math.PI*.49;cameraRef.current={camera,controls};
    scene.add(new T.HemisphereLight(0xe8f0ee,0x53635f,1.6));const sun=new T.DirectionalLight(0xfff0d5,3.2);sun.position.set(-115,190,115);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-190;sun.shadow.camera.right=190;sun.shadow.camera.top=140;sun.shadow.camera.bottom=-140;sun.shadow.bias=-.00015;scene.add(sun);
    const fill=new T.DirectionalLight(0xb9d5e7,1.05);fill.position.set(100,75,-110);scene.add(fill);
    const ground=new T.Mesh(new T.PlaneGeometry(420,260),new T.MeshStandardMaterial({color:0x394a4a,roughness:.92}));ground.rotation.x=-Math.PI/2;ground.position.y=-.4;ground.receiveShadow=true;groundRef.current=ground;scene.add(ground);
    const grid=new T.GridHelper(280,56,0x73847d,0x53635f);grid.position.y=-.34;gridRef.current=grid;for(const gridMaterial of Array.isArray(grid.material)?grid.material:[grid.material]){gridMaterial.transparent=true;gridMaterial.opacity=.035;}scene.add(grid);
    const objects=buildPlant(plant);root.current=objects;scene.add(objects);assetObjects.current=new Map(objects.children.map(o=>[String(o.userData.assetId),o]));
    const edges:T.Mesh[]=[];const particles:T.Mesh[]=[];
    for(const e of plant.streams){const a=plant.assets.find(a=>a.id===e.source)!,b=plant.assets.find(a=>a.id===e.target)!;const p=new T.Vector3(a.position[0],2,a.position[2]),q=new T.Vector3(b.position[0],2,b.position[2]);const mid=p.clone().lerp(q,.5);mid.y=e.material.includes('water')?1:5;
      const isWater=e.material==='water'||(e.water_m3_h>0&&['solution','electrolyte'].includes(e.material));
      const curve=new T.QuadraticBezierCurve3(p,mid,q);const pipe=new T.Mesh(new T.TubeGeometry(curve,18,isWater?.08:.12,7,false),new T.MeshStandardMaterial({color:isWater?0x288cba:0x9b7751,transparent:true,opacity:.78}));pipe.userData.stream=e;scene.add(pipe);edges.push(pipe);
      const dot=new T.Mesh(new T.SphereGeometry(.14,8,6),new T.MeshBasicMaterial({color:isWater?0x8ddafa:0xffdf9c}));dot.userData.curve=curve;scene.add(dot);particles.push(dot);
    }
    syncAnchors.current=()=>{
      objects.updateWorldMatrix(true,true);
      edges.forEach((edge,i)=>{const e=edge.userData.stream;const a=assetObjects.current.get(e.source),b=assetObjects.current.get(e.target);const aVisible=!!a&&a.visible,bVisible=!!b&&b.visible;const inScope=state.current.areaStreamIds.has(e.id);edge.visible=inScope&&aVisible&&bVisible;particles[i].userData.available=edge.visible;if(!inScope||!a||!b||(!aVisible&&!bVisible))return;let p=a.getWorldPosition(new T.Vector3()).add(new T.Vector3(0,2,0)),q=b.getWorldPosition(new T.Vector3()).add(new T.Vector3(0,2,0));if(aVisible!==bVisible){const visible=aVisible?p:q,hidden=aVisible?q:p;const direction=visible.clone().sub(hidden).setY(0).normalize();if(aVisible){p=visible;q=visible.clone().add(direction.multiplyScalar(12));}else{p=visible.clone().sub(direction.multiplyScalar(12));q=visible;}}const mid=p.clone().lerp(q,.5);mid.y+=e.material.includes('water')?1:5;const curve=new T.QuadraticBezierCurve3(p,mid,q);edge.geometry.dispose();edge.geometry=new T.TubeGeometry(curve,18,e.material.includes('water')?.4:.65,5,false);particles[i].userData.curve=curve;});
      invalidate.current();
    };syncAnchors.current();
    const resize=new ResizeObserver(()=>{const w=element.clientWidth,h=element.clientHeight;if(w>0&&h>0){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();invalidate.current();}});resize.observe(element);
    const recolor=()=>{const light=document.documentElement.dataset.theme==='light'||document.documentElement.getAttribute('data-color-scheme')==='light';scene.background=new T.Color(light?0xdce4e2:0x1b292c);(ground.material as T.MeshStandardMaterial).color.setHex(light?0xb8c2bd:0x394a4a);invalidate.current();};recolor();const theme=new MutationObserver(recolor);theme.observe(document.documentElement,{attributes:true});
    let downX=0,downY=0;const down=(e:PointerEvent)=>{downX=e.clientX;downY=e.clientY;};const ray=new T.Raycaster();
    const hitAsset=(e:PointerEvent)=>{const r=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);for(const hit of ray.intersectObjects(objects.children,true)){let o:T.Object3D|null=hit.object;while(o&&!o.userData.assetId)o=o.parent;if(o?.userData.assetId)return String(o.userData.assetId);}return null;};
    const click=(e:PointerEvent)=>{if(Math.hypot(e.clientX-downX,e.clientY-downY)>6)return;const id=hitAsset(e);if(id){state.current.onSelect(id);const area=areaForAsset(plant,id);if(area)state.current.onScopeChange(area);}};
    const hover=(e:PointerEvent)=>{const id=hitAsset(e);renderer.domElement.style.cursor=id?'pointer':'grab';setHovered(current=>current===id?current:id);};
    const leave=()=>{renderer.domElement.style.cursor='grab';setHovered(null);};
    renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointerup',click);renderer.domElement.addEventListener('pointermove',hover);renderer.domElement.addEventListener('pointerleave',leave);
    const animate=(t:number)=>{const started=performance.now();const s=state.current;
      for(const a of plant.assets){const o=assetObjects.current.get(a.id);if(!o)continue;o.visible=s.areaAssetIds.has(a.id);
        o.traverse(child=>{if(child instanceof T.Mesh){const m=child.material as T.MeshStandardMaterial;if(m.emissive){m.emissive.setHex(a.id===s.selected?0x244b45:s.highlight.has(a.id)?0x143a30:0);}}});}
      edges.forEach(e=>{const stream=e.userData.stream;const active=stream.source===s.selected||stream.target===s.selected;(e.material as T.MeshStandardMaterial).opacity=active?.95:.35;});
      particles.forEach((dot,i)=>{dot.visible=s.playing&&dot.userData.available!==false;dot.position.copy((dot.userData.curve as T.QuadraticBezierCurve3).getPoint((t*.00012+i*.13)%1));});
      renderer.render(scene,camera);if(!statsCaptured.current){statsCaptured.current=true;setStats({triangles:renderer.info.render.triangles,ms:performance.now()-started});}
    };draw.current=animate;invalidate.current=requestDraw;controls.addEventListener('change',requestDraw);requestDraw();
    return()=>{pauseDraw();draw.current=()=>{};resize.disconnect();theme.disconnect();controls.dispose();renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointerup',click);renderer.domElement.removeEventListener('pointermove',hover);renderer.domElement.removeEventListener('pointerleave',leave);scene.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});renderer.dispose();renderer.domElement.remove();root.current=null;groundRef.current=null;gridRef.current=null;invalidate.current=()=>{};syncAnchors.current=()=>{};};
  },[plant,requestDraw,pauseDraw]);
  const scopeCenter=useRef({x:8,y:0,z:0,distance:180});
  useEffect(()=>{
    state.current.areaAssetIds=new Set(areaModel.coreAssets.map(a=>a.id));
    state.current.areaStreamIds=new Set(areaModel.streams.map(e=>e.id));
    for(const [id,object] of assetObjects.current)object.visible=state.current.areaAssetIds.has(id);
    syncAnchors.current();
    const focus=areaModel.coreAssets.length?areaModel.coreAssets:plant.assets;
    const bounds=new T.Box3();
    for(const asset of focus){const object=assetObjects.current.get(asset.id);if(object)bounds.expandByObject(object);}
    const minX=bounds.isEmpty()?Math.min(...focus.map(a=>a.position[0]-a.size[0]/2)):bounds.min.x;
    const maxX=bounds.isEmpty()?Math.max(...focus.map(a=>a.position[0]+a.size[0]/2)):bounds.max.x;
    const minY=bounds.isEmpty()?0:bounds.min.y,maxY=bounds.isEmpty()?Math.max(...focus.map(a=>a.size[1])):bounds.max.y;
    const minZ=bounds.isEmpty()?Math.min(...focus.map(a=>a.position[2]-a.size[2]/2)):bounds.min.z;
    const maxZ=bounds.isEmpty()?Math.max(...focus.map(a=>a.position[2]+a.size[2]/2)):bounds.max.z;
    const centerX=(minX+maxX)/2,centerY=(minY+maxY)/2,centerZ=(minZ+maxZ)/2;
    const width=Math.max(1,maxX-minX),depth=Math.max(1,maxZ-minZ),height=Math.max(1,maxY-minY);
    const camera=cameraRef.current;
    const verticalFov=camera?camera.camera.fov*Math.PI/180:38*Math.PI/180;
    const horizontalFov=camera?2*Math.atan(Math.tan(verticalFov/2)*camera.camera.aspect):verticalFov;
    const diagonal=Math.hypot(width,depth);
    const fitScale=scope==='global' ? 0.75 : 0.95;
    const distance=Math.max(18,Math.max((width+depth*.55)/(2*Math.tan(horizontalFov/2)),(height+diagonal*.42)/(2*Math.tan(verticalFov/2)))*fitScale);
    const siteWidth=Math.max(28,width*1.32),siteDepth=Math.max(24,depth*1.32);
    if(groundRef.current){groundRef.current.scale.set(siteWidth/420,siteDepth/260,1);groundRef.current.position.set(centerX,-.4,centerZ);}
    if(gridRef.current){gridRef.current.scale.set(siteWidth/280,1,siteDepth/280);gridRef.current.position.set(centerX,-.34,centerZ);}
    scopeCenter.current={x:centerX,y:centerY,z:centerZ,distance};
    if(camera){const c=scopeCenter.current;camera.controls.target.set(c.x,c.y,c.z);const direction=new T.Vector3(.72,.56,.72).normalize();camera.camera.position.copy(camera.controls.target).addScaledVector(direction,c.distance);camera.controls.update();}
    invalidate.current();
  },[areaModel,plant,scope]);
  useEffect(()=>{invalidate.current();},[selected,hovered,highlight,playing,trace,step,method,live,now,engines,overlay,lang,scope]);
  const go=(top=false)=>{const c=cameraRef.current;if(!c)return;const center=scopeCenter.current;c.controls.target.set(center.x,center.y,center.z);if(top)c.camera.position.set(center.x,center.y+center.distance*1.55,center.z+.1);else c.camera.position.set(center.x+center.distance*.72,center.y+center.distance*.56,center.z+center.distance*.72);c.controls.update();};
  async function exportScene(){if(!root.current)return;const result=await new GLTFExporter().parseAsync(root.current,{binary:true});const blob=new Blob([result as ArrayBuffer],{type:'model/gltf-binary'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='caos-mineral-plant-explorer-reference.glb';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function importScene(file:File){try{if(file.size>10_000_000)throw Error('10 MB scene budget');const bytes=await file.arrayBuffer();let json:unknown;const dv=new DataView(bytes);if(dv.getUint32(0,true)===0x46546c67){if(dv.getUint32(4,true)!==2||dv.getUint32(16,true)!==0x4e4f534a)throw Error('Invalid GLB');const n=dv.getUint32(12,true);json=JSON.parse(new TextDecoder().decode(bytes.slice(20,20+n)));}else json=JSON.parse(new TextDecoder().decode(bytes));validateGLTF(json,plant);const loaded=await new GLTFLoader().parseAsync(bytes,'');if(root.current){root.current.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});root.current.clear();assetObjects.current.clear();for(const child of [...loaded.scene.children])root.current.add(child);root.current.traverse(o=>{if(o.userData.assetId)assetObjects.current.set(o.userData.assetId,o);});}syncAnchors.current();setImported(true);setError('');}catch(e){setError(String(e));}}
  const boundaries=[...areaModel.incoming.map(stream=>({stream,direction:lang==='es'?'Entrada':'Incoming',neighbor:stream.source})),...areaModel.outgoing.map(stream=>({stream,direction:lang==='es'?'Salida':'Outgoing',neighbor:stream.target}))];
  return <div className="ob-scene-wrap" data-scope={scope} data-selected-asset={selected} data-hovered-asset={hovered ?? ''} data-visible-assets={areaModel.coreAssets.length}><div className="ob-toolbar"><select aria-label={lang==='es'?'Capa de información':'Information layer'} value={overlay} onChange={e=>onOverlay(e.target.value as typeof overlay)}><option value="observations">{lang==='es'?'Observaciones de planta':'Plant observations'}</option><option value="engines">{lang==='es'?'Referencias de motores CAOS':'CAOS engine references'}</option></select><button onClick={()=>go()}>{lang==='es'?'Vista general':'Overview'}</button><button onClick={()=>go(true)}>{lang==='es'?'Planta superior':'Top view'}</button><button onClick={()=>void exportScene()}>{lang==='es'?'Exportar GLB':'Export GLB'}</button><label className="ob-file">{lang==='es'?'Importar glTF':'Import glTF'}<input type="file" accept=".gltf,.glb" onChange={e=>e.target.files?.[0]&&void importScene(e.target.files[0])}/></label></div><div className="ob-scene-stage"><div ref={host} className="ob-scene" data-testid="plant-scene"/>{hovered && <SceneHoverCard s={{plant,trace,step,method,live,now,engines,overlay}} assetId={hovered}/>}</div>{error&&<p role="alert" className="ob-scene-message">{error}</p>}{boundaries.length>0&&<section className="ob-scene-boundaries" aria-label={lang==='es'?'Conexiones de área':'Area connections'}><strong>{lang==='es'?'Conexiones con otras áreas':'Connections to adjacent areas'}</strong><div>{boundaries.map(({stream,direction,neighbor})=>{const adjacent=PLANT_AREAS.find(area=>area.id===areaForAsset(plant,neighbor))?.name[lang]??neighbor;return <article key={stream.id}><small>{direction} · {adjacent}</small><span>{stream.source} → {stream.target}</span><b>{stream.nominal.toLocaleString(lang)} {stream.unit}{stream.water_m3_h&&!/m[³3]\s*\/\s*h/i.test(stream.unit)?` · ${stream.water_m3_h.toLocaleString(lang)} m³/h`:''}</b></article>})}</div></section>}<div className="ob-scene-caption">{imported?(lang==='es'?'Geometría importada':'Imported geometry'):(lang==='es'?'Geometría de referencia · metros':'Reference geometry · metres')} · {stats.triangles.toLocaleString(lang)} {lang==='es'?'triángulos':'triangles'} · {stats.ms.toLocaleString(lang,{maximumFractionDigits:1})} ms/{lang==='es'?'renderizado':'render'}<br/>{overlay==='engines'?(lang==='es'?'Casos externos de referencia; no son mediciones de esta planta.':'Upstream reference cases; these are not plant measurements.'):''}<br/>{lang==='es'?'Arrastre para orbitar · rueda para acercar · pulse un equipo':'Drag to orbit · scroll to zoom · click equipment'}</div></div>;
}
