const segmenter = new Intl.Segmenter('ja', {granularity:'grapheme'});
export const graphemes = text => [...segmenter.segment(text)].map(x=>x.segment);
export function validate(text) {
 const lines=text.replace(/\r\n?/g,'\n').split('\n');
 const errors=[];
 if(!text.trim()) errors.push('文字を入力してください。');
 if(lines.length>4) errors.push('改行は4行までにしてください。');
 if(lines.some(line=>graphemes(line).length>12)) errors.push('1行は12文字までにしてください。');
 return errors;
}
export function normalizeHex(value){
 const hex=value.trim().replace(/^#/,'');
 if(/^[0-9a-f]{3}$/i.test(hex))return '#'+[...hex].map(c=>c+c).join('').toLowerCase();
 return /^[0-9a-f]{6}$/i.test(hex)?'#'+hex.toLowerCase():null;
}
