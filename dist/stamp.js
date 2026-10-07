import * as THREE from './vendor/three.module.js';
import {span} from './nail-form.js';
import {SIZE,renderImprint,surfaceHasBase} from './materials.js';
import {imprints,captureRecipe,makeTransfer,defaultMirror} from './transfer.js';

export function createStampSystem(api){
 const {root,renderer,nails,specs,camera,hit,localPoint,pickTool,commitStroke,selectNail,tone,save,transfer}=api;
 const button=root.querySelector('[data-tool=stamp]'),thumb=button.querySelector('canvas');
 const physical=document.createElement('div');physical.id='stamp-press';physical.setAttribute('aria-hidden','true');physical.innerHTML='<span class="stamp-grip"></span><span class="stamp-silicone"><canvas width="512" height="512"></canvas></span>';root.append(physical);
 const imprintCanvas=physical.querySelector('canvas'),annotation=document.createElement('span');annotation.id='stamp-annotation';annotation.textContent='M — mirror · tap stamp to flip';annotation.hidden=true;root.append(annotation);
 let loaded=null,flip=false,hoverId=-1,motion=null,lastPointer=null,active=false,preview=null,drawnMirror=null;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const canvas=renderer.domElement;
 function draw(mirror=false){if(drawnMirror===mirror&&preview===loaded?.id)return;drawnMirror=mirror;preview=loaded?.id;
  let surface;if(loaded){surface=renderImprint(loaded);}
  for(const c of [thumb,imprintCanvas]){const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);if(surface){ctx.save();ctx.scale(c.width/SIZE,c.height/SIZE);if(mirror){ctx.translate(SIZE,0);ctx.scale(-1,1);}ctx.drawImage(surface.canvas,0,0,SIZE,SIZE*(loaded.span||1),0,0,SIZE,SIZE);ctx.drawImage(surface.detail,0,0,SIZE,SIZE*(loaded.span||1),0,0,SIZE,SIZE);ctx.restore();}}
  button.classList.toggle('stamp-loaded',!!loaded);annotation.hidden=!active||!loaded;
 }
 function setActive(value){if(!value)finish();active=value;root.classList.toggle('stamping',value);physical.hidden=!value;annotation.hidden=!value||!loaded;if(value){physical.hidden=true;draw(effectiveMirror());}}
 function effectiveMirror(id=hoverId){return !!loaded&&(defaultMirror(loaded.sourceId,id)!==flip);}
 function wipe(){finish();loaded=null;flip=false;preview=null;drawnMirror=null;draw();button.classList.remove('stamp-wiping');void button.offsetWidth;button.classList.add('stamp-wiping');tone('wipe');save();}
 button.onclick=()=>{if(api.tool()==='erase'&&loaded){wipe();return;}if(api.tool()==='stamp'&&loaded){finish();flip=!flip;draw(effectiveMirror());button.classList.remove('stamp-flipping');void button.offsetWidth;button.classList.add('stamp-flipping');save();return;}pickTool('stamp');};
 function setPose(e,id=-1,contact=false){const bounds=canvas.getBoundingClientRect();let width=43,height=54,angle=0,x=e.clientX-bounds.left,y=e.clientY-bounds.top;
  if(id>=0){const s=specs[id],pixel=camera.zoom*bounds.height/(camera.top-camera.bottom);width=Math.max(30,s[3]*pixel);height=Math.max(37,s[4]*span(nails[id].form)*pixel);angle=s[5];if(!api.zoomed?.()||!loaded){const c=new THREE.Vector3(0,(.5-span(nails[id].form)/2)*s[4],3);nails[id].mesh.localToWorld(c);c.project(camera);x=(c.x+1)*bounds.width/2;y=(1-c.y)*bounds.height/2;}}
  physical.style.left=x+'px';physical.style.top=y+'px';physical.style.setProperty('--stamp-width',width+'px');physical.style.setProperty('--stamp-height',height+'px');physical.style.setProperty('--stamp-angle',angle+'deg');physical.hidden=false;
 }
 function visibleInk(n){for(const ctx of [n.ctx,n.dctx]){const bytes=ctx.getImageData(0,0,SIZE,SIZE*span(n.form)).data;for(let i=3;i<bytes.length;i+=4)if(bytes[i]>4)return true;}return false;}
 function contact(){if(!motion||motion.contacted)return;motion.contacted=true;const {id,u,v}=motion,n=nails[id];
  if(!loaded){if(visibleInk(n)){loaded=captureRecipe(id,[specs[id][3],specs[id][4]*span(n.form)],n.actions,n.form);flip=false;preview=null;drawnMirror=null;draw(false);save();}}
  else {const action=makeTransfer(loaded,{...n,span:span(n.form),basePresent:surfaceHasBase(n)},[specs[id][3],specs[id][4]*span(n.form)],u,v/span(n.form),flip,n.wetUntil>performance.now());transfer(n,action);}
  tone('stamp');selectNail(id);
 }
 function finish(){if(!motion)return;contact();motion=null;physical.style.setProperty('--press','0');physical.hidden=true;}
 function press(id,u=.5,v=.5,e){if(!active||api.presenting())return false;finish();commitStroke();const s=specs[id];if(!s)return false;hoverId=id;draw(effectiveMirror(id));if(e)setPose(e,id,true);motion={id,u,v,start:performance.now(),contacted:false};return true;}
 canvas.addEventListener('pointerdown',e=>{if(!active||api.presenting()||e.button>0)return;e.preventDefault();e.stopImmediatePropagation();const h=hit(e);if(!h)return;const id=h.object.userData.id,p=localPoint(e,nails[id]);lastPointer={clientX:e.clientX,clientY:e.clientY,pointerType:e.pointerType};press(id,api.zoomed?.()?p.x/SIZE:.5,api.zoomed?.()?p.y/SIZE:span(nails[id].form)/2,e);},true);
 canvas.addEventListener('pointermove',e=>{if(!active||api.presenting())return;lastPointer={clientX:e.clientX,clientY:e.clientY,pointerType:e.pointerType};if(motion)return;const h=hit(e);hoverId=h?h.object.userData.id:-1;setPose(e,hoverId);draw(effectiveMirror());},true);
 canvas.addEventListener('pointerleave',()=>{if(!motion)physical.hidden=true;hoverId=-1;});
 canvas.addEventListener('dblclick',e=>{if(active)e.stopImmediatePropagation();},true);
 document.addEventListener('keydown',e=>{if(active&&e.key.toLowerCase()==='m'&&!e.metaKey&&!e.ctrlKey&&loaded){e.preventDefault();finish();flip=!flip;draw(effectiveMirror());save();}},true);
 function update(t){if(!motion)return;const p=Math.min(1,(t-motion.start)/260);if(p>=.43)contact();const squash=p<.43?p/.43:p<.62?1:(1-p)/.38;physical.style.setProperty('--press',reduced?'0':Math.max(0,squash).toFixed(3));if(p>=1){motion=null;physical.style.setProperty('--press','0');if(lastPointer&&lastPointer.pointerType!=='touch'&&active)setPose(lastPointer,hoverId);else physical.hidden=true;}}
 function restore(value){loaded=imprints.get(value?.imprintId)||null;flip=!!value?.flip;preview=null;drawnMirror=null;draw(false);}
 function state(){return {imprintId:loaded?.id||null,flip};}
 function inspect(){return {...state(),sourceId:loaded?.sourceId??null,active,pressing:!!motion,mirror:effectiveMirror(),surfaceActions:loaded?.actions.length||0};}
 physical.hidden=true;draw();
 return {setActive,update,finish,state,restore,inspect};
}
