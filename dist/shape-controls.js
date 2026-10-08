import {shapePresets,lengthPresets} from './nail-form.js';
export function createShapeControls(extension){let shape='natural',length='M',lastId=-1;
 function render(center){const selected=extension.selection();if(selected&&selected.id!==lastId){shape=selected.form.preset||(selected.form.extensionLength?'custom':'natural');length=selected.form.lengthName||'M';lastId=selected.id;extension.setCustom(shape==='custom');}
 const note=document.createElement('p');note.className='shape-selection';note.textContent=selected?selected.name:'Tap a nail to shape it individually.';center.append(note);
 const row=document.createElement('div');row.className='shape-options';for(const name of shapePresets){const b=document.createElement('button');b.textContent=name;b.setAttribute('aria-label',name+' nail shape');b.setAttribute('aria-pressed',shape===name);b.onclick=()=>{shape=name;extension.setCustom(name==='custom');if(selected)extension.setPreset(shape,length);renderFresh();};row.append(b);}center.append(row);
 const label=document.createElement('span');label.className='mini-category';label.textContent='length';center.append(label);const lengths=document.createElement('div');lengths.className='editorial-options';for(const name of Object.keys(lengthPresets)){const b=document.createElement('button');b.textContent=name;b.setAttribute('aria-label',({S:'Short',M:'Medium',L:'Long',XL:'Extra long'})[name]+' nail length');b.setAttribute('aria-pressed',length===name);b.disabled=shape==='natural'||shape==='custom';b.onclick=()=>{length=name;if(selected)extension.setPreset(shape,length);renderFresh();};lengths.append(b);}center.append(lengths);
 const actions=document.createElement('div');actions.className='shape-actions';for(const [all,label] of [[false,'this nail'],[true,'apply to all']]){const b=document.createElement('button');b.textContent=label;b.disabled=!all&&!selected;b.onclick=()=>extension.setPreset(shape,length,all);actions.append(b);}center.append(actions);
 if(shape==='custom'){const p=document.createElement('p');p.textContent='Pull the tip for length. Move side marks for taper, width and roundness.';center.append(p);}
 function renderFresh(){const category=center.firstElementChild;center.replaceChildren(category);render(center);}
 }
 return {render,reset(){shape='natural';length='M';lastId=-1;}};
}
