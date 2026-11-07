import {test} from 'node:test';
import assert from 'node:assert/strict';
import {FONT_PRESETS,canvasFont,fontStrokeWidth} from '../src/emoji/fonts.js';
test('offers three independent weights for every font family',()=>{
 assert.deepEqual(FONT_PRESETS.map(p=>p.label),['ゴシック体','明朝体','丸文字']);
 for(const preset of FONT_PRESETS)for(const weight of [300,500,900]){
  const actual=weight===300?(preset.id==='mincho'?600:500):weight===500?(preset.id==='mincho'?900:preset.id==='rounded'?700:800):900;
  assert.match(canvasFont(preset.id,32,weight),new RegExp(`^${actual} 32px`));
  assert.ok(fontStrokeWidth(preset.id,48,weight)>=0);
 }
 assert.equal(canvasFont(undefined,32),canvasFont('gothic',32,900));
 assert.throws(()=>canvasFont('invalid',32),/フォント/);
 assert.throws(()=>canvasFont('gothic',32,123),/太さ/);
});

test('medium uses the specified font weights and outlines',()=>{
 for(const [id,weight] of [['gothic',800],['mincho',900],['rounded',700]]){
  assert.match(canvasFont(id,48,500),new RegExp(`^${weight} 48px`));
  assert.equal(fontStrokeWidth(id,48,500),(id==='mincho'?48*0.025:id==='rounded'?48*0.02:0));
 }
});

test('adjusts requested outlines while leaving other combinations unchanged',()=>{
 for(const p of FONT_PRESETS)assert.equal(fontStrokeWidth(p.id,100,300),0);
 assert.equal(fontStrokeWidth('mincho',100,900),6);
 assert.equal(fontStrokeWidth('gothic',100,900),4);
 assert.equal(fontStrokeWidth('rounded',100,900),0);
});
