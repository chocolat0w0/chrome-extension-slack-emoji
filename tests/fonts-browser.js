import {renderEmoji} from '../src/emoji/render.js';
import {FONT_PRESETS} from '../src/emoji/fonts.js';
export async function verifyFonts(){
 const hashes=[],results=[];
 for(const preset of FONT_PRESETS){
  for(const text of ['確認済','ありがとう\nございました']){
   const {canvas,blob}=await renderEmoji({text,font:preset.id,foreground:'#111111',background:'#ffffff',transparent:true});
   const data=canvas.getContext('2d').getImageData(0,0,128,128).data;
   for(let i=0;i<128;i++){if(data[i*4+3]||data[(127*128+i)*4+3]||data[(i*128)*4+3]||data[(i*128+127)*4+3])throw Error('Clipped '+preset.id);}
   const bitmap=await createImageBitmap(blob);if(bitmap.width!==128||bitmap.height!==128||blob.size>=128000)throw Error('Invalid PNG');bitmap.close();
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))).map(b=>b.toString(16).padStart(2,'0')).join('');
   if(text==='確認済'){
    hashes.push(hash);
    const figure=document.createElement('figure'),caption=document.createElement('figcaption');caption.textContent=preset.label;figure.append(caption,canvas);document.querySelector('#samples').append(figure);
   }
   results.push({font:preset.id,text,bytes:blob.size});
  }
 }
 if(new Set(hashes).size!==FONT_PRESETS.length)throw Error('Some font styles render identically in this environment');
 return {result:`PASS: ${FONT_PRESETS.length} distinct styles / ${results.length} PNG cases / unclipped edges`,cases:results};
}
