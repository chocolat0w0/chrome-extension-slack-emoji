// Google Fonts are fetched on use; aliases prevent accidental local-font substitution.
export const FONT_PRESETS = [
 {id:'gothic',label:'ゴシック体',weight:700,stroke:0.025,googleFamily:'Noto Sans JP',family:'"SlackEmojiWebGothic"'},
 {id:'gothic-bold',label:'太いゴシック体',weight:900,stroke:0.055,googleFamily:'Noto Sans JP',family:'"SlackEmojiWebGothicBold"'},
 {id:'mincho',label:'明朝体',weight:900,stroke:0.025,googleFamily:'Noto Serif JP',family:'"SlackEmojiWebMincho"'},
 {id:'rounded',label:'丸文字',weight:900,stroke:0.025,googleFamily:'M PLUS Rounded 1c',family:'"SlackEmojiWebMaru"'}
];
export function canvasFont(id='gothic-bold',size) {
 const preset=FONT_PRESETS.find(p=>p.id===id);
 if(!preset)throw new Error('フォントを選び直してください。');
 return `${preset.weight} ${size}px ${preset.family}`;
}

export function fontStrokeWidth(id='gothic-bold',size) {
 const preset=FONT_PRESETS.find(p=>p.id===id);
 if(!preset)throw new Error('フォントを選び直してください。');
 return Math.max(0.4,size*preset.stroke);
}
