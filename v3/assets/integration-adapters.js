/* 同路真实 AI / 数据库适配接口预留（未启用）。
 * 所有真实 API 调用必须经过后端鉴权；严禁在浏览器嵌入模型密钥。
 * 此文件没有 fetch、网络传输或自动上传用户数据，便于本地离线演示。
 */
(function(){
  'use strict';
  const disabled=async name=>({ok:false,status:'not_connected',service:name,message:'尚未配置服务端接口。本地演示不会上传个人资料。'});
  window.TongluAdapters={
    version:'v1',mode:'demo',
    auth:{currentUser:()=>disabled('auth.currentUser'),signIn:()=>disabled('auth.signIn'),signOut:()=>disabled('auth.signOut')},
    profiles:{get:()=>disabled('profiles.get'),save:()=>disabled('profiles.save'),delete:()=>disabled('profiles.delete')},
    documents:{parse:()=>disabled('documents.parse'),delete:()=>disabled('documents.delete')},
    speech:{transcribe:()=>disabled('speech.transcribe')},
    ai:{extractProfile:()=>disabled('ai.extractProfile'),followUp:()=>disabled('ai.followUp'),planSuggestions:()=>disabled('ai.planSuggestions')},
    experience:{search:()=>disabled('experience.search'),answerWithCitations:()=>disabled('experience.answerWithCitations')},
    mentors:{lookup:()=>disabled('mentors.lookup'),verification:()=>disabled('mentors.verification'),orderStats:()=>disabled('mentors.orderStats')},
    records:{applications:()=>disabled('records.applications'),tasks:()=>disabled('records.tasks'),favorites:()=>disabled('records.favorites')}
  };
})();
