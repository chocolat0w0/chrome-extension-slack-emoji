import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fitText} from '../src/emoji/layout.js';
test('fits every multiline ink bound inside an explicit safe area',()=>{
 const area={x:27,y:27,width:74,height:74};
 const measure=(text,size)=>({width:text.length*size,actualBoundingBoxLeft:2,actualBoundingBoxRight:text.length*size,actualBoundingBoxAscent:size*.8,actualBoundingBoxDescent:size*.2});
 for(const text of [['確認'],['確認','済'],['一','二','三','四'],['','確認','']]){
  const fit=fitText(text,measure,'center',area);
  for(const line of fit.lines){
   assert.ok(line.x-line.left>=area.x);
   assert.ok(line.x+line.right<=area.x+area.width);
   assert.ok(line.y-line.ascent>=area.y);
   assert.ok(line.y+line.descent<=area.y+area.height);
  }
 }
});
test('frame safe rectangles stay inside the inner circle with rasterization clearance',async()=>{
 const {frameLayout}=await import('../src/emoji/frames.js');
 assert.deepEqual(frameLayout('none'),{x:0,y:0,width:128,height:128});
 for(const [frame,innerRadius] of [['circle',58],['double-circle',50]]){
  const a=frameLayout(frame);
  for(const x of [a.x,a.x+a.width])for(const y of [a.y,a.y+a.height])assert.ok(Math.hypot(x-64,y-64)<=innerRadius-3);
 }
 assert.throws(()=>frameLayout('invalid'),/フレーム/);
});
