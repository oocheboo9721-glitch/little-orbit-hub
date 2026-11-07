import {configured, initializeCloud} from './cloud.js';
const message=document.querySelector('#access-message');
const login=document.querySelector('#gate-login');
const switchAccount=document.querySelector('#gate-switch');
let cloud,loaded=false,revision=0;
function lock(text){document.body.classList.add('access-locked');message.textContent=text;}
async function check(user){
 if(!cloud)return;
 const current=++revision;
 lock('접근 권한을 확인하고 있어요.');
 login.hidden=!!user;switchAccount.hidden=!user;
 if(loaded){location.reload();return;}
 if(!user){message.textContent='본인 Google 계정으로 로그인해 주세요.';return;}
 try{
  const allowed=await cloud.allowed();
  if(current!==revision)return;
  if(!allowed){lock('이 계정에는 일기장 이용 권한이 없어요. 허용된 계정으로 로그인해 주세요.');return;}
  await import('./app.js');
  if(current!==revision)return;
  loaded=true;document.body.classList.remove('access-locked');
 }catch{
  if(current===revision)lock('이 계정의 접근 권한을 확인할 수 없어요. 허용 계정 설정과 연결 상태를 확인해 주세요.');
 }
}
login.onclick=async()=>{if(!cloud)return;login.disabled=true;try{await cloud.login();}catch{message.textContent='로그인을 완료하지 못했어요. 팝업을 허용한 뒤 다시 시도해 주세요.';}finally{login.disabled=false;}};
switchAccount.onclick=async()=>{try{await cloud.logout();}catch{message.textContent='로그아웃하지 못했어요. 다시 시도해 주세요.';}};
if(!configured){
 lock('비공개 일기장으로 전환 중이에요. Firebase 연결과 본인 계정 등록이 끝나면 로그인할 수 있어요. 기존 기기 기록은 삭제하지 않았어요.');
}else{
 try{cloud=await initializeCloud(check);await check(cloud.user());}
 catch{lock('로그인 서비스에 연결하지 못했어요. 잠시 후 새로고침해 주세요.');}
}
