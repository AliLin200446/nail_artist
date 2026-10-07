export const MAX_EXTENSION=1.65;
export const SURFACE_SPAN=3;
export const tendencies={square:{tipWidth:.84,sideTaper:.03,tipRoundness:.04},almond:{tipWidth:.10,sideTaper:.5,tipRoundness:.88},coffin:{tipWidth:.49,sideTaper:.3,tipRoundness:.05},stiletto:{tipWidth:.018,sideTaper:.87,tipRoundness:.08}};
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function naturalForm(width=45,height=61){return {naturalNailBounds:{width,height},extensionLength:0,tipWidth:.1,sideTaper:.5,tipRoundness:.88,shapeAssist:'almond',surfaceGeometry:{version:1,segments:80,columns:20}};}
export function validForm(f){return !!f&&Number.isFinite(f.extensionLength)&&f.extensionLength>=0&&f.extensionLength<=MAX_EXTENSION&&Number.isFinite(f.tipWidth)&&f.tipWidth>=.015&&f.tipWidth<=.94&&Number.isFinite(f.sideTaper)&&f.sideTaper>=0&&f.sideTaper<=1&&Number.isFinite(f.tipRoundness)&&f.tipRoundness>=0&&f.tipRoundness<=1&&Object.hasOwn(tendencies,f.shapeAssist)&&f.naturalNailBounds?.width>0&&f.naturalNailBounds?.height>0&&f.surfaceGeometry?.version===1;}
export const span=f=>1+(f?.extensionLength||0);
// Coordinates are measured in original nail-bed units; the cuticle never moves.
const boundaries=new WeakMap(),widths=new WeakMap();
export function boundary(f){if(f&&boundaries.has(f))return boundaries.get(f);const length=f?.extensionLength||0,points=[];let p=[.22,0];points.push(p);
 const line=(x,y)=>{p=[x,y];points.push(p);};
 const cubic=(x1,y1,x2,y2,x3,y3,n=20)=>{const [x0,y0]=p;for(let i=1;i<=n;i++){const t=i/n,s=1-t;points.push([s*s*s*x0+3*s*s*t*x1+3*s*t*t*x2+t*t*t*x3,s*s*s*y0+3*s*s*t*y1+3*s*t*t*y2+t*t*t*y3]);}p=[x3,y3];};
 cubic(.03,.01,.01,.18,.01,.38);line(.04,.77);
 if(length<.00001){cubic(.07,.99,.26,1.01,.5,1.01);cubic(.74,1.01,.93,.99,.96,.77);}
 else{const t=clamp(length/.16,0,1),width=f.tipWidth*t,round=f.tipRoundness*t+(1-t),tip=1.01+length,shoulder=tip-(.03+round*.22),side=.04+f.sideTaper*.18;
 cubic(side,.86+length*.18,.5-width/2-.05*(1-round),shoulder-.12*(1+length),.5-width/2,shoulder);
 cubic(.5-width/2,tip,.5-width*.25,tip,.5,tip,12);
 cubic(.5+width*.25,tip,.5+width/2,tip,.5+width/2,shoulder,12);
 cubic(.5+width/2+.05*(1-round),shoulder-.12*(1+length),1-side,.86+length*.18,.96,.77);
 }
 line(.99,.38);cubic(.99,.18,.97,.01,.78,0);cubic(.5933,-.0333,.4067,-.0333,.22,0);if(f)boundaries.set(f,points);return points;
}
export function contains(f,u,v,margin=0){const polygon=boundary(f);let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const [xi,yi]=polygon[i],[xj,yj]=polygon[j];if((yi>v)!==(yj>v)&&u<(xj-xi)*(v-yi)/(yj-yi)+xi)inside=!inside;}if(!inside)return false;if(margin){return contains(f,u-margin,v)&&contains(f,u+margin,v)&&contains(f,u,v-margin)&&contains(f,u,v+margin);}return true;}
export function clipSurface(ctx,f,size=512){const points=boundary(f);ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x*size,y*size):ctx.moveTo(x*size,y*size));ctx.closePath();ctx.clip();}
export function halfWidth(f,v){let cache=widths.get(f);if(!cache){cache=new Map();widths.set(f,cache);}if(cache.has(v))return cache.get(v);const p=boundary(f),xs=[];for(let i=1;i<p.length;i++){const a=p[i-1],b=p[i];if((a[1]<=v&&b[1]>v)||(b[1]<=v&&a[1]>v))xs.push(a[0]+(b[0]-a[0])*(v-a[1])/(b[1]-a[1]));}const value=xs.length?(Math.max(...xs)-Math.min(...xs))/2:.001;cache.set(v,value);return value;}
export function surfaceZ(f,u,v){if(!f?.extensionLength)return 0;const width=f.naturalNailBounds.width,edge=Math.max(.001,halfWidth(f,v)),c=Math.max(0,1-((u-.5)/edge)**2),root=clamp(v/.18,0,1),arch=.65+.35*Math.sin(Math.PI*clamp(v/span(f),0,1));return width*(.025+.013*f.extensionLength)*c*root*arch;}
export function assisted(f){let best='almond',score=Infinity;for(const [name,s] of Object.entries(tendencies)){const distance=(s.tipWidth-f.tipWidth)**2+(s.sideTaper-f.sideTaper)**2*.35+(s.tipRoundness-f.tipRoundness)**2*.1;if(distance<score){score=distance;best=name;}}const result={...f,shapeAssist:best};if(score<.035){const target=tendencies[best];for(const k of ['tipWidth','sideTaper','tipRoundness'])result[k]+=(target[k]-result[k])*.16;}return result;}
export function cycleForm(f){const names=Object.keys(tendencies),name=names[(names.indexOf(f.shapeAssist)+1)%4];return {...f,...tendencies[name],shapeAssist:name};}
export function isTrim(a){return a?.tool==='trim';}
