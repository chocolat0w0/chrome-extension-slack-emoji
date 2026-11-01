export function fitText(texts, measure, align='center') {
 if(!['center','left','right'].includes(align))throw Error('文字揃えを選び直してください。');
 // Each line uses its actual ink bounds, not only advance width.
 for(let size=112;size>=1;size--) {
  const metrics=texts.map(text=>{
   const m=measure(text,size);
   return {text,left:m.actualBoundingBoxLeft??0,right:m.actualBoundingBoxRight??m.width,ascent:m.actualBoundingBoxAscent||size*.8,descent:m.actualBoundingBoxDescent||size*.2};
  });
  const gap=size*.12, height=metrics.reduce((n,m)=>n+m.ascent+m.descent,0)+gap*(texts.length-1);
  if(height>112 || metrics.some(m=>m.left+m.right>112)) continue;
  let top=(128-height)/2;
  return {size,lines:metrics.map(m=>{const line={...m,x:align==='left'?8+m.left:align==='right'?120-m.right:(128-m.left-m.right)/2+m.left,y:top+m.ascent};top+=m.ascent+m.descent+gap;return line;})};
 }
 throw new Error('文字を描画領域に配置できませんでした。');
}
export function verticalInkBounds(pixels,width,height){
 let top=height,bottom=-1;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(pixels[(y*width+x)*4+3]){top=Math.min(top,y);bottom=Math.max(bottom,y);}
 return bottom<0?null:{top,height:bottom-top+1};
}
