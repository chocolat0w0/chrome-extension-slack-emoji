import {mountEditor} from './editor/view.js';
import {findSlackForm,transferEmoji} from './slack/adapter.js';
export function startIntegration(scope=document,styles='') {
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
