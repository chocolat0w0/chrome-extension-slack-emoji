// Rectangles are inset from the inner circle by at least 3px at each corner.
export function frameLayout(frame='none'){
 if(frame==='none')return {x:0,y:0,width:128,height:128};
 if(frame==='circle')return {x:26,y:26,width:76,height:76};
 if(frame==='double-circle')return {x:31,y:31,width:66,height:66};
 if(frame==='rays')return {x:24,y:24,width:80,height:80};
 throw Error('フレームを選び直してください。');
}
export function drawFrame(ctx,frame,color){
 frameLayout(frame);
 ctx.save();ctx.strokeStyle=color;ctx.lineWidth=4;ctx.lineCap='round';
 if(frame==='circle'||frame==='double-circle'){
  for(const radius of frame==='circle'?[60]:[60,52]){
   ctx.beginPath();ctx.arc(64,64,radius,0,Math.PI*2);ctx.stroke();
  }
 }else if(frame==='rays'){
  // Square exclusion zone: line ends remain outside the text rectangle,
  // including the stroke's rounded cap and a 3px gap.
  ctx.lineWidth=2;
  for(let i=0;i<32;i++){
   const angle=i*Math.PI*2/32,dx=Math.cos(angle),dy=Math.sin(angle);
   const inner=45/Math.max(Math.abs(dx),Math.abs(dy));
   const outer=61/Math.max(Math.abs(dx),Math.abs(dy));
   ctx.beginPath();ctx.moveTo(64+dx*inner,64+dy*inner);ctx.lineTo(64+dx*outer,64+dy*outer);ctx.stroke();
  }
 }
 ctx.restore();
}
