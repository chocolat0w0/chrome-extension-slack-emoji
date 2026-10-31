import {mountEditor} from '../src/editor/view.js';
import {findSlackForm,transferEmoji} from '../src/slack/adapter.js';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const check=(value,message)=>{if(!value)throw Error(message);};
async function until(fn){for(let i=0;i<1600;i++){if(fn())return;await pause(25);}throw Error('Timed out waiting for UI');}
export async function regression(){
 const results=[];const area=document.createElement('section');document.body.append(area);let dispose;
 try{
 let calls=0,finish;
 dispose=mountEditor(area,{onGenerate:()=>{calls++;return new Promise(resolve=>finish=resolve);}});
 const el=id=>area.querySelector('#'+id);
 await until(()=>!el('generate').disabled);el('generate').click();check(el('result').textContent.includes('名前'),'empty name');results.push('empty name');
 el('name').value='check';el('name').dispatchEvent(new Event('input',{bubbles:true}));await until(()=>!el('generate').disabled);
 el('generate').click();el('generate').click();check(calls===1&&el('generate').disabled,'double click prevention');results.push('double click');
 el('text').value='更新';el('text').dispatchEvent(new Event('input',{bubbles:true}));await pause(100);check(el('generate').disabled,'busy while rendering');finish();await until(()=>!el('generate').disabled);check(el('result').textContent.includes('変更を'),'edit during transfer');results.push('edit during transfer');
 el('text').value='a\nb\nc\nd\ne';el('text').dispatchEvent(new Event('input',{bubbles:true}));check(el('generate').disabled&&el('error').textContent.includes('4行'),'too many lines');check(!el('large').hasAttribute('src'),'stale preview removed');results.push('invalid input');
 dispose();dispose=mountEditor(area,{initial:{text:'保持',name:'keep'},onGenerate:async()=>{throw Error('接続エラー');}});await until(()=>!el('generate').disabled);el('generate').click();await until(()=>el('result').textContent==='接続エラー');check(el('text').value==='保持'&&el('name').value==='keep'&&!el('generate').disabled,'failed transfer retains draft');results.push('failed transfer');
 dispose();dispose=mountEditor(area,{initial:{name:'pending'},onGenerate:()=>new Promise(r=>finish=r)});await until(()=>!el('generate').disabled);el('generate').click();dispose();dispose=null;finish();await pause(50);check(area.childElementCount===0,'closed editor not recreated');results.push('close during transfer');
 // Both supported UI languages use semantic attributes, not button text.
 for(const label of ['Save','保存する']){
 area.innerHTML=`<div role="dialog"><div data-qa="customize_emoji_add_dialog_body"><form><input type="file" data-qa="customize_emoji_add_dialog_file_input"><input type="text" data-qa="customize_emoji_add_dialog_input"></form><div class="p-add_custom_emoji_dialog__upload_preview"></div><button data-qa="customize_emoji_add_dialog_go">${label}</button></div></div>`;
 const f=findSlackForm(area);check(f,'language-independent selectors');f.dialog.setAttribute('aria-hidden','true');check(!findSlackForm(area),'hidden dialog');f.dialog.removeAttribute('aria-hidden');
 f.file.addEventListener('change',()=>{const img=document.createElement('img');const c=document.createElement('canvas');img.src=c.toDataURL();f.body.querySelector('div').append(img);f.name.setAttribute('aria-invalid','true');});
 const c=document.createElement('canvas'),blob=await new Promise(r=>c.toBlob(r));let failed=false;try{await transferEmoji(f,new File([blob],'test.png',{type:'image/png'}),'invalid',{scope:area,timeout:100});}catch{failed=true;}check(failed,'invalid name must not confirm');
 }
 results.push('English/Japanese fixture','hidden dialog','invalid name');
 return 'PASS: '+results.join(' / ');
 }finally{dispose?.();area.remove();}
}
