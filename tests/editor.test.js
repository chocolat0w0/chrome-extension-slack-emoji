import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validate, graphemes} from '../src/editor/model.js';
import {fitText} from '../src/emoji/layout.js';
test('validates blank text and line/grapheme boundaries without splitting combining characters',()=>{
 assert.equal(validate('   ').length,1);
 assert.equal(graphemes('か\u3099').length,1);
 assert.equal(validate('ありがとう\n確認中').length,0);
 assert.equal(validate('a\nb\nc\nd\ne').length,1);
 assert.equal(validate('あ'.repeat(13)).length,1);
 assert.equal(validate('あ'.repeat(12)).length,0);
});
test('fits actual glyph bounds including ascenders and descenders within image',()=>{
 const measure=(text,size)=>({width:text.length*size,actualBoundingBoxLeft:0,actualBoundingBoxRight:text.length*size,actualBoundingBoxAscent:size*.85,actualBoundingBoxDescent:size*.25});
 const fit=fitText(['確認','中'],measure);
 assert.ok(fit.size>0);
 for(const line of fit.lines){assert.ok(line.x-line.left>=0);assert.ok(line.x+line.right<=128);assert.ok(line.y-line.ascent>=0);assert.ok(line.y+line.descent<=128);}
});
test('aligns ink bounds at the left edge, center, or right edge without padding',()=>{
 const measure=(text,size)=>({width:text.length*size,actualBoundingBoxLeft:2,actualBoundingBoxRight:text.length*size-2,actualBoundingBoxAscent:size*.8,actualBoundingBoxDescent:size*.2});
 for(const align of ['left','center','right']){
  const fit=fitText(['長い行','短'],measure,align);
  for(const line of fit.lines){
   if(align==='left')assert.equal(line.x-line.left,0);
   if(align==='right')assert.equal(line.x+line.right,128);
   if(align==='center')assert.equal((line.x-line.left+line.x+line.right)/2,64);
  }
 }
 assert.deepEqual(fitText(['a'],measure),fitText(['a'],measure,'center'));
 assert.throws(()=>fitText(['a'],measure,'invalid'),/文字揃え/);
});
test('finds actual vertical ink bounds, including faint edge pixels',async()=>{
 const {verticalInkBounds}=await import('../src/emoji/layout.js');
 const pixels=new Uint8ClampedArray(4*4*6);
 assert.equal(verticalInkBounds(pixels,4,6),null);
 pixels[(1*4+2)*4+3]=1;pixels[(4*4+1)*4+3]=255;
 assert.deepEqual(verticalInkBounds(pixels,4,6),{top:1,height:4});
});
test('normalizes freely specified HEX colors and rejects incomplete values',async()=>{
 const {normalizeHex}=await import('../src/editor/model.js');
 assert.equal(normalizeHex('#EC71A1'),'#ec71a1');
 assert.equal(normalizeHex('  f80 '),'#ff8800');
 assert.equal(normalizeHex('#123456'),'#123456');
 for(const invalid of ['','#12','red','#gggggg','#12345678'])assert.equal(normalizeHex(invalid),null);
});
