import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderAnimation} from '../src/emoji/animation.js';
test('GIF frames use the selected speed and default to medium',async()=>{
 const original=globalThis.document;
 globalThis.document={createElement:()=>({getContext:()=>({clearRect(){},drawImage(){},getImageData(){return {data:new Uint8ClampedArray(128*128*4)}}})})};
 try{
  for(const [speed,expected] of [['slow',140],['medium',100],['fast',40],[undefined,100]]){
   const bytes=new Uint8Array(await renderAnimation({}, {foreground:'#000000',background:'#ffffff',transparent:true,animation:'bounce',speed}).arrayBuffer());
   const delays=[];for(let i=0;i<bytes.length-7;i++)if(bytes[i]===0x21&&bytes[i+1]===0xf9&&bytes[i+2]===4&&bytes[i+3]===9&&bytes[i+6]===0&&bytes[i+7]===0)delays.push(bytes[i+4]+256*bytes[i+5]);
   assert.equal(delays.length,20);assert.equal(delays.reduce((a,b)=>a+b,0),expected,`${speed} total delay`);
  }
 }finally{globalThis.document=original;}
});

test('shake uses two cycles across 20 frames',()=>{
 const original=globalThis.document,positions=[];
 globalThis.document={createElement:()=>({getContext:()=>({clearRect(){},drawImage(_layer,x){positions.push(x)},getImageData(){return {data:new Uint8ClampedArray(128*128*4)}}})})};
 try{renderAnimation({}, {foreground:'#000000',background:'#ffffff',transparent:true,animation:'shake'});assert.equal(positions.length,20);assert.deepEqual(positions.slice(0,10),positions.slice(10));assert.ok(new Set(positions).size>1);assert.equal(positions[0],positions[1]);}
 finally{globalThis.document=original;}
});
