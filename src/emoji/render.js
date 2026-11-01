import {fitText,verticalInkBounds} from './layout.js';
import {canvasFont,fontStrokeWidth} from './fonts.js';
import {ensureWebFont} from './font-loader.js';
import {validate} from '../editor/model.js';
export async function renderEmoji({text,foreground,background,transparent,font:fontId='gothic-bold',align='center',stretchVertical=true}) {
 const errors=validate(text); if(errors.length) throw new Error(errors.join(' '));
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
 fit.lines.forEach(line=>{ctx.strokeText(line.text,line.x,line.y);ctx.fillText(line.text,line.x,line.y);});
 const output=document.createElement('canvas');output.width=output.height=128;
 const out=output.getContext('2d');if(!out)throw new Error('Canvasを利用できません。');
 if(!transparent){out.fillStyle=background;out.fillRect(0,0,128,128);}
 const bounds=stretchVertical?verticalInkBounds(ctx.getImageData(0,0,128,128).data,128,128):null;
 if(bounds)out.drawImage(canvas,0,bounds.top,128,bounds.height,0,8,128,112);
 else out.drawImage(canvas,0,0);
 const blob=await new Promise(resolve=>output.toBlob(resolve,'image/png'));
 if(!blob) throw new Error('PNGを生成できませんでした。');
 if(blob.size>=128000) throw new Error('画像が128,000バイト以上です。');
 return {canvas:output,blob};
}
