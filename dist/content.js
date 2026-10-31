(()=>{
const segmenter = new Intl.Segmenter('ja', {granularity:'grapheme'});
const graphemes = text => [...segmenter.segment(text)].map(x=>x.segment);
function validate(text) {
 const lines=text.replace(/\r\n?/g,'\n').split('\n');
 const errors=[];
 if(!text.trim()) errors.push('文字を入力してください。');
 if(lines.length>4) errors.push('改行は4行までにしてください。');
 if(lines.some(line=>graphemes(line).length>12)) errors.push('1行は12文字までにしてください。');
 return errors;
}

function fitText(texts, measure) {
 // Each line uses its actual ink bounds, not only advance width.
 for(let size=112;size>=1;size--) {
  const metrics=texts.map(text=>{
   const m=measure(text,size);
   return {text,left:m.actualBoundingBoxLeft??0,right:m.actualBoundingBoxRight??m.width,ascent:m.actualBoundingBoxAscent||size*.8,descent:m.actualBoundingBoxDescent||size*.2};
  });
  const gap=size*.12, height=metrics.reduce((n,m)=>n+m.ascent+m.descent,0)+gap*(texts.length-1);
  if(height>112 || metrics.some(m=>m.left+m.right>112)) continue;
  let top=(128-height)/2;
  return {size,lines:metrics.map(m=>{const line={...m,x:(128-m.left-m.right)/2+m.left,y:top+m.ascent};top+=m.ascent+m.descent+gap;return line;})};
 }
 throw new Error('文字を描画領域に配置できませんでした。');
}

async function renderEmoji({text,foreground,background,transparent}) {
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

function mountEditor(app,{onGenerate=null,onDraft=()=>{},initial={}}={}) {
let disposed=false,busy=false,reflected=false;
app.innerHTML=`<h1>文字絵文字を作成</h1>
<section class="workspace">
<form id="editor">
<label class="label" for="text">文字</label>
<textarea id="text" rows="2" aria-describedby="text-help counter">ありがとう</textarea>
<div class="helper"><span id="text-help">4行まで・1行12文字まで</span><output id="counter"></output></div>
<fieldset><legend class="label">色</legend>
<div class="colors"><label>文字 <input id="foreground" type="color" value="#176b50"></label><label>背景 <input id="background" type="color" value="#ffedb5"></label></div>
<div class="swatches" aria-label="文字色プリセット"></div>
<label class="check"><input id="transparent" type="checkbox" checked>背景を透明にする</label></fieldset>
<label class="label" for="name">Slackでの名前</label>
<input id="name" type="text" placeholder="例：arigatou" autocomplete="off">
<p id="error" role="alert"></p>
</form>
<aside class="preview">
<span class="label">プレビュー</span>
<div class="stage checker"><img id="large" alt="作成した絵文字のプレビュー"></div>
<div class="samples"><div><span>明</span><div class="sample light"><img class="small" alt="明るい背景での絵文字"></div></div><div><span>暗</span><div class="sample dark"><img class="small" alt="暗い背景での絵文字"></div></div></div>
<p id="size" class="helper" aria-live="polite"></p>
<button id="generate" type="button">PNGを生成</button>
<output id="result" aria-live="polite"></output>
</aside></section>`;
const el=id=>app.querySelector('#'+id);
for(const [color,label] of [['#176b50','緑'],['#d44735','赤'],['#252b38','墨'],['#ffffff','白'],['#d98a00','黄']]){
 const button=document.createElement('button');button.type='button';button.style.background=color;button.title=label;button.setAttribute('aria-label',`文字色を${label}にする`);button.addEventListener('click',()=>{el('foreground').value=color;update();});app.querySelector('.swatches').append(button);
}
for(const id of ['text','foreground','background','name'])if(initial[id]!==undefined)el(id).value=initial[id];
if(initial.transparent!==undefined)el('transparent').checked=initial.transparent;
if(onGenerate)el('generate').textContent='登録欄に反映';
let revision=0, current=null, url=null;
function values(){return {text:el('text').value,foreground:el('foreground').value,background:el('background').value,transparent:el('transparent').checked};}
async function update(){
 const ticket=++revision;current=null;el('generate').disabled=true;el('result').textContent=reflected?'変更を登録欄に反映してください。':'';
 onDraft({...values(),name:el('name').value});
 el('background').disabled=el('transparent').checked;
 const lines=el('text').value.split('\n');el('counter').textContent=`${lines.length}行 / 最長${Math.max(...lines.map(s=>graphemes(s).length))}文字`;
 const errors=validate(el('text').value);el('error').textContent=errors.join(' ');
 if(errors.length){app.querySelectorAll('img').forEach(img=>img.removeAttribute('src'));el('size').textContent='';return;}
 try{
  const image=await renderEmoji(values());if(disposed||ticket!==revision)return;
  if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(image.blob);
  app.querySelectorAll('img').forEach(img=>img.src=url);current=image.blob;
  el('size').textContent=`128 × 128 px · ${image.blob.size.toLocaleString()} bytes`;
  el('generate').disabled=busy;
 }catch(error){if(!disposed&&ticket===revision)el('error').textContent=error.message;}
}
el('editor').addEventListener('submit',e=>e.preventDefault());
el('editor').addEventListener('input',update);
el('generate').addEventListener('click',async ()=>{
 if(!current||busy||disposed)return;
 const name=el('name').value.trim();if(!name){el('result').textContent='Slackでの名前を入力してください。';el('name').focus();return;}
 const file=new File([current],`${name}.png`,{type:'image/png'});
 const ticket=revision;
 if(onGenerate){
  busy=true;el('generate').disabled=true;el('result').textContent='反映中…';
  try{await onGenerate(file,name);reflected=true;if(!disposed)el('result').textContent=ticket===revision?'登録欄に反映済み。Slackの「保存する」で登録してください。':'変更を登録欄に反映してください。';}
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

const slackQa = name => `[data-qa="customize_emoji_add_dialog_${name}"]`;
function findSlackForm(scope=document) {
 const bodies=scope.querySelectorAll(slackQa('body'));
 if(bodies.length!==1)return null;
 const body=bodies[0],dialog=body.closest('[role="dialog"]');
 if(!dialog||!body.isConnected||dialog.getAttribute('aria-hidden')==='true'||!dialog.getClientRects().length)return null;
 const files=body.querySelectorAll(`input[type="file"]${slackQa('file_input')}`), names=body.querySelectorAll(`input[type="text"]${slackQa('input')}`), saves=dialog.querySelectorAll(`button${slackQa('go')}`);
 if(files.length!==1||names.length!==1||saves.length!==1)return null;
 const file=files[0],name=names[0],save=saves[0];
 if(!file.form||file.form!==name.form||file.disabled||name.disabled)return null;
 return {body,dialog,file,name,save};
}
async function transferEmoji(target,file,name,{scope=document,timeout=3500}={}) {
 const live=()=>{const f=findSlackForm(scope);return f&&['body','file','name','save'].every(k=>f[k]===target[k]);};
 if(!live())throw new Error('登録欄が変わりました。ダイアログを開き直してください。');
 if(!name.trim())throw new Error('Slackでの名前を入力してください。');
 // A new input selection should produce a new preview, not reuse an old image.
 const previews=()=>[...target.body.querySelectorAll('.p-add_custom_emoji_dialog__upload_preview img')];
 const oldSources=new Set(previews().map(img=>img.src));
 const transfer=new DataTransfer();transfer.items.add(file);target.file.files=transfer.files;
 target.file.dispatchEvent(new Event('change',{bubbles:true}));
 if(!live())throw new Error('画像の反映中に登録欄が変わりました。');
 Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(target.name,name);
 target.name.dispatchEvent(new Event('input',{bubbles:true}));target.name.dispatchEvent(new Event('change',{bubbles:true}));
 const started=Date.now();
 while(Date.now()-started<timeout){
  if(!live())throw new Error('ダイアログが閉じられました。入力内容は保持しています。');
  const ready=previews().some(img=>!oldSources.has(img.src)&&img.complete&&img.naturalWidth>0);
  if(ready&&target.name.value===name&&target.name.getAttribute('aria-invalid')!=='true'&&!target.save.disabled&&target.save.getAttribute('aria-disabled')!=='true')return;
  await new Promise(r=>setTimeout(r,50));
 }
 throw new Error('Slack側の反映を確認できませんでした。画像・名前とSlackの案内を確認してください。');
}

function startIntegration(scope=document,styles='') {
 let host=null,dispose=null,activeBody=null,draft={},scheduled=false;
 const clear=()=>{dispose?.();dispose=null;host?.remove();host=null;activeBody=null;};
 const sync=()=>{
  scheduled=false;const form=findSlackForm(scope);
  if(form?.body===activeBody&&host?.isConnected)return;
  clear();if(!form)return;
  activeBody=form.body;host=document.createElement('div');host.dataset.slackEmojiEditor='';
  const root=host.attachShadow({mode:'open'}),style=document.createElement('style');style.textContent=styles;
  const app=document.createElement('main');root.append(style,app);form.body.prepend(host);
  dispose=mountEditor(app,{initial:draft,onDraft:value=>{draft=value;},onGenerate:(file,name)=>transferEmoji(form,file,name,{scope})});
 };
 const observer=new MutationObserver(()=>{if(!scheduled){scheduled=true;queueMicrotask(sync);}});
 observer.observe(scope===document?document.body:scope,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-hidden']});sync();
 const stop=()=>{observer.disconnect();clear();};return stop;
}

if(/^\/customize\/emoji\/?$/.test(location.pathname)){const stop=startIntegration(document,":root{font-family:\"Hiragino Kaku Gothic ProN\",\"Yu Gothic\",sans-serif;color:#26352f;background:#f7f7f4;font-size:13px}*{box-sizing:border-box}body{margin:0}main{max-width:560px;padding:20px;margin:0 auto}h1{font-size:16px;margin:0 0 16px;font-weight:600}.workspace{display:grid;grid-template-columns:minmax(0,1fr) 150px;gap:24px;align-items:start}.label{display:block;font-weight:600;font-size:12px;margin-bottom:6px}textarea,input[type=text]{font:inherit;width:100%;border:1px solid #b9c1bb;border-radius:4px;padding:7px 9px;background:#fff;color:inherit}textarea{resize:vertical;min-height:58px;font-size:16px;line-height:1.4}textarea:focus,input:focus,button:focus-visible{outline:2px solid #176b50;outline-offset:2px}.helper{font-size:10px;color:#68746c;line-height:1.6}.helper:has(span){display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px}.helper output{white-space:nowrap}fieldset{border:0;padding:0;margin:16px 0}.colors{display:flex;gap:16px}.colors label{display:flex;align-items:center;gap:6px;font-size:12px}input[type=color]{width:30px;height:28px;padding:2px;border:1px solid #b9c1bb;background:none;cursor:pointer}.swatches{display:flex;gap:8px;margin:10px 0}.swatches button{width:20px;height:20px;border:1px solid #bbc2ba;border-radius:50%;cursor:pointer}.check{font-size:12px;display:flex;align-items:center;gap:6px}input[type=checkbox]{accent-color:#176b50}#error{font-size:11px;color:#aa3128;margin:8px 0}#error:empty{display:none}.stage{width:96px;height:96px;display:grid;place-items:center;border:1px solid #cdd4c4;border-radius:3px}.checker{background-color:#fff;background-image:conic-gradient(#e8eae4 25%,transparent 0 50%,#e8eae4 0 75%,transparent 0);background-size:12px 12px}#large{width:80px;height:80px;object-fit:contain}img:not([src]){visibility:hidden}.samples{display:flex;gap:8px;margin-top:8px}.samples>div>span{font-size:10px;color:#68746c}.sample{display:grid;place-items:center;margin-top:3px;width:36px;height:32px;border-radius:3px}.light{background:white;border:1px solid #e0e3dd}.dark{background:#24282d}.small{width:22px;height:22px}#size{margin:8px 0}#generate{width:100%;border:0;border-radius:4px;background:#176b50;color:white;padding:9px;font:inherit;cursor:pointer}#generate:disabled{opacity:.4;cursor:default}#result{display:block;font-size:11px;line-height:1.6;margin-top:8px;overflow-wrap:anywhere}@media(max-width:400px){main{padding:12px}.workspace{grid-template-columns:minmax(0,1fr) 110px;gap:12px}}\n\n:host{display:block;color:#26352f;font:13px \"Hiragino Kaku Gothic ProN\",sans-serif;background:#f7f7f4;border:1px solid #d4d9d4;border-radius:4px;margin:12px 0}main{margin:0;padding:16px;max-width:none}" );addEventListener('pagehide',stop,{once:true});}
})();
