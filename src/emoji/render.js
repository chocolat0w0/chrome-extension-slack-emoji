import {fitText} from './layout.js';
import {canvasFont,fontStrokeWidth} from './fonts.js';
import {ensureWebFont} from './font-loader.js';
import {validate} from '../editor/model.js';
import {renderBounce} from './animation.js';
export async function renderEmoji({text,foreground,background,transparent,font:fontId='gothic-bold',align='center',stretchVertical=true,animation='none'}) {
 const errors=validate(text); if(errors.length) throw new Error(errors.join(' '));
 if(!['none','bounce'].includes(animation))throw Error('アニメーションを選び直してください。');
 await ensureWebFont(fontId,text);
 const canvas=document.createElement('canvas'); canvas.width=canvas.height=128;
 const ctx=canvas.getContext('2d'); if(!ctx) throw new Error('Canvasを利用できません。');
 const font=size=>canvasFont(fontId,size);
 const fit=fitText(text.replace(/\r\n?/g,'\n').split('\n'),(line,size)=>{
  ctx.font=font(size);const m=ctx.measureText(line),pad=fontStrokeWidth(fontId,size)/2;
  return {width:m.width,actualBoundingBoxLeft:m.actualBoundingBoxLeft+pad,actualBoundingBoxRight:m.actualBoundingBoxRight+pad,actualBoundingBoxAscent:(m.actualBoundingBoxAscent||size*.8)+pad,actualBoundingBoxDescent:(m.actualBoundingBoxDescent||size*.2)+pad};
 },align);
 ctx.font=font(fit.size);ctx.fillStyle=foreground;ctx.textBaseline='alphabetic';
 ctx.strokeStyle=foreground;ctx.lineWidth=fontStrokeWidth(fontId,fit.size);ctx.lineJoin='round';
 if(stretchVertical){
  let top=Infinity,bottom=-Infinity;
  for(const line of fit.lines){
   const m=ctx.measureText(line.text);
   if(!m.actualBoundingBoxLeft&&!m.actualBoundingBoxRight&&!m.actualBoundingBoxAscent&&!m.actualBoundingBoxDescent)continue;
   const pad=ctx.lineWidth/2;
   top=Math.min(top,line.y-(m.actualBoundingBoxAscent??fit.size*.8)-pad);
   bottom=Math.max(bottom,line.y+(m.actualBoundingBoxDescent??fit.size*.2)+pad);
  }
  if(bottom>top){
   const scaleY=128/(bottom-top);
   ctx.beginPath();ctx.rect(0,0,128,128);ctx.clip();
   // Transform the glyphs before rasterizing: scaling a small bitmap also
   // stretches its antialiased edge pixels, which blurs long single lines.
   ctx.setTransform(1,0,0,scaleY,0,-top*scaleY);
  }
 }
 fit.lines.forEach(line=>{ctx.strokeText(line.text,line.x,line.y);ctx.fillText(line.text,line.x,line.y);});
 const output=document.createElement('canvas');output.width=output.height=128;
 const out=output.getContext('2d');if(!out)throw new Error('Canvasを利用できません。');
 if(!transparent){out.fillStyle=background;out.fillRect(0,0,128,128);}
 out.drawImage(canvas,0,0);
 const blob=animation==='bounce'?renderBounce(canvas,{foreground,background,transparent}):await new Promise(resolve=>output.toBlob(resolve,'image/png'));
 if(!blob) throw new Error('画像を生成できませんでした。');
 if(blob.size>=128000) throw new Error(animation==='bounce'?'GIFが128,000バイト以上です。文字数を減らすか、背景を透明にしてください。':'画像が128,000バイト以上です。');
 return {canvas:output,blob};
}
