import { useEffect, useRef, useState } from 'react';
import { useShellLang } from '@fasl-work/caos-app-shell';
import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { Plant, Trace, Observation, EngineEvidence } from '../lib/contract.types';
import { assetState, liveValue } from './model';
import { buildPlant, COLORS, validateGLTF } from './scene';
export function PlantScene({plant,trace,step,method,selected,onSelect,highlight,playing,live,now,engines,overlay,onOverlay}:{engines:EngineEvidence;overlay:'observations'|'engines';onOverlay:(v:'observations'|'engines')=>void;plant:Plant;trace:Trace|null;step:number;method:string;selected:string;onSelect:(id:string)=>void;highlight:Set<string>;playing:boolean;live:Observation[]|null;now:number}) {
  const host=useRef<HTMLDivElement>(null), root=useRef<T.Group|null>(null), assetObjects=useRef(new Map<string,T.Object3D>()), cameraRef=useRef<{camera:T.PerspectiveCamera;controls:OrbitControls}|null>(null);
  const state=useRef({selected,onSelect,highlight,playing,trace,step,method,live,now,engines,overlay});state.current={selected,onSelect,highlight,playing,trace,step,method,live,now,engines,overlay};
  const [error,setError]=useState(''); const [stats,setStats]=useState(''); const [imported,setImported]=useState(false);const lang=useShellLang();
  useEffect(()=>{
    if(!host.current)return;const element=host.current;let renderer:T.WebGLRenderer;
    try{renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch{setError('WebGL unavailable; use the process diagram and asset selector. / WebGL no disponible; use el diagrama y selector.');return;}
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.outputColorSpace=T.SRGBColorSpace;renderer.domElement.setAttribute('aria-label','Connected plant 3D / Planta conectada 3D');element.appendChild(renderer.domElement);
    const scene=new T.Scene();const camera=new T.PerspectiveCamera(42,1,.1,1800);camera.position.set(175,150,195);
    const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(8,0,0);controls.enableDamping=true;controls.minDistance=15;controls.maxDistance=650;controls.maxPolarAngle=Math.PI*.49;cameraRef.current={camera,controls};
    scene.add(new T.HemisphereLight(0xe4f2ff,0x34494a,2.1));const sun=new T.DirectionalLight(0xfff1d4,3);sun.position.set(-80,150,80);scene.add(sun);
    const ground=new T.Mesh(new T.PlaneGeometry(360,220),new T.MeshStandardMaterial({color:0x243748,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.4;scene.add(ground);
    const grid=new T.GridHelper(360,36,0x536674,0x344958);grid.position.y=-.25;scene.add(grid);
    const objects=buildPlant(plant);root.current=objects;scene.add(objects);assetObjects.current=new Map(objects.children.map(o=>[String(o.userData.assetId),o]));
    const labels=plant.assets.map(a=>{
      const canvas=document.createElement('canvas');canvas.width=256;canvas.height=72;
      const texture=new T.CanvasTexture(canvas);const sprite=new T.Sprite(new T.SpriteMaterial({map:texture,depthTest:false,transparent:true}));
      sprite.position.set(a.position[0],a.position[1]+a.size[1]+4,a.position[2]);sprite.scale.set(16,4.5,1);sprite.renderOrder=10;scene.add(sprite);
      return {asset:a,canvas,texture,sprite,last:''};
    });
    const edges:T.Mesh[]=[];const particles:T.Mesh[]=[];
    for(const e of plant.streams){const a=plant.assets.find(a=>a.id===e.source)!,b=plant.assets.find(a=>a.id===e.target)!;const p=new T.Vector3(a.position[0],2,a.position[2]),q=new T.Vector3(b.position[0],2,b.position[2]);const mid=p.clone().lerp(q,.5);mid.y=e.material.includes('water')?1:5;
      const curve=new T.QuadraticBezierCurve3(p,mid,q);const pipe=new T.Mesh(new T.TubeGeometry(curve,18,e.material.includes('water')?.4:.65,5,false),new T.MeshStandardMaterial({color:e.material.includes('water')?0x288cba:0xa98552,transparent:true,opacity:.55}));pipe.userData.stream=e;scene.add(pipe);edges.push(pipe);
      const dot=new T.Mesh(new T.SphereGeometry(.85,6,5),new T.MeshBasicMaterial({color:e.material.includes('water')?0x8ddafa:0xffdf9c}));dot.userData.curve=curve;scene.add(dot);particles.push(dot);
    }
    const resize=new ResizeObserver(()=>{const w=element.clientWidth,h=element.clientHeight;if(w>0&&h>0){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}});resize.observe(element);
    const recolor=()=>{const light=document.documentElement.dataset.theme==='light'||document.documentElement.getAttribute('data-color-scheme')==='light';scene.background=new T.Color(light?0xdbe6e9:0x101e2b);(ground.material as T.MeshStandardMaterial).color.setHex(light?0xc3d1d4:0x243748);};recolor();const theme=new MutationObserver(recolor);theme.observe(document.documentElement,{attributes:true});
    let downX=0,downY=0;const down=(e:PointerEvent)=>{downX=e.clientX;downY=e.clientY;};const ray=new T.Raycaster();
    const click=(e:PointerEvent)=>{if(Math.hypot(e.clientX-downX,e.clientY-downY)>6)return;const r=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);for(const hit of ray.intersectObjects(objects.children,true)){let o:T.Object3D|null=hit.object;while(o&&!o.userData.assetId)o=o.parent;if(o?.userData.assetId){state.current.onSelect(o.userData.assetId);break;}}};
    renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointerup',click);
    let frame=0,last=performance.now(),elapsed=0,ticks=0;const animate=(t:number)=>{frame=requestAnimationFrame(animate);const s=state.current;controls.update();
      for(const a of plant.assets){const o=assetObjects.current.get(a.id);if(!o)continue;let marker:T.Mesh|undefined;o.traverse(child=>{if(child.userData.statusMarker)marker=child as T.Mesh;});const status=s.overlay==='engines'?'context':assetState(a,s.trace,s.step,s.method,s.live,s.now);if(marker){(marker.material as T.MeshBasicMaterial).color.setHex(a.id===s.selected?0x268cff:COLORS[status]);marker.scale.setScalar(a.id===s.selected?1.12:1);}
        o.traverse(child=>{if(child instanceof T.Mesh&&child.name!=='status'){const m=child.material as T.MeshStandardMaterial;if(m.emissive){m.emissive.setHex(a.id===s.selected?0x203f56:s.highlight.has(a.id)?0x143a30:0);}}});}
      edges.forEach(e=>{const stream=e.userData.stream;const active=stream.source===s.selected||stream.target===s.selected;(e.material as T.MeshStandardMaterial).opacity=active?.95:.35;});
      for(const label of labels){
        const i=s.trace?.channels.findIndex(c=>c.asset_id===label.asset.id)??-1;
        const evidence=s.engines.records.find(r=>r.asset_id===label.asset.id);const metric=evidence?.metrics[0];
        const visible=(s.overlay==='engines'?!!metric:i>=0)||label.asset.id===s.selected||s.highlight.has(label.asset.id);label.sprite.visible=visible;
        if(!visible)continue;
        const r=s.live?.find(r=>r.asset_id===label.asset.id);const value=s.overlay==='engines'?(metric?.value??null):s.live?(r?liveValue(r,s.now):null):(i>=0&&s.trace?.valid[s.step][i]?s.trace.observed[s.step][i]:null);
        const unit=s.overlay==='engines'?metric?.unit:s.live?r?.unit:i>=0?s.trace?.channels[i].unit:'';
        const text=label.asset.id+' · '+(typeof value==='number'?value.toFixed(value<100?1:0)+' '+unit:'?');
        const signature=text+(label.asset.id===s.selected?'selected':'');if(signature===label.last)continue;label.last=signature;
        const ctx=label.canvas.getContext('2d')!;ctx.clearRect(0,0,256,72);ctx.fillStyle=label.asset.id===s.selected?'#155f8fe8':'#102532d9';ctx.fillRect(0,0,256,72);ctx.fillStyle='#ecf5fa';ctx.textAlign='center';ctx.font='600 24px monospace';ctx.fillText(text,128,44,246);label.texture.needsUpdate=true;
      }
      particles.forEach((dot,i)=>{dot.visible=s.playing;dot.position.copy((dot.userData.curve as T.QuadraticBezierCurve3).getPoint((t*.00012+i*.13)%1));});
      renderer.render(scene,camera);elapsed+=t-last;last=t;ticks++;if(ticks===90){setStats(`${renderer.info.render.triangles.toLocaleString()} triangles · ${(elapsed/ticks).toFixed(1)} ms/frame`);ticks=0;elapsed=0;}
    };frame=requestAnimationFrame(animate);
    return()=>{cancelAnimationFrame(frame);resize.disconnect();theme.disconnect();controls.dispose();labels.forEach(l=>{l.texture.dispose();l.sprite.material.dispose();});scene.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});renderer.dispose();renderer.domElement.remove();root.current=null;};
  },[plant]);
  const go=(top=false)=>{const c=cameraRef.current;if(!c)return;c.controls.target.set(8,0,0);c.camera.position.set(top?8:210,top?310:190,top?.1:230);c.controls.update();};
  async function exportScene(){if(!root.current)return;const result=await new GLTFExporter().parseAsync(root.current,{binary:true});const blob=new Blob([result as ArrayBuffer],{type:'model/gltf-binary'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='orebridge-reference.glb';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function importScene(file:File){try{if(file.size>10_000_000)throw Error('10 MB scene budget');const bytes=await file.arrayBuffer();let json:unknown;const dv=new DataView(bytes);if(dv.getUint32(0,true)===0x46546c67){if(dv.getUint32(4,true)!==2||dv.getUint32(16,true)!==0x4e4f534a)throw Error('Invalid GLB');const n=dv.getUint32(12,true);json=JSON.parse(new TextDecoder().decode(bytes.slice(20,20+n)));}else json=JSON.parse(new TextDecoder().decode(bytes));validateGLTF(json,plant);const loaded=await new GLTFLoader().parseAsync(bytes,'');if(root.current){root.current.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});root.current.clear();assetObjects.current.clear();for(const child of [...loaded.scene.children])root.current.add(child);root.current.traverse(o=>{if(o.userData.assetId)assetObjects.current.set(o.userData.assetId,o);});}setImported(true);setError('');}catch(e){setError(String(e));}}
  return <div className="ob-scene-wrap"><div className="ob-toolbar"><select aria-label={lang==='es'?'Capa de información':'Information layer'} value={overlay} onChange={e=>onOverlay(e.target.value as typeof overlay)}><option value="observations">{lang==='es'?'Observaciones de planta':'Plant observations'}</option><option value="engines">{lang==='es'?'Referencias de motores CAOS':'CAOS engine references'}</option></select><button onClick={()=>go()}>{lang==='es'?'Vista general':'Overview'}</button><button onClick={()=>go(true)}>{lang==='es'?'Planta superior':'Top view'}</button><button onClick={()=>void exportScene()}>{lang==='es'?'Exportar GLB':'Export GLB'}</button><label className="ob-file">{lang==='es'?'Importar glTF':'Import glTF'}<input type="file" accept=".gltf,.glb" onChange={e=>e.target.files?.[0]&&void importScene(e.target.files[0])}/></label></div><div ref={host} className="ob-scene" data-testid="plant-scene"/>{error&&<p role="alert" className="ob-scene-message">{error}</p>}<div className="ob-scene-caption">{imported?(lang==='es'?'Geometría importada':'Imported geometry'):(lang==='es'?'Geometría de referencia · metros':'Reference geometry · metres')} · {stats}<br/>{overlay==='engines'?(lang==='es'?'Casos externos de referencia; no son mediciones de esta planta.':'Upstream reference cases; these are not plant measurements.'):''}<br/>{lang==='es'?'Arrastre para orbitar · rueda para acercar · pulse un equipo':'Drag to orbit · scroll to zoom · click equipment'}</div></div>;
}
