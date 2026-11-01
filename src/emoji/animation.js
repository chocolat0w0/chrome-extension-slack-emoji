import {encodeGif} from './gif.js';
export function renderAnimation(layer,{foreground,background,transparent,animation}){
 const rgb=hex=>[1,3,5].map(offset=>parseInt(hex.slice(offset,offset+2),16));
 const ink=rgb(foreground),paper=transparent?ink:rgb(background),palette=new Uint8Array(768);
 // A two-color gradient preserves the exact selected colors and opaque edges.
 for(let alpha=0;alpha<256;alpha++)for(let channel=0;channel<3;channel++)palette[alpha*3+channel]=Math.round(paper[channel]+(ink[channel]-paper[channel])*alpha/255);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('Canvasを利用できません。');
 const frames=[];
 for(let i=0;i<20;i++){
  const t=i/20;
  ctx.clearRect(0,0,128,128);
  if(animation==='bounce')ctx.drawImage(layer,12.8,25.6-20*4*t*(1-t),102.4,102.4);
  if(animation==='shake'){
   const offsets=[0,4,-4,3,-3];ctx.drawImage(layer,12.8+offsets[i%offsets.length],12.8,102.4,102.4);
  }
  if(animation==='pop'){
   const size=128*(.55+.29*Math.sin(Math.PI*t)),margin=(128-size)/2;ctx.drawImage(layer,margin,margin,size,size);
  }
  if((animation==='blink'&&i<10)||(animation==='blink-fast'&&i%10<5))ctx.drawImage(layer,0,0,128,128);
  const rgba=ctx.getImageData(0,0,128,128).data,pixels=new Uint8Array(128*128);
  // 32 edge shades keep antialiasing while avoiding hundreds of near-identical
  // colors that inflate animated text. Endpoints retain exact foreground/background.
  for(let p=0;p<pixels.length;p++){const alpha=rgba[p*4+3];pixels[p]=transparent?(alpha>=128?255:0):Math.round(Math.round(alpha*31/255)*255/31);}
  frames.push(pixels);
 }
 return encodeGif({width:128,height:128,palette,frames,transparent,delay:6});
}
