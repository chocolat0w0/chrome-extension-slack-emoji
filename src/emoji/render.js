import {fitText} from './layout.js';
import {validate} from '../editor/model.js';
export async function renderEmoji({text,foreground,background,transparent}) {
 const errors=validate(text); if(errors.length) throw new Error(errors.join(' '));
 await document.fonts.ready;
 const canvas=document.createElement('canvas'); canvas.width=canvas.height=128;
 const ctx=canvas.getContext('2d'); if(!ctx) throw new Error('Canvasを利用できません。');
 const font=size=>`900 ${size}px "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif`;
 const fit=fitText(text.replace(/\r\n?/g,'\n').split('\n'),(line,size)=>{ctx.font=font(size);return ctx.measureText(line);});
 if(!transparent){ctx.fillStyle=background;ctx.fillRect(0,0,128,128);}
 ctx.font=font(fit.size);ctx.fillStyle=foreground;ctx.textBaseline='alphabetic';
 fit.lines.forEach(line=>ctx.fillText(line.text,line.x,line.y));
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
 if(!blob) throw new Error('PNGを生成できませんでした。');
 if(blob.size>=128000) throw new Error('画像が128,000バイト以上です。');
 return {canvas,blob};
}
