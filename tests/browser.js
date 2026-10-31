import {renderEmoji} from '../src/emoji/render.js';
export async function verify(){
 const cases=['ありがとう','確\n認\nし\nた','ABCDEFGHIJKL','か\u3099'];const results=[];
 for(const text of cases){for(const transparent of [true,false]){
 const {canvas,blob}=await renderEmoji({text,foreground:'#176b50',background:'#ffedb5',transparent});
 const data=canvas.getContext('2d').getImageData(0,0,128,128).data;
 const bitmap=await createImageBitmap(blob);
 const border=[];for(let i=0;i<128;i++)border.push(data[i*4+3],data[((127*128)+i)*4+3],data[(i*128)*4+3],data[(i*128+127)*4+3]);
 if(bitmap.width!==128||bitmap.height!==128||blob.type!=='image/png'||blob.size>=128000)throw Error('PNG metadata');
 if(transparent&&border.some(a=>a!==0))throw Error('Text clipped at edge');
 if(!transparent&&data[3]!==255)throw Error('Background not opaque');
 if(!data.some((v,i)=>i%4===3&&v>0))throw Error('Empty image');
 bitmap.close();results.push({text,transparent,bytes:blob.size});
 }}return results;
}
