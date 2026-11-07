// Run only after authenticating the Firebase CLI. Credentials stay outside this repository.
import {spawnSync} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
const [projectId,pagesDomain,supportEmail]=process.argv.slice(2);
if(!/^[a-z][a-z0-9-]{5,29}$/.test(projectId||'')||!/^[a-z0-9-]+\.github\.io$/.test(pagesDomain||'')||!/^\S+@\S+\.\S+$/.test(supportEmail||''))throw Error('Usage: node scripts/firebase-setup.mjs PROJECT_ID ACCOUNT.github.io SUPPORT_EMAIL');
function run(args,json=false){const r=spawnSync('npx',['-y','firebase-tools@latest',...args],{encoding:'utf8',stdio:json?['inherit','pipe','inherit']:'inherit'});if(r.status!==0)throw Error('Firebase operation failed. Resolve it before retrying.');return json?JSON.parse(r.stdout):null}
run(['login:list']);
run(['projects:create',projectId,'--display-name','Little Orbit Diary','--non-interactive']);
// Standard edition for this small, client-only diary. Seoul data location.
run(['firestore:databases:create','(default)','--project',projectId,'--edition','standard','--location','asia-northeast3','--non-interactive']);
const created=run(['apps:create','WEB','Little Orbit Hub','--project',projectId,'--json'],true);
const appId=created.result?.appId;if(!appId)throw Error('Web app created; retrieve its ID with apps:list before continuing. Do not rerun project creation.');
const sdk=run(['apps:sdkconfig','WEB',appId,'--project',projectId,'--json'],true);
const raw=sdk.result?.sdkConfig;if(!raw)throw Error('Retrieve the Web SDK config using apps:sdkconfig.');
const config=typeof raw==='string'?JSON.parse(raw):raw;
const allowed=Object.fromEntries(['apiKey','authDomain','projectId','appId'].map(k=>[k,config[k]]));
// Public identifiers only. Never write login tokens or OAuth client secrets.
await writeFile(new URL('../assets/firebase-config.js',import.meta.url),'export const firebaseConfig = '+JSON.stringify(allowed)+';\n');
const firebase={firestore:{rules:'firestore.rules',indexes:'firestore.indexes.json'},auth:{providers:{googleSignIn:{oAuthBrandDisplayName:'Little Orbit Diary',supportEmail,authorizedRedirectUris:['https://'+projectId+'.firebaseapp.com/__/auth/handler','https://'+pagesDomain]}}}};
// Email stays outside Git history in ignored local work; deploy config is temporary.
await writeFile(new URL('../firebase.local.json',import.meta.url),JSON.stringify(firebase,null,2));
run(['deploy','--only','firestore,auth','--project',projectId,'--config','firebase.local.json','--non-interactive']);
console.log('Firebase configuration deployed. Verify Google login on the actual Pages domain.');
