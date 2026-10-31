const slackQa = name => `[data-qa="customize_emoji_add_dialog_${name}"]`;
export function findSlackForm(scope=document) {
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
export async function transferEmoji(target,file,name,{scope=document,timeout=3500}={}) {
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
