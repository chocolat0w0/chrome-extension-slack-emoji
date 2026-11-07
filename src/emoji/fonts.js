// Google Fonts are fetched on use; aliases prevent accidental local-font substitution.
export const FONT_PRESETS = [
 {id:'gothic',label:'ゴシック体',googleFamily:'Noto Sans JP',family:'"SlackEmojiWebGothic"'},
 {id:'mincho',label:'明朝体',googleFamily:'Noto Serif JP',family:'"SlackEmojiWebMincho"'},
 {id:'rounded',label:'丸文字',googleFamily:'M PLUS Rounded 1c',family:'"SlackEmojiWebMaru"'}
];
export function fontPreset(id='gothic') {
 const preset=FONT_PRESETS.find(p=>p.id===(id==='gothic-bold'?'gothic':id));
 if(!preset)throw new Error('フォントを選び直してください。');
 return preset;
}
export function fontWeight(weight=900) {
 const value=Number(weight);
 if(![300,500,900].includes(value))throw new Error('太さを選び直してください。');
 return value;
}
export function actualFontWeight(id,weight=900) {
 const preset=fontPreset(id),value=fontWeight(weight);
 return value===300?(preset.id==='mincho'?600:500):value===500?(preset.id==='mincho'?900:preset.id==='rounded'?700:800):900;
}
export function canvasFont(id='gothic',size,weight=900) {
 return `${actualFontWeight(id,weight)} ${size}px ${fontPreset(id).family}`;
}
export function fontStrokeWidth(id='gothic',size,weight=900) {
 const preset=fontPreset(id),value=fontWeight(weight);
 return value===300||(value===500&&preset.id==='gothic')||(preset.id==='rounded'&&value===900)?0:Math.max(0.1,size*(value===500?(preset.id==='rounded'?0.02:0.025):(preset.id==='mincho'?0.06:0.04)));
}
