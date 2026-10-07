import {gemShapes,gemPath,normalizeHex} from './workstation.js';
import {span,surfaceZ,contains} from './nail-form.js';
import * as THREE from './vendor/three.module.js';

// Dimensions are in nail-world units, independent of viewport and close-up zoom.
export const charmTypes = [
  {type:'pearl',material:'pearl',name:'Small warm pearl',radius:2.3},
  {type:'rice',material:'pearl',name:'Rice pearl',radius:2.6},
  {type:'baroque',material:'pearl',name:'Baroque pearl',radius:3},
  {type:'stud',material:'silver',name:'Silver stud',radius:2.3},
  {type:'gold-stud',material:'gold',name:'Aged gold stud',radius:2.3},
  {type:'black-stud',material:'black',name:'Black stud',radius:2.2},
  {type:'crystal',material:'crystal',name:'Clear rhinestone',radius:2.5},
  {type:'red-crystal',material:'red',name:'Deep red rhinestone',radius:2.5},
  {type:'bead',material:'red',name:'Irregular garnet bead',radius:2.7},
  {type:'blue-bead',material:'blue',name:'Cobalt glass bead',radius:2.6},
  {type:'star',material:'silver',name:'Tiny silver star',radius:3.1},
  {type:'heart',material:'gold',name:'Small gold heart',radius:3},
  {type:'ring',material:'gold',name:'Fine metal ring',radius:3.8},
  {type:'chain',material:'silver',name:'Short silver chain',radius:3},
  {type:'flower',material:'silver',name:'Five petal metal flower',radius:3.2},
  {type:'fragment',material:'gold',name:'Abstract metal fragment',radius:3.4},
];
const vocabulary=new Map(charmTypes.map(c=>[c.type,c]));
vocabulary.set('gem',{type:'gem',material:'gem',radius:3.2});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const copy=v=>JSON.parse(JSON.stringify(v));
export function validCharm(c){const def=vocabulary.get(c?.type);return !!def&&(c.type!=='gem'||(gemShapes.includes(c.shape)&&!!normalizeHex(c.color)))&&c.u<=1&&(!c.end||c.end.u<=1)&&typeof c.id==='string'&&c.id.length<100&&Number.isInteger(c.nailId)&&c.nailId>=0&&c.nailId<10&&[c.u,c.v].every(x=>Number.isFinite(x)&&x>=0&&x<=3)&&Number.isFinite(c.rotation)&&Number.isFinite(c.scale)&&c.scale>=.7&&c.scale<=1.4&&Number.isFinite(c.zOffset)&&c.zOffset>=0&&c.zOffset<=4&&c.material===def.material&&(c.type!=='chain'||(!!c.end&&[c.end.u,c.end.v].every(x=>Number.isFinite(x)&&x>=0&&x<=3)));}
export function createCharmSystem(api){
  const {scene,camera,renderer,nails,specs,root,hit,localPoint,toast,tone,record,selectNail,commitStroke}=api;
  let gemConfig={shape:'round',color:'#e5e4dc',scale:1};
  let items=[],chosen=null,selected=null,drag=null,pendingChain=null,serial=0,presenting=false,hover=-1;
  const meshes=new Map(),pointers=new Map();let gesture=null,lastTime=0,pickTap={time:0,nailId:-1};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lights=new THREE.Group();scene.add(lights);
  lights.add(new THREE.HemisphereLight(0xfff5df,0x656b79,2.3));
  const key=new THREE.DirectionalLight(0xffffff,3.1);key.position.set(-170,300,350);lights.add(key);
  const edge=new THREE.DirectionalLight(0xc6d1ed,1.6);edge.position.set(180,-40,170);lights.add(edge);
  // A tiny generated studio environment gives metal real broad reflections, not painted sparkles.
  const envScene=new THREE.Scene();envScene.background=new THREE.Color('#858278');
  for(const [x,y,z,w,h,color] of [[-6,5,7,5,10,'#fff9e8'],[6,0,5,2,12,'#e2e8f5'],[0,-6,3,12,3,'#3e3730']]){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);envScene.add(m);}
  const pmrem=new THREE.PMREMGenerator(renderer),env=pmrem.fromScene(envScene,.02).texture;pmrem.dispose();
  const mats={
    pearl:new THREE.MeshPhysicalMaterial({color:'#e9decc',metalness:.12,roughness:.28,clearcoat:.65,iridescence:.23,iridescenceIOR:1.32,envMap:env,envMapIntensity:.55}),
    silver:new THREE.MeshStandardMaterial({color:'#bfc3c1',metalness:.94,roughness:.23,envMap:env,envMapIntensity:.9}),
    gold:new THREE.MeshStandardMaterial({color:'#b19a62',metalness:.88,roughness:.3,envMap:env,envMapIntensity:.85}),
    black:new THREE.MeshPhysicalMaterial({color:'#191a1b',metalness:.45,roughness:.24,clearcoat:.7,envMap:env}),
    crystal:new THREE.MeshPhysicalMaterial({color:'#e8e7df',metalness:.2,roughness:.065,clearcoat:1,ior:2.1,envMap:env,envMapIntensity:1.2,flatShading:true}),
    red:new THREE.MeshPhysicalMaterial({color:'#641525',metalness:.22,roughness:.16,clearcoat:1,envMap:env,flatShading:true}),
    blue:new THREE.MeshPhysicalMaterial({color:'#2141a2',metalness:.15,roughness:.16,clearcoat:1,envMap:env,flatShading:true}),
  };
  const sphere=new THREE.SphereGeometry(1,24,16),facet=new THREE.IcosahedronGeometry(1,0),bead=new THREE.IcosahedronGeometry(1,1),ring=new THREE.TorusGeometry(1,.15,8,32),link=new THREE.TorusGeometry(1,.19,6,16);
  function extrude(type){const s=new THREE.Shape();if(type==='heart'){s.moveTo(0,-.9);s.bezierCurveTo(-1.7,.1,-.65,1.55,0,.55);s.bezierCurveTo(.65,1.55,1.7,.1,0,-.9);}else{const count=type==='star'?10:7;for(let k=0;k<count;k++){const a=Math.PI/2+k*Math.PI*2/count,r=type==='star'?(k%2?.43:1):[1,.62,.96,.51,.88,.72,1][k];const x=Math.cos(a)*r,y=Math.sin(a)*r;k?s.lineTo(x,y):s.moveTo(x,y);}s.closePath();}return new THREE.ExtrudeGeometry(s,{depth:.26,bevelEnabled:true,bevelSize:.11,bevelThickness:.12,bevelSegments:2,steps:1,curveSegments:16});}
  const shapes={star:extrude('star'),heart:extrude('heart'),fragment:extrude('fragment')};
  const contactCanvas=document.createElement('canvas');contactCanvas.width=contactCanvas.height=64;const ctx=contactCanvas.getContext('2d'),gradient=ctx.createRadialGradient(32,32,4,32,32,32);gradient.addColorStop(0,'rgba(63,45,28,.27)');gradient.addColorStop(.6,'rgba(86,66,45,.13)');gradient.addColorStop(1,'rgba(86,66,45,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
  const shadowMat=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(contactCanvas),transparent:true,depthWrite:false,opacity:.7});
  const shadowGeo=new THREE.PlaneGeometry(1,1);
  const gemTextures=new Map(),gemPlane=new THREE.PlaneGeometry(8.6,8.6);
  function gemObject(config){const key=config.shape+config.color;let material=gemTextures.get(key);if(!material){const cv=document.createElement('canvas');cv.width=cv.height=128;const c=cv.getContext('2d');c.translate(64,64);c.scale(4,4);const path=new Path2D(gemPath(config.shape));c.fillStyle=config.color;c.globalAlpha=.94;c.fill(path);c.globalAlpha=1;c.strokeStyle='#8b7664';c.lineWidth=.55;c.stroke(path);c.save();c.clip(path);c.fillStyle='#fff3';c.beginPath();c.moveTo(-12,-8);c.lineTo(0,-9);c.lineTo(0,1);c.lineTo(-5,7);c.closePath();c.fill();c.strokeStyle='#fff8';c.lineWidth=.45;const facets=new Path2D('M-7 -5 L0 -8 6 -3 4 5 -4 5Z M0 -8 0 1 6 -3 M0 1 4 5 M0 1 -4 5');if(config.shape!=='pearl')c.stroke(facets);c.fillStyle='#fffc';c.beginPath();c.ellipse(-4,-5,2,1,-.5,0,Math.PI*2);c.fill();c.restore();const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;material=new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,side:THREE.DoubleSide});gemTextures.set(key,material);}const g=new THREE.Group(),m=new THREE.Mesh(gemPlane,material);m.position.z=1.1;g.add(m);return g;}
  function object(type,materialSet=mats,config=gemConfig){if(type==='gem')return gemObject(config);const d=vocabulary.get(type),g=new THREE.Group(),material=materialSet[d.material];
    const add=(geo,x,y,z,sx,sy=sx,sz=sx)=>{const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);g.add(m);return m;};
    if(type==='ring')add(ring,0,0,.65,d.radius);
    else if(type==='chain'){const inst=new THREE.InstancedMesh(link,material,18);inst.count=9;g.add(inst);g.userData.chain=inst;chainShape(g,14,0);}
    else if(type==='flower'){for(let k=0;k<5;k++){const a=k*Math.PI*2/5;add(sphere,Math.cos(a)*1.7,Math.sin(a)*1.7,.85,1.45,1.2,.7);}add(sphere,0,0,1.25,.9);}
    else if(shapes[type])add(shapes[type],0,0,.3,d.radius,d.radius,2);
    else {const isFacet=type.includes('crystal'),geo=isFacet?facet:type.includes('bead')||type==='baroque'?bead:sphere;const r=d.radius;const m=add(geo,0,0,r*.43,r*(type==='rice'?.65:1),r*(type==='rice'?1.25:1),r*(isFacet?.67:type.includes('stud')?.38:.72));if(type==='baroque'||type.includes('bead')){m.rotation.set(.3,.25,.2);m.scale.x*=.82;}if(isFacet)m.rotation.z=Math.PI/5;}
    return g;
  }
  function chainShape(g,x,y,surface){const inst=g.userData.chain;if(!inst)return;const len=Math.hypot(x,y),count=clamp(Math.round(len/1.65)+1,3,18),dummy=new THREE.Object3D();inst.count=count;
    for(let i=0;i<count;i++){const t=i/(count-1),sag=Math.sin(t*Math.PI)*Math.min(2,len*.12);dummy.position.set(x*t,y*t-sag,.7+Math.sin(t*Math.PI)*.15+(surface?surface(t):0));dummy.rotation.set(i%2?.65:0,0,Math.atan2(y-Math.cos(t*Math.PI)*Math.min(2,len*.12)*Math.PI,x));dummy.scale.set(1.25,.8,1);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);}inst.instanceMatrix.needsUpdate=true;inst.computeBoundingSphere();
  }
  // Tray objects use the same meshes and materials as the objects on the nails.
  const tray=document.createElement('div');tray.id='charm-dish';tray.setAttribute('role','group');tray.setAttribute('aria-label','Tiny objects to place on nails');root.append(tray);
  const tr=new THREE.WebGLRenderer({alpha:true,antialias:true});tr.setPixelRatio(Math.min(devicePixelRatio,2));tr.outputColorSpace=THREE.SRGBColorSpace;tray.append(tr.domElement);tr.domElement.setAttribute('aria-hidden','true');
  const ts=new THREE.Scene(),tc=new THREE.OrthographicCamera(-160,160,32,-32,.1,100);tc.position.z=50;ts.add(new THREE.HemisphereLight(0xfff8e8,0x696775,2.5));const tl=new THREE.DirectionalLight(0xffffff,3);tl.position.set(-40,60,80);ts.add(tl);
  // Render-target textures belong to one WebGL context; bake the tray environment separately.
  const trayPMREM=new THREE.PMREMGenerator(tr),trayEnv=trayPMREM.fromScene(envScene,.02).texture;trayPMREM.dispose();
  const trayMats=Object.fromEntries(Object.entries(mats).map(([name,m])=>{const clone=m.clone();clone.envMap=trayEnv;return [name,clone];}));
  envScene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
  const trayObjects=[];let trayDirty=true;
  charmTypes.forEach((d,i)=>{const g=object(d.type,trayMats);g.position.set((i%8-3.5)*38,(i<8?13:-13),1);g.rotation.z=([-.2,.3,-.3,.1,-.2,.3,.1,-.2][i%8]);g.scale.setScalar(d.type==='chain'?.65:1.1);ts.add(g);const sh=new THREE.Mesh(shadowGeo,shadowMat);sh.position.set(g.position.x+1,g.position.y-1,0);sh.scale.set(12,10,1);ts.add(sh);trayObjects.push(g);
    const button=document.createElement('button');button.setAttribute('aria-label',d.name+' — pick up');button.setAttribute('aria-pressed','false');button.title=d.name;button.dataset.charm=d.type;tray.append(button);
    button.addEventListener('pointerenter',()=>{g.userData.hover=true;trayDirty=true;});button.addEventListener('pointerleave',()=>{g.userData.hover=false;trayDirty=true;});
    button.addEventListener('pointerdown',e=>{if(e.button>0||presenting)return;e.preventDefault();e.stopPropagation();choose(d.type);startDrag(e,null);button.setPointerCapture(e.pointerId);});
    button.addEventListener('click',e=>{if(e.detail===0)choose(d.type);});
  });
  const observer=new ResizeObserver(()=>{tr.setSize(tray.clientWidth,tray.clientHeight);trayDirty=true;});observer.observe(tray);
  const ghost=new THREE.Group();scene.add(ghost);let ghostObject=null,ghostTarget=new THREE.Vector3(),ghostReady=false;
  function updateTray(){tray.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.charm===chosen)));root.classList.toggle('carrying-charm',!!chosen||!!drag);}
  function choose(type){cancel();commitStroke();api.pickTool('pick');chosen=type;selected=null;updateTray();toast(type==='chain'?'Place one end, then the other on the same nail.':'Place, then place another. PICK to move · Esc to finish.');}
  function cancel(){if(drag?.before)items=copy(drag.before);drag=null;gesture=null;pointers.clear();pendingChain=null;chosen=null;hover=-1;ghost.visible=false;ghostReady=false;selected=null;sync();updateTray();}
  function state(){return copy(items);}
  function changed(before){if(JSON.stringify(before)===JSON.stringify(items))return;record({kind:'charm',before});api.save();api.status();}
  function restore(data){items=Array.isArray(data)?data.filter(validCharm).slice(0,400).map(copy):[];selected=null;sync();}
  function visibleItems(){return pendingChain?[...items,{...pendingChain,end:pendingChain.end||{u:pendingChain.u,v:pendingChain.v}}]:items;}
  function sync(){const display=visibleItems();const ids=new Set(display.map(c=>c.id));for(const [id,g] of meshes){if(!ids.has(id)){g.removeFromParent();if(g.userData.body.userData.chain)g.userData.body.userData.chain.dispose();meshes.delete(id);}}
    for(const c of display){let g=meshes.get(c.id);if(!g){g=new THREE.Group();const body=object(c.type,mats,c),sh=new THREE.Mesh(shadowGeo,shadowMat);g.add(sh,body);g.userData={body,shadow:sh,born:performance.now()};meshes.set(c.id,g);}nails[c.nailId].mesh.add(g);g.userData.charm=c;position(g,c);}
  }
  function position(g,c){const s=specs[c.nailId];g.position.set((c.u-.5)*s[3],(.5-c.v)*s[4],surfaceZ(nails[c.nailId].form,c.u,c.v)+.3+c.zOffset);g.rotation.z=c.rotation;g.scale.setScalar(c.scale);const body=g.userData.body;
    // Slight local surface tilt plus a contact meniscus gives adhesion to the nail.
    body.rotation.y=(c.u-.5)*.3;body.rotation.x=(c.v-.5)*.16;
    const r=vocabulary.get(c.type).radius;g.userData.shadow.scale.set(r*2.9,r*2.6,1);g.userData.shadow.position.set(.4,-.55,-.12);
    if(c.type==='chain'){const dx=(c.end.u-c.u)*s[3]/c.scale,dy=(c.v-c.end.v)*s[4]/c.scale;const co=Math.cos(-c.rotation),si=Math.sin(-c.rotation);chainShape(body,dx*co-dy*si,dx*si+dy*co,t=>(surfaceZ(nails[c.nailId].form,c.u+(c.end.u-c.u)*t,c.v+(c.end.v-c.v)*t)-surfaceZ(nails[c.nailId].form,c.u,c.v))/c.scale);}
  }
  function at(e,nailId){const p=localPoint(e,nails[nailId]);return {u:p.x/512,v:p.y/512};}
  function screenRadius(c){return vocabulary.get(c.type).radius*c.scale*camera.zoom*renderer.domElement.clientHeight/(camera.top-camera.bottom);}
  function screenPoint(c){const s=specs[c.nailId],v=new THREE.Vector3((c.u-.5)*s[3],(.5-c.v)*s[4],surfaceZ(nails[c.nailId].form,c.u,c.v)+3);nails[c.nailId].mesh.localToWorld(v);v.project(camera);const r=renderer.domElement.getBoundingClientRect();return {x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2};}
  function find(e){let best=null;for(const c of [...items].reverse()){const p=screenPoint(c);let distance=Math.hypot(e.clientX-p.x,e.clientY-p.y);if(c.type==='chain'){const b=screenPoint({...c,...c.end}),dx=b.x-p.x,dy=b.y-p.y,t=clamp(((e.clientX-p.x)*dx+(e.clientY-p.y)*dy)/(dx*dx+dy*dy||1),0,1);distance=Math.hypot(e.clientX-p.x-dx*t,e.clientY-p.y-dy*t);}if(distance<Math.max(e.pointerType==='touch'?10:5,screenRadius(c)+3)){best=c;break;}}return best;}
  function nailHit(e){const h=hit(e);return h?h.object.userData.id:-1;}
  function showGhost(type,e){if(ghostObject?.userData.type!==type||ghostObject?.userData.gemKey!==(type==='gem'?gemConfig.shape+gemConfig.color:'')){if(ghostObject){ghost.remove(ghostObject);ghostObject.userData.chain?.dispose();}ghostObject=object(type);ghostObject.userData.type=type;ghostObject.userData.gemKey=type==='gem'?gemConfig.shape+gemConfig.color:'';ghost.add(ghostObject);}const r=renderer.domElement.getBoundingClientRect();ghostTarget.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1,0).unproject(camera);ghostTarget.z=40;if(!ghostReady){ghost.position.copy(ghostTarget);ghostReady=true;}ghost.visible=true;ghostObject.scale.setScalar(drag?.scale||(type==='gem'?gemConfig.scale:1));}
  function startDrag(e,c){commitStroke();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});selected=c?.id||null;const p=c?at(e,c.nailId):null;drag={pointer:e.pointerId,before:state(),id:c?.id,type:c?.type||chosen,nailId:c?.nailId??-1,offset:c?{u:p.u-c.u,v:p.v-c.v}:{u:0,v:0},start:{x:e.clientX,y:e.clientY},moved:false,scale:c?.scale||(chosen==='gem'?gemConfig.scale:1)};if(c){meshes.get(c.id).userData.lift=1;tone('pickup');}else tone('pickup');showGhost(drag.type,e);updateTray();}
  function snap(c){if(!['pearl','rice','baroque','crystal','red-crystal'].includes(c.type))return;const s=specs[c.nailId],px=renderer.domElement.clientHeight*camera.zoom/(camera.top-camera.bottom);for(const other of items){if(other.id===c.id||other.nailId!==c.nailId||!['pearl','rice','baroque','crystal','red-crystal'].includes(other.type))continue;const dx=(c.u-other.u)*s[3],dy=(c.v-other.v)*s[4],dist=Math.hypot(dx,dy),target=(vocabulary.get(c.type).radius*c.scale+vocabulary.get(other.type).radius*other.scale)*1.02;if(dist>.01&&Math.abs(dist-target)*px<3){c.u=clamp(other.u+dx/dist*target/s[3],.035,.965);c.v=clamp(other.v+dy/dist*target/s[4],.035,span(nails[c.nailId].form)-.035);break;}}}
  function newCharm(type,id,p){const d=vocabulary.get(type);return {id:`charm-${Date.now()}-${serial++}`,nailId:id,u:clamp(p.u,.025,.975),v:clamp(p.v,.025,span(nails[id].form)-.025),rotation:0,scale:type==='gem'?gemConfig.scale:1,...(type==='gem'?{shape:gemConfig.shape,color:gemConfig.color}:{}),zOffset:Math.min(3.8,items.filter(c=>c.nailId===id).length*.008),type,material:d.material};}
  function land(e){if(!drag)return;const d=drag;drag=null;pointers.clear();ghost.visible=false;ghostReady=false;const id=nailHit(e),p=id>=0?at(e,id):null;
    if(d.id){const c=items.find(c=>c.id===d.id);if(id!==d.nailId){items=items.filter(c=>c.id!==d.id);selected=null;}else if(c){const next={u:clamp(p.u-d.offset.u,.025,.975),v:clamp(p.v-d.offset.v,.025,span(nails[d.nailId].form)-.025)};if(c.end){const du=clamp(next.u-c.u,.025-Math.min(c.u,c.end.u),.975-Math.max(c.u,c.end.u)),dv=clamp(next.v-c.v,.025-Math.min(c.v,c.end.v),span(nails[c.nailId].form)-.025-Math.max(c.v,c.end.v));next.u=c.u+du;next.v=c.v+dv;c.end.u+=du;c.end.v+=dv;}Object.assign(c,next);snap(c);selected=c.id;toast('Drag to move · [ ] to turn · + / − to resize · Delete to lift away.');}sync();if(c&&meshes.has(c.id))meshes.get(c.id).userData.born=performance.now();changed(d.before);tone('land');}
    else if(id>=0){if(items.length>=400){toast('This set is full. Use PICK to return an object to the tray.');updateTray();return;}if(pendingChain){if(id!==pendingChain.nailId){toast('Both ends belong on the same nail.');updateTray();return;}const s=specs[id],dx=(p.u-pendingChain.u)*s[3],dy=(p.v-pendingChain.v)*s[4],len=Math.hypot(dx,dy);if(len<2){toast('Place the other end a little further away.');return;}const k=Math.min(1,26/len);const c={...pendingChain,end:{u:pendingChain.u+dx*k/s[3],v:pendingChain.v+dy*k/s[4]}};items.push(c);pendingChain=null;selected=c.id;}else{const c=newCharm(d.type,id,p);if(d.type==='chain'){pendingChain=c;sync();toast('Now place the second end on this nail.');updateTray();return;}snap(c);items.push(c);selected=c.id;}selectNail(id);sync();changed(d.before);tone('land');}
    else if(d.moved){chosen=null;pendingChain=null;}
    updateTray();
  }
  const canvas=renderer.domElement;
  canvas.addEventListener('dblclick',e=>{if(!presenting&&api.tool()==='pick'&&!chosen){const id=nailHit(e);if(id>=0){e.stopImmediatePropagation();/* Touch double-tap is owned by pointerdown below. */}}},true);
  // Capture-phase ownership keeps each gesture wholly in paint OR object manipulation.
  canvas.addEventListener('pointerdown',e=>{if(presenting||e.button>0)return;
    if(drag){e.preventDefault();e.stopImmediatePropagation();if(!drag.id)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);if(pointers.size===2&&drag.id){const a=[...pointers.values()],c=items.find(c=>c.id===drag.id);gesture={distance:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),angle:Math.atan2(a[1].y-a[0].y,a[1].x-a[0].x),scale:c.scale,rotation:c.rotation,end:c.end?{...c.end}:null};}return;}
    const c=api.tool()==='pick'?find(e):null;if(c){chosen=null;if(c.type==='gem')gemConfig={shape:c.shape,color:c.color,scale:c.scale};}if(!chosen&&!c){if(api.tool()==='pick'){e.preventDefault();e.stopImmediatePropagation();selected=null;const id=nailHit(e),now=performance.now();if(id>=0&&pickTap.nailId===id&&now-pickTap.time<300){api.closeup(id);pickTap={time:0,nailId:-1};}else pickTap={time:now,nailId:id};}return;}e.preventDefault();e.stopImmediatePropagation();startDrag(e,c);canvas.setPointerCapture(e.pointerId);
  },true);
  window.addEventListener('pointermove',e=>{if(presenting)return;if(drag){if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});e.preventDefault();e.stopImmediatePropagation();if(gesture&&pointers.size===2){const a=[...pointers.values()],c=items.find(c=>c.id===drag.id);c.scale=clamp(gesture.scale*Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)/Math.max(gesture.distance,1),.7,1.4);c.rotation=gesture.rotation+Math.atan2(a[1].y-a[0].y,a[1].x-a[0].x)-gesture.angle;if(gesture.end){const s=specs[c.nailId],dx=(gesture.end.u-c.u)*s[3],dy=(c.v-gesture.end.v)*s[4],angle=c.rotation-gesture.rotation,k=c.scale/gesture.scale;c.end={u:clamp(c.u+(dx*Math.cos(angle)-dy*Math.sin(angle))*k/s[3],.025,.975),v:clamp(c.v-(dx*Math.sin(angle)+dy*Math.cos(angle))*k/s[4],.025,span(nails[c.nailId].form)-.025)};}position(meshes.get(c.id),c);ghost.visible=false;return;}if(e.pointerId!==drag.pointer)return;drag.moved ||= Math.hypot(e.clientX-drag.start.x,e.clientY-drag.start.y)>3;showGhost(drag.type,e);if(drag.id){const g=meshes.get(drag.id);g.visible=false;}hover=nailHit(e);}
    else if(chosen&&e.target===canvas){showGhost(chosen,e);hover=nailHit(e);if(pendingChain&&hover===pendingChain.nailId){const p=at(e,hover),s=specs[hover],dx=(p.u-pendingChain.u)*s[3],dy=(p.v-pendingChain.v)*s[4],k=Math.min(1,26/(Math.hypot(dx,dy)||1));pendingChain.end={u:pendingChain.u+dx*k/s[3],v:pendingChain.v+dy*k/s[4]};position(meshes.get(pendingChain.id),pendingChain);ghost.visible=false;}}else{ghost.visible=false;hover=-1;}
  },{capture:true,passive:false});
  window.addEventListener('pointerup',e=>{if(!drag||!pointers.has(e.pointerId))return;e.preventDefault();e.stopImmediatePropagation();if(gesture){pointers.delete(e.pointerId);if(pointers.size)return;const before=drag.before;drag=null;gesture=null;ghost.visible=false;sync();changed(before);updateTray();return;}land(e);for(const g of meshes.values())g.visible=true;},true);
  window.addEventListener('pointercancel',()=>{if(drag)cancel();},true);
  window.addEventListener('blur',()=>{if(drag)cancel();});
  function transform(rotation,scale){const c=items.find(c=>c.id===selected);if(!c||presenting)return false;const before=state();if(c.end){const s=specs[c.nailId],dx=(c.end.u-c.u)*s[3],dy=(c.v-c.end.v)*s[4],r=scale/c.scale,co=Math.cos(rotation),si=Math.sin(rotation);const u=c.u+(dx*co-dy*si)*r/s[3],v=c.v-(dx*si+dy*co)*r/s[4];if(u<0||u>1||v<0||v>span(nails[c.nailId].form))return false;c.end={u,v};}c.rotation+=rotation;c.scale=scale;sync();changed(before);return true;}
  canvas.addEventListener('wheel',e=>{const c=items.find(c=>c.id===selected);if(!c||presenting||drag||!e.altKey)return;e.preventDefault();e.stopImmediatePropagation();transform(e.shiftKey?0:Math.sign(e.deltaY)*.10,e.shiftKey?clamp(c.scale-Math.sign(e.deltaY)*.05,.7,1.4):c.scale);},{capture:true,passive:false});
  document.addEventListener('keydown',e=>{if(/INPUT|TEXTAREA/.test(e.target.tagName))return;if(e.key==='Escape'&&(chosen||selected||drag||pendingChain)){e.stopImmediatePropagation();cancel();return;}const c=items.find(c=>c.id===selected);if(!c||presenting)return;if(['Delete','Backspace'].includes(e.key)){e.preventDefault();removeSelected();return;}if(['[',']','-','+','='].includes(e.key)){e.preventDefault();transform(e.key==='['?-.12:e.key===']'?.12:0,['+','=','-'].includes(e.key)?clamp(c.scale+(e.key==='-'?-.05:.05),.7,1.4):c.scale);}},true);
  const handles=document.createElement('div');handles.id='gem-handles';handles.hidden=true;handles.innerHTML='<button aria-label="Make selected gem smaller">−</button><button aria-label="Make selected gem larger">+</button><button aria-label="Rotate selected gem left">↶</button><button aria-label="Rotate selected gem right">↷</button><button aria-label="Delete selected gem">×</button>';root.append(handles);
  function removeSelected(){const before=state();items=items.filter(c=>c.id!==selected);selected=null;sync();changed(before);}
  [...handles.children].forEach((b,i)=>b.onclick=()=>{const c=items.find(c=>c.id===selected);if(!c)return;if(i===4)removeSelected();else transform(i===2?-.2:i===3?.2:0,clamp(c.scale+(i===0?-.1:i===1?.1:0),.7,1.4));});
  function update(t){const selectedItem=items.find(c=>c.id===selected);handles.hidden=!selectedItem||presenting||!!drag||api.tool()!=='pick';if(!handles.hidden){const p=screenPoint(selectedItem),r=root.getBoundingClientRect();handles.style.left=clamp(p.x-r.left,90,r.width-90)+'px';handles.style.top=clamp(p.y-r.top+22,70,r.height-280)+'px';}const dt=Math.min(50,t-lastTime||16);lastTime=t;const alpha=reduced?1:1-Math.exp(-dt/20);if(ghost.visible){const dx=ghostTarget.x-ghost.position.x;ghost.position.lerp(ghostTarget,alpha);ghost.rotation.z+=(clamp(-dx*.02,-.3,.3)-ghost.rotation.z)*alpha;const worldPixel=(camera.top-camera.bottom)/camera.zoom/renderer.domElement.clientHeight;ghost.scale.setScalar(Math.max(1,worldPixel*1.9));}
    for(const c of visibleItems()){const g=meshes.get(c.id);g.visible=drag?.id!==c.id||!!gesture;const age=(t-g.userData.born)/1000,bounce=reduced?0:Math.sin(age*27)*Math.exp(-age*14)*1.4;g.userData.body.position.z=bounce+(selected===c.id?.35:0);}
    for(const n of nails)n.natural.material.color.lerp(new THREE.Color(n.id===hover?'#f6e5d9':'#f0d9d0'),.2);
    key.intensity+=(presenting?3.35-key.intensity:3.1-key.intensity)*.1;key.position.x+=(pointerLight.x-key.position.x)*.12;key.position.y+=(pointerLight.y-key.position.y)*.12;
    let moving=false;trayObjects.forEach(g=>{const z=g.userData.hover?3:1;if(Math.abs(g.position.z-z)>.01){g.position.z+=(z-g.position.z)*.24;g.position.y+=( (g.userData.hover?1.2:0)- (g.userData.lastLift||0));g.userData.lastLift=g.userData.hover?.15:0;moving=true;}});
    if(!presenting&&(trayDirty||moving)){tr.render(ts,tc);trayDirty=false;}
  }
  const pointerLight={x:-170,y:300};window.addEventListener('pointermove',e=>{pointerLight.x=-170+(e.clientX/innerWidth-.5)*220;pointerLight.y=300-(e.clientY/innerHeight-.5)*120;},{passive:true});
  function present(v){cancel();presenting=v;tray.inert=v;}
  function fits(c,f){return contains(f,c.u,c.v)&&(!c.end||contains(f,c.end.u,c.end.v));}
  function previewTrim(id,f){for(const c of items)meshes.get(c.id).scale.setScalar(c.scale*(c.nailId===id&&!fits(c,f)?.7:1));}
  function trimTo(id,f){items=items.filter(c=>c.nailId!==id||fits(c,f));sync();}
  // Read-only diagnostics expose persisted transforms, not a separate editing/history path.
  return {chooseGem(config){gemConfig={...gemConfig,...config};choose('gem');},sizeGem(scale){gemConfig.scale=scale;const c=items.find(c=>c.id===selected);if(c)transform(0,scale);},manipulating:()=>!!drag?.id,cure(value){for(const [key,m] of gemTextures)m.color.setScalar(1+value*.12);},update,state,restore,cancel,present,reflow:sync,trimTo,previewTrim,active:()=>!!chosen||!!drag,count:n=>items.filter(c=>c.nailId===n).length,selected:()=>selected};
}
