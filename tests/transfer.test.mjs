import test from 'node:test';
import assert from 'node:assert/strict';
import {imprints,captureRecipe,makeTransfer,defaultMirror,stampOffset,restoreImprints,hasBase} from '../dist/transfer.js';
import {validAction,migrate} from '../dist/materials.js';
const stroke=(tool,color=0)=>({tool,color,material:'cream',seed:19,points:[{x:180,y:140,r:tool==='brush'?58:7}]});
const dimensions=[45,61];

test('equivalent fingers mirror; same-hand and unmatched fingers preserve orientation',()=>{
 for(let i=0;i<5;i++)assert.equal(defaultMirror(i,9-i),true);
 for(const [a,b] of [[3,0],[3,2],[3,8],[6,7],[3,3]])assert.equal(defaultMirror(a,b),false);
});
test('capture is an immutable surface recipe, never a reference to editable nail actions',()=>{
 imprints.clear();const actions=[stroke('brush',3),stroke('liner'),stroke('dot',2)];const r=captureRecipe(3,dimensions,actions);actions[1].points[0].x=400;actions.push(stroke('dot'));
 assert.equal(r.actions.length,3);assert.equal(r.actions[1].points[0].x,180);assert.equal('charms' in r,false);
});
test('recipient base is preserved, transfer is one layer, and manual flip reverses the default',()=>{
 imprints.clear();const r=captureRecipe(3,dimensions,[stroke('brush',3),stroke('liner')]);const empty={id:6,actions:[]},painted={id:0,actions:[stroke('brush',6)]};
 const mirrored=makeTransfer(r,empty,dimensions);assert.equal(mirrored.mirror,true);assert.equal(mirrored.includeBase,true);assert.equal(validAction(mirrored),true);
 assert.equal(makeTransfer(r,empty,dimensions,.5,.5,true).mirror,false);
 const layered=makeTransfer(r,painted,[34,52]);assert.equal(layered.includeBase,false);assert.equal(painted.actions.length,1);
 assert.equal(hasBase([mirrored]),true);assert.equal(hasBase([layered]),false);
});
test('central taps do not shift artwork; deliberate offset stays bounded and wetness stays subtle',()=>{
 assert.deepEqual(stampOffset(.55,.45),{x:0,y:0});assert.deepEqual(stampOffset(0,1),{x:-.24,y:.24});
 const r=captureRecipe(3,dimensions,[stroke('liner')]);const a=makeTransfer(r,{id:0,actions:[]},[34,52],.8,.25,false,true);assert.equal(a.softness,.35);assert.ok(a.offset.x>0);assert.ok(a.offset.y<0);
});
test('saved nested transfers restore in dependency order and reject missing/cyclic recipes',()=>{
 imprints.clear();const a=captureRecipe(3,dimensions,[stroke('brush',3),stroke('liner')]);const transfer=makeTransfer(a,{id:6,actions:[]},dimensions);const b=captureRecipe(6,dimensions,[transfer,stroke('dot',2)]);const data=JSON.parse(JSON.stringify([...imprints.values()]));
 restoreImprints(data,validAction);assert.equal(imprints.size,2);assert.equal(hasBase(imprints.get(b.id).actions),true);
 restoreImprints([{...b,id:'broken',actions:[{...transfer,imprintId:'broken'}]}],validAction);assert.equal(imprints.size,0);
 restoreImprints(data,validAction);const save={v:4,nails:Array.from({length:10},()=>[]),imprints:data,stamp:{imprintId:b.id,flip:true}};assert.deepEqual(migrate(save),save);
});
