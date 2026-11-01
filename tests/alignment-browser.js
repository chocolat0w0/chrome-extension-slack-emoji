import {renderEmoji} from '../src/emoji/render.js';
import {FONT_PRESETS} from '../src/emoji/fonts.js';
export async function verifyAlignment(){
 const results=[];
 for(const font of FONT_PRESETS){for(const align of ['center','left','right']){
  const {canvas,blob}=await renderEmoji({text:'確認済\n済',font:font.id,align,foreground:'#111111',background:'#ffffff',transparent:true});
  const data=canvas.getContext('2d').getImageData(0,0,128,128).data;
  const bounds=[{min:128,max:-1},{min:128,max:-1}];
  for(let y=0;y<128;y++)for(let x=0;x<128;x++)if(data[(y*128+x)*4+3]){
   if(x===0||x===127||y===0||y===127)throw Error('Clipped');const b=bounds[y<64?0:1];b.min=Math.min(b.min,x);b.max=Math.max(b.max,x);
  }
  for(const b of bounds){if(b.max<0)throw Error('Empty line');if(align==='left'&&Math.abs(b.min-8)>2)throw Error('Left alignment');if(align==='right'&&Math.abs(b.max-119)>2)throw Error('Right alignment');if(align==='center'&&Math.abs((b.min+b.max)/2-63.5)>2)throw Error('Center alignment');}
  if(canvas.width!==128||canvas.height!==128||blob.size>=128000)throw Error('Invalid PNG');
  results.push({font:font.id,align,bounds});
  const figure=document.createElement('figure');const caption=document.createElement('figcaption');caption.textContent=font.label+' / '+align;figure.append(caption,canvas);document.querySelector('#samples').append(figure);
 }}return 'PASS: 4 fonts × 3 alignments / actual ink bounds / no clipping';
}
