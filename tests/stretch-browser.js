import {renderEmoji} from '../src/emoji/render.js';
import {verticalInkBounds} from '../src/emoji/layout.js';
import {FONT_PRESETS} from '../src/emoji/fonts.js';
export async function verifyStretch(){
 // At this width the source glyph is only a few pixels high. Scaling its
 // bitmap spreads edge alpha over most of the output; direct text drawing
 // keeps the middle of the horizontal strokes opaque and their edges narrow.
 const sharp=await renderEmoji({text:'三'.repeat(12),font:'gothic-bold',foreground:'#111111',transparent:true});
 const sharpPixels=sharp.canvas.getContext('2d').getImageData(0,0,128,128).data;
 let partial=0,solid=0;
 for(let y=0;y<128;y++){
  const alpha=sharpPixels[(y*128+8)*4+3];
  if(alpha>0&&alpha<255)partial++;
  if(alpha===255)solid++;
 }
 if(partial>20||solid<30)throw Error(`Stretched horizontal strokes are blurred: ${partial} partial / ${solid} solid pixels`);
 let pairs=0;
 for(const font of FONT_PRESETS)for(const align of ['center','left','right'])for(const text of ['ありがとう','確認済\n済','三'.repeat(12),'上\n中\n下','一\n二\n三\n四','\nありがとう\n','確認\n\n済','Agy_','一\n\n\n','、','見','ー'.repeat(12)]){
  const options={text,font:font.id,align,foreground:'#111111',background:'#ff0000',transparent:true};
  const off=await renderEmoji({...options,stretchVertical:false}),on=await renderEmoji({...options,stretchVertical:true});
  const bounds=c=>verticalInkBounds(c.getContext('2d').getImageData(0,0,128,128).data,128,128);
  const a=bounds(off.canvas),b=bounds(on.canvas);
  // Text rasterization can inset a contour by one pixel from its vector bounds.
  if(b.top>1||b.top+b.height<127)throw Error('Stretch does not fill vertical area: '+JSON.stringify({font:font.id,text,...b}));
  if(a.height<100&&a.height>=b.height)throw Error('Off should preserve shorter text');
  for(const {canvas,blob} of [off,on]){
   if(canvas.width!==128||canvas.height!==128||blob.size>=128000)throw Error('PNG');
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
 return `PASS: sharp strokes (${partial} partial / ${solid} solid pixels) / ${pairs} on/off pairs / default on / background / full vertical area`;
}
