import test from 'node:test';
import assert from 'node:assert/strict';
import {validCharm,charmTypes} from '../dist/charms.js';
import {migrate} from '../dist/materials.js';
const pearl={id:'test-pearl',nailId:6,u:.4,v:.6,rotation:.12,scale:1,zOffset:.016,type:'pearl',material:'pearl'};
test('persisted vocabulary has 16 physical objects with valid nail-local records',()=>{
  assert.equal(charmTypes.length,16);
  for(const {type,material} of charmTypes)assert.equal(validCharm({...pearl,type,material,...(type==='chain'?{end:{u:.7,v:.7}}:{})}),true,type);
});
test('rejects damaged or out-of-range saved objects before creating meshes',()=>{
  for(const patch of [{nailId:10},{nailId:-1},{u:NaN},{v:3.1},{u:1.1},{scale:.69},{scale:1.41},{rotation:Infinity},{zOffset:-1},{type:'unknown'},{material:'unknown'},{id:null}])assert.equal(validCharm({...pearl,...patch}),false,JSON.stringify(patch));
  assert.equal(validCharm({...pearl,type:'chain',material:'silver'}),false);
  assert.equal(validCharm({...pearl,type:'chain',material:'silver',end:{u:2,v:.5}}),false);
});
test('v2 artwork remains untouched while v3 saves retain unified undo and charms',()=>{
  const v2={v:2,nails:Array.from({length:10},()=>[]),history:[{id:6}],colorIndex:3};
  assert.deepEqual(migrate(structuredClone(v2)),v2);
  const v3={...v2,v:3,charms:[pearl],history:[{id:6},{kind:'charm',before:[]}]};
  assert.deepEqual(migrate(JSON.parse(JSON.stringify(v3))),v3);
});
test('v1 pigment migration still preserves the earlier drawing vocabulary',()=>{
  const nails=Array.from({length:10},()=>[]);nails[0]=[{tool:'brush',color:4,points:[{x:100,y:100,r:20}]}];
  const data=migrate({v:1,nails,colorIndex:4});assert.equal(data.nails[0][0].material,'chrome');assert.equal(data.nails[0][0].pigment,'#a6aaa8');assert.equal(data.nails[0][0].legacy,true);
});

test('charms retain canonical positions beyond the original free edge',()=>{assert.equal(validCharm({...pearl,v:2.4}),true);});
