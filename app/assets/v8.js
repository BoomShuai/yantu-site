/* 同路 V8.1 · 服务者详情 / 会话 / 我的 / 服务者建档体验优化
 * 基于 11.14 正式站 web/app。所有会话和资料仍为本机原型，不冒充真实消息或订单。
 */
(function(){
  'use strict';
  const T=window.__TL;
  if(!T || !window.__TLV4) return;
  const esc=(v)=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const CHAT_KEY='tonglu-v4-local-consultations';
  const ACTIVE_KEY='tonglu-v8-active-conversation';
  const STEP_KEY='tonglu-v8-mentor-step';
  let mentorStep=0;
  try{mentorStep=Math.max(0,Math.min(3,Number(localStorage.getItem(STEP_KEY)||0)));}catch(_){}
  const providers=()=>M.providers||[];
  const consults=()=>T.consults();
  const getProvider=id=>providers().find(p=>p.id===id);
  const activeId=()=>{try{return sessionStorage.getItem(ACTIVE_KEY)||localStorage.getItem(ACTIVE_KEY)||'';}catch(_){return '';}};
  const setActive=id=>{try{sessionStorage.setItem(ACTIVE_KEY,id);localStorage.setItem(ACTIVE_KEY,id);}catch(_){}};
  const currentChat=()=>consults().find(c=>c.id===activeId())||null;
  const persistChats=()=>{try{localStorage.setItem(CHAT_KEY,JSON.stringify(consults().slice(0,60)));return true;}catch(e){toast('本机存储不可用，消息没有保存');return false;}};
  const saveMentor=patch=>T.persistMentor(patch);
  const draft=()=>T.mentorDraft||{};
  const MBTI_KEY='tonglu-v8-provider-mbti';
  let savedProviderMbti={};
  try{savedProviderMbti=JSON.parse(localStorage.getItem(MBTI_KEY)||'{}')||{};}catch(_){}
  function applySavedProviderMbti(){
    providers().forEach(p=>{if(savedProviderMbti[p.id])p.mbti=savedProviderMbti[p.id];});
  }
  applySavedProviderMbti();
  function syncDraftMbti(){
    const d=draft(), name=String(d.name||'').trim(), mbti=String(d.mbti||'').trim();
    if(!name||!mbti)return;
    // 仅当服务者填写的展示姓名与本地演示档案完全一致时才关联，不猜测身份。
    const matches=providers().filter(p=>String(p.name||'').trim()===name);
    if(!matches.length)return;
    matches.forEach(p=>{p.mbti=mbti;savedProviderMbti[p.id]=mbti;});
    try{localStorage.setItem(MBTI_KEY,JSON.stringify(savedProviderMbti));}catch(_){}
  }

  /* 服务者详情：删除独立的核验依据/可信度说明；保留实际履历与服务信息。 */
  const oldProvider=PAGES.provider;
  PAGES.provider=function(){
    let html=oldProvider();
    html=html.replace(/<details class="v4-fold"[^>]*><summary>核验依据（可展开）<\/summary>[\s\S]*?<\/details>/,'');
    html=html.replace(/<p class="v4-note">身份核验不等于能力认证；方案范围、价格与交付时间以确认页为准。<\/p>/,'<p class="v4-note">方案范围、价格与交付时间以确认页为准。</p>');
    html=html.replace('<span>MBTI</span>','<span>MBTI 性格类型</span>');
    return html;
  };

  /* 服务者入驻：四步引导；简历/文字/语音入口收进可折叠的辅助录入区。 */
  const MBTI=['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'];
  const mentorSteps=[
    {title:'基本信息',sub:'先让学生认识你',fields:['name','mbti','bio']},
    {title:'教育背景',sub:'填写真实的本科与升学经历',fields:['school','major','destination']},
    {title:'服务',sub:'选择并说明你能提供的具体服务',fields:['services','slots']},
    {title:'经历与成果',sub:'说明服务过什么样的学生、提供过哪些帮助以及实际结果',fields:['achievements','servedTypes','served','results','experience','cases']}
  ];
  const fieldMeta={
    name:['展示姓名或称呼','input','例如：陈同学'],
    mbti:['MBTI 性格类型','select',''],
    bio:['个人简介','textarea','简单介绍你的学习经历和沟通风格'],
    school:['本科院校','input','例如：天津大学'],
    major:['本科专业','input','例如：金融学'],
    destination:['升学去向','input','例如：复旦大学金融专硕'],
    services:['可提供的服务','textarea','例如：简历结构优化、面试模拟、科研项目梳理、学科竞赛辅导、院校定位与保研规划'],
    slots:['每周期可接待人数','select',''],
    achievements:['科研 / 竞赛成果','textarea','请填写项目、论文、竞赛及个人贡献'],
    servedTypes:['服务对象背景（请脱敏）','textarea','例如：统计、计算机等专业；双非/一本背景；大二至大三学生'],
    served:['历史辅导人数（个人申报）','input','例如：曾辅导 5 位同学'],
    results:['历史辅导结果（个人申报）','textarea','说明辅导内容及已知结果，不要夸大或承诺录取'],
    experience:['个人辅导经验','textarea','你通常如何帮助学生？有哪些方法和心得？'],
    cases:['典型服务案例（请脱敏）','textarea','描述学生原始需求、你提供的帮助和交付内容']
  };
  function mentorControl(id,d){
    const [label,type,placeholder]=fieldMeta[id];
    const value=d[id]||'';
    if(id==='mbti'){
      return '<label class="v8-field"><span>'+label+'</span><select name="mbti" onchange="tlV8MentorField(\'mbti\',this.value)"><option value="">暂不填写</option>'+MBTI.map(v=>'<option value="'+v+'"'+(value===v?' selected':'')+'>'+v+'</option>').join('')+'</select><small>仅用于了解沟通偏好，不作为服务能力或推荐排序依据。</small></label>';
    }
    if(id==='slots'){
      const opts=['0','1','2','3','4','5'];
      return '<label class="v8-field"><span>'+label+'</span><select name="slots" onchange="tlV8MentorField(\'slots\',this.value)">'+opts.map(v=>'<option value="'+v+'"'+(String(value||'3')===v?' selected':'')+'>'+v+' 人</option>').join('')+'</select></label>';
    }
    const attr=' oninput="tlV8MentorField(\''+id+'\',this.value)"';
    if(type==='textarea')return '<label class="v8-field"><span>'+label+'</span><textarea name="'+id+'" rows="'+(id==='bio'?3:4)+'" maxlength="'+(id==='bio'?300:1000)+'" placeholder="'+placeholder+'"'+attr+'>'+esc(value)+'</textarea></label>';
    return '<label class="v8-field"><span>'+label+'</span><input name="'+id+'" maxlength="120" placeholder="'+placeholder+'" value="'+esc(value)+'"'+attr+' /></label>';
  }
  function mentorFiles(){
    const st=window.__TLV5&&window.__TLV5.getState?window.__TLV5.getState().mentor:null;
    if(!st||!st.files||!st.files.length)return '<small class="v8-muted">尚未上传简历。</small>';
    return '<div class="v8-file-list">'+st.files.map(f=>'<div><b>'+esc(f.name)+'</b><small>'+esc(f.status||'已添加')+'</small></div>').join('')+'</div>';
  }
  function aiImportBox(){
    const st=window.__TLV5&&window.__TLV5.getState?window.__TLV5.getState().mentor:null;
    const text=st&&st.text?st.text:'';
    return '<details class="v8-ai-import"><summary><span>简历 / 文字 / 语音辅助录入</span><small>可选 · 不影响逐步填写</small></summary>'+
      '<p>可以先写一段经历、上传简历或语音口述，系统会把识别结果填入下方资料草稿。当前使用本地解析规则，不调用真实大模型。</p>'+
      '<label class="v8-field"><span>自由描述</span><textarea id="v5-mentor-text" rows="4" maxlength="12000" placeholder="例如：本科院校、专业、保研去向、科研竞赛、辅导经历……" oninput="v5KeepText(\'mentor\',this.value)">'+esc(text)+'</textarea></label>'+
      '<div class="v8-ai-actions"><button type="button" onclick="v5Voice(\'mentor\')">语音转文字</button><label class="v8-upload">上传 PDF / Word / TXT<input type="file" accept=".pdf,.docx,.txt,.md" multiple onchange="v5ChooseFiles(\'mentor\',event)"></label></div>'+
      mentorFiles()+
      '<button type="button" class="v8-ai-primary" onclick="tlV8ImportMentor()">整理并填入资料</button>'+
      '<small class="v8-muted">文件在本机浏览器解析；未经本人确认的内容不会用于正式资料展示。学历、成果和辅导结果仍需另行核验。</small></details>';
  }
  function mentorWizard(){
    if(T.role!=='mentor')return '<div class="page tl-v2-page"><p>请切换到服务者身份后完善资料。</p></div>';
    const d=draft(), step=mentorSteps[mentorStep]||mentorSteps[0];
    const progress=mentorSteps.map((x,i)=>'<span class="'+(i<mentorStep?'done':i===mentorStep?'active':'')+'"></span>').join('');
    const tabs=mentorSteps.map((x,i)=>'<button type="button" class="'+(i===mentorStep?'active':i<mentorStep?'done':'')+'" onclick="tlV8MentorGo('+i+')"><b>'+(i<mentorStep?'✓':'0'+(i+1))+'</b><small>'+x.title+'</small></button>').join('');
    const intro=mentorStep===3?'<div class="v8-declaration">请说明服务对象的专业、年级或背景类型（不要填写可识别学生身份的信息），再补充辅导人数、实际提供的帮助和结果。没有历史辅导经历可如实填写“暂无”。辅导人数、服务结果和案例均为个人申报内容；平台真实订单次数未来由后台自动统计，不由个人手填认证。</div>':'';
    return '<div class="page tl-v2-page v8-mentor-wizard"><div class="v4-kicker">MENTOR PROFILE · STEP BY STEP</div>'+
      '<h1 class="v4-h1">完善服务者资料</h1><p class="v4-sub">分步骤填写，随时保存。资料将用于个人展示与服务方向筛选。</p>'+
      '<div class="v8-step-progress">'+progress+'</div><nav class="v8-step-tabs" aria-label="服务者资料步骤">'+tabs+'</nav>'+
      '<section class="v8-step-card"><div class="v8-step-title"><div><small>STEP 0'+(mentorStep+1)+' / 04</small><h2>'+step.title+'</h2><p>'+step.sub+'</p></div><span>'+(mentorStep+1)+'/4</span></div>'+
      (mentorStep===0?aiImportBox():'')+
      '<div class="v8-step-fields">'+step.fields.map(id=>mentorControl(id,d)).join('')+'</div>'+intro+
      '<div class="v8-step-actions">'+(mentorStep>0?'<button type="button" class="v8-btn secondary" onclick="tlV8MentorGo('+(mentorStep-1)+')">上一步</button>':'<button type="button" class="v8-btn secondary" onclick="go(\'#/mentorMe\')">稍后填写</button>')+
      (mentorStep<3?'<button type="button" class="v8-btn primary" onclick="tlV8MentorGo('+(mentorStep+1)+')">下一步 →</button>':'<button type="button" class="v8-btn primary" onclick="tlV8MentorSave()">保存服务者资料</button>')+'</div></section>'+
      '<p class="v8-footnote">所有资料保存在当前浏览器。平台核验、真实订单和跨设备同步需后续接入后台。</p></div>';
  }
  window.tlV8MentorField=function(id,value){
    if(!fieldMeta[id])return;
    const patch={};patch[id]=String(value||'').trim().slice(0,id==='bio'?300:1000);
    saveMentor(patch);
  };
  function validateMentorStep(n){
    const d=draft();
    if(n===0&&!String(d.name||'').trim()){toast('先填写展示姓名或称呼');return false;}
    if(n===1&&(!String(d.school||'').trim()||!String(d.major||'').trim())){toast('请先填写本科院校和专业');return false;}
    if(n===2&&!String(d.services||'').trim()){toast('请填写至少一项擅长辅导方向');return false;}
    return true;
  }
  window.tlV8MentorGo=function(n){
    if(!Number.isInteger(n)||n<0||n>3)return;
    if(n>mentorStep){for(let i=mentorStep;i<n;i++){if(!validateMentorStep(i))return;}}
    mentorStep=n;try{localStorage.setItem(STEP_KEY,String(n));}catch(_){}
    render();
  };
  window.tlV8MentorSave=function(){
    const d=draft();
    for(let i=0;i<3;i++){if(!validateMentorStep(i))return;}
    if(!Object.values(d).some(v=>String(v||'').trim())){toast('请至少填写一项服务者资料');return;}
    saveMentor({...d,updatedAt:new Date().toISOString(),declared:true});
    syncDraftMbti();
    toast('服务者资料已保存为个人申报');
    go('#/mentorMe');
  };
  window.tlV8ImportMentor=function(){
    const box=document.getElementById('v5-mentor-text');
    if(box&&box.value&&window.v5KeepText)window.v5KeepText('mentor',box.value);
    if(!window.v5Analyze||!window.__TLV5){toast('资料整理模块尚未加载');return;}
    window.v5Analyze('mentor',{silent:true});
    const st=window.__TLV5.getState().mentor;
    const f=st&&st.fields||{};
    const patch={};
    ['name','mbti','school','major','destination','services','servedTypes','served','results','experience','cases'].forEach(k=>{if(f[k])patch[k]=String(f[k]).slice(0,k==='experience'||k==='cases'||k==='results'||k==='services'||k==='servedTypes'?1000:150);});
    if(f.achievements)patch.achievements=String(f.achievements).slice(0,1000);
    const bio=[f.achievements,f.experience].filter(Boolean).join('；');
    if(bio)patch.bio=bio.slice(0,300);
    if(!Object.keys(patch).length){toast('暂未识别出可填入的资料，请补充文字或简历');return;}
    saveMentor(patch);render();toast('已将识别结果填入资料步骤，请检查并修改');
  };
  PAGES.mentorProfile=mentorWizard;

  /* 我的：把消息提升为第一组快捷入口，保留原有收藏、投递、规划、经验库与数据管理。 */
  const oldMe=PAGES.me;
  window.tlV8ScrollPlan=function(){
    const cards=[...document.querySelectorAll('.tl-v3-card')];
    const target=cards.find(el=>/MY ROADMAP|我的行动时间线/.test(el.textContent||''))||document.querySelector('.tl-v3-empty-plan');
    if(target)target.scrollIntoView({behavior:'smooth',block:'start'});else toast('请先完善个人 BG，生成行动计划');
  };
  PAGES.me=function(){
    let html=oldMe();
    if(T.role!=='student')return html;
    const bg=T.bg||{}, goals=Array.isArray(bg.goals)?bg.goals:[];
    const consultations=consults().length;
    const ready=!!(T.profileReady&&T.profileReady());
    const banner='<section class="v8-profile-banner"><div class="v8-profile-avatar">同</div><div class="v8-profile-copy"><b>学生个人档案</b><small>'+esc([bg.grade,...goals].filter(Boolean).join(' · ')||'完善 BG，开启个性化服务')+'</small><span class="v8-profile-state '+(ready?'ready':'')+'">'+(ready?'资料已确认':'资料待完善')+'</span></div><button onclick="go(\'#/profile\')">编辑 ›</button></section>';
    const shortcuts='<section class="v8-my-shortcuts-wrap"><div class="v8-shortcuts-title"><b>常用功能</b><small>个人申请与服务入口</small></div><div class="v8-my-shortcuts">'+
      '<button onclick="go(\'#/messages\')"><span class="v8-shortcut-icon">✉</span><b>消息中心</b><small>'+consultations+' 个咨询会话</small></button>'+
      '<button onclick="tlV8ScrollPlan()"><span class="v8-shortcut-icon">▤</span><b>行动计划</b><small>查看成长任务</small></button>'+
      '<button onclick="S.schoolView=\'saved\';go(\'#/school\')"><span class="v8-shortcut-icon">☆</span><b>院校收藏</b><small>已收藏院校</small></button>'+
      '<button onclick="S.providerView=\'saved\';go(\'#/providers\')"><span class="v8-shortcut-icon">♡</span><b>服务者收藏</b><small>已收藏服务者</small></button></div></section>';
    html=html.replace(/<section class="tl-v3-card"><h3>消息与咨询<\/h3>[\s\S]*?<\/section>/,'');
    const marker='<span class="tl-v3-gold-label">学生体验</span></div>';
    if(html.includes(marker))html=html.replace(marker,marker+banner+shortcuts);
    else html=html.replace('<div class="page tl-v2-page tl-v3-my">','<div class="page tl-v2-page tl-v3-my">'+banner+shortcuts);
    return html;
  };
  const oldMentorMe=PAGES.mentorMe;
  PAGES.mentorMe=function(){
    let html=oldMentorMe();
    if(T.role!=='mentor')return html;
    const d=draft();
    const shortcuts='<section class="v8-my-shortcuts mentor"><button onclick="go(\'#/messages\')"><span class="v8-shortcut-icon">✉</span><b>消息中心</b><small>查看咨询消息</small></button><button onclick="go(\'#/mentorDemands\')"><span class="v8-shortcut-icon">⌕</span><b>学生需求</b><small>浏览适配需求</small></button><button onclick="go(\'#/workbench\')"><span class="v8-shortcut-icon">▤</span><b>服务工作台</b><small>查看服务管理</small></button><button onclick="S.providerView=\'saved\';go(\'#/providers\')"><span class="v8-shortcut-icon">♡</span><b>服务者收藏</b><small>已收藏同行</small></button></section>';
    html=html.replace(new RegExp("<button class=\"tl-v2-link-row\" onclick=\"go\\('#/messages'\\)\">消息中心 <span>暂未接入真实咨询 ›</span></button>"),"");
    const marker='<p class="tl-v2-sub">服务者也可以浏览其他同行的公开资料；收藏不会影响排序。</p>';
    if(html.includes(marker))html=html.replace(marker,marker+'<div class="v8-mentor-summary"><b>'+esc(d.name||'完善你的服务者资料')+'</b><small>'+esc([d.school,d.major,d.destination,d.mbti].filter(Boolean).join(' · ')||'个人履历尚未完善')+'</small><button onclick="go(\'#/mentorProfile\')">编辑资料 ›</button></div>'+shortcuts);
    return html;
  };

  /* 微信 / 闲鱼式聊天：会话按服务者区分；本机保存，不伪装为真实发送。 */
  window.openTongluConversation=function(id){const c=consults().find(x=>x.id===id);if(!c){toast('没有找到该会话');return;}setActive(id);go('#/conversation');};
  window.startTongluConsult=function(providerId){
    if(T.role!=='student'){toast('请以学生身份开始咨询');return;}
    const p=getProvider(providerId);if(!p){toast('没有找到该服务者');return;}
    let c=consults().find(x=>x.providerId===providerId);
    if(!c){c={id:'chat-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),providerId,entries:[],updatedAt:new Date().toISOString()};consults().unshift(c);}
    setActive(c.id);persistChats();go('#/conversation');
  };
  window.tlV8SendMessage=function(event){
    event.preventDefault();
    const c=currentChat();if(!c){toast('会话不存在，请返回服务者详情重新发起');return;}
    const field=event.target.elements.message;
    const text=String(field&&field.value||'').trim().slice(0,500);
    if(!text)return;
    c.entries=Array.isArray(c.entries)?c.entries:[];
    c.entries.push({text,who:T.role==='mentor'?'mentor':'me',at:new Date().toISOString(),status:'本机保存'});
    c.updatedAt=new Date().toISOString();
    if(persistChats()){render();const log=document.querySelector('.v8-chat-log');if(log)log.scrollTop=log.scrollHeight;}
  };
  window.tlV8Appointment=function(){
    const c=currentChat(),p=c&&getProvider(c.providerId);
    if(!p){toast('服务者信息不存在');return;}
    if(typeof remain==='function'&&remain(p)===0){toast('该服务者当前名额已满');return;}
    if(!p.services||!p.services.length){toast('该服务者暂未配置可预约项目');return;}
    if(typeof v4Book==='function')v4Book(p.id,0);else toast('预约页面暂不可用');
  };
  window.tlV8Phone=function(){
    const c=currentChat(),p=c&&getProvider(c.providerId);
    if(!p){toast('服务者信息不存在');return;}
    if(p.phone){location.href='tel:'+String(p.phone).replace(/[^0-9+]/g,'');return;}
    toast('该服务者暂未公开电话，请先通过预约服务确认沟通方式');
  };
  PAGES.messages=function(){
    const list=consults().slice().sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
    if(T.role==='mentor'){
      const threads=list.map(c=>{
        const p=getProvider(c.providerId),last=(c.entries||[]).slice(-1)[0];
        return '<button class="v8-thread" onclick="openTongluConversation(\''+esc(c.id)+'\')"><span class="v8-thread-avatar">学</span><span class="v8-thread-main"><b>学生咨询 · '+esc(p&&p.name||'服务者')+'</b><small>'+esc(last&&last.text||'已建立本机演示会话')+'</small></span><span class="v8-thread-meta"><small>'+(c.entries||[]).length+' 条</small>›</span></button>';
      }).join('');
      return '<div class="page tl-v2-page v8-message-page"><div class="v4-kicker">MESSAGES</div><h1 class="v4-h1">消息中心</h1><p class="v4-sub">查看学生发起的咨询。当前仅展示同一浏览器中的本机演示会话。</p>'+(threads?'<div class="v8-thread-list">'+threads+'</div>':'<div class="v8-empty"><b>暂时没有学生咨询</b><p>正式上线后，学生发起咨询并授权后，消息会同步到服务者账号。</p><button onclick="go(\'#/mentorDemands\')">查看学生需求 ›</button></div>')+'<p class="v8-footnote">当前没有连接真实消息后台，不能跨设备接收消息或向真实学生发送内容。</p></div>';
    }
    const tab=window.__tlV8MsgTab||'咨询';
    const tabs=['咨询','订单','系统'];
    const body=tab==='咨询'?(list.length?list.map(c=>{
      const p=getProvider(c.providerId),last=(c.entries||[]).slice(-1)[0];
      return '<button class="v8-thread" onclick="openTongluConversation(\''+esc(c.id)+'\')"><span class="v8-thread-avatar">'+esc((p&&p.name||'服').slice(0,1))+'</span><span class="v8-thread-main"><b>'+esc(p&&p.name||'服务者')+'</b><small>'+esc(last&&last.text||'已建立咨询会话')+'</small></span><span class="v8-thread-meta"><small>'+(c.entries||[]).length+' 条</small>›</span></button>';
    }).join(''):'<div class="v8-empty"><b>还没有咨询消息</b><p>进入服务者详情，点击咨询即可开始一段独立会话。</p><button onclick="go(\'#/providers\')">去找服务者 ›</button></div>'):'<div class="v8-empty"><b>'+ (tab==='订单'?'暂无订单消息':'暂无系统消息')+'</b><p>正式消息和订单通知需要后端服务支持。</p></div>';
    return '<div class="page tl-v2-page v8-message-page"><div class="v4-kicker">MESSAGES</div><h1 class="v4-h1">消息中心</h1><p class="v4-sub">咨询、订单与系统通知集中在这里。</p><div class="v8-message-tabs">'+tabs.map(t=>'<button class="'+(tab===t?'active':'')+'" onclick="tlV8MessageTab(\''+t+'\')">'+t+'</button>').join('')+'</div><div class="v8-thread-list">'+body+'</div><p class="v8-footnote">当前为本机交互原型，消息仅保存在当前浏览器，不会发送给真实服务者。</p></div>';
  };
  window.tlV8MessageTab=function(tab){window.__tlV8MsgTab=['咨询','订单','系统'].includes(tab)?tab:'咨询';render();};
  PAGES.conversation=function(){
    const c=currentChat();
    if(!c)return '<div class="page tl-v2-page v8-chat-page"><div class="v8-empty"><b>没有找到这段会话</b><button onclick="go(\'#/messages\')">返回消息中心</button></div></div>';
    const p=getProvider(c.providerId),name=T.role==='mentor'?'学生咨询':(p&&p.name||'服务者'),brief=T.role==='mentor'?'来自学生的咨询 · 本机演示':(p&&p.brief||'同路服务者');
    const entries=(c.entries||[]).map(e=>{
      const incoming=T.role==='mentor'?(e.who!=='mentor'):(e.who==='mentor'||e.from==='mentor');
      const time=e.at?new Date(e.at).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}):'';
      const avatar=T.role==='mentor'?'学':name.slice(0,1);
      return '<div class="v8-chat-row '+(incoming?'incoming':'outgoing')+'">'+(!incoming?'<span class="v8-chat-bubble">'+esc(e.text)+'<small class="v8-chat-time">'+esc(time)+'</small></span>':'<span class="v8-chat-avatar">'+esc(avatar)+'</span><span class="v8-chat-bubble">'+esc(e.text)+'<small class="v8-chat-time">'+esc(time)+'</small></span>')+'</div>';
    }).join('');
    const actions=T.role==='mentor'?'':'<div class="v8-chat-actions"><button onclick="tlV8Appointment()">▣ 立即预约服务</button><button onclick="tlV8Phone()">☎ 电话咨询</button></div>';
    const note=T.role==='mentor'?'当前为本机双身份演示会话，回复仅保存在本机，不会发送给真实学生。':'当前为本地聊天演示。发送内容仅保存在本机，尚未送达服务者。';
    const placeholder=T.role==='mentor'?'回复学生消息…':'发送消息…';
    return '<div class="page tl-v2-page v8-chat-page"><header class="v8-chat-header"><button class="v8-chat-back" onclick="go(\'#/messages\')" aria-label="返回">‹</button><span class="v8-thread-avatar">'+esc(T.role==='mentor'?'学':name.slice(0,1))+'</span><span class="v8-chat-person"><b>'+esc(name)+'</b><small>'+esc(brief)+'</small></span>'+(T.role==='mentor'?'':'<button class="v8-chat-more" onclick="tlV8Phone()">电话</button>')+'</header>'+
      actions+
      '<div class="v8-chat-note">'+note+'</div>'+
      '<div class="v8-chat-log">'+(entries||'<div class="v8-chat-empty">你好，可以在这里记录想向 '+esc(name)+' 咨询的问题。<br>你也可以先预约服务，或使用电话咨询入口。</div>')+'</div>'+
      '<form class="v8-chat-compose" onsubmit="tlV8SendMessage(event)"><textarea name="message" rows="1" maxlength="500" placeholder="'+placeholder+'" aria-label="发送消息" oninput="this.style.height=&quot;auto&quot;;this.style.height=Math.min(this.scrollHeight,110)+&quot;px&quot;" required></textarea><button type="submit" aria-label="发送">↑</button></form></div>';
  };

  /* 本轮页面使用内置 composer / wizard，隐藏原有页面底部动作栏。 */
  const oldActionbar=actionbar;
  actionbar=function(name){if(['messages','conversation','mentorProfile'].includes(name))return '';return oldActionbar(name);};
  NAV.messages={title:'消息中心'};
  NAV.conversation={title:'聊天'};
  NAV.mentorProfile={title:'服务者资料'};
})();
