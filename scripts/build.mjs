import {cp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
const root=new URL('../',import.meta.url),dist=new URL('dist/',root);
await rm(dist,{recursive:true,force:true});await mkdir(dist,{recursive:true});
for(const name of ['index.html','privacy.html','assets','apps'])await cp(new URL(name,root),new URL(name,dist),{recursive:true});
await writeFile(new URL('.nojekyll',dist),'');
if(process.env.FIREBASE_WEB_CONFIG){
 const input=JSON.parse(process.env.FIREBASE_WEB_CONFIG),allowed=['apiKey','authDomain','projectId','appId'];
 if(Object.keys(input).some(k=>!allowed.includes(k)))throw Error('Only the four public Firebase Web config fields are allowed.');
 if(allowed.some(k=>typeof input[k]!=='string'||!input[k]||input[k].length>250))throw Error('Firebase Web config is incomplete.');
 if(!/^[a-z0-9-]+$/.test(input.projectId)||input.authDomain!==input.projectId+'.firebaseapp.com'||!/^AIza[\w-]+$/.test(input.apiKey)||!/^1:\d+:web:[a-f0-9]+$/i.test(input.appId))throw Error('Unexpected Firebase Web configuration.');
 await writeFile(new URL('assets/firebase-config.js',dist),'export const firebaseConfig = '+JSON.stringify(input)+';\n');
}
console.log('Built static GitHub Pages site → dist/');
