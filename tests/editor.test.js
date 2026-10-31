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
test('fits actual glyph bounds including ascenders and descenders within padded image',()=>{
 const measure=(text,size)=>({width:text.length*size,actualBoundingBoxLeft:0,actualBoundingBoxRight:text.length*size,actualBoundingBoxAscent:size*.85,actualBoundingBoxDescent:size*.25});
 const fit=fitText(['確認','中'],measure);
 assert.ok(fit.size>0);
 for(const line of fit.lines){assert.ok(line.x-line.left>=8);assert.ok(line.x+line.right<=120);assert.ok(line.y-line.ascent>=8);assert.ok(line.y+line.descent<=120);}
});
