import {frameLayout,drawFrame} from './frames.js';
import {fitText} from './layout.js';
import {canvasFont,fontStrokeWidth} from './fonts.js';
import {ensureWebFont} from './font-loader.js';
import {validate,effectiveTransparency} from '../editor/model.js';
import {renderAnimation} from './animation.js';
export async function renderEmoji({text,foreground,background,transparent,font:fontId='gothic',fontWeight=900,align='center',stretchVertical=true,animation='none',animationSpeed='medium',frame='none'}) {
 const errors=validate(text); if(errors.length) throw new Error(errors.join(' '));
 if(!['none','bounce','shake','pop','blink'].includes(animation))throw Error('アニメーションを選び直してください。');
 transparent=effectiveTransparency(animation,transparent);
 const area=frameLayout(frame);
 await ensureWebFont(fontId,text,fontWeight);
 const canvas=document.createElement('canvas'); canvas.width=canvas.height=128;
 const ctx=canvas.getContext('2d'); if(!ctx) throw new Error('Canvasを利用できません。');
 const font=size=>canvasFont(fontId,size,fontWeight);
 const fit=fitText(text.replace(/\r\n?/g,'\n').split('\n'),(line,size)=>{
  ctx.font=font(size);ctx.letterSpacing=`${-size*.08}px`;const m=ctx.measureText(line),pad=fontStrokeWidth(fontId,size,fontWeight)/2;
  return {width:m.width,actualBoundingBoxLeft:m.actualBoundingBoxLeft+pad,actualBoundingBoxRight:m.actualBoundingBoxRight+pad,actualBoundingBoxAscent:(m.actualBoundingBoxAscent||size*.8)+pad,actualBoundingBoxDescent:(m.actualBoundingBoxDescent||size*.2)+pad};
 },frame==='none'?align:'center',area);
 if(frame!=='none'){ctx.beginPath();ctx.rect(area.x,area.y,area.width,area.height);ctx.clip();}
 ctx.font=font(fit.size);ctx.letterSpacing=`${-fit.size*.08}px`;ctx.fillStyle=foreground;ctx.textBaseline='alphabetic';
 const strokeWidth=fontStrokeWidth(fontId,fit.size,fontWeight);
 ctx.strokeStyle=foreground;if(strokeWidth>0)ctx.lineWidth=strokeWidth;ctx.lineJoin='round';
 if(stretchVertical){
  let top=Infinity,bottom=-Infinity;
  for(const line of fit.lines){
   const m=ctx.measureText(line.text);
   if(!m.actualBoundingBoxLeft&&!m.actualBoundingBoxRight&&!m.actualBoundingBoxAscent&&!m.actualBoundingBoxDescent)continue;
   const pad=strokeWidth/2;
   top=Math.min(top,line.y-(m.actualBoundingBoxAscent??fit.size*.8)-pad);
   bottom=Math.max(bottom,line.y+(m.actualBoundingBoxDescent??fit.size*.2)+pad);
  }
  if(bottom>top){
   const scaleY=area.height/(bottom-top);
   ctx.beginPath();ctx.rect(0,0,128,128);ctx.clip();
   // Transform the glyphs before rasterizing: scaling a small bitmap also
   // stretches its antialiased edge pixels, which blurs long single lines.
   ctx.setTransform(1,0,0,scaleY,0,area.y-top*scaleY);
  }
 }
 fit.lines.forEach(line=>{if(strokeWidth>0)ctx.strokeText(line.text,line.x,line.y);ctx.fillText(line.text,line.x,line.y);});
 // Keep fixed-width frame strokes independent of extreme glyph transforms.
 const layer=document.createElement('canvas');layer.width=layer.height=128;
 const layerCtx=layer.getContext('2d');if(!layerCtx)throw new Error('Canvasを利用できません。');
 drawFrame(layerCtx,frame,foreground);layerCtx.drawImage(canvas,0,0);
 const output=document.createElement('canvas');output.width=output.height=128;
 const out=output.getContext('2d');if(!out)throw new Error('Canvasを利用できません。');
 if(!transparent){out.fillStyle=background;out.fillRect(0,0,128,128);}
 out.drawImage(layer,0,0);
 const blob=animation!=='none'?renderAnimation(layer,{foreground,background,transparent,animation,speed:animationSpeed}):await new Promise(resolve=>output.toBlob(resolve,'image/png'));
 if(!blob) throw new Error('画像を生成できませんでした。');
 if(blob.size>=128000) throw new Error(animation!=='none'?'GIFが128,000バイト以上です。文字数を減らすか、背景を透明にしてください。':'画像が128,000バイト以上です。');
 return {canvas:output,blob};
}
