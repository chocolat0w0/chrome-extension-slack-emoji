import {readFile,mkdir,writeFile} from 'node:fs/promises';
async function bundle(files){
 const chunks=[];
 for(const path of files){
  let source=await readFile(path,'utf8');
  source=source.replace(/^import \{[^\n]+\} from '[^']+';\n/gm,'').replace(/^export (?=(async )?function|const )/gm,'');
  if(/^\s*(import|export)\b/m.test(source))throw Error(`Unsupported module syntax: ${path}`);chunks.push(source);
 }return chunks.join('\n');
}
const shared=['src/emoji/fonts.js','src/emoji/font-network.js'];
const code=await bundle(['src/editor/model.js','src/emoji/layout.js',...shared,'src/emoji/font-loader.js','src/emoji/gif.js','src/emoji/animation.js','src/emoji/render.js','src/editor/view.js','src/slack/adapter.js','src/content.js']);
const styles=await readFile('src/editor/styles.css','utf8');
await mkdir('dist',{recursive:true});
await writeFile('dist/content.js',`(()=>{\n${code}\nif(/^\\/customize\\/emoji\\/?$/.test(location.pathname)){const stop=startIntegration(document,${JSON.stringify(styles+'\n:host{display:block;color:#26352f;font:13px "Hiragino Kaku Gothic ProN",sans-serif;background:#f7f7f4;border:1px solid #d4d9d4;border-radius:4px;margin:12px 0}main{margin:0;padding:16px;max-width:none}')} );addEventListener('pagehide',stop,{once:true});}\n})();\n`);
await writeFile('dist/font-worker.js',`(()=>{\n${await bundle([...shared,'src/font-worker.js'])}\n})();\n`);
await writeFile('dist/manifest.json',await readFile('manifest.json'));
