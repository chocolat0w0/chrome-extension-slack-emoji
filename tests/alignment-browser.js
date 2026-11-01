import {renderEmoji} from '../src/emoji/render.js';
import {FONT_PRESETS} from '../src/emoji/fonts.js';
export async function verifyAlignment(){
 const originalMeasure=CanvasRenderingContext2D.prototype.measureText,originalFill=CanvasRenderingContext2D.prototype.fillText;
 const measured=[],drawn=[];
 try{
  CanvasRenderingContext2D.prototype.measureText=function(...args){measured.push(parseFloat(this.letterSpacing));return originalMeasure.apply(this,args);};
  CanvasRenderingContext2D.prototype.fillText=function(...args){drawn.push(parseFloat(this.letterSpacing));return originalFill.apply(this,args);};
  await renderEmoji({text:'文字間',font:'gothic-bold',foreground:'#111111',transparent:true});
  if(!measured.length||!drawn.length||measured.some(n=>!(n<0))||drawn.some(n=>!(n<0))||measured.at(-1)!==drawn.at(-1))throw Error('文字間が計測と描画に反映されていません');
 }finally{CanvasRenderingContext2D.prototype.measureText=originalMeasure;CanvasRenderingContext2D.prototype.fillText=originalFill;}
 const results=[];
 for(const font of FONT_PRESETS){for(const align of ['center','left','right']){
  const {canvas,blob}=await renderEmoji({text:'確認済\n済',font:font.id,align,foreground:'#111111',background:'#ffffff',transparent:true});
  const data=canvas.getContext('2d').getImageData(0,0,128,128).data;
  const bounds=[{min:128,max:-1},{min:128,max:-1}];
  for(let y=0;y<128;y++)for(let x=0;x<128;x++)if(data[(y*128+x)*4+3]){
   const b=bounds[y<64?0:1];b.min=Math.min(b.min,x);b.max=Math.max(b.max,x);
  }
  for(const b of bounds){if(b.max<0)throw Error('Empty line');if(align==='left'&&Math.abs(b.min)>2)throw Error('Left alignment');if(align==='right'&&Math.abs(b.max-127)>2)throw Error('Right alignment');if(align==='center'&&Math.abs((b.min+b.max)/2-63.5)>2)throw Error('Center alignment');}
  if(canvas.width!==128||canvas.height!==128||blob.size>=128000)throw Error('Invalid PNG');
  results.push({font:font.id,align,bounds});
  const figure=document.createElement('figure');const caption=document.createElement('figcaption');caption.textContent=font.label+' / '+align;figure.append(caption,canvas);document.querySelector('#samples').append(figure);
 }}return `PASS: ${FONT_PRESETS.length} fonts × 3 alignments / actual ink bounds`;
}
