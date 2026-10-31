export function fitText(texts, measure) {
 // Each line uses its actual ink bounds, not only advance width.
 for(let size=112;size>=1;size--) {
  const metrics=texts.map(text=>{
   const m=measure(text,size);
   return {text,left:m.actualBoundingBoxLeft??0,right:m.actualBoundingBoxRight??m.width,ascent:m.actualBoundingBoxAscent||size*.8,descent:m.actualBoundingBoxDescent||size*.2};
  });
  const gap=size*.12, height=metrics.reduce((n,m)=>n+m.ascent+m.descent,0)+gap*(texts.length-1);
  if(height>112 || metrics.some(m=>m.left+m.right>112)) continue;
  let top=(128-height)/2;
  return {size,lines:metrics.map(m=>{const line={...m,x:(128-m.left-m.right)/2+m.left,y:top+m.ascent};top+=m.ascent+m.descent+gap;return line;})};
 }
 throw new Error('文字を描画領域に配置できませんでした。');
}
