import * as T from 'three';
import type { Asset, Plant } from '../lib/contract.types';
export const COLORS = { normal: 0x38bda8, alarm: 0xf65f66, unavailable: 0xf5b94d, context: 0x7e94a8 };
const material = (color: number, metalness = .35) => new T.MeshStandardMaterial({ color, metalness, roughness: .6 });
/** Distinct equipment geometry in metres. The scene is an authored engineering reference. */
export function equipment(a: Asset): T.Group {
  const group = new T.Group(); group.name = a.id; group.userData.assetId = a.id;
  const [w,h,d] = a.size; const steel = material(0x7795ad), dark = material(0x32485a), yellow = material(0xdbaa48), water = material(0x298aac), ore = material(0x9c8264), white = material(0xb9ccd5);
  function mesh(geometry: T.BufferGeometry, mat: T.Material, x=0,y=0,z=0) { const m = new T.Mesh(geometry,mat); m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true; group.add(m); return m; }
  const box=(x:number,y:number,z:number,mat:T.Material,px=0,py=y/2,pz=0)=>mesh(new T.BoxGeometry(x,y,z),mat,px,py,pz);
  const cyl=(r1:number,r2:number,height:number,mat:T.Material,x=0,y=height/2,z=0)=>mesh(new T.CylinderGeometry(r1,r2,height,24),mat,x,y,z);
  const pipe=(from:T.Vector3,to:T.Vector3,r:number,mat:T.Material)=> { const diff=to.clone().sub(from); const m=mesh(new T.CylinderGeometry(r,r,diff.length(),10),mat); m.position.copy(from.clone().add(to).multiplyScalar(.5)); m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),diff.normalize()); return m; };
  switch(a.kind) {
    case 'pit': for(let i=0;i<5;i++) { const ring=new T.Mesh(new T.RingGeometry(w*(.19+i*.06),w*(.25+i*.06),8),ore); ring.rotation.x=-Math.PI/2; ring.position.y=.08+i*.5; ring.scale.y=d/w; group.add(ring); } break;
    case 'stockpile': { const p=cyl(0,w*.47,h,ore); p.scale.z=d/w; box(w+2,.4,d+2,dark,0,.2); break; }
    case 'shovel': box(w*.6,h*.25,d*.75,yellow); box(w*.35,h*.5,d*.4,steel,0,h*.5); pipe(new T.Vector3(0,h*.6,0),new T.Vector3(w*.6,h*1.2,0),.35,yellow); pipe(new T.Vector3(w*.6,h*1.2,0),new T.Vector3(w*.8,.8,0),.25,yellow); box(2,1.5,2,dark,w*.8,.8); break;
    case 'truck': box(w,h*.35,d,yellow,0,h*.55); box(w*.35,h*.5,d*.8,white,-w*.3,h*.4); for(const x of [-w*.3,w*.3])for(const z of [-d*.45,d*.45]) { const tire=cyl(h*.22,h*.22,d*.25,dark,x,h*.22,z); tire.rotation.x=Math.PI/2; } break;
    case 'conveyor': box(w,.6,d,dark,0,h*.7); for(const x of [-w*.4,0,w*.4]) {box(.3,h*.7,.3,steel,x,h*.35,-d*.4);box(.3,h*.7,.3,steel,x,h*.35,d*.4);} box(w,.2,d*.7,ore,0,h*.7+.4); break;
    case 'crusher': cyl(w*.5,w*.3,h*.25,steel,0,h*.7); cyl(w*.32,w*.42,h*.35,dark,0,h*.42); cyl(.1,w*.28,h*.6,yellow,0,h*.6); cyl(w*.48,w*.48,.5,white,0,h*.25); for(const x of [-w*.3,w*.3])for(const z of [-d*.3,d*.3])box(.6,h*.3,.6,steel,x,h*.15,z); break;
    case 'mill': { const drum=cyl(h*.46,h*.46,w*.75,steel,0,h*.55); drum.rotation.z=Math.PI/2; for(const x of [-w*.35,w*.35]) {const ring=cyl(h*.49,h*.49,.65,dark,x,h*.55);ring.rotation.z=Math.PI/2;box(2,h*.3,d*.8,white,x,h*.15);} for(let i=0;i<12;i++){const q=i*Math.PI/6;box(w*.7,.35,.35,yellow,0,h*.55+Math.sin(q)*h*.47,Math.cos(q)*h*.47);} pipe(new T.Vector3(-w*.6,h*.7,0),new T.Vector3(-w*.3,h*.55,0),1,dark); break; }
    case 'screen': box(w,h*.2,d,steel,0,h*.7); for(let i=0;i<9;i++)box(.2,.2,d,dark,-w*.45+i*w*.11,h*.82); for(const x of [-w*.35,w*.35])box(.5,h*.6,d*.6,yellow,x,h*.3); break;
    case 'bin': cyl(w*.45,w*.45,h*.55,steel,0,h*.7);cyl(w*.45,.7,h*.4,dark,0,h*.25);break;
    case 'cyclone': for(let i=0;i<5;i++){const q=i*Math.PI*2/5,x=Math.cos(q)*w*.32,z=Math.sin(q)*d*.32;cyl(1.2,.2,h*.55,steel,x,h*.4,z);cyl(1.2,1.2,h*.22,yellow,x,h*.78,z);}box(w,h*.1,d,dark,0,h*.6);break;
    case 'flotation': for(let i=0;i<4;i++){const x=-w*.37+i*w*.25;box(w*.23,h*.65,d,steel,x,h*.325);box(w*.21,.12,d*.9,water,x,h*.66);cyl(.4,.4,h*.5,yellow,x,h*.85);for(let j=0;j<6;j++)mesh(new T.SphereGeometry(.2,6,4),white,x+Math.sin(j)*w*.07,h*.68,Math.cos(j)*d*.3);}box(w*1.05,.2,1,dark,0,h*.8,d*.56);break;
    case 'thickener': cyl(w*.49,w*.49,h*.45,steel);cyl(w*.46,w*.46,.12,water,0,h*.46);box(w*.95,.3,.6,white,0,h*.55);cyl(.35,.35,h*.55,yellow,0,h*.3);for(let i=0;i<4;i++){const q=i*Math.PI/2;pipe(new T.Vector3(0,h*.46,0),new T.Vector3(Math.cos(q)*w*.4,h*.46,Math.sin(q)*d*.4),.12,dark);}cyl(w*.45,w*.1,h*.3,dark,0,-h*.13);break;
    case 'filter': box(w,h*.65,d*.6,dark);for(let i=0;i<10;i++)box(.25,h*.8,d,steel,-w*.4+i*w*.09,h*.55);break;
    case 'sx': for(let i=0;i<2;i++){box(w*.43,h*.7,d,steel,-w*.25+i*w*.5,h*.35);box(w*.4,.15,d*.9,i?water:yellow,-w*.25+i*w*.5,h*.72);}break;
    case 'electrowin': for(let i=0;i<3;i++){const z=-d*.33+i*d*.33;box(w,h*.5,d*.25,steel,0,h*.25,z);for(let j=0;j<15;j++)box(.15,h*.55,d*.21,ore,-w*.45+j*w*.064,h*.4,z);}box(w*1.1,.5,.5,yellow,0,h*.95);break;
    case 'cathode': for(let i=0;i<9;i++)box(w*.7,h*.7,.25,ore,0,h*.4,-d*.4+i*d*.1);break;
    case 'heap': box(w,1,d,dark);for(let i=0;i<4;i++)box(w*(1-i*.14),h*.24,d*(1-i*.16),ore,0,1+i*h*.22);for(let i=0;i<5;i++)pipe(new T.Vector3(-w*.4,h+1,-d*.4+i*d*.2),new T.Vector3(w*.4,h+1,-d*.4+i*d*.2),.12,water);break;
    case 'tailings': case 'pond': {const wall=cyl(w*.5,w*.55,h*.35,ore);wall.scale.z=d/w;const surface=cyl(w*.46,w*.46,.15,water,0,h*.37);surface.scale.z=d/w;break;}
    case 'pump': cyl(h*.4,h*.4,w*.55,steel,0,h*.5).rotation.z=Math.PI/2;cyl(h*.3,h*.3,w*.45,dark,w*.38,h*.5).rotation.z=Math.PI/2;box(w*1.2,.5,d,white);pipe(new T.Vector3(-w*.3,h*.5,0),new T.Vector3(-w*.3,h*1.2,0),.5,water);break;
    case 'motor': cyl(h*.4,h*.4,w*.8,steel,0,h*.5).rotation.z=Math.PI/2;for(let i=0;i<8;i++)cyl(h*.44,h*.44,.15,dark,-w*.35+i*w*.1,h*.5).rotation.z=Math.PI/2;break;
    case 'substation': box(w,.6,d,white);for(let i=0;i<3;i++){box(w*.2,h*.5,d*.5,steel,-w*.3+i*w*.3,h*.25);cyl(.2,.2,h*.5,yellow,-w*.3+i*w*.3,h*.65);}break;
    case 'sensor': cyl(.2,.2,h,steel);box(w,h*.25,d,yellow,0,h);break;
    case 'warehouse': box(w,h*.7,d,steel);{const roof=new T.Mesh(new T.CylinderGeometry(d*.57,d*.57,w,3),dark);roof.rotation.z=Math.PI/2;roof.position.y=h*.65;group.add(roof);}break;
    default: cyl(w*.47,w*.47,h*.9,steel);cyl(w*.48,w*.48,.3,white,0,h*.92);pipe(new T.Vector3(0,h,0),new T.Vector3(w*.5,h,0),.3,water);
  }
  const marker = mesh(new T.TorusGeometry(Math.max(w,d)*.55,.25,6,36),new T.MeshBasicMaterial({color:COLORS.context}),0,.5,0);marker.rotation.x=Math.PI/2; marker.name='status';marker.userData.statusMarker=true;
  group.position.fromArray(a.position); return group;
}
export function buildPlant(plant: Plant) {
  const group = new T.Group(); group.name='CAOS Mineral Plant Explorer'; group.userData={schema:plant.schema, revision:plant.revision, provenance:plant.provenance};
  for(const a of plant.assets)group.add(equipment(a)); return group;
}
export function validateGLTF(json: unknown, plant: Plant) {
  if(!json || typeof json!=='object') throw Error('Invalid glTF');
  const g=json as {asset?:{version?:string};buffers?:{uri?:string}[];images?:{uri?:string}[];nodes?:{extras?:{assetId?:string};translation?:number[];scale?:number[];rotation?:number[];matrix?:number[]}[];accessors?:{count?:number}[]};
  if(g.asset?.version!=='2.0')throw Error('glTF 2.0 required');
  for(const row of [...(g.buffers??[]),...(g.images??[])])if(row.uri && !row.uri.startsWith('data:'))throw Error('External resources are refused');
  if((g.accessors??[]).reduce((s,a)=>s+(a.count??0),0)>2_000_000)throw Error('Geometry budget exceeded');
  if((g.nodes?.length??0)>5000)throw Error('Scene node budget exceeded');
  for(const n of g.nodes??[])for(const key of ['translation','scale','rotation','matrix'] as const)if(n[key]?.some(v=>!Number.isFinite(v)||Math.abs(v)>100000))throw Error('Invalid transform');
  const known=new Set(plant.assets.map(a=>a.id)); const seen=new Set<string>();
  for(const node of g.nodes??[])if(node.extras?.assetId){if(!known.has(node.extras.assetId)||seen.has(node.extras.assetId))throw Error('Unknown or duplicate asset mapping');seen.add(node.extras.assetId);}
  if(!seen.size)throw Error('Explicit node extras.assetId required');
  return seen;
}
