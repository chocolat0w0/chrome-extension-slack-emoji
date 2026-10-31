import {test} from 'node:test';
import assert from 'node:assert/strict';
import {FONT_PRESETS,canvasFont,fontStrokeWidth} from '../src/emoji/fonts.js';
test('offers four requested styles and defaults to bold Gothic',()=>{
 assert.deepEqual(FONT_PRESETS.map(p=>p.label),['ゴシック体','太いゴシック体','明朝体','丸文字']);
 assert.equal(canvasFont(undefined,32),canvasFont('gothic-bold',32));
 assert.match(canvasFont('gothic',32),/^700 32px/);
 assert.match(canvasFont('gothic-bold',32),/^900 32px/);
 assert.match(canvasFont('mincho',32),/Mincho/);
 assert.match(canvasFont('rounded',32),/Maru/);
 assert.throws(()=>canvasFont('invalid',32),/フォント/);
});

test('thickens all fonts, with stronger stroke for bold Gothic',()=>{
 for(const preset of FONT_PRESETS){assert.ok(preset.weight>=700);assert.ok(fontStrokeWidth(preset.id,48)>0);}
 assert.ok(fontStrokeWidth('gothic-bold',48)>fontStrokeWidth('gothic',48));
 assert.ok(fontStrokeWidth('rounded',12)<fontStrokeWidth('rounded',48));
});
