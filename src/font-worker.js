import {fetchFontStyles,fetchFontBytes} from './emoji/font-network.js';
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
