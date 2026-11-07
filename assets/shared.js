export const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function safeURL(value) {
  const u = new URL(value);
  if (u.protocol !== 'https:' || u.username || u.password || u.port) throw Error('인증 정보나 별도 포트 없는 HTTPS 주소를 입력해 주세요.');
  return u.href;
}
export const today = () => new Date().toLocaleDateString('sv-SE');
export const moods = {happy:['☀','행복해요'],calm:['☘','평온해요'],okay:['◡','그저 그래요'],sad:['☂','슬퍼요'],tired:['☾','지쳤어요']};
export function validateEntry(data) {
  if (!data || typeof data !== 'object') throw Error('일기 형식이 올바르지 않아요.');
  const {date, title, body, mood} = data;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date+'T12:00:00Z')) || new Date(date+'T12:00:00Z').toISOString().slice(0,10) !== date) throw Error('날짜를 확인해 주세요.');
  if (typeof title !== 'string' || !title.trim() || title.trim().length>120 || typeof body !== 'string' || !body.trim() || body.trim().length>20000 || !Object.hasOwn(moods,mood)) throw Error('제목(120자)과 내용(20,000자), 기분을 확인해 주세요.');
  return {date,title:title.trim(),body:body.trim(),mood};
}
export function downloadJSON(data, filename) {
 const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
