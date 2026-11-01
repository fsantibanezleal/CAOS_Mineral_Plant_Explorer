import { useEffect, useMemo, useRef, useState } from 'react';
import { usePausedViz, useShellLang } from '@fasl-work/caos-app-shell';
import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { Plant, Trace, Observation, EngineEvidence } from '../lib/contract.types';
import { assetState, liveValue, snapshotValue } from './model';
import { buildPlant, COLORS, validateGLTF } from './scene';
import { areaForAsset, buildAreaModel, PLANT_AREAS } from './areas';
import type { PlantScope } from './areas';
export function PlantScene({plant,trace,step,method,selected,onSelect,highlight,playing,live,now,engines,overlay,onOverlay,scope,onScopeChange}:{engines:EngineEvidence;overlay:'observations'|'engines';onOverlay:(v:'observations'|'engines')=>void;plant:Plant;trace:Trace|null;step:number;method:string;selected:string;onSelect:(id:string)=>void;highlight:Set<string>;playing:boolean;live:Observation[]|null;now:number;scope:PlantScope;onScopeChange:(scope:PlantScope)=>void}) {
  const lang=useShellLang();
  const areaModel=useMemo(()=>buildAreaModel(plant,scope),[plant,scope]);
  const host=useRef<HTMLDivElement>(null), root=useRef<T.Group|null>(null), assetObjects=useRef(new Map<string,T.Object3D>()), cameraRef=useRef<{camera:T.PerspectiveCamera;controls:OrbitControls}|null>(null);
  const invalidate=useRef<()=>void>(()=>{}),syncAnchors=useRef<()=>void>(()=>{});
  const state=useRef({selected,onSelect,onScopeChange,highlight,playing,trace,step,method,live,now,engines,overlay,lang,scope,areaAssetIds:new Set(areaModel.coreAssets.map(a=>a.id)),areaStreamIds:new Set(areaModel.internalStreams.map(e=>e.id))});state.current={selected,onSelect,onScopeChange,highlight,playing,trace,step,method,live,now,engines,overlay,lang,scope,areaAssetIds:new Set(areaModel.coreAssets.map(a=>a.id)),areaStreamIds:new Set(areaModel.internalStreams.map(e=>e.id))};
  const draw=useRef<(elapsed:number)=>void>(()=>{});
  const {play:requestDraw,pause:pauseDraw}=usePausedViz((_dt,elapsed)=>{draw.current(elapsed);return state.current.playing;});
  const [error,setError]=useState(''); const [stats,setStats]=useState({triangles:0,ms:0}); const [imported,setImported]=useState(false);
  useEffect(()=>{
    if(!host.current)return;const element=host.current;let renderer:T.WebGLRenderer;
    try{renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch{setError('WebGL unavailable; use the process diagram and asset selector. / WebGL no disponible; use el diagrama y selector.');return;}
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.outputColorSpace=T.SRGBColorSpace;renderer.domElement.setAttribute('aria-label','Connected plant 3D / Planta conectada 3D');element.appendChild(renderer.domElement);
    const scene=new T.Scene();const camera=new T.PerspectiveCamera(42,1,.1,1800);camera.position.set(175,150,195);
    const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(8,0,0);controls.enableDamping=false;controls.minDistance=15;controls.maxDistance=650;controls.maxPolarAngle=Math.PI*.49;cameraRef.current={camera,controls};
    scene.add(new T.HemisphereLight(0xe4f2ff,0x34494a,2.1));const sun=new T.DirectionalLight(0xfff1d4,3);sun.position.set(-80,150,80);scene.add(sun);
    const ground=new T.Mesh(new T.PlaneGeometry(180,120),new T.MeshStandardMaterial({color:0x243748,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.4;scene.add(ground);
    const grid=new T.GridHelper(120,24,0x536674,0x344958);grid.position.y=-.25;for(const gridMaterial of Array.isArray(grid.material)?grid.material:[grid.material]){gridMaterial.transparent=true;gridMaterial.opacity=.055;}scene.add(grid);
    const objects=buildPlant(plant);root.current=objects;scene.add(objects);assetObjects.current=new Map(objects.children.map(o=>[String(o.userData.assetId),o]));
    const labels=plant.assets.map(a=>{
      const canvas=document.createElement('canvas');canvas.width=256;canvas.height=72;
      const texture=new T.CanvasTexture(canvas);const sprite=new T.Sprite(new T.SpriteMaterial({map:texture,depthTest:false,transparent:true}));
      sprite.position.set(a.position[0],a.position[1]+a.size[1]+4,a.position[2]);sprite.scale.set(12,3.4,1);sprite.renderOrder=10;scene.add(sprite);
      return {asset:a,canvas,texture,sprite,last:''};
    });
    const edges:T.Mesh[]=[];const particles:T.Mesh[]=[];
    for(const e of plant.streams){const a=plant.assets.find(a=>a.id===e.source)!,b=plant.assets.find(a=>a.id===e.target)!;const p=new T.Vector3(a.position[0],2,a.position[2]),q=new T.Vector3(b.position[0],2,b.position[2]);const mid=p.clone().lerp(q,.5);mid.y=e.material.includes('water')?1:5;
      const curve=new T.QuadraticBezierCurve3(p,mid,q);const pipe=new T.Mesh(new T.TubeGeometry(curve,18,e.material.includes('water')?.4:.65,5,false),new T.MeshStandardMaterial({color:e.material.includes('water')?0x288cba:0xa98552,transparent:true,opacity:.55}));pipe.userData.stream=e;scene.add(pipe);edges.push(pipe);
      const dot=new T.Mesh(new T.SphereGeometry(.85,6,5),new T.MeshBasicMaterial({color:e.material.includes('water')?0x8ddafa:0xffdf9c}));dot.userData.curve=curve;scene.add(dot);particles.push(dot);
    }
    syncAnchors.current=()=>{
      objects.updateWorldMatrix(true,true);
      for(const label of labels){const o=assetObjects.current.get(label.asset.id);if(!o){label.sprite.visible=false;continue;}const bounds=new T.Box3().setFromObject(o);const p=o.getWorldPosition(new T.Vector3());label.sprite.position.set(p.x,bounds.isEmpty()?p.y+4:bounds.max.y+4,p.z);}
      edges.forEach((edge,i)=>{const e=edge.userData.stream;const a=assetObjects.current.get(e.source),b=assetObjects.current.get(e.target);const aVisible=!!a&&a.visible,bVisible=!!b&&b.visible;const inScope=state.current.areaStreamIds.has(e.id);edge.visible=inScope&&aVisible&&bVisible;particles[i].userData.available=edge.visible;if(!inScope||!a||!b||(!aVisible&&!bVisible))return;let p=a.getWorldPosition(new T.Vector3()).add(new T.Vector3(0,2,0)),q=b.getWorldPosition(new T.Vector3()).add(new T.Vector3(0,2,0));if(aVisible!==bVisible){const visible=aVisible?p:q,hidden=aVisible?q:p;const direction=visible.clone().sub(hidden).setY(0).normalize();if(aVisible){p=visible;q=visible.clone().add(direction.multiplyScalar(12));}else{p=visible.clone().sub(direction.multiplyScalar(12));q=visible;}}const mid=p.clone().lerp(q,.5);mid.y+=e.material.includes('water')?1:5;const curve=new T.QuadraticBezierCurve3(p,mid,q);edge.geometry.dispose();edge.geometry=new T.TubeGeometry(curve,18,e.material.includes('water')?.4:.65,5,false);particles[i].userData.curve=curve;});
      invalidate.current();
    };syncAnchors.current();
    const resize=new ResizeObserver(()=>{const w=element.clientWidth,h=element.clientHeight;if(w>0&&h>0){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();invalidate.current();}});resize.observe(element);
    const recolor=()=>{const light=document.documentElement.dataset.theme==='light'||document.documentElement.getAttribute('data-color-scheme')==='light';scene.background=new T.Color(light?0xdbe6e9:0x101e2b);(ground.material as T.MeshStandardMaterial).color.setHex(light?0xc3d1d4:0x243748);invalidate.current();};recolor();const theme=new MutationObserver(recolor);theme.observe(document.documentElement,{attributes:true});
    let downX=0,downY=0;const down=(e:PointerEvent)=>{downX=e.clientX;downY=e.clientY;};const ray=new T.Raycaster();
    const click=(e:PointerEvent)=>{if(Math.hypot(e.clientX-downX,e.clientY-downY)>6)return;const r=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);for(const hit of ray.intersectObjects(objects.children,true)){let o:T.Object3D|null=hit.object;while(o&&!o.userData.assetId)o=o.parent;if(o?.userData.assetId){const id=String(o.userData.assetId);state.current.onSelect(id);const area=areaForAsset(plant,id);if(area)state.current.onScopeChange(area);break;}}};
    renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointerup',click);
    const animate=(t:number)=>{const started=performance.now();const s=state.current;
      for(const a of plant.assets){const o=assetObjects.current.get(a.id);if(!o)continue;o.visible=s.areaAssetIds.has(a.id);let marker:T.Mesh|undefined;o.traverse(child=>{if(child.userData.statusMarker)marker=child as T.Mesh;});const status=s.overlay==='engines'?'context':assetState(a,s.trace,s.step,s.method,s.live,s.now,plant);if(marker){(marker.material as T.MeshBasicMaterial).color.setHex(a.id===s.selected?0x268cff:COLORS[status]);marker.scale.setScalar(a.id===s.selected?1.12:1);}
        o.traverse(child=>{if(child instanceof T.Mesh&&child.name!=='status'){const m=child.material as T.MeshStandardMaterial;if(m.emissive){m.emissive.setHex(a.id===s.selected?0x203f56:s.highlight.has(a.id)?0x143a30:0);}}});}
      edges.forEach(e=>{const stream=e.userData.stream;const active=stream.source===s.selected||stream.target===s.selected;(e.material as T.MeshStandardMaterial).opacity=active?.95:.35;});
      for(const label of labels){
        const i=s.trace?.channels.findIndex(c=>c.asset_id===label.asset.id)??-1;
        const evidence=s.engines.records.find(r=>r.asset_id===label.asset.id);const metric=evidence?.metrics[0];
        const visible=assetObjects.current.has(label.asset.id)&&s.areaAssetIds.has(label.asset.id)&&((s.overlay==='engines'?!!metric:i>=0)||label.asset.id===s.selected||s.highlight.has(label.asset.id));label.sprite.visible=visible;
        if(!visible)continue;
        const r=s.live?.find(r=>r.asset_id===label.asset.id);const value=s.overlay==='engines'?(metric?.value??null):s.live?(r?liveValue(r,s.now,plant):null):(i>=0&&s.trace?snapshotValue(s.trace,s.step,s.method,i):null);
        const unit=s.overlay==='engines'?metric?.unit:s.live?r?.unit:i>=0?s.trace?.channels[i].unit:'';
        const text=label.asset.id+' · '+(typeof value==='number'?value.toLocaleString(s.lang,{maximumFractionDigits:value<100?1:0})+' '+unit:'?');
        const status=s.overlay==='engines'?'context':assetState(label.asset,s.trace,s.step,s.method,s.live,s.now,plant);const signature=text+status+(label.asset.id===s.selected?'selected':'');if(signature===label.last)continue;label.last=signature;
        const ctx=label.canvas.getContext('2d')!;ctx.clearRect(0,0,256,72);ctx.fillStyle=status==='alarm'?'#792c38ed':status==='unavailable'?'#654d1eed':status==='normal'?'#174f47ed':'#253d4eed';ctx.fillRect(0,0,256,72);ctx.strokeStyle=label.asset.id===s.selected?'#72bdff':'#dae9ef';ctx.lineWidth=label.asset.id===s.selected?6:1;ctx.strokeRect(3,3,250,66);ctx.fillStyle='#ecf5fa';ctx.textAlign='center';ctx.font='600 24px monospace';ctx.fillText(text,128,44,246);label.texture.needsUpdate=true;
      }
      particles.forEach((dot,i)=>{dot.visible=s.playing&&dot.userData.available!==false;dot.position.copy((dot.userData.curve as T.QuadraticBezierCurve3).getPoint((t*.00012+i*.13)%1));});
      renderer.render(scene,camera);element.dataset.renderCount=String(Number(element.dataset.renderCount??0)+1);setStats({triangles:renderer.info.render.triangles,ms:performance.now()-started});
    };draw.current=animate;invalidate.current=requestDraw;controls.addEventListener('change',requestDraw);requestDraw();
    return()=>{pauseDraw();draw.current=()=>{};resize.disconnect();theme.disconnect();controls.dispose();labels.forEach(l=>{l.texture.dispose();l.sprite.material.dispose();});scene.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});renderer.dispose();renderer.domElement.remove();root.current=null;invalidate.current=()=>{};syncAnchors.current=()=>{};};
  },[plant,requestDraw,pauseDraw]);
  const scopeCenter=useRef({x:8,z:0,distance:180});
  useEffect(()=>{
    state.current.areaAssetIds=new Set(areaModel.coreAssets.map(a=>a.id));
    state.current.areaStreamIds=new Set(areaModel.streams.map(e=>e.id));
    for(const [id,object] of assetObjects.current)object.visible=state.current.areaAssetIds.has(id);
    syncAnchors.current();
    const focus=areaModel.coreAssets.length?areaModel.coreAssets:plant.assets;
    const minX=Math.min(...focus.map(a=>a.position[0]-a.size[0]/2)),maxX=Math.max(...focus.map(a=>a.position[0]+a.size[0]/2));
    const minZ=Math.min(...focus.map(a=>a.position[2]-a.size[2]/2)),maxZ=Math.max(...focus.map(a=>a.position[2]+a.size[2]/2));
    scopeCenter.current={x:(minX+maxX)/2,z:(minZ+maxZ)/2,distance:Math.max(24,Math.max(maxX-minX,maxZ-minZ)*.82)};
    const camera=cameraRef.current;if(camera){const c=scopeCenter.current;camera.controls.target.set(c.x,0,c.z);camera.camera.position.set(c.x+c.distance*.78,c.distance*.72,c.z+c.distance*.9);camera.controls.update();}
    invalidate.current();
  },[areaModel,plant]);
  useEffect(()=>{invalidate.current();},[selected,highlight,playing,trace,step,method,live,now,engines,overlay,lang,scope]);
  const go=(top=false)=>{const c=cameraRef.current;if(!c)return;const center=scopeCenter.current;c.controls.target.set(center.x,0,center.z);c.camera.position.set(top?center.x:center.x+center.distance*.78,top?center.distance*1.7:center.distance*.72,top?center.z+.1:center.z+center.distance*.9);c.controls.update();};
  async function exportScene(){if(!root.current)return;const result=await new GLTFExporter().parseAsync(root.current,{binary:true});const blob=new Blob([result as ArrayBuffer],{type:'model/gltf-binary'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='caos-mineral-plant-explorer-reference.glb';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function importScene(file:File){try{if(file.size>10_000_000)throw Error('10 MB scene budget');const bytes=await file.arrayBuffer();let json:unknown;const dv=new DataView(bytes);if(dv.getUint32(0,true)===0x46546c67){if(dv.getUint32(4,true)!==2||dv.getUint32(16,true)!==0x4e4f534a)throw Error('Invalid GLB');const n=dv.getUint32(12,true);json=JSON.parse(new TextDecoder().decode(bytes.slice(20,20+n)));}else json=JSON.parse(new TextDecoder().decode(bytes));validateGLTF(json,plant);const loaded=await new GLTFLoader().parseAsync(bytes,'');if(root.current){root.current.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});root.current.clear();assetObjects.current.clear();for(const child of [...loaded.scene.children])root.current.add(child);root.current.traverse(o=>{if(o.userData.assetId)assetObjects.current.set(o.userData.assetId,o);});}syncAnchors.current();setImported(true);setError('');}catch(e){setError(String(e));}}
  const boundaries=[...areaModel.incoming.map(stream=>({stream,direction:lang==='es'?'Entrada':'Incoming',neighbor:stream.source})),...areaModel.outgoing.map(stream=>({stream,direction:lang==='es'?'Salida':'Outgoing',neighbor:stream.target}))];
  return <div className="ob-scene-wrap"><div className="ob-toolbar"><select aria-label={lang==='es'?'Capa de información':'Information layer'} value={overlay} onChange={e=>onOverlay(e.target.value as typeof overlay)}><option value="observations">{lang==='es'?'Observaciones de planta':'Plant observations'}</option><option value="engines">{lang==='es'?'Referencias de motores CAOS':'CAOS engine references'}</option></select><button onClick={()=>go()}>{lang==='es'?'Vista general':'Overview'}</button><button onClick={()=>go(true)}>{lang==='es'?'Planta superior':'Top view'}</button><button onClick={()=>void exportScene()}>{lang==='es'?'Exportar GLB':'Export GLB'}</button><label className="ob-file">{lang==='es'?'Importar glTF':'Import glTF'}<input type="file" accept=".gltf,.glb" onChange={e=>e.target.files?.[0]&&void importScene(e.target.files[0])}/></label></div><div ref={host} className="ob-scene" data-testid="plant-scene"/>{error&&<p role="alert" className="ob-scene-message">{error}</p>}{boundaries.length>0&&<section className="ob-scene-boundaries" aria-label={lang==='es'?'Conexiones de área':'Area connections'}><strong>{lang==='es'?'Conexiones con otras áreas':'Connections to adjacent areas'}</strong><div>{boundaries.map(({stream,direction,neighbor})=>{const adjacent=PLANT_AREAS.find(area=>area.id===areaForAsset(plant,neighbor))?.name[lang]??neighbor;return <article key={stream.id}><small>{direction} · {adjacent}</small><span>{stream.source} → {stream.target}</span><b>{stream.nominal.toLocaleString(lang)} {stream.unit}{stream.water_m3_h&&!/m[³3]\s*\/\s*h/i.test(stream.unit)?` · ${stream.water_m3_h.toLocaleString(lang)} m³/h`:''}</b></article>})}</div></section>}<div className="ob-scene-caption">{imported?(lang==='es'?'Geometría importada':'Imported geometry'):(lang==='es'?'Geometría de referencia · metros':'Reference geometry · metres')} · {stats.triangles.toLocaleString(lang)} {lang==='es'?'triángulos':'triangles'} · {stats.ms.toLocaleString(lang,{maximumFractionDigits:1})} ms/{lang==='es'?'renderizado':'render'}<br/>{overlay==='engines'?(lang==='es'?'Casos externos de referencia; no son mediciones de esta planta.':'Upstream reference cases; these are not plant measurements.'):''}<br/>{lang==='es'?'Arrastre para orbitar · rueda para acercar · pulse un equipo':'Drag to orbit · scroll to zoom · click equipment'}</div></div>;
}
