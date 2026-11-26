/* 同路真实 AI / 数据库适配接口预留（未启用）。
 * 所有真实 API 调用必须经过后端鉴权；严禁在浏览器嵌入模型密钥。
 * 此文件没有 fetch、网络传输或自动上传用户数据，便于本地离线演示。
 */
(function(){
  'use strict';
  const disabled=async name=>({ok:false,status:'not_connected',service:name,message:'这项服务暂未开通，你的资料不会上传。请先使用已开放的功能。'});
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
  const extensions=['pdf','docx','txt','md'];
  const call=(host,method,options={})=>new Promise((resolve,reject)=>host[method]({...options,success:resolve,fail:error=>reject(Object.assign(new Error(error.errMsg||'文件导入未完成'),error))}));
  function nativeHost(source){
    if(source==='qq')return typeof window.qq?.chooseMessageFile==='function'?window.qq:null;
    return typeof window.wx?.chooseMessageFile==='function'?window.wx:typeof window.qq?.chooseMessageFile==='function'?window.qq:null;
  }
  function systemFile(){
    return new Promise(resolve=>{
      const input=document.createElement('input');input.type='file';input.accept=extensions.map(x=>'.'+x).join(',');input.hidden=true;
      const finish=files=>{input.remove();resolve(files);};
      input.addEventListener('change',()=>finish(Array.from(input.files||[])),{once:true});
      input.addEventListener('cancel',()=>finish([]),{once:true});
      document.body.appendChild(input);input.click();
    });
  }
  async function chooseResume(options={}){
    const host=nativeHost(options.source);
    if(!host)return systemFile();
    if(typeof host.getPrivacySetting==='function'){
      const setting=await call(host,'getPrivacySetting');
      if(setting.needAuthorization){
        if(typeof host.requirePrivacyAuthorize!=='function')throw new Error('请升级客户端并同意隐私保护指引后导入');
        await call(host,'requirePrivacyAuthorize');
      }
    }
    const result=await call(host,'chooseMessageFile',{count:1,type:'file',extension:extensions});
    return (result.tempFiles||[]).slice(0,1).map(file=>{
      if(!file.size||file.size>8*1024*1024)throw new Error('请选择不超过 8 MB 的简历文件');
      if(!/\.(pdf|docx|txt|md)$/i.test(file.name||''))throw new Error('请选择 PDF、DOCX、TXT 或 MD；旧版 DOC 请先另存为 DOCX');
      // 提供与浏览器 File 相同的读取契约；原生页面需注入支持 PDF/DOCX 的解析器。
      return {name:file.name,size:file.size,type:'',path:file.path,arrayBuffer:async()=>{
        const result=await call(host.getFileSystemManager(),'readFile',{filePath:file.path});return result.data;
      }};
    });
  }
  window.TongluAdapters.fileImport={canUseChat:()=>!!nativeHost(),chooseResume,chooseFromQQ:()=>chooseResume({source:'qq'})};
  // 可替换为异步远端排序；只返回已传入的需求，页面仍核对最新接单状态。
  window.TongluAdapters.matching={async rankDemands(demands,mentorProfile,options={}){
    const text=[mentorProfile.major,mentorProfile.specialty,mentorProfile.services,...(mentorProfile.capabilities||[])].filter(Boolean).join(' ');
    const ranked=demands.map(d=>{
      const reasons=[];
      if(d.major&&text.includes(d.major))reasons.push('专业方向相近');
      if((d.categories||[]).some(x=>text.includes(x)))reasons.push('服务能力相关');
      return {...d,matchMeta:{score:reasons.length,reasons,source:'local_fallback',algorithmVersion:'keyword-v1'}};
    });
    return ranked.sort((a,b)=>(options.sortMode==='recommended'?b.matchMeta.score-a.matchMeta.score:0)||String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
  }};
})();
