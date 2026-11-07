import {fontPreset,fontWeight,actualFontWeight} from './fonts.js';
import {fetchFontStyles,fetchFontBytes,rangeContains} from './font-network.js';
const loadedSubsets=new Map();
async function fontTransport(type,id,index,weight){
 if(typeof chrome!=='undefined'&&chrome.runtime?.id){
  const result=await chrome.runtime.sendMessage({type,id,index,weight});
  if(!result?.ok)throw Error(result?.error??'Font service unavailable');
  return type==='font-styles'?result.styles:Uint8Array.from(atob(result.base64),c=>c.charCodeAt(0)).buffer;
 }
 return type==='font-styles'?fetchFontStyles(id,weight):fetchFontBytes(id,index,weight);
}
export async function ensureWebFont(id,text,weight=900){
 const preset=fontPreset(id);weight=fontWeight(weight);
 try{
  const styles=await fontTransport('font-styles',id,undefined,weight);
  const points=[...new Set([...text].filter(c=>!/[\r\n\t]/.test(c)).map(c=>c.codePointAt(0)))];
  if(points.some(p=>!styles.some(s=>rangeContains(s.range,p))))throw Error('Unsupported character');
  const needed=styles.map((s,index)=>({...s,index})).filter(s=>points.some(p=>rangeContains(s.range,p)));
  await Promise.all(needed.map(s=>{
   const key=preset.id+':'+weight+':'+s.index;
   if(!loadedSubsets.has(key)){
    const promise=(async()=>{
     const buffer=await fontTransport('font-bytes',id,s.index,weight);
     const face=new FontFace(preset.family.replaceAll('"',''),buffer,{weight:String(actualFontWeight(id,weight)),style:'normal',unicodeRange:s.range});
     await face.load();document.fonts.add(face);return face;
    })().catch(e=>{loadedSubsets.delete(key);throw e;});loadedSubsets.set(key,promise);
   }return loadedSubsets.get(key);
  }));
 }catch{throw Error('フォントを取得できませんでした。通信環境や入力文字を確認して、再度お試しください。');}
}
