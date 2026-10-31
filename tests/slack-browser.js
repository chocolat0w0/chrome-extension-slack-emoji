import {findSlackForm,transferEmoji} from '../src/slack/adapter.js';
import {startIntegration} from '../src/content.js';
const assert=(ok,message)=>{if(!ok)throw new Error(message);};
const waitFor=async fn=>{for(let i=0;i<1600;i++){if(fn())return;await new Promise(r=>setTimeout(r,25));}throw Error('UI timeout');};
export async function verifyIntegration(){
 const area=document.createElement('section');document.body.append(area);
 const markup=`<div role="dialog"><div data-qa="customize_emoji_add_dialog_body"><form><input type="file" data-qa="customize_emoji_add_dialog_file_input"><input type="text" data-qa="customize_emoji_add_dialog_input"></form><div class="p-add_custom_emoji_dialog__upload_preview"></div><button data-qa="customize_emoji_add_dialog_go" aria-disabled="true">保存</button></div></div>`;
 const make=()=>{area.innerHTML=markup;const f=findSlackForm(area);f.file.addEventListener('change',()=>{const img=document.createElement('img');img.src=URL.createObjectURL(f.file.files[0]);f.body.querySelector('.p-add_custom_emoji_dialog__upload_preview').replaceChildren(img);f.save.setAttribute('aria-disabled','false');});return f;};
 let f=make();assert(f,'unique form');
 // Use a genuine PNG for image-decode checks.
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 const png=await new Promise(r=>canvas.toBlob(r));const image=new File([png],'test.png',{type:'image/png'});
 await transferEmoji(f,image,'test_name',{timeout:500});assert(f.name.value==='test_name'&&f.file.files[0].name==='test.png','file and name');
 area.insertAdjacentHTML('beforeend',markup);assert(findSlackForm(area)===null,'ambiguous form rejected');
 let rejected=false;try{await transferEmoji(f,image,'other',{scope:area,timeout:50});}catch{rejected=true;}assert(rejected,'ambiguous transfer rejected');
 f=make();f.file.replaceWith(f.file.cloneNode());rejected=false;try{await transferEmoji(f,image,'stale',{scope:area,timeout:50});}catch{rejected=true;}assert(rejected,'detached input rejected');
 f=make();f.file.replaceWith(f.file.cloneNode());rejected=false;try{await transferEmoji(findSlackForm(area),image,'timeout',{scope:area,timeout:70});}catch{rejected=true;}assert(rejected,'unconfirmed preview not success');
 f=make();const stop=startIntegration(area);await new Promise(r=>setTimeout(r,30));assert(area.querySelectorAll('[data-slack-emoji-editor]').length===1,'one editor');
 const root=area.querySelector('[data-slack-emoji-editor]').shadowRoot;
 const name=root.querySelector('#name');name.value='test_editor';name.dispatchEvent(new Event('input',{bubbles:true}));
 await waitFor(()=>!root.querySelector('#generate').disabled);root.querySelector('#generate').click();await waitFor(()=>!root.querySelector('#generate').disabled);
 assert(root.querySelector('#result').textContent.includes('反映済み'),'editor confirms reflection');
 const font=root.querySelector('#font');font.value='mincho';font.dispatchEvent(new Event('input',{bubbles:true}));await waitFor(()=>!root.querySelector('#generate').disabled);
 const text=root.querySelector('#text');text.value='変更';text.dispatchEvent(new Event('input',{bubbles:true}));await waitFor(()=>!root.querySelector('#generate').disabled);
 assert(root.querySelector('#result').textContent.includes('変更を'),'editing needs reflection');
 area.append(document.createElement('div'));await new Promise(r=>setTimeout(r,30));assert(area.querySelectorAll('[data-slack-emoji-editor]').length===1,'no duplicate mount');
 f=make();await new Promise(r=>setTimeout(r,30));assert(area.querySelectorAll('[data-slack-emoji-editor]').length===1,'reopen mounts');assert(area.querySelector('[data-slack-emoji-editor]').shadowRoot.querySelector('#text').value==='変更','draft preserved');assert(area.querySelector('[data-slack-emoji-editor]').shadowRoot.querySelector('#font').value==='mincho','font draft preserved');stop();area.remove();
 return 'PASS: transfer / ambiguity / detached input / timeout / mount / reflection / edited state / duplicate prevention / reopen / preserved draft';
}
