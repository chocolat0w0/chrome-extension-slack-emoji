import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fontCssUrl,parseFontCss,rangeContains} from '../src/emoji/font-network.js';
test('Google request contains only family/weight and never input text',()=>{
 for(const [id,family] of [['rounded','M PLUS Rounded 1c:wght@500']]){const url=new URL(fontCssUrl(id,300));assert.equal(url.origin,'https://fonts.googleapis.com');assert.equal(url.searchParams.get('family'),family);assert.equal(url.searchParams.has('text'),false);}assert.throws(()=>fontCssUrl('bad'));
});
test('parses only HTTPS gstatic font resources and unicode ranges',()=>{
 const css='@font-face {src: url(https://fonts.gstatic.com/s/example/font.woff2) format("woff2"); unicode-range: U+3040-309F,U+4E00;}';
 assert.deepEqual(parseFontCss(css),[{url:'https://fonts.gstatic.com/s/example/font.woff2',range:'U+3040-309F,U+4E00'}]);
 assert.ok(rangeContains('U+3040-309F,U+4E00',0x3042));assert.ok(!rangeContains('U+3040-309F',65));assert.ok(rangeContains('U+4??',0x450));
 assert.throws(()=>parseFontCss(css.replace('fonts.gstatic.com','example.com')));assert.throws(()=>parseFontCss('body{color:red}'));
});
test('failed downloads time out or reject, and stylesheet retry is possible',async()=>{
 const {fetchFontStyles}=await import('../src/emoji/font-network.js');
 const original=globalThis.fetch;let attempts=0;
 globalThis.fetch=async(url,options)=>{
  attempts++;assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');assert.equal(options.redirect,'error');assert.ok(options.signal instanceof AbortSignal);
  if(attempts===1)throw Error('offline');
  return new Response('@font-face{src:url(https://fonts.gstatic.com/s/example/font.woff2);unicode-range:U+0-10FFFF;}');
 };
 try{await assert.rejects(fetchFontStyles('mincho'),/offline/);assert.equal((await fetchFontStyles('mincho')).length,1);assert.equal(attempts,2);}finally{globalThis.fetch=original;}
});
