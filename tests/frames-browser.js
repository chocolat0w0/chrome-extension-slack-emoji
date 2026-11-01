import {renderEmoji} from '../src/emoji/render.js';
import {frameLayout,drawFrame} from '../src/emoji/frames.js';
import {FONT_PRESETS} from '../src/emoji/fonts.js';
import {mountEditor} from '../src/editor/view.js';
const check=(ok,message)=>{if(!ok)throw Error(message);};
async function ready(app){for(let i=0;i<1600;i++){if(!app.querySelector('#generate').disabled)return;const error=app.querySelector('#error').textContent;if(error)throw Error(error);await new Promise(r=>setTimeout(r,25));}throw Error('UI timeout');}
const pixels=canvas=>canvas.getContext('2d').getImageData(0,0,128,128).data;
export async function verifyFrames(){
 let cases=0;
 for(const frame of ['circle','double-circle','rays']){
  const area=frameLayout(frame),mask=document.createElement('canvas');mask.width=mask.height=128;drawFrame(mask.getContext('2d'),frame,'#176b50');const border=pixels(mask);
  for(const font of FONT_PRESETS)for(const stretchVertical of [false,true])for(const text of ['確認済','確認\n済','一\n二\n三\n四','\n確認\n','確認\n\n済','、','三'.repeat(12),Array(4).fill('確認しました確認しました').join('\n')]){
   const {canvas,blob}=await renderEmoji({frame,font:font.id,text,stretchVertical,align:'right',foreground:'#176b50',transparent:true});
   const data=pixels(canvas);let ink=0,top=128,bottom=-1;
   for(let y=0;y<128;y++)for(let x=0;x<128;x++){
    const p=(y*128+x)*4;
    if(x<area.x||x>=area.x+area.width||y<area.y||y>=area.y+area.height){for(let c=0;c<4;c++)check(data[p+c]===border[p+c],`Text outside safe area: ${frame}/${font.id}/${text}`);}
    else if(data[p+3]){
     check(!border[p+3],'Frame overlaps text');ink++;top=Math.min(top,y);bottom=Math.max(bottom,y);
     if(frame!=='rays')check(Math.hypot(x+.5-64,y+.5-64)<(frame==='circle'?58:50)-2,'Text crosses circle');
    }
   }
   check(ink>0&&blob.type==='image/png'&&blob.size<128000,'Visible PNG');
   if(stretchVertical)check(top<=area.y+1&&bottom>=area.y+area.height-2,'Stretch fills safe area');
   if(font.id==='gothic-bold'&&text==='確認\n済'){
    const figure=document.createElement('figure');figure.innerHTML=`<small>${frame} / 縦伸ばし${stretchVertical?'あり':'なし'}</small>`;figure.append(canvas);document.querySelector('#samples').append(figure);
   }
   cases++;
  }
  for(const transparent of [false,true]){
   const {canvas,blob}=await renderEmoji({frame,text:'確認\n済',foreground:'#176b50',background:'#fedcba',transparent,animation:'bounce'});
   const decoder=new ImageDecoder({data:await blob.arrayBuffer(),type:blob.type});await decoder.tracks.ready;
   check(decoder.tracks.selectedTrack.frameCount===20&&blob.size<128000,'GIF frames and budget');
   const tops=[];
   try{for(let i=0;i<20;i++){
    const {image}=await decoder.decode({frameIndex:i});const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);image.close();const d=pixels(c);let top=128;
    for(let p=0;p<128*128;p++)if(transparent?d[p*4+3]>0:d[p*4]!==254)top=Math.min(top,Math.floor(p/128));
    tops.push(top);check(transparent?d[3]===0:d[0]===254&&d[1]===220&&d[2]===186&&d[3]===255,'GIF background');
   }}finally{decoder.close();}
   check(tops[0]-tops[10]>=18,'Whole frame bounces');
   const d=pixels(canvas);check(transparent?d[3]===0:d[0]===254&&d[3]===255,'PNG background');
  }
 }
 const app=document.createElement('main');document.body.append(app);let dispose,draft;
 try{
  dispose=mountEditor(app,{initial:{align:'right',frame:'circle',name:'frame_test'},onDraft:d=>draft=d});await ready(app);
  const el=id=>app.querySelector('#'+id);
  check(el('frame')?.value==='circle'&&el('align').disabled&&el('align').value==='center','Frame restored and alignment disabled');
  check(draft.align==='right'&&draft.frame==='circle','Original alignment retained in draft');
  dispose();dispose=mountEditor(app,{initial:draft,onDraft:d=>draft=d});await ready(app);
  el('frame').value='none';el('frame').dispatchEvent(new Event('input',{bubbles:true}));await ready(app);
  check(!el('align').disabled&&el('align').value==='right','Original alignment restored');
  el('frame').value='rays';el('frame').dispatchEvent(new Event('input',{bubbles:true}));await ready(app);
  let file;app.addEventListener('emoji-generated',e=>file=e.detail.file);el('generate').click();check(file?.type==='image/png','Frame PNG file');
  el('animation').value='bounce';el('animation').dispatchEvent(new Event('input',{bubbles:true}));await ready(app);el('generate').click();check(file?.type==='image/gif','Frame GIF file');
 }finally{dispose?.();app.remove();}
 return `PASS: ${cases} PNG containment/stretch cases, 6 GIFs decoded (120 frames), UI draft/alignment restoration and PNG/GIF files`;
}
