// GIF89a with a shared 256-color palette, full frames, and 9–12 bit LZW.
function compressGifIndices(pixels){
 const bytes=[];let bits=0,count=0,width=9,decodedNext=258,hasPrevious=false;
 // Track the decoder's dictionary: it learns entries one emitted code later.
 const emit=code=>{
  bits|=code<<count;count+=width;while(count>=8){bytes.push(bits&255);bits>>>=8;count-=8;}
  if(code===256){width=9;decodedNext=258;hasPrevious=false;}
  else if(code!==257){if(hasPrevious&&++decodedNext===(1<<width)&&width<12)width++;hasPrevious=true;}
 };
 let dictionary=new Map(),next=258,prefix=pixels[0];emit(256);
 for(let i=1;i<pixels.length;i++){
  const pixel=pixels[i],key=prefix*256+pixel,found=dictionary.get(key);
  if(found!==undefined){prefix=found;continue;}
  emit(prefix);dictionary.set(key,next++);prefix=pixel;
  if(next===4095){emit(256);dictionary=new Map();next=258;}
 }
 emit(prefix);emit(257);if(count)bytes.push(bits&255);
 return bytes;
}
export function encodeGif({width,height,palette,frames,transparent=false,delay=6}){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>65535||height>65535||palette.length!==768||!frames.length||frames.length>50||frames.some(frame=>frame.length!==width*height))throw Error('GIFの画像データが不正です。');
 const bytes=[];
 const word=value=>bytes.push(value&255,value>>8&255);
 bytes.push(...new TextEncoder().encode('GIF89a'));word(width);word(height);
 bytes.push(0xf7,0,0,...palette);
 // NETSCAPE2.0: repeat forever.
 bytes.push(0x21,0xff,11,...new TextEncoder().encode('NETSCAPE2.0'),3,1,0,0,0);
 for(const frame of frames){
  // Restore to background before the next frame, including transparent pixels.
  bytes.push(0x21,0xf9,4,transparent?9:8);word(delay);bytes.push(0,0);
  bytes.push(0x2c);word(0);word(0);word(width);word(height);bytes.push(0,8);
  const data=compressGifIndices(frame);
  for(let offset=0;offset<data.length;offset+=255){const block=data.slice(offset,offset+255);bytes.push(block.length,...block);}
  bytes.push(0);
 }
 bytes.push(0x3b);return new Blob([Uint8Array.from(bytes)],{type:'image/gif'});
}
