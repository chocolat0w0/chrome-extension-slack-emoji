(()=>{
// Google Fonts are fetched on use; aliases prevent accidental local-font substitution.
const FONT_PRESETS = [
 {id:'gothic',label:'ゴシック体',weight:700,stroke:0.025,googleFamily:'Noto Sans JP',family:'"SlackEmojiWebGothic"'},
 {id:'gothic-bold',label:'太いゴシック体',weight:900,stroke:0.055,googleFamily:'Noto Sans JP',family:'"SlackEmojiWebGothicBold"'},
 {id:'mincho',label:'明朝体',weight:900,stroke:0.025,googleFamily:'Noto Serif JP',family:'"SlackEmojiWebMincho"'},
 {id:'rounded',label:'丸文字',weight:900,stroke:0.025,googleFamily:'Zen Maru Gothic',family:'"SlackEmojiWebMaru"'}
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

chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 if(!['font-styles','font-bytes'].includes(message?.type))return;
 let url;try{url=new URL(sender.url);}catch{return;}
 if(sender.id!==chrome.runtime.id||url.protocol!=='https:'||!url.hostname.endsWith('.slack.com')||!/^\/customize\/emoji\/?$/.test(url.pathname))return;
 (async()=>{
  if(message.type==='font-styles')return {ok:true,styles:await fetchFontStyles(message.id)};
  const buffer=await fetchFontBytes(message.id,message.index),bytes=new Uint8Array(buffer);
  let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return {ok:true,base64:btoa(binary)};
 })().then(reply,()=>reply({ok:false,error:'Font request failed'}));return true;
});

})();
