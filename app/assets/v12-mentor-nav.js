/* 服务者账号入口、四栏导航和个人中心。账号与服务数据当前均保存在本机。 */
(function () {
  'use strict';
  const store=window.TongluMarket,T=window.__TL,E=value=>escapeTL(String(value??''));
  const mentorRole=()=>T.role==='mentor';
  const routeKey=()=>location.hash.replace(/^#\/?/,'').split('/')[0]||'choose';
  const originalRender=render,originalGo=go,originalBack=back,originalActionbar=actionbar,originalSelectRole=window.selectTongluRole;
  const originalPersist=T.persistMentor;
  let loadedMentorId='';
  const registrationPage=PAGES.mentorProfile;
  const originalExperiencePage=PAGES.experience,studentExperienceNav={...NAV.experience};
  const studentConversationNav={...NAV.conversation};
  const studentWorkbenchNav={...NAV.workbench};
  let previousDraft={...T.mentorDraft};
  try{if(!previousDraft.name){const legacy=JSON.parse(localStorage.getItem('tonglu-mentor-legacy-draft-v1')||'null');if(legacy?.profile)previousDraft={...legacy.profile,intakeDraft:legacy.intake};}}catch(_){}
  // 旧版资料没有账号归属，先保留备份，不把它自动认领给新注册的账号。
  try{
    const key='tonglu-mentor-legacy-draft-v1';
    if(!store.auth()&&!localStorage.getItem(key)&&(T.mentorDraft.name||window.__TLV5?.getState().mentor.files.length))localStorage.setItem(key,JSON.stringify({profile:T.mentorDraft,intake:window.__TLV5?.getState().mentor}));
  }catch(_){}
  function hydrateProfile(){
    const a=store.auth(),identity=a?.mentorId||'registration-draft';
    if(identity===loadedMentorId)return;
    let p=a?store.profile():null;
    if(!a){
      try{p=JSON.parse(localStorage.getItem(store.KEYS.registrationDraft)||'null');}catch(_){}
      p=p||store.registrationProfile()||previousDraft;
      p={...p,registered:false};
    }
    loadedMentorId=identity;
    if(typeof window.tlV8ResetMentorStep==='function')window.tlV8ResetMentorStep();
    const reset=Object.fromEntries(Object.keys(T.mentorDraft).map(key=>[key,Array.isArray(T.mentorDraft[key])?[]:null]));
    originalPersist({...reset,slots:'3',registered:false,...p});
    if(window.__TLV5){const state=window.__TLV5.getState();state.mentor=p.intakeDraft||{text:'',files:[],fields:{},edited:[],preview:false,confirmed:false,intro:'',source:'',question:'',cardOpen:{}};window.__TLV5.persist();}
  }
  T.persistMentor=function(patch){
    try{
      const value={...T.mentorDraft,...patch};
      if(window.__TLV5)value.intakeDraft=JSON.parse(JSON.stringify(window.__TLV5.getState().mentor));
      if(store.auth())store.saveProfile(value);
      else if(patch.registered===true)store.registerProfile(value);
      else localStorage.setItem(store.KEYS.registrationDraft,JSON.stringify({...value,registered:false}));
      return originalPersist(value);
    }catch(error){toast(error.message||'资料保存失败');return false;}
  };
  PAGES.mentorAuth=function(){return window.TongluRegistration.uploadPage('mentor',window.__TLV5.getState().mentor,window.__TLV5.isUploading('mentor'));};
  window.tlMentorLogout=function(){store.signOut();loadedMentorId='';window.__TLMentorReturn='';hydrateProfile();go('#/mentorAuth');};
  const icons = {
    messages: '<path d="M4 5.5h16v11H9l-5 3v-14Z"/><path d="M8 9h8M8 13h5"/>',
    publish: '<path d="M12 3v12M7 8l5-5 5 5"/><path d="M4 14v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/>',
    personal: '<circle cx="12" cy="8" r="3.3"/><path d="M4.5 20c.6-3.5 3.2-5.3 7.5-5.3s6.9 1.8 7.5 5.3"/>',
    training: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17Z"/><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20M8 6h8M8 9.5h8"/>'
  };

  const tabIcon=key=>'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+icons[key]+'</svg>';
  const tabs=[['消息','messages',tabIcon('messages')],['发布','mentorMarket',tabIcon('publish')],['个人','mentorMe',tabIcon('personal')],['培训','experience',tabIcon('training')]];
  function renderMentorTabs(){
    if(!mentorRole())return;
    const key=routeKey(),bar=document.getElementById('tabbar');
    if(['choose','mentorAuth'].includes(key)||!store.auth()||!store.profile().registered){bar.innerHTML='';bar.className='tabbar hidden';return;}
    const active=['mentorMarket','mentorSku','mentorDemands','providers','sku'].includes(key)?'mentorMarket':['mentorProfile','mentorMe','workbench','mentorOrders','mentorPeers','provider'].includes(key)?'mentorMe':['experience','dataCenter'].includes(key)?'experience':'messages';
    bar.innerHTML=tabs.map(([title,path,icon])=>`<button class="tab v12-mentor-tab${active===path?' active':''}" type="button" aria-current="${active===path?'page':'false'}" onclick="go('#/${path}')">${icon}<span>${title}</span></button>`).join('');bar.className='tabbar v12-mentor-tabbar';
  }
  PAGES.experience = function () {
    if (!mentorRole()) return originalExperiencePage ? originalExperiencePage() : '<div class="page"></div>';
    const guides=[
      ['平台入驻与服务流程','了解资料完善、服务发布和交付流程。',['在服务者信息中填写真实教育背景、经历与服务能力，提交所需证明。','在同路集市发布具体服务，写清服务范围、价格、名额和交付时间。','接单前确认双方的目标与安排；交付完成后在订单管理更新状态。']],
      ['沟通与咨询规范','明确诉求、服务边界与隐私保护。',['先了解学生的年级、申请方向与当前问题，再判断能否提供帮助。','提前说明沟通次数、反馈方式和交付内容；有变更时重新确认。','仅使用获授权的材料，不转发简历原件、联系方式或其他人的个人信息。']],
      ['简历与申请材料反馈','围绕真实经历梳理结构与表达。',['先核对目标项目要求，再检查教育、科研、竞赛与实践经历的顺序。','围绕问题、方法、个人贡献与结果给出具体修改建议，保留可核实依据。','不编造经历、不代写成果；交付批注与修改清单，帮助学生自行完善。']],
      ['面试与科研竞赛准备','明确目标，提供可执行的练习反馈。',['依据公开要求共同确定练习主题与时间安排，不承诺录取或获奖。','模拟问答后说明表达、逻辑与知识准备中的改进点，给出复盘清单。','科研和竞赛围绕已有真实经历做规划，不交易论文、名额或结果。']]
    ];
    return `<div class="page tl-v2-page v12-training-page">
      <div class="tl-v2-kicker">MENTOR LEARNING CENTER</div>
      <h1 class="tl-v2-headline">培训中心</h1>
      <p class="tl-v2-sub">了解平台服务流程与基本规范，让每一次经验分享都更清晰、更有帮助。</p>
      <section class="v12-training-intro"><span class="v12-training-mark">同路 · 服务者指南</span><b>先了解规则，再开始服务</b><p>点击下方主题阅读指引，开始服务前可随时回来核对。</p></section>
      <div class="v12-training-list">
        ${guides.map(([title,desc,steps],i)=>`<details class="tl-training-guide"><summary><span class="v12-training-no">0${i+1}</span><span><b>${title}</b><small>${desc}</small></span><span class="v12-training-arrow">›</span></summary><ol>${steps.map(step=>`<li>${step}</li>`).join('')}</ol></details>`).join('')}
      </div>
      <p class="v12-training-note">以上为平台服务指引，阅读不代表获得资质认证或培训证书。</p>
    </div>`;
  };

  PAGES.mentorMe=function(){
    const p=store.profile(),summary=store.workbenchSummary(),saved=store.peerFavorites().length;
    const modules=[['服务者信息','mentorProfile','查看与编辑教育背景、服务经历',icons.personal],['服务工作台','workbench','排班、收入、待处理与接单状态','<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4h8v3M3 12h18M10 12v3h4v-3"/>'],['同行收藏','mentorPeers',`已收藏 ${saved} 位同行`,'<path d="M20.5 5.5a5 5 0 0 0-7.1 0L12 7l-1.4-1.5a5 5 0 0 0-7.1 7.1L12 21l8.5-8.4a5 5 0 0 0 0-7.1Z"/>'],['订单管理','mentorOrders',`${summary.active} 项服务中 · ${summary.completed} 项已完成`,'<path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3ZM8 7h8M8 11h8M8 15h5"/>']];
    return `<div class="page v9-page tl-mentor-personal"><header class="tl-mentor-identity"><span class="tl-mentor-avatar">${E((p.name||'服').slice(0,1))}</span><div><h1>${E(p.name||'服务者')}</h1><p>${E([p.school,p.major].filter(Boolean).join(' · ')||'管理你的服务与个人资料')}</p></div><span class="tl-mentor-role">服务者</span></header><div class="tl-mentor-core">${modules.map(([title,path,note,icon])=>`<button type="button" onclick="go('#/${path}')"><i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icon}</svg></i><b>${title}</b><small>${E(note)}</small><span aria-hidden="true">›</span></button>`).join('')}</div></div>`;
  };
  const originalWorkbench=PAGES.workbench;
  const yuan=value=>'¥'+Number(value).toFixed(2);
  PAGES.workbench=function(){
    if(!mentorRole())return originalWorkbench();
    const settings=store.workbench(),summary=store.workbenchSummary(),pending=store.orders().filter(x=>x.status==='in_progress');
    return `<div class="page v9-page tl-workbench"><h1>服务工作台</h1><section class="v9-provider tl-work-status"><div><b>${settings.accepting?'正在接单':'已暂停接单'}</b><p>${settings.accepting?'学生可以浏览并咨询你的在售服务。':'暂停期间不接收新咨询与需求，已有订单可继续处理。'}</p></div><button class="v9-primary" aria-pressed="${!settings.accepting}" onclick="tlSetAccepting(${!settings.accepting})">${settings.accepting?'暂停接单':'恢复接单'}</button></section>
      <div class="tl-work-metrics"><article><small>已结算收入</small><strong data-work-income>${yuan(summary.income)}</strong><p>仅统计已结算订单</p></article><article><small>待处理</small><strong data-work-pending>${summary.pending}</strong><p>${summary.completed} 项已完成</p></article></div>
      <section class="v9-provider"><div class="tl-work-heading"><h2>我的排班</h2><small>可服务的日期与时段</small></div><form class="tl-slot-form" onsubmit="tlSaveSlot(event)"><label><span>日期</span><input type="date" name="slotDate" required></label><label><span>开始时间</span><input type="time" name="slotStart" required></label><label><span>结束时间</span><input type="time" name="slotEnd" required></label><label class="tl-slot-note"><span>安排说明（选填）</span><input name="slotNote" maxlength="80" placeholder="例如：线上沟通时段"></label><button class="v9-primary" type="submit">保存排班</button></form><div class="tl-slot-list">${settings.slots.map(slot=>`<article data-slot-id="${E(slot.id)}"><div><b>${E(slot.date)} · ${E(slot.start)}—${E(slot.end)}</b><small>${E(slot.note||'可服务时段')}</small></div><button onclick="tlRemoveSlot('${E(slot.id)}')">删除</button></article>`).join('')||'<p class="v9-market-footnote">还没有安排时段，选择日期和时间后保存。</p>'}</div></section>
      <section class="v9-provider"><div class="tl-work-heading"><h2>待处理服务</h2><button onclick="go('#/mentorOrders')">查看订单 ›</button></div>${pending.map(item=>`<div class="tl-work-pending"><b>${E(item.title)}</b><small>${item.price===null?'服务范围与费用待确认':'服务进行中'}</small></div>`).join('')||'<p>当前没有待处理服务，可以先整理排班或查看学生需求。</p>'}<p class="v9-market-footnote">未确认费用或未结算的订单不计入收入。</p></section>
      <div class="v9-provider-actions"><button class="v9-primary" onclick="go('#/mentorMarket')">管理同路集市服务</button><button onclick="go('#/mentorDemands')">查看学生需求</button></div></div>`;
  };
  window.tlSetAccepting=function(value){try{store.setAccepting(value);render();toast(value?'已恢复接单':'已暂停接单');}catch(error){toast(error.message);}};
  window.tlSaveSlot=function(event){event.preventDefault();const f=event.currentTarget.elements;try{store.addSlot({date:f.slotDate.value,start:f.slotStart.value,end:f.slotEnd.value,note:f.slotNote.value});render();toast('排班已保存');}catch(error){toast(error.message);}};
  window.tlRemoveSlot=function(slotId){try{store.removeSlot(slotId);render();toast('排班已删除');}catch(error){toast(error.message);}};
  PAGES.mentorOrders=function(){
    const items=store.orders();
    return `<div class="page v9-page"><h1>订单管理</h1><p class="v9-market-lead">查看已承接的需求，记录服务进度与交付状态。</p>${items.length?items.map(x=>`<article class="v9-provider"><small>${E(x.studentLabel)} · ${E(x.discipline)}</small><h2>${E(x.title)}</h2><p>${E(x.categoryLabel)}</p><b>${x.status==='completed'?'已完成':'服务中'} · ${x.price===null?'费用待确认':'¥'+E(x.price)}</b><p class="v9-market-footnote">${E(x.note)}</p>${x.status==='in_progress'?`<button class="v9-primary" onclick="tlCompleteOrder('${E(x.id)}')">标记交付完成</button>`:''}</article>`).join(''):'<div class="v9-empty"><b>还没有服务记录</b><p>前往学生需求，看看你能提供哪些帮助。</p><button class="v9-primary" onclick="go(\'#/mentorDemands\')">浏览学生需求</button></div>'}</div>`;
  };
  window.tlCompleteOrder=function(orderId){try{store.completeOrder(orderId);render();toast('交付状态已更新');}catch(error){toast(error.message);}};
  PAGES.mentorPeers=window.tlPeerFavoritesPage;
  NAV.mentorAuth={title:'个人简历'};NAV.mentorDemands={title:'学生需求'};NAV.mentorMe={title:'个人中心'};NAV.mentorPeers={title:'同行收藏'};NAV.mentorOrders={title:'订单管理'};
  actionbar=function(name){if(mentorRole())return '';return originalActionbar(name);};
  render=function(){
    if(mentorRole())hydrateProfile();
    if(T.role==='student')NAV.profile={title:!location.hash.split('/')[2]||location.hash.split('/')[2]==='upload'?'个人简历':'学生资料'};
    NAV.experience=mentorRole()?{title:'培训中心'}:{...studentExperienceNav};
    NAV.conversation=mentorRole()?{title:'消息详情'}:{...studentConversationNav};
    NAV.workbench=mentorRole()?{title:'服务工作台'}:{...studentWorkbenchNav};
    originalRender();renderMentorTabs();
  };
  go=function(hash){
    if(mentorRole()){
      if(hash==='#/mentorHome')hash='#/messages';
      if(hash==='#/providers')hash=S.providerView==='saved'?'#/mentorPeers':'#/mentorMarket';
      if(['#/admin','#/dataCenter'].includes(hash))hash='#/mentorPeers';
    }
    return originalGo(hash);
  };
  back=function(){
    if(mentorRole()){
      const key=routeKey();
      if(key==='mentorAuth')return go('#/choose');
      if(key==='mentorSku')return go('#/mentorMarket');
      if(key==='provider')return go('#/mentorPeers');
      if(key==='sku')return go('#/mentorMarket');
      if(['providers','mentorProfile','workbench','mentorPeers','mentorOrders'].includes(key))return go('#/mentorMe');
      return go('#/messages');
    }
    return originalBack();
  };
  window.selectTongluRole=function(role){originalSelectRole(role);if(role==='student'&&window.TongluPreview?.enabled)go('#/home');if(role==='mentor'){hydrateProfile();go(store.auth()?(store.profile().registered?'#/messages':'#/mentorProfile'):'#/mentorAuth');}};
  window.addEventListener('storage',event=>{if(Object.values(store.KEYS).includes(event.key)||event.key===null){loadedMentorId='';render();}});
  if(mentorRole())render();
})();
