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
function normalizeHex(value){
 const hex=value.trim().replace(/^#/,'');
 if(/^[0-9a-f]{3}$/i.test(hex))return '#'+[...hex].map(c=>c+c).join('').toLowerCase();
 return /^[0-9a-f]{6}$/i.test(hex)?'#'+hex.toLowerCase():null;
}

function fitText(texts, measure, align='center',area={x:0,y:0,width:128,height:128}) {
 if(!['center','left','right'].includes(align))throw Error('文字揃えを選び直してください。');
 // Each line uses its actual ink bounds, not only advance width.
 for(let size=128;size>=1;size--) {
  const metrics=texts.map(text=>{
   const m=measure(text,size);
   return {text,left:m.actualBoundingBoxLeft??0,right:m.actualBoundingBoxRight??m.width,ascent:m.actualBoundingBoxAscent||size*.8,descent:m.actualBoundingBoxDescent||size*.2};
  });
  const gap=size*.12, height=metrics.reduce((n,m)=>n+m.ascent+m.descent,0)+gap*(texts.length-1);
  if(height>area.height || metrics.some(m=>m.left+m.right>area.width)) continue;
  let top=area.y+(area.height-height)/2;
  return {size,lines:metrics.map(m=>{const line={...m,x:area.x+(align==='left'?m.left:align==='right'?area.width-m.right:(area.width-m.left-m.right)/2+m.left),y:top+m.ascent};top+=m.ascent+m.descent+gap;return line;})};
 }
 throw new Error('文字を描画領域に配置できませんでした。');
}
function verticalInkBounds(pixels,width,height){
 let top=height,bottom=-1;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(pixels[(y*width+x)*4+3]){top=Math.min(top,y);bottom=Math.max(bottom,y);}
 return bottom<0?null:{top,height:bottom-top+1};
}

// Google Fonts are fetched on use; aliases prevent accidental local-font substitution.
const FONT_PRESETS = [
 {id:'gothic',label:'ゴシック体',weight:700,stroke:0.025,googleFamily:'Noto Sans JP',family:'"SlackEmojiWebGothic"'},
 {id:'gothic-bold',label:'太いゴシック体',weight:900,stroke:0.04,googleFamily:'Noto Sans JP',family:'"SlackEmojiWebGothicBold"'},
 {id:'mincho',label:'明朝体',weight:900,stroke:0.025,googleFamily:'Noto Serif JP',family:'"SlackEmojiWebMincho"'},
 {id:'rounded',label:'丸文字',weight:900,stroke:0.025,googleFamily:'M PLUS Rounded 1c',family:'"SlackEmojiWebMaru"'}
];
function canvasFont(id='gothic-bold',size) {
 const preset=FONT_PRESETS.find(p=>p.id===id);
 if(!preset)throw new Error('フォントを選び直してください。');
 return `${preset.weight} ${size}px ${preset.family}`;
}

function fontStrokeWidth(id='gothic-bold',size) {
 const preset=FONT_PRESETS.find(p=>p.id===id);
 if(!preset)throw new Error('フォントを選び直してください。');
 return Math.max(0.4,size*preset.stroke);
}

const styleCache=new Map();
function fontCssUrl(id){
 const p=FONT_PRESETS.find(p=>p.id===id);if(!p)throw Error('Unknown font');
 return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(p.googleFamily+':wght@'+p.weight)}&display=block`;
}
function rangeContains(range,point){
 return range.split(',').some(part=>{
  const value=part.trim().replace(/^U\+/i,'');
  const pair=value.includes('?')?[value.replaceAll('?','0'),value.replaceAll('?','F')]:value.split('-');
  return point>=parseInt(pair[0],16)&&point<=parseInt(pair[1]??pair[0],16);
 });
}
function parseFontCss(css){
 const entries=[...css.matchAll(/@font-face\s*\{([^}]+)\}/g)].map(([,body])=>{
  const src=body.match(/src:\s*url\(['"]?([^\s)'";]+)['"]?\)/),range=body.match(/unicode-range:\s*([^;]+);/);
  if(!src)throw Error('Invalid font stylesheet');const url=new URL(src[1]);
  if(url.protocol!=='https:'||url.hostname!=='fonts.gstatic.com'||url.port||url.username||url.password||!url.pathname.startsWith('/s/'))throw Error('Unexpected font URL');
  const value=range?.[1].trim()??'U+0-10FFFF';
  if(!/^U\+[0-9A-F?]+(?:-[0-9A-F]+)?(?:\s*,\s*U\+[0-9A-F?]+(?:-[0-9A-F]+)?)*$/i.test(value))throw Error('Invalid unicode range');
  return {url:url.href,range:value};
 });
 if(!entries.length||entries.length>300)throw Error('Invalid font stylesheet');return entries;
}
async function fontFetch(url){
 const response=await fetch(url,{credentials:'omit',referrerPolicy:'no-referrer',redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Font request failed: '+response.status);return response;
}
async function fetchFontStyles(id){
 if(!styleCache.has(id)){
  const promise=fontFetch(fontCssUrl(id)).then(r=>r.text()).then(parseFontCss).catch(e=>{styleCache.delete(id);throw e;});styleCache.set(id,promise);
 }return styleCache.get(id);
}
async function fetchFontBytes(id,index){
 const styles=await fetchFontStyles(id);if(!Number.isInteger(index)||!styles[index])throw Error('Unknown font subset');
 const buffer=await (await fontFetch(styles[index].url)).arrayBuffer();if(buffer.byteLength>8*1024*1024)throw Error('Font too large');return buffer;
}

const loadedSubsets=new Map();
async function fontTransport(type,id,index){
 if(typeof chrome!=='undefined'&&chrome.runtime?.id){
  const result=await chrome.runtime.sendMessage({type,id,index});
  if(!result?.ok)throw Error(result?.error??'Font service unavailable');
  return type==='font-styles'?result.styles:Uint8Array.from(atob(result.base64),c=>c.charCodeAt(0)).buffer;
 }
 return type==='font-styles'?fetchFontStyles(id):fetchFontBytes(id,index);
}
async function ensureWebFont(id,text){
 const preset=FONT_PRESETS.find(p=>p.id===id);if(!preset)throw Error('フォントを選び直してください。');
 try{
  const styles=await fontTransport('font-styles',id);
  const points=[...new Set([...text].filter(c=>!/[\r\n\t]/.test(c)).map(c=>c.codePointAt(0)))];
  if(points.some(p=>!styles.some(s=>rangeContains(s.range,p))))throw Error('Unsupported character');
  const needed=styles.map((s,index)=>({...s,index})).filter(s=>points.some(p=>rangeContains(s.range,p)));
  await Promise.all(needed.map(s=>{
   const key=id+':'+s.index;
   if(!loadedSubsets.has(key)){
    const promise=(async()=>{
     const buffer=await fontTransport('font-bytes',id,s.index);
     const face=new FontFace(preset.family.replaceAll('"',''),buffer,{weight:String(preset.weight),style:'normal',unicodeRange:s.range});
     await face.load();document.fonts.add(face);return face;
    })().catch(e=>{loadedSubsets.delete(key);throw e;});loadedSubsets.set(key,promise);
   }return loadedSubsets.get(key);
  }));
 }catch{throw Error('フォントを取得できませんでした。通信環境や入力文字を確認して、再度お試しください。');}
}

// GIF89a with a shared 256-color palette, full frames, and 9–12 bit LZW.
function compressGifIndices(pixels){
 const bytes=[];let bits=0,count=0,width=9,decodedNext=258,hasPrevious=false;
 // Track the decoder's dictionary: it learns entries one emitted code later.
 const emit=code=>{
  bits|=code<<count;count+=width;while(count>=8){bytes.push(bits&255);bits>>>=8;count-=8;}
  if(code===256){width=9;decodedNext=258;hasPrevious=false;}
  else if(code!==257){if(hasPrevious&&++decodedNext===(1<<width)&&width<12)width++;hasPrevious=true;}
 };
 let dictionary=new Map(),next=258,prefix=pixels[0];emit(256);
 for(let i=1;i<pixels.length;i++){
  const pixel=pixels[i],key=prefix*256+pixel,found=dictionary.get(key);
  if(found!==undefined){prefix=found;continue;}
  emit(prefix);dictionary.set(key,next++);prefix=pixel;
  if(next===4095){emit(256);dictionary=new Map();next=258;}
 }
 emit(prefix);emit(257);if(count)bytes.push(bits&255);
 return bytes;
}
function encodeGif({width,height,palette,frames,transparent=false,delay=6}){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>65535||height>65535||palette.length!==768||!frames.length||frames.length>50||frames.some(frame=>frame.length!==width*height))throw Error('GIFの画像データが不正です。');
 const bytes=[];
 const word=value=>bytes.push(value&255,value>>8&255);
 bytes.push(...new TextEncoder().encode('GIF89a'));word(width);word(height);
 bytes.push(0xf7,0,0,...palette);
 // NETSCAPE2.0: repeat forever.
 bytes.push(0x21,0xff,11,...new TextEncoder().encode('NETSCAPE2.0'),3,1,0,0,0);
 for(const frame of frames){
  // Restore to background before the next frame, including transparent pixels.
  bytes.push(0x21,0xf9,4,transparent?9:8);word(delay);bytes.push(0,0);
  bytes.push(0x2c);word(0);word(0);word(width);word(height);bytes.push(0,8);
  const data=compressGifIndices(frame);
  for(let offset=0;offset<data.length;offset+=255){const block=data.slice(offset,offset+255);bytes.push(block.length,...block);}
  bytes.push(0);
 }
 bytes.push(0x3b);return new Blob([Uint8Array.from(bytes)],{type:'image/gif'});
}

function renderAnimation(layer,{foreground,background,transparent,animation}){
 const rgb=hex=>[1,3,5].map(offset=>parseInt(hex.slice(offset,offset+2),16));
 const ink=rgb(foreground),paper=transparent?ink:rgb(background),palette=new Uint8Array(768);
 // A two-color gradient preserves the exact selected colors and opaque edges.
 for(let alpha=0;alpha<256;alpha++)for(let channel=0;channel<3;channel++)palette[alpha*3+channel]=Math.round(paper[channel]+(ink[channel]-paper[channel])*alpha/255);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('Canvasを利用できません。');
 const frames=[];
 for(let i=0;i<20;i++){
  const t=i/20;
  ctx.clearRect(0,0,128,128);
  if(animation==='bounce')ctx.drawImage(layer,12.8,25.6-20*4*t*(1-t),102.4,102.4);
  if(animation==='shake'){
   const offsets=[0,4,-4,3,-3];ctx.drawImage(layer,12.8+offsets[i%offsets.length],12.8,102.4,102.4);
  }
  if(animation==='pop'){
   const size=128*(.55+.29*Math.sin(Math.PI*t)),margin=(128-size)/2;ctx.drawImage(layer,margin,margin,size,size);
  }
  if((animation==='blink'&&i<10)||(animation==='blink-fast'&&i%10<5))ctx.drawImage(layer,0,0,128,128);
  const rgba=ctx.getImageData(0,0,128,128).data,pixels=new Uint8Array(128*128);
  // 32 edge shades keep antialiasing while avoiding hundreds of near-identical
  // colors that inflate animated text. Endpoints retain exact foreground/background.
  for(let p=0;p<pixels.length;p++){const alpha=rgba[p*4+3];pixels[p]=transparent?(alpha>=128?255:0):Math.round(Math.round(alpha*31/255)*255/31);}
  frames.push(pixels);
 }
 return encodeGif({width:128,height:128,palette,frames,transparent,delay:6});
}

// Rectangles are inset from the inner circle by at least 3px at each corner.
function frameLayout(frame='none'){
 if(frame==='none')return {x:0,y:0,width:128,height:128};
 if(frame==='circle')return {x:26,y:26,width:76,height:76};
 if(frame==='double-circle')return {x:31,y:31,width:66,height:66};
 if(frame==='rays')return {x:24,y:24,width:80,height:80};
 throw Error('フレームを選び直してください。');
}
function drawFrame(ctx,frame,color){
 frameLayout(frame);
 ctx.save();ctx.strokeStyle=color;ctx.lineWidth=4;ctx.lineCap='round';
 if(frame==='circle'||frame==='double-circle'){
  for(const radius of frame==='circle'?[60]:[60,52]){
   ctx.beginPath();ctx.arc(64,64,radius,0,Math.PI*2);ctx.stroke();
  }
 }else if(frame==='rays'){
  // Square exclusion zone: line ends remain outside the text rectangle,
  // including the stroke's rounded cap and a 3px gap.
  ctx.lineWidth=2;
  for(let i=0;i<32;i++){
   const angle=i*Math.PI*2/32,dx=Math.cos(angle),dy=Math.sin(angle);
   const inner=45/Math.max(Math.abs(dx),Math.abs(dy));
   const outer=61/Math.max(Math.abs(dx),Math.abs(dy));
   ctx.beginPath();ctx.moveTo(64+dx*inner,64+dy*inner);ctx.lineTo(64+dx*outer,64+dy*outer);ctx.stroke();
  }
 }
 ctx.restore();
}

async function renderEmoji({text,foreground,background,transparent,font:fontId='gothic-bold',align='center',stretchVertical=true,animation='none',frame='none'}) {
 const errors=validate(text); if(errors.length) throw new Error(errors.join(' '));
 if(!['none','bounce','shake','pop','blink','blink-fast'].includes(animation))throw Error('アニメーションを選び直してください。');
 const area=frameLayout(frame);
 await ensureWebFont(fontId,text);
 const canvas=document.createElement('canvas'); canvas.width=canvas.height=128;
 const ctx=canvas.getContext('2d'); if(!ctx) throw new Error('Canvasを利用できません。');
 const font=size=>canvasFont(fontId,size);
 const fit=fitText(text.replace(/\r\n?/g,'\n').split('\n'),(line,size)=>{
  ctx.font=font(size);ctx.letterSpacing=`${-size*.08}px`;const m=ctx.measureText(line),pad=fontStrokeWidth(fontId,size)/2;
  return {width:m.width,actualBoundingBoxLeft:m.actualBoundingBoxLeft+pad,actualBoundingBoxRight:m.actualBoundingBoxRight+pad,actualBoundingBoxAscent:(m.actualBoundingBoxAscent||size*.8)+pad,actualBoundingBoxDescent:(m.actualBoundingBoxDescent||size*.2)+pad};
 },frame==='none'?align:'center',area);
 if(frame!=='none'){ctx.beginPath();ctx.rect(area.x,area.y,area.width,area.height);ctx.clip();}
 ctx.font=font(fit.size);ctx.letterSpacing=`${-fit.size*.08}px`;ctx.fillStyle=foreground;ctx.textBaseline='alphabetic';
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
   const scaleY=area.height/(bottom-top);
   ctx.beginPath();ctx.rect(0,0,128,128);ctx.clip();
   // Transform the glyphs before rasterizing: scaling a small bitmap also
   // stretches its antialiased edge pixels, which blurs long single lines.
   ctx.setTransform(1,0,0,scaleY,0,area.y-top*scaleY);
  }
 }
 fit.lines.forEach(line=>{ctx.strokeText(line.text,line.x,line.y);ctx.fillText(line.text,line.x,line.y);});
 // Keep fixed-width frame strokes independent of extreme glyph transforms.
 const layer=document.createElement('canvas');layer.width=layer.height=128;
 const layerCtx=layer.getContext('2d');if(!layerCtx)throw new Error('Canvasを利用できません。');
 drawFrame(layerCtx,frame,foreground);layerCtx.drawImage(canvas,0,0);
 const output=document.createElement('canvas');output.width=output.height=128;
 const out=output.getContext('2d');if(!out)throw new Error('Canvasを利用できません。');
 if(!transparent){out.fillStyle=background;out.fillRect(0,0,128,128);}
 out.drawImage(layer,0,0);
 const blob=animation!=='none'?renderAnimation(layer,{foreground,background,transparent,animation}):await new Promise(resolve=>output.toBlob(resolve,'image/png'));
 if(!blob) throw new Error('画像を生成できませんでした。');
 if(blob.size>=128000) throw new Error(animation!=='none'?'GIFが128,000バイト以上です。文字数を減らすか、背景を透明にしてください。':'画像が128,000バイト以上です。');
 return {canvas:output,blob};
}

function mountEditor(app,{onGenerate=null,onDraft=()=>{},initial={}}={}) {
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
<label class="check stretch-option"><input id="stretchVertical" type="checkbox" checked>縦に伸ばして埋める</label>
<label class="label font-label" for="frame">フレーム</label>
<select id="frame"><option value="none">なし</option><option value="circle">丸囲み</option><option value="double-circle">二重丸</option><option value="rays">集中線</option></select>
<label class="label font-label" for="animation">アニメーション</label>
<select id="animation"><option value="none">なし（PNG）</option><option value="bounce">バウンド（GIF）</option><option value="shake">ぶるぶる（GIF）</option><option value="pop">ポップ（GIF）</option><option value="blink">点滅（GIF）</option><option value="blink-fast">点滅・速い（GIF）</option></select>
<fieldset><legend class="label">色</legend>
<div class="colors">
<div class="color-control"><label for="foreground">文字色</label><div class="color-fields"><input id="foreground" type="color" value="#3ab0c7"><input id="foregroundHex" type="text" value="#3ab0c7" aria-label="文字色のHEXコード" placeholder="#3ab0c7" spellcheck="false" autocomplete="off"></div></div>
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
for(const id of ['text','foreground','background','name','font','align','animation','frame'])if(initial[id]!==undefined)el(id).value=initial[id];
if(!el('frame').value)el('frame').value='none';
if(!el('font').value)el('font').value='gothic-bold';
for(const id of ['transparent','stretchVertical'])if(initial[id]!==undefined)el(id).checked=initial[id];
for(const id of ['foreground','background'])el(id+'Hex').value=initial[id]??el(id).value;
if(onGenerate)el('generate').textContent='登録欄に反映';
let revision=0, editRevision=0, current=null, url=null, preferredAlign=el('align').value;
function values(){return {frame:el('frame').value,animation:el('animation').value,stretchVertical:el('stretchVertical').checked,align:el('frame').value==='none'?el('align').value:preferredAlign,font:el('font').value,text:el('text').value,foreground:normalizeHex(el('foregroundHex').value)??el('foregroundHex').value,background:normalizeHex(el('backgroundHex').value)??el('backgroundHex').value,transparent:el('transparent').checked};}
async function update(){
 const ticket=++revision;editRevision++;current=null;el('generate').disabled=true;el('result').textContent=reflected?'変更を登録欄に反映してください。':'';
 if(!el('align').disabled)preferredAlign=el('align').value;
 el('align').disabled=el('frame').value!=='none';
 el('align').value=el('align').disabled?'center':preferredAlign;
 onDraft({...values(),name:el('name').value});
 if(!onGenerate)el('generate').textContent=el('animation').value!=='none'?'GIFを生成':'PNGを生成';
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
 let host=null,dispose=null,activeBody=null,restoreBody=null,draft={},scheduled=false;
 const clear=()=>{dispose?.();dispose=null;host?.remove();host=null;restoreBody?.();restoreBody=null;activeBody=null;};
 const sync=()=>{
  scheduled=false;const form=findSlackForm(scope);
  if(form?.body===activeBody&&host?.isConnected)return;
  clear();if(!form)return;
  activeBody=form.body;
  const properties=['max-height','overflow-x','overflow-y'];
  const previous=properties.map(p=>[p,form.body.style.getPropertyValue(p),form.body.style.getPropertyPriority(p)]);
  restoreBody=()=>{for(const [p,value,priority] of previous){if(value)form.body.style.setProperty(p,value,priority);else form.body.style.removeProperty(p);}};
  form.body.style.setProperty('max-height','65vh');form.body.style.setProperty('overflow-x','auto');form.body.style.setProperty('overflow-y','auto');
  host=document.createElement('div');host.dataset.slackEmojiEditor='';
  const root=host.attachShadow({mode:'open'}),style=document.createElement('style');style.textContent=styles;
  const app=document.createElement('main');root.append(style,app);form.body.prepend(host);
  dispose=mountEditor(app,{initial:draft,onDraft:value=>{draft=value;},onGenerate:(file,name)=>transferEmoji(form,file,name,{scope})});
 };
 const observer=new MutationObserver(()=>{if(!scheduled){scheduled=true;queueMicrotask(sync);}});
 observer.observe(scope===document?document.body:scope,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-hidden']});sync();
 const stop=()=>{observer.disconnect();clear();};return stop;
}

if(/^\/customize\/emoji\/?$/.test(location.pathname)){const stop=startIntegration(document,":root{font-family:\"Hiragino Kaku Gothic ProN\",\"Yu Gothic\",sans-serif;color:#26352f;background:#f7f7f4;font-size:13px}*{box-sizing:border-box}body{margin:0}main{max-width:560px;padding:20px;margin:0 auto}h1{font-size:16px;margin:0 0 16px;font-weight:600}.workspace{display:grid;grid-template-columns:minmax(0,1fr) 150px;gap:24px;align-items:start}.label{display:block;font-weight:600;font-size:12px;margin-bottom:6px}textarea,input[type=text],select{font:inherit;width:100%;border:1px solid #b9c1bb;border-radius:4px;padding:7px 9px;background:#fff;color:inherit}textarea{resize:vertical;min-height:58px;font-size:16px;line-height:1.4}textarea:focus,input:focus,select:focus,button:focus-visible{outline:2px solid #176b50;outline-offset:2px}.helper{font-size:10px;color:#68746c;line-height:1.6}.helper:has(span){display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px}.helper output{white-space:nowrap}fieldset{border:0;padding:0;margin:16px 0}.colors{display:flex;gap:16px}.colors label{display:flex;align-items:center;gap:6px;font-size:12px}input[type=color]{width:30px;height:28px;padding:2px;border:1px solid #b9c1bb;background:none;cursor:pointer}.swatches{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}.swatches button{flex:0 0 20px;width:20px;height:20px;border:1px solid #bbc2ba;border-radius:50%;cursor:pointer}.check{font-size:12px;display:flex;align-items:center;gap:6px}input[type=checkbox]{accent-color:#176b50}#error{font-size:11px;color:#aa3128;margin:8px 0}#error:empty{display:none}img:not([src]){visibility:hidden}.samples{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.samples>div>span{font-size:10px;color:#68746c}.sample{margin-top:3px;aspect-ratio:1}.light{background:white;outline:1px solid #e0e3dd}.dark{background:#24282d}.sample img{display:block;width:100%;height:100%}#size{margin:8px 0}#generate{width:100%;border:0;border-radius:4px;background:#176b50;color:white;padding:9px;font:inherit;cursor:pointer}#generate:disabled{opacity:.4;cursor:default}#result{display:block;font-size:11px;line-height:1.6;margin-top:8px;overflow-wrap:anywhere}@media(max-width:400px){main{padding:12px}.workspace{grid-template-columns:minmax(0,1fr) 110px;gap:12px}}\n\n.font-label{margin-top:12px}select{font-size:12px;padding:7px 9px}\n\n.stretch-option{margin-top:10px}\n\n.colors{flex-wrap:wrap;gap:10px}.color-control{flex:1;min-width:112px}.color-control>label{display:block;margin-bottom:4px;font-size:12px}.color-fields{display:flex;align-items:center;gap:5px}.color-fields input[type=text]{width:90px;min-width:0;padding:5px;font:12px ui-monospace,monospace}.color-fields input[type=color]{flex-shrink:0}input[aria-invalid=true]{border-color:#aa3128}input:disabled{opacity:.5}\n\n:host{display:block;color:#26352f;font:13px \"Hiragino Kaku Gothic ProN\",sans-serif;background:#f7f7f4;border:1px solid #d4d9d4;border-radius:4px;margin:12px 0}main{margin:0;padding:16px;max-width:none}" );addEventListener('pagehide',stop,{once:true});}
})();
