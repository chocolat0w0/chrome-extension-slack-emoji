import {renderEmoji} from '../src/emoji/render.js';
import {verticalInkBounds} from '../src/emoji/layout.js';
import {FONT_PRESETS} from '../src/emoji/fonts.js';
export async function verifyStretch(){
 let pairs=0;
 for(const font of FONT_PRESETS)for(const align of ['center','left','right'])for(const text of ['ありがとう','確認済\n済']){
  const options={text,font:font.id,align,foreground:'#111111',background:'#ff0000',transparent:true};
  const off=await renderEmoji({...options,stretchVertical:false}),on=await renderEmoji({...options,stretchVertical:true});
  const bounds=c=>verticalInkBounds(c.getContext('2d').getImageData(0,0,128,128).data,128,128);
  const a=bounds(off.canvas),b=bounds(on.canvas);
  if(b.top!==8||b.height!==112)throw Error('Stretch does not fill vertical area: '+JSON.stringify(b));
  if(a.height>=b.height)throw Error('Off should preserve shorter text');
  for(const {canvas,blob} of [off,on]){
   if(canvas.width!==128||canvas.height!==128||blob.size>=128000)throw Error('PNG');
   const d=canvas.getContext('2d').getImageData(0,0,128,128).data;
   for(let i=0;i<128;i++)if(d[i*4+3]||d[(127*128+i)*4+3]||d[(i*128)*4+3]||d[(i*128+127)*4+3])throw Error('Clipped');
  }
  if(align==='center'&&text==='ありがとう'){
   for(const [label,result] of [['Off',off],['On',on]]){const figure=document.createElement('figure');const cap=document.createElement('figcaption');cap.textContent=font.label+' '+label;figure.append(cap,result.canvas);document.querySelector('#samples').append(figure);}
  }
  pairs++;
 }
 const options={text:'ありがとう',foreground:'#111111',background:'#ff0000',transparent:false};
 const defaultImage=await renderEmoji(options),explicit=await renderEmoji({...options,stretchVertical:true});
 if(defaultImage.canvas.toDataURL()!==explicit.canvas.toDataURL())throw Error('Default not on');
 const corner=defaultImage.canvas.getContext('2d').getImageData(0,0,1,1).data;if(corner[0]!==255||corner[1]!==0||corner[3]!==255)throw Error('Background');
 return `PASS: ${pairs} on/off pairs / default on / background / no clipping`;
}
