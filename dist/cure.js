export function createCuring(api){
 const {root,group,nails,charms,present,tone,sound,exportImage,reset,save}=api;let state='making',started=0,phase=0,hum=null;
 const lamp=document.createElement('div');lamp.id='uv-lamp';lamp.setAttribute('aria-hidden','true');lamp.innerHTML=`<svg viewBox="0 0 700 280" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="ivory" x2="0" y2="1"><stop stop-color="#fbf6eb"/><stop offset="1" stop-color="#e8decb"/></linearGradient></defs><ellipse cx="350" cy="254" rx="298" ry="13" fill="#786249" opacity=".07"/><path d="M54 240 Q42 60 169 30 Q350 -2 534 32 Q653 66 645 238 L615 250 Q614 115 527 97 Q350 69 174 99 Q83 120 85 249Z" fill="url(#ivory)" stroke="#a38b73" stroke-width="1.6"/><path d="M85 249 Q83 120 174 99 Q350 69 527 97 Q614 115 615 250Z" fill="#625a58" fill-opacity=".13"/><path class="uv-glow" d="M87 246 Q92 121 174 102 Q350 75 526 100 Q609 126 612 246Z" fill="#b6a4d3" opacity="0"/><path d="M55 239 Q350 258 645 239 L644 271 Q348 280 56 270Z" fill="#e9dfcc" stroke="#a38b73" stroke-width="1.5"/><path d="M100 57 Q344 8 592 64" fill="none" stroke="#fffc" stroke-width="2"/><text x="350" y="58" text-anchor="middle" fill="#867363" font-size="10" letter-spacing="3">n / s — UV</text></svg><div class="cure-count" aria-live="off"><span>curing</span><strong>03</strong></div>`;root.append(lamp);
 const ready=document.createElement('section');ready.id='cure-ready';ready.hidden=true;ready.innerHTML='<span class="category">ready to cure</span><p>A moment to let it settle.</p><button>cure ↗</button><button class="return-making">back to making</button>';root.append(ready);
 const reveal=document.createElement('section');reveal.id='final-reveal';reveal.hidden=true;reveal.innerHTML='<span class="category">NO. 01 / FINISHED</span><p>Made by your hands.</p><div><button data-keep>keep</button><button data-share>share</button><button data-new>start again</button></div>';root.append(reveal);
 const live=document.createElement('span');live.className='sr-only';live.setAttribute('role','status');root.append(live);
 function stopHum(){if(hum){try{hum.osc.stop();hum.context.close();}catch{}hum=null;}}
 function startHum(){if(!sound())return;try{const context=new AudioContext(),osc=context.createOscillator(),gain=context.createGain();osc.type='sine';osc.frequency.value=92;gain.gain.value=.003;osc.connect(gain);gain.connect(context.destination);osc.start();hum={context,osc};}catch{}}
 function begin(){if(state!=='making')return;present(true);save();state='ready';root.dataset.cure='ready';ready.hidden=false;live.textContent='Ready to cure. Your design is saved.';tone('stretch');}
 function cure(){if(state!=='ready')return;ready.hidden=true;state='entering';started=performance.now();root.dataset.cure='entering';live.textContent='Hands entering the UV lamp.';tone('stretch');}
 function back(){if(state!=='ready')return;state='making';delete root.dataset.cure;ready.hidden=true;present(false);}
 ready.querySelector('button').onclick=cure;ready.querySelector('.return-making').onclick=back;
 reveal.querySelector('[data-keep]').onclick=()=>exportImage(false);reveal.querySelector('[data-share]').onclick=()=>exportImage(true);reveal.querySelector('[data-new]').onclick=()=>{reset();state='making';reveal.hidden=true;delete root.dataset.cure;present(false);save();};
 const ease=x=>x*x*(3-2*x);
 function movement(v){group.position.y=-560*v;group.scale.setScalar(1-v*.35);}
 function response(v,progress){for(const n of nails){n.mesh.material.uniforms.cure.value=v;n.mesh.material.uniforms.cureProgress.value=progress;}charms().cure(v);}
 function update(t){if(state==='entering'){const p=Math.min(1,(t-started)/1100);movement(ease(p));if(p===1){state='curing';root.dataset.cure='curing';started=t;phase=3;lamp.querySelector('strong').textContent='03';live.textContent='Curing, three seconds.';tone('settle');startHum();}}
 else if(state==='curing'){const elapsed=t-started,p=Math.min(1,elapsed/3000),count=Math.max(1,3-Math.floor(elapsed/1000));if(count!==phase){phase=count;lamp.querySelector('strong').textContent='0'+count;}response(Math.sin(p*Math.PI)*.65,p);if(p===1){state='pause';started=t;root.dataset.cure='pause';response(0,1);stopHum();tone('settle');}}
 else if(state==='pause'&&t-started>=300){state='leaving';started=t;root.dataset.cure='leaving';}
 else if(state==='leaving'){const p=Math.min(1,(t-started)/1100);movement(1-ease(p));if(p===1){state='finished';root.dataset.cure='finished';reveal.hidden=false;live.textContent='Cured. Your finished manicure is ready to keep or share.';}}
 }
 window.addEventListener('pagehide',stopHum);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopHum();else if(state==='curing')startHum();});
 return {begin,update,back,state:()=>state};
}
