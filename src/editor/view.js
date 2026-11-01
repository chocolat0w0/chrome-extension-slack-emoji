import {FONT_PRESETS} from '../emoji/fonts.js';
import {renderEmoji} from '../emoji/render.js';
import {graphemes,validate,normalizeHex} from './model.js';
export function mountEditor(app,{onGenerate=null,onDraft=()=>{},initial={}}={}) {
let disposed=false,busy=false,reflected=false;
app.innerHTML=`<h1>文字絵文字を作成</h1>
<section class="workspace">
<form id="editor">
<label class="label" for="text">文字</label>
<textarea id="text" rows="2" aria-describedby="text-help counter">ありがとう</textarea>
<div class="helper"><span id="text-help">4行まで・1行12文字まで</span><output id="counter"></output></div>
<label class="label font-label" for="font">フォント</label>
<select id="font"></select>
<label class="label font-label" for="align">文字揃え</label>
<select id="align"><option value="center">中央</option><option value="left">左</option><option value="right">右</option></select>
<label class="label font-label" for="animation">アニメーション</label>
<select id="animation"><option value="none">なし（PNG）</option><option value="bounce">バウンド（実験・GIF）</option></select>
<label class="check stretch-option"><input id="stretchVertical" type="checkbox" checked>縦に伸ばして埋める</label>
<fieldset><legend class="label">色</legend>
<div class="colors">
<div class="color-control"><label for="foreground">文字色</label><div class="color-fields"><input id="foreground" type="color" value="#176b50"><input id="foregroundHex" type="text" value="#176b50" aria-label="文字色のHEXコード" placeholder="#176b50" spellcheck="false" autocomplete="off"></div></div>
<div class="color-control"><label for="background">背景色</label><div class="color-fields"><input id="background" type="color" value="#ffffff"><input id="backgroundHex" type="text" value="#ffffff" aria-label="背景色のHEXコード" placeholder="#ffffff" spellcheck="false" autocomplete="off"></div></div>
</div>
<div class="swatches" aria-label="文字色プリセット"></div>
<label class="check"><input id="transparent" type="checkbox">背景を透明にする</label></fieldset>
<label class="label" for="name">Slackでの名前</label>
<input id="name" type="text" placeholder="例：arigatou" autocomplete="off">
<p id="error" role="alert"></p>
</form>
<aside class="preview">
<div class="samples"><div><span>明</span><div class="sample light"><img alt="明るい背景での絵文字"></div></div><div><span>暗</span><div class="sample dark"><img alt="暗い背景での絵文字"></div></div></div>
<p id="loading" class="helper" role="status"></p>
<p id="size" class="helper" aria-live="polite"></p>
<button id="generate" type="button">PNGを生成</button>
<output id="result" aria-live="polite"></output>
</aside></section>`;
const el=id=>app.querySelector('#'+id);
for(const preset of FONT_PRESETS){const option=document.createElement('option');option.value=preset.id;option.textContent=preset.label;el('font').append(option);}
el('font').value='gothic-bold';
for(const [color,label] of [['#3ab0c7','水色'],['#176b50','緑'],['#ff0000','赤'],['#1111ff','青'],['#ec71a1','ピンク'],['#00bb00','明るい緑'],['#d98a00','黄'],['#252b38','墨'],['#ffffff','白']]){
 const button=document.createElement('button');button.type='button';button.style.background=color;button.title=label;button.setAttribute('aria-label',`文字色を${label}にする`);button.addEventListener('click',()=>{el('foreground').value=color;el('foregroundHex').value=color;update();});app.querySelector('.swatches').append(button);
}
for(const id of ['text','foreground','background','name','font','align','animation'])if(initial[id]!==undefined)el(id).value=initial[id];
if(!el('font').value)el('font').value='gothic-bold';
for(const id of ['transparent','stretchVertical'])if(initial[id]!==undefined)el(id).checked=initial[id];
for(const id of ['foreground','background'])el(id+'Hex').value=initial[id]??el(id).value;
if(onGenerate)el('generate').textContent='登録欄に反映';
let revision=0, editRevision=0, current=null, url=null;
function values(){return {animation:el('animation').value,stretchVertical:el('stretchVertical').checked,align:el('align').value,font:el('font').value,text:el('text').value,foreground:normalizeHex(el('foregroundHex').value)??el('foregroundHex').value,background:normalizeHex(el('backgroundHex').value)??el('backgroundHex').value,transparent:el('transparent').checked};}
async function update(){
 const ticket=++revision;editRevision++;current=null;el('generate').disabled=true;el('result').textContent=reflected?'変更を登録欄に反映してください。':'';
 onDraft({...values(),name:el('name').value});
 if(!onGenerate)el('generate').textContent=el('animation').value==='bounce'?'GIFを生成':'PNGを生成';
 el('background').disabled=el('backgroundHex').disabled=el('transparent').checked;
 const lines=el('text').value.split('\n');el('counter').textContent=`${lines.length}行 / 最長${Math.max(...lines.map(s=>graphemes(s).length))}文字`;
 const errors=validate(el('text').value);
 for(const [id,label] of [['foreground','文字色'],['background','背景色']]){const valid=normalizeHex(el(id+'Hex').value);const invalid=!valid&&(id==='foreground'||!el('transparent').checked);el(id+'Hex').setAttribute('aria-invalid',String(invalid));if(invalid)errors.push(label+'はHEXコード（例：#EC71A1）で入力してください。');}
 el('error').textContent=errors.join(' ');
 if(errors.length){el('loading').textContent='';app.querySelectorAll('img').forEach(img=>img.removeAttribute('src'));el('size').textContent='';return;}
 el('loading').textContent='フォントを読み込み中…';
 app.querySelectorAll('img').forEach(img=>img.removeAttribute('src'));el('size').textContent='';
 try{
  const image=await renderEmoji(values());if(disposed||ticket!==revision)return;
  if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(image.blob);
  app.querySelectorAll('img').forEach(img=>img.src=url);current=image.blob;
  el('size').textContent=`128 × 128 px · ${image.blob.type==='image/gif'?'GIF · 20コマ · 1.2秒':'PNG'} · ${image.blob.size.toLocaleString()} bytes`;
  el('generate').disabled=busy;
 }catch(error){if(!disposed&&ticket===revision)el('error').textContent=error.message;}
 finally{if(!disposed&&ticket===revision)el('loading').textContent='';}
}
el('editor').addEventListener('submit',e=>e.preventDefault());
el('editor').addEventListener('input',event=>{
 if(event.target===el('name')){editRevision++;onDraft({...values(),name:el('name').value});if(!busy)el('result').textContent=reflected?'変更を登録欄に反映してください。':'';return;}
 for(const id of ['foreground','background']){
  if(event.target===el(id))el(id+'Hex').value=el(id).value;
  if(event.target===el(id+'Hex')){const color=normalizeHex(el(id+'Hex').value);if(color)el(id).value=color;}
 }
 update();
});
el('generate').addEventListener('click',async ()=>{
 if(!current||busy||disposed)return;
 const name=el('name').value.trim();if(!name){el('result').textContent='Slackでの名前を入力してください。';el('name').focus();return;}
 const extension=current.type==='image/gif'?'gif':'png';
 const file=new File([current],`${name}.${extension}`,{type:current.type});
 const ticket=editRevision;
 if(onGenerate){
  busy=true;el('generate').disabled=true;el('result').textContent='反映中…';
  try{await onGenerate(file,name);reflected=true;if(!disposed)el('result').textContent=ticket===editRevision?'登録欄に反映済み。Slackの「保存する」で登録してください。':'変更を登録欄に反映してください。';}
  catch(error){if(!disposed)el('result').textContent=error.message;}
  finally{busy=false;if(!disposed)el('generate').disabled=!current;}
 }else{
  el('result').textContent=`「${file.name}」を生成しました。${file.size.toLocaleString()} bytes`;
  app.dispatchEvent(new CustomEvent('emoji-generated',{detail:{file,name}}));
 }
});
update();
return ()=>{disposed=true;revision++;if(url)URL.revokeObjectURL(url);app.replaceChildren();};
}
