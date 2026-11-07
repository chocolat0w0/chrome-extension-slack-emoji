import {mountEditor} from '../src/editor/view.js';
import {startIntegration} from '../src/content.js';
export async function verifyColors(){
 const check=(ok,msg)=>{if(!ok)throw Error(msg);};
 const wait=async fn=>{for(let i=0;i<1600;i++){if(fn())return;await new Promise(r=>setTimeout(r,25));}throw Error('UI timeout');};
 const app=document.createElement('main');document.body.append(app);let captured;
 const dispose=mountEditor(app,{initial:{text:'色',name:'color_check'},onGenerate:(file)=>{captured=file;}});
 const el=id=>app.querySelector('#'+id),input=(id,value)=>{el(id).value=value;el(id).dispatchEvent(new Event('input',{bubbles:true}));};
 try{
  await wait(()=>!el('generate').disabled);
  const previews=app.querySelectorAll('.sample img');check(previews.length===2&&!el('large'),'two background previews only');
  for(const img of previews){const image=img.getBoundingClientRect(),background=img.parentElement.getBoundingClientRect();check(image.width===image.height&&image.width===background.width&&image.height===background.height&&image.left===background.left&&image.top===background.top,'square preview fills background');}
  input('foregroundHex','#EC71A1');await wait(()=>!el('generate').disabled);check(el('foreground').value==='#ec71a1','hex to picker');
  el('transparent').checked=false;el('transparent').dispatchEvent(new Event('input',{bubbles:true}));input('backgroundHex','123456');await wait(()=>!el('generate').disabled);check(el('background').value==='#123456','background hex');
  el('generate').click();await wait(()=>!!captured);const bitmap=await createImageBitmap(captured);const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0);bitmap.close();const pixels=ctx.getImageData(0,0,128,128).data;
  check(pixels[0]===0x12&&pixels[1]===0x34&&pixels[2]===0x56&&pixels[3]===255,'background actual pixels');
  check(pixels.some((v,i)=>i%4===0&&v===0xec&&pixels[i+1]===0x71&&pixels[i+2]===0xa1&&pixels[i+3]===255),'foreground actual pixels');
  input('foregroundHex','#12');check(el('generate').disabled&&el('foregroundHex').getAttribute('aria-invalid')==='true'&&[...previews].every(img=>!img.hasAttribute('src')),'invalid color blocked');
  input('foregroundHex','f80');await wait(()=>!el('generate').disabled);check(el('foreground').value==='#ff8800','short hex');
  app.querySelector('[aria-label="文字色を緑にする"]').click();await wait(()=>!el('generate').disabled);check(el('foregroundHex').value==='#176b50','preset sync');
  for(const [label,color] of [['赤','#ff0000'],['青','#1111ff'],['水色','#3ab0c7'],['ピンク','#ec71a1'],['明るい緑','#00bb00']]){
   const button=app.querySelector(`[aria-label="文字色を${label}にする"]`);check(!!button,`missing preset: ${label}`);button.click();await wait(()=>!el('generate').disabled);check(el('foregroundHex').value===color&&el('foreground').value===color,`preset sync: ${label}`);
  }
  input('foreground','#2456ab');await wait(()=>!el('generate').disabled);check(el('foregroundHex').value==='#2456ab','picker to hex');
  el('transparent').checked=true;el('transparent').dispatchEvent(new Event('input',{bubbles:true}));await wait(()=>!el('generate').disabled);check(el('backgroundHex').disabled&&el('backgroundHex').value==='123456','transparent preserves background');
 }finally{dispose();app.remove();}
 const legacy=document.createElement('main');document.body.append(legacy);const disposeLegacy=mountEditor(legacy,{initial:{text:'確認',font:'pop'}});
 try{check(legacy.querySelector('#font').value==='gothic','removed font falls back to default');await wait(()=>!legacy.querySelector('#generate').disabled);}finally{disposeLegacy();legacy.remove();}
 const scope=document.createElement('section');document.body.append(scope);
 const markup='<div role="dialog"><div data-qa="customize_emoji_add_dialog_body"><form><input type="file" data-qa="customize_emoji_add_dialog_file_input"><input type="text" data-qa="customize_emoji_add_dialog_input"></form><button data-qa="customize_emoji_add_dialog_go">保存</button></div></div>';
 scope.innerHTML=markup;const stop=startIntegration(scope);
 try{
  const root=scope.querySelector('[data-slack-emoji-editor]').shadowRoot;const field=root.querySelector('#foregroundHex');field.value='#A123BC';field.dispatchEvent(new Event('input',{bubbles:true}));
  scope.innerHTML=markup;await wait(()=>!!scope.querySelector('[data-slack-emoji-editor]'));const reopened=scope.querySelector('[data-slack-emoji-editor]').shadowRoot;
  check(reopened.querySelector('#foregroundHex').value==='#a123bc'&&reopened.querySelector('#foreground').value==='#a123bc','draft preserved');
 }finally{stop();scope.remove();}
 return 'PASS: HEX / picker / presets / invalid input / transparency / draft / actual PNG colors';
}
