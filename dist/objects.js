export const crystalShapes=['round','oval','marquise','teardrop','heart','square','baguette','statement','diamond','star','pearl'];
export const crystalColors={clear:'#e5e4dc',ab:'#dcd9e5',ruby:'#a92e46',rose:'#d99caa',sapphire:'#4055a1',emerald:'#47795d',amber:'#bf883e',smoke:'#77747c',onyx:'#28292d',pearl:'#eee0c8'};
export const stickerMotifs=['star','heart','bow','flower','butterfly','flame','spiderweb','cherry','cross','letter'];
export const metalColors={silver:'#b7bdbf',gunmetal:'#555b64',gold:'#b7a06c'};
export const beadSizes={XS:1.15,S:1.8,M:2.5,L:3.4};
export const singleCharacter=value=>Array.from(String(value||'A').normalize('NFC')).filter(c=>!/[\u0000-\u001f\u007f<>]/.test(c))[0]||'A';
export function objectDimension(c){return c.type==='sticker'?18:c.type==='steel-bead'?(beadSizes[c.size]||1.8)*2.7:c.shape==='statement'?20:c.shape==='marquise'||c.shape==='baguette'?13:8.6;}
export function objectRadius(c){return objectDimension(c)*.4;}
export function validObjectStyle(c){if(c.type==='gem')return crystalShapes.includes(c.shape)&&/^#[\da-f]{6}$/i.test(c.color)&&(c.finish===undefined||['plain','ab'].includes(c.finish));if(c.type==='sticker')return stickerMotifs.includes(c.motif)&&/^#[\da-f]{6}$/i.test(c.color)&&(c.motif!=='letter'||(typeof c.letter==='string'&&Array.from(c.letter).length===1&&singleCharacter(c.letter)===c.letter));if(c.type==='steel-bead')return Object.hasOwn(beadSizes,c.size)&&Object.hasOwn(metalColors,c.finish);return true;}
export const motifPaths={
 star:'M0 -12 3 -4 11 -4 5 2 7 10 0 5 -7 10 -5 2 -11 -4 -3 -4Z',
 heart:'M0 10 C-19 -2 -9 -15 0 -5 C9 -15 19 -2 0 10Z',
 bow:'M-2 -1 Q-17 -15 -12 4 Q-9 10 -2 2 L-6 12 -2 10 0 4 3 11 7 12 3 2 Q16 12 13 -9 Q11 -14 2 -2Z',
 flower:'M0 -5 C-9 -17 -14 -4 -6 0 C-19 4 -8 17 -2 7 C2 20 14 11 7 4 C20 0 10 -13 4 -5 C6 -19 -7 -17 0 -5Z',
 butterfly:'M0 0 C-15 -20 -19 -2 -7 2 C-18 16 -3 16 0 3 C5 20 17 12 8 3 C23 -9 10 -18 0 0Z',
 flame:'M-7 11 C-18 0 -2 -2 -3 -14 C9 -6 2 -1 8 1 C9 -3 12 -4 12 -7 C18 9 7 17 -1 13 C8 9 -3 2 0 -3 C-7 5 -7 8 -7 11Z',
 cherry:'M-5 3 C-16 -3 -18 13 -8 13 C1 13 1 3 -5 3Z M8 3 C0 -1 -2 12 7 13 C17 13 17 2 8 3Z',
 cross:'M-3 -13 3 -13 3 -3 12 -3 12 3 3 3 3 13 -3 13 -3 3 -12 3 -12 -3 -3 -3Z'
};
export function crystalPath(shape){return {round:'M0 -10 A10 10 0 1 1 -.01 -10Z',oval:'M0 -13 C12 -13 12 13 0 13 C-12 13 -12 -13 0 -13Z',marquise:'M0 -14 Q16 0 0 14 Q-16 0 0 -14Z',square:'M-10 -10H10V10H-10Z',baguette:'M-6 -14H6V14H-6Z',statement:'M-7 -13H7L13 -7V7L7 13H-7L-13 7V-7Z',diamond:'M0 -13 10 0 0 13 -10 0Z',heart:motifPaths.heart,star:motifPaths.star,teardrop:'M0 -14 C3 -7 11 -1 9 6 C7 15 -7 15 -9 6 C-11 -1 -3 -7 0 -14Z',pearl:'M0 -10 A10 10 0 1 1 -.01 -10Z'}[shape];}
export function drawArtwork(ctx,c){ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
 if(c.type==='sticker'){ctx.fillStyle=c.color;ctx.strokeStyle=c.color;ctx.lineWidth=.85;
  if(c.motif==='letter'){ctx.font='27px "Instrument Serif",Georgia,serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(singleCharacter(c.letter),0,1);}
  else if(c.motif==='spiderweb'){for(let k=0;k<8;k++){const a=k*Math.PI/4;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*15,Math.sin(a)*15);ctx.stroke();}for(const r of [4,8,13]){ctx.beginPath();for(let k=0;k<8;k++){const a=k*Math.PI/4,b=(k+1)*Math.PI/4;if(!k)ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);ctx.quadraticCurveTo(Math.cos((a+b)/2)*r*.72,Math.sin((a+b)/2)*r*.72,Math.cos(b)*r,Math.sin(b)*r);}ctx.stroke();}}
  else{ctx.fill(new Path2D(motifPaths[c.motif]));if(c.motif==='cherry'){ctx.beginPath();ctx.moveTo(-8,4);ctx.quadraticCurveTo(-7,-9,5,-12);ctx.quadraticCurveTo(3,-4,7,4);ctx.stroke();}if(c.motif==='butterfly'){ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(0,6);ctx.lineTo(0,-4);ctx.lineTo(-3,-9);ctx.moveTo(0,-4);ctx.lineTo(4,-8);ctx.stroke();}}
 }else if(c.type==='steel-bead'){const color=metalColors[c.finish],g=ctx.createRadialGradient(-4,-5,.5,0,1,12);g.addColorStop(0,'#f5f1e6');g.addColorStop(.22,color);g.addColorStop(.78,color);g.addColorStop(1,'#70695e');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,11,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#80766b';ctx.lineWidth=.55;ctx.stroke();ctx.fillStyle='#fff9';ctx.beginPath();ctx.ellipse(-4,-5,1.6,1.1,0,0,Math.PI*2);ctx.fill();
 }else{const path=new Path2D(crystalPath(c.shape)||crystalPath('round'));ctx.fillStyle=c.color;ctx.globalAlpha=.93;ctx.fill(path);ctx.globalAlpha=1;ctx.strokeStyle='#8b7664';ctx.lineWidth=.55;ctx.stroke(path);ctx.save();ctx.clip(path);const tones=c.finish==='ab'?['#d8d6f366','#e7d7d95a','#cddfdb6a','#f3e7c366']:['#ffffff38','#ffffff0a','#51465420','#ffffff60'];for(let i=0;i<4;i++){ctx.fillStyle=tones[i];ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(...[[-16,-16],[16,-16],[16,16],[-16,16]][i]);ctx.lineTo(...[[16,-16],[16,16],[-16,16],[-16,-16]][i]);ctx.closePath();ctx.fill();}ctx.strokeStyle='#fff7';ctx.lineWidth=.45;ctx.stroke(new Path2D('M-6 -8H6L8 -5V6L5 8H-5L-8 5V-5Z M-6 -8 -13 -13 M6 -8 13 -13 M8 6 15 14 M-8 5 -15 14'));ctx.fillStyle='#fffc';ctx.beginPath();ctx.ellipse(-4,-6,2,1,-.5,0,Math.PI*2);ctx.fill();ctx.restore();}
 ctx.restore();}
export function previewCanvas(c){const canvas=document.createElement('canvas');canvas.width=canvas.height=96;const ctx=canvas.getContext('2d');ctx.translate(48,48);ctx.scale(2.7,2.7);drawArtwork(ctx,c);return canvas;}
