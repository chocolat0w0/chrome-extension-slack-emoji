import {FONT_PRESETS} from './fonts.js';
const styleCache=new Map();
export function fontCssUrl(id){
 const p=FONT_PRESETS.find(p=>p.id===id);if(!p)throw Error('Unknown font');
 return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(p.googleFamily+':wght@'+p.weight)}&display=block`;
}
export function rangeContains(range,point){
 return range.split(',').some(part=>{
  const value=part.trim().replace(/^U\+/i,'');
  const pair=value.includes('?')?[value.replaceAll('?','0'),value.replaceAll('?','F')]:value.split('-');
  return point>=parseInt(pair[0],16)&&point<=parseInt(pair[1]??pair[0],16);
 });
}
export function parseFontCss(css){
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
export async function fetchFontStyles(id){
 if(!styleCache.has(id)){
  const promise=fontFetch(fontCssUrl(id)).then(r=>r.text()).then(parseFontCss).catch(e=>{styleCache.delete(id);throw e;});styleCache.set(id,promise);
 }return styleCache.get(id);
}
export async function fetchFontBytes(id,index){
 const styles=await fetchFontStyles(id);if(!Number.isInteger(index)||!styles[index])throw Error('Unknown font subset');
 const buffer=await (await fontFetch(styles[index].url)).arrayBuffer();if(buffer.byteLength>8*1024*1024)throw Error('Font too large');return buffer;
}
