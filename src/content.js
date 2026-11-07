import {mountEditor} from './editor/view.js';
import {findSlackForm,transferEmoji} from './slack/adapter.js';
export function startIntegration(scope=document,styles='') {
 let host=null,dispose=null,activeBody=null,restoreBody=null,layoutStyle=null,draft={},scheduled=false;
 const clear=()=>{dispose?.();dispose=null;host?.remove();host=null;restoreBody?.();restoreBody=null;layoutStyle?.remove();layoutStyle=null;activeBody=null;};
 const sync=()=>{
  scheduled=false;const form=findSlackForm(scope);
  if(form?.body===activeBody&&host?.isConnected)return;
  clear();if(!form)return;
  activeBody=form.body;
  const content=form.body.firstElementChild;
  const wide=form.body.children.length===1&&(content===form.file.form||(content?.matches('[data-qa="customize_emoji_add_dialog_message"]')&&content.contains(form.file.form)));
  const scroll=form.body.closest('.c-scrollbar__child');
  if(wide){
   form.body.setAttribute('data-slack-emoji-layout','');form.dialog.setAttribute('data-slack-emoji-wide','');
   if(scroll&&form.dialog.contains(scroll))scroll.setAttribute('data-slack-emoji-scroll','');
   layoutStyle=document.createElement('style');layoutStyle.textContent=`@media (min-width: 1000px){[data-slack-emoji-wide]{width:min(1000px,calc(100vw - 48px))!important;max-width:calc(100vw - 48px)!important}[data-slack-emoji-scroll]{width:100%!important;max-width:100%;min-width:0;box-sizing:border-box}.c-scrollbar__hider>[data-slack-emoji-scroll]{width:calc(100% - 50px)!important}[data-slack-emoji-layout]{display:grid!important;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:16px;align-items:start;min-width:0;max-width:100%;box-sizing:border-box}[data-slack-emoji-layout]>*{min-width:0;max-width:100%;box-sizing:border-box}[data-slack-emoji-layout]>[data-slack-emoji-editor]{margin:0}[data-slack-emoji-layout]>[data-qa="customize_emoji_add_dialog_message"]{overflow-wrap:anywhere}[data-slack-emoji-layout] .p-add_custom_emoji_dialog__upload_container{flex-wrap:wrap}[data-slack-emoji-layout] input[type="text"]{max-width:100%;box-sizing:border-box}}`;
   document.head.append(layoutStyle);
  }
  const properties=['max-height','overflow-x','overflow-y'];
  const previous=properties.map(p=>[p,form.body.style.getPropertyValue(p),form.body.style.getPropertyPriority(p)]);
  restoreBody=()=>{if(wide){form.body.removeAttribute('data-slack-emoji-layout');form.dialog.removeAttribute('data-slack-emoji-wide');scroll?.removeAttribute('data-slack-emoji-scroll');}for(const [p,value,priority] of previous){if(value)form.body.style.setProperty(p,value,priority);else form.body.style.removeProperty(p);}};
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
