import {renderEmoji} from '../src/emoji/render.js';
import {encodeGif} from '../src/emoji/gif.js';
import {mountEditor} from '../src/editor/view.js';
const check=(value,message)=>{if(!value)throw Error(message);};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(fn){for(let i=0;i<1600;i++){if(fn())return;await pause(25);}throw Error('Timed out waiting for animation UI');}
async function openGif(blob){const decoder=new ImageDecoder({data:await blob.arrayBuffer(),type:blob.type});await decoder.tracks.ready;return decoder;}
function pixelsOf(image){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);return ctx.getImageData(0,0,128,128).data;}
export async function verifyAnimation(){
 const results=[];
 // Independent browser decoder checks dictionary growth, resets, and sub-blocks.
 const palette=new Uint8Array(768),indices=new Uint8Array(128*128);let seed=7;
 for(let i=0;i<256;i++)palette.set([i,255-i,i],i*3);
 for(let i=0;i<indices.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;indices[i]=seed>>>24;}
 const stress=await openGif(encodeGif({width:128,height:128,palette,frames:[indices]}));
 try{const {image}=await stress.decode({frameIndex:0});const pixels=pixelsOf(image);image.close();for(let p=0;p<indices.length;p++)check(pixels[p*4]===indices[p]&&pixels[p*4+1]===255-indices[p]&&pixels[p*4+3]===255,'LZW pixel mismatch at '+p);}finally{stress.close();}
 results.push('LZW dictionary growth/reset decoded pixel-for-pixel');
 for(const transparent of [false,true]){
  const {blob}=await renderEmoji({text:'跳ねる',foreground:'#176b50',background:'#ffffff',transparent,animation:'bounce'});
  check(blob.type==='image/gif'&&blob.size<128000,'GIF type/size');const decoder=await openGif(blob),tops=[];
  try{
   check(decoder.tracks.selectedTrack.frameCount===20&&decoder.tracks.selectedTrack.repetitionCount===Infinity,'GIF frames/loop');
   for(let frameIndex=0;frameIndex<20;frameIndex++){
    const {image}=await decoder.decode({frameIndex});check(image.displayWidth===128&&image.displayHeight===128&&image.duration===50000,'GIF dimensions/delay');
    const pixels=pixelsOf(image);image.close();let top=128,bottom=-1;
    for(let p=0;p<128*128;p++){
     if(pixels[p*4]!==255){top=Math.min(top,Math.floor(p/128));bottom=Math.max(bottom,Math.floor(p/128));}
     check(pixels[p*4+3]===255,'Opaque background');
    }
    check(bottom>=top&&top>=4&&bottom<128,'Visible, unclipped text');tops.push(top);
    check(pixels[3]===255&&pixels[0]===255&&pixels[1]===255&&pixels[2]===255,'Opaque GIF background');
   }
   check(tops[0]-tops[10]>=18&&Math.abs(tops[0]-tops[19])<=5,'Bounces up and returns without trails');
  }finally{decoder.close();}
  results.push({transparent,bytes:blob.size,frames:20});
 }
 for(const animation of ['shake','pop','blink'])for(const transparent of [false,true]){
  const {blob}=await renderEmoji({text:'確認',foreground:'#176b50',background:'#ffffff',transparent,animation});
  check(blob.type==='image/gif'&&blob.size<128000,animation+' GIF type/size');
  const decoder=await openGif(blob),bounds=[];
  try{
   check(decoder.tracks.selectedTrack.frameCount===20&&decoder.tracks.selectedTrack.repetitionCount===Infinity,animation+' frames/loop');
   for(let frameIndex=0;frameIndex<20;frameIndex++){
    const {image}=await decoder.decode({frameIndex});check(image.duration===50000,animation+' duration');const pixels=pixelsOf(image);image.close();
    let left=128,right=-1,top=128,bottom=-1;
    for(let p=0;p<128*128;p++)if(pixels[p*4]!==255){const x=p%128,y=Math.floor(p/128);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
    bounds.push({left,right,top,bottom});
   }
   if(animation==='shake')check(Math.max(...bounds.map(b=>b.left))-Math.min(...bounds.map(b=>b.left))>=4,'shake moves horizontally');
   if(animation==='pop')check(Math.max(...bounds.map(b=>b.right-b.left))-Math.min(...bounds.map(b=>b.right-b.left))>=10,'pop changes scale');
   if(animation==='blink')check(bounds.some(b=>b.right<0)&&bounds.some(b=>b.right>=0),'blink shows and hides text');
  }finally{decoder.close();}
  results.push({animation,transparent,bytes:blob.size});
 }
 const longText=Array(4).fill('確認しました確認しました').join('\n');
 for(const text of ['ABCDEFGHIJKL',longText]){
  const {blob}=await renderEmoji({text,foreground:'#ec71a1',background:'#123456',transparent:false,animation:'bounce'});
  check(blob.size<128000,'Dense text fits GIF budget');results.push({text,bytes:blob.size});
 }
 const area=document.createElement('main');document.body.append(area);let dispose;
 try{
  let draft,file;dispose=mountEditor(area,{initial:{name:'bounce_test'},onDraft:value=>draft=value});const el=id=>area.querySelector('#'+id);
  await until(()=>!el('generate').disabled);check(el('background').value==='#ffffff'&&el('transparent').checked&&el('background').disabled,'Transparent default background');
  check(el('animationSpeed').disabled&&draft.animationSpeed==='medium','Default speed disabled for PNG');
  check(el('fontWeight').value==='1'&&draft.fontWeight===500,'Default font weight is medium');
  area.addEventListener('emoji-generated',e=>file=e.detail.file);
  el('animation').value='bounce';el('animation').dispatchEvent(new Event('input',{bubbles:true}));await until(()=>!el('generate').disabled);
  check(draft.animation==='bounce'&&!el('animationSpeed').disabled&&el('generate').textContent==='GIFを生成','Animation draft/button');
  check(el('transparent').disabled&&!el('transparent').checked&&!el('background').disabled&&draft.transparent,'GIF forces opaque and preserves PNG preference');
  el('animationSpeed').value='2';el('animationSpeed').dispatchEvent(new Event('input',{bubbles:true}));await until(()=>!el('generate').disabled);
  check(draft.animationSpeed==='fast'&&el('animationSpeed').getAttribute('aria-valuetext')==='速'&&el('size').textContent.includes('0.4秒'),'Speed updates draft and preview');
  el('generate').click();check(file.name==='bounce_test.gif'&&file.type==='image/gif','GIF filename/MIME');
  check((await fetch(area.querySelector('img').src)).headers.get('content-type')==='image/gif','Animated GIF preview');
  dispose();dispose=mountEditor(area,{initial:draft,onGenerate:async value=>file=value});await until(()=>!el('generate').disabled);
  check(el('animation').value==='bounce'&&el('animationSpeed').value==='2','Animation and speed restored');el('generate').click();await until(()=>!el('generate').disabled);check(file.type==='image/gif','GIF transfer callback');
  el('animation').value='none';el('animation').dispatchEvent(new Event('input',{bubbles:true}));await until(()=>!el('generate').disabled);check(el('transparent').checked&&!el('transparent').disabled,'PNG transparency restored');el('generate').click();await until(()=>!el('generate').disabled);
  check(file.name==='bounce_test.png'&&file.type==='image/png','Switch back to PNG');results.push('Transparent default, GIF preview/file/transfer, draft restore, PNG switch');
 }finally{dispose?.();area.remove();}
 return results;
}
