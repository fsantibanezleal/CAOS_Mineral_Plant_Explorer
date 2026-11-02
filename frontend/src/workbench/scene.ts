import * as T from 'three';
import type { Asset, Plant } from '../lib/contract.types';
const material = (color: number, metalness = .28, roughness = .74) => new T.MeshStandardMaterial({ color, metalness, roughness });
/** Distinct equipment geometry in metres. The scene is an authored engineering reference. */
export function equipment(a: Asset): T.Group {
  const group = new T.Group(); group.name = a.id; group.userData.assetId = a.id;
  const [w,h,d] = a.size; const steel = material(0x9aa7a9,.48,.55), dark = material(0x50595d,.36,.68), yellow = material(0xb98b4d,.28,.72), water = material(0x3d91aa,.16,.42), ore = material(0x81786b,.05,.96), white = material(0xc5cbc8,.18,.62), concrete = material(0x979c96,.04,.95);
  function mesh(geometry: T.BufferGeometry, mat: T.Material, x=0,y=0,z=0) { const m = new T.Mesh(geometry,mat); m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true; group.add(m); return m; }
  const box=(x:number,y:number,z:number,mat:T.Material,px=0,py=y/2,pz=0)=>mesh(new T.BoxGeometry(x,y,z),mat,px,py,pz);
  const cyl=(r1:number,r2:number,height:number,mat:T.Material,x=0,y=height/2,z=0)=>mesh(new T.CylinderGeometry(r1,r2,height,32),mat,x,y,z);
  const pipe=(from:T.Vector3,to:T.Vector3,r:number,mat:T.Material)=> { const diff=to.clone().sub(from); const m=mesh(new T.CylinderGeometry(r,r,diff.length(),10),mat); m.position.copy(from.clone().add(to).multiplyScalar(.5)); m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),diff.normalize()); return m; };
  switch(a.kind) {
    case 'pit': for(let i=0;i<7;i++) { const ring=new T.Mesh(new T.RingGeometry(w*(.16+i*.045),w*(.205+i*.045),40),material(i%2?0x777568:0x878476,.02,.98)); ring.rotation.x=-Math.PI/2; ring.position.y=.1+i*.42; ring.scale.y=d/w; ring.receiveShadow=true; group.add(ring); } break;
    case 'stockpile': {
      const pad=box(w+2,.55,d+2,concrete,0,.28);pad.receiveShadow=true;
      const nx=48,nz=36,positions:number[]=[],colors:number[]=[],indices:number[]=[];
      const baseColor=new T.Color(0x8b7357);
      const relief=Math.min(h*.34,Math.min(w,d)*.30);
      for(let iz=0;iz<=nz;iz++)for(let ix=0;ix<=nx;ix++){
        const u=ix/nx*2-1,v=iz/nz*2-1;
        const peakA=Math.exp(-((((u+.2)/.72)**2)+(((v+.02)/.82)**2))*2.8);
        const peakB=.62*Math.exp(-((((u-.35)/.54)**2)+(((v-.2)/.67)**2))*2.5);
        const ridge=Math.max(peakA,peakB);
        const fineNoise=Math.sin(ix*1.73+iz*.81)*Math.cos(iz*1.31-ix*.44)*.012;
        const elevation=Math.max(0,relief*(ridge+fineNoise));
        positions.push(u*w*.49,.56+elevation,v*d*.49);
        const shade=.9+(.5+.5*Math.sin(ix*.41+iz*.19))*.12+elevation/h*.08;
        colors.push(baseColor.r*shade,baseColor.g*shade,baseColor.b*shade);
        if(ix<nx&&iz<nz){const a=iz*(nx+1)+ix,b=a+1,c=a+nx+1,e=c+1;indices.push(a,c,b,b,c,e);}
      }
      const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
      const terrain=mesh(geometry,new T.MeshStandardMaterial({vertexColors:true,roughness:.98,metalness:0}));terrain.name='stockpile-terrain';
      break;
    }
    case 'shovel': box(w*.6,h*.25,d*.75,yellow); box(w*.35,h*.5,d*.4,steel,0,h*.5); pipe(new T.Vector3(0,h*.6,0),new T.Vector3(w*.6,h*1.2,0),.35,yellow); pipe(new T.Vector3(w*.6,h*1.2,0),new T.Vector3(w*.8,.8,0),.25,yellow); box(2,1.5,2,dark,w*.8,.8); break;
    case 'truck': box(w,h*.35,d,yellow,0,h*.55); box(w*.35,h*.5,d*.8,white,-w*.3,h*.4); for(const x of [-w*.3,w*.3])for(const z of [-d*.45,d*.45]) { const tire=cyl(h*.22,h*.22,d*.25,dark,x,h*.22,z); tire.rotation.x=Math.PI/2; } break;
    case 'conveyor': { box(w,.55,d,dark,0,h*.7);for(const x of [-w*.43,-w*.15,w*.15,w*.43]){box(.3,h*.65,.35,steel,x,h*.34,-d*.38);box(.3,h*.65,.35,steel,x,h*.34,d*.38);pipe(new T.Vector3(x-.4,h*.66,-d*.36),new T.Vector3(x+.4,h*.66,d*.36),.11,steel);}box(w,.2,d*.7,ore,0,h*.7+.38);pipe(new T.Vector3(-w*.49,h*.7,0),new T.Vector3(-w*.49,h*.94,0),.15,dark);pipe(new T.Vector3(w*.49,h*.7,0),new T.Vector3(w*.49,h*.94,0),.15,dark);break; }
    case 'crusher': { const secondary=a.id==='CR2',hopper=new T.CylinderGeometry(w*(secondary?.38:.47),w*(secondary?.2:.16),h*(secondary?.2:.24),12,1,true);mesh(hopper,steel,0,h*(secondary?.84:.82),0);cyl(w*(secondary?.31:.38),w*(secondary?.39:.46),h*(secondary?.42:.34),dark,0,h*.48);cyl(w*(secondary?.2:.25),w*(secondary?.24:.3),h*(secondary?.48:.42),steel,0,h*.58);const mantle=new T.Mesh(new T.CylinderGeometry(w*(secondary?.05:.08),w*(secondary?.2:.23),h*(secondary?.46:.52),16),yellow);mantle.position.y=h*.57;mantle.castShadow=true;group.add(mantle);cyl(w*.43,w*.43,.38,white,0,h*.22);for(const x of [-w*.36,w*.36])for(const z of [-d*.36,d*.36]){box(.65,h*.58,.65,dark,x,h*.29,z);pipe(new T.Vector3(x,h*.57,z),new T.Vector3(x+Math.sign(x)*.8,h*.57,z),.09,white);}if(secondary){cyl(w*.18,w*.18,h*.24,dark,w*.52,h*.17);box(w*.3,h*.24,d*.25,yellow,w*.52,h*.4);}else{cyl(w*.15,w*.15,h*.26,dark,-w*.52,h*.17);box(w*.28,h*.25,d*.22,white,-w*.52,h*.42);}box(w*1.05,.45,d*.95,concrete,0,.23);break; }
    case 'mill': { const drum=cyl(h*.46,h*.46,w*.72,steel,0,h*.56);drum.rotation.z=Math.PI/2;for(const x of [-w*.36,w*.36]){const ring=cyl(h*.5,h*.5,.7,dark,x,h*.56);ring.rotation.z=Math.PI/2;const head=cyl(h*.42,h*.42,.18,white,x*1.06,h*.56);head.rotation.z=Math.PI/2;box(2,h*.36,d*.82,white,x,h*.18);}for(let i=0;i<24;i++){const q=i*Math.PI/12;box(w*.68,.22,.24,yellow,0,h*.56+Math.sin(q)*h*.47,Math.cos(q)*h*.47);}for(const x of [-w*.24,w*.24]){box(1.25,h*.34,d*.92,dark,x,h*.17);for(const z of [-d*.35,d*.35])pipe(new T.Vector3(x,h*.36,z),new T.Vector3(x,h*.65,z),.16,steel);}pipe(new T.Vector3(-w*.62,h*.74,0),new T.Vector3(-w*.36,h*.57,0),.85,dark);box(w*.18,h*.32,d*.65,yellow,w*.46,h*.16);break; }
    case 'screen': { box(w,h*.12,d,steel,0,h*.76);for(let i=0;i<11;i++){const x=-w*.45+i*w*.09;box(.14,.18,d*.86,dark,x,h*.84);}for(const x of [-w*.38,w*.38]){box(.45,h*.62,d*.62,yellow,x,h*.34);pipe(new T.Vector3(x,h*.64,-d*.3),new T.Vector3(x,h*.8,d*.3),.08,steel);}box(w*.92,.22,d*.9,concrete,0,.12);break; }
    case 'bin': cyl(w*.45,w*.45,h*.55,steel,0,h*.7);cyl(w*.45,.7,h*.4,dark,0,h*.25);break;
    case 'cyclone': for(let i=0;i<5;i++){const q=i*Math.PI*2/5,x=Math.cos(q)*w*.32,z=Math.sin(q)*d*.32;cyl(1.2,.2,h*.55,steel,x,h*.4,z);cyl(1.2,1.2,h*.22,yellow,x,h*.78,z);}box(w,h*.1,d,dark,0,h*.6);break;
    case 'flotation': { for(let i=0;i<4;i++){const x=-w*.37+i*w*.25;box(w*.23,h*.62,d,steel,x,h*.31);box(w*.215,.16,d*.9,water,x,h*.635);cyl(.42,.42,h*.42,yellow,x,h*.9);pipe(new T.Vector3(x,h*.6,0),new T.Vector3(x,h*.91,0),.09,dark);for(let j=0;j<4;j++)mesh(new T.SphereGeometry(.17,8,6),white,x+Math.sin(j*1.6)*w*.065,h*.69,Math.cos(j*1.6)*d*.28);}box(w*1.08,.35,1.1,dark,0,h*.78,d*.56);for(const x of [-w*.52,w*.52]){pipe(new T.Vector3(x,h*.8,-d*.5),new T.Vector3(x,h*.8,d*.5),.12,yellow);for(const z of [-d*.45,-d*.15,d*.15,d*.45])pipe(new T.Vector3(x,h*.68,z),new T.Vector3(x,h*.83,z),.08,yellow);}box(w*1.12,.35,d*1.12,concrete,0,.18,0);break; }
    case 'thickener': { cyl(w*.49,w*.49,h*.42,steel);cyl(w*.455,w*.455,.22,water,0,h*.43);cyl(w*.5,w*.5,.22,concrete,0,.12);box(w*.13,.4,d*.13,white,0,h*.54);box(w*1.02,.42,.8,steel,0,h*.58);for(const x of [-w*.43,w*.43]){box(.18,h*.28,.18,dark,x,h*.35);pipe(new T.Vector3(x,h*.74,-d*.46),new T.Vector3(x,h*.74,d*.46),.1,yellow);for(const z of [-d*.42,d*.42])pipe(new T.Vector3(x,h*.45,z),new T.Vector3(x,h*.77,z),.07,yellow);}cyl(.35,.35,h*.52,yellow,0,h*.31);for(let i=0;i<6;i++){const q=i*Math.PI/3;pipe(new T.Vector3(0,h*.43,0),new T.Vector3(Math.cos(q)*w*.4,h*.22,Math.sin(q)*d*.4),.12,dark);}cyl(w*.45,w*.1,h*.28,dark,0,-h*.13);break; }
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
  if(!['pit','stockpile','heap','pond','tailings','truck','shovel','conveyor'].includes(a.kind)){const pad=box(w+1.2,.5,d+1.2,concrete,0,.25,0);pad.receiveShadow=true;}
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
