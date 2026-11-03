/* 同路 · 紫金三身份 V3 | 独立于原壹/贰业务脚本的体验增强层
   注意：仅交互演示，无真实登录、AI调用、学生匹配或后台订单统计。
*/
(function () {
  'use strict';
  const K = 'tonglu-role-v3-mentor-draft';
  let role = null;
  let planPrefill = '';
  let mentorFilter = '全部';
  const messages = [];
  const stubMentor = {name:'',school:'',major:'',destination:'',services:'材料诊断、专业方向咨询',bio:'',slots:'3'};
  let mentorDraft = {...stubMentor};
  try {mentorDraft = {...stubMentor,...JSON.parse(localStorage.getItem(K)||'{}')};} catch (_) {}
  const PROFILE_KEY = 'tonglu-v3-student-bg';
  const TASK_KEY = 'tonglu-v3-plan-tasks';
  const DEFAULT_PROFILE = {raw:'',grade:'',goals:[],confirmed:false,updatedAt:''};
  let studentBG={...DEFAULT_PROFILE};
  let planTasks={};
  try { const data=JSON.parse(localStorage.getItem(PROFILE_KEY)||'{}'); if(data&&typeof data==='object')studentBG={...DEFAULT_PROFILE,...data}; } catch (_) {}
  try { const data=JSON.parse(localStorage.getItem(TASK_KEY)||'{}'); if(data&&typeof data==='object')planTasks=data; } catch (_) {}
  let planCategory = '全部';
  let chatBusy = false;
  let lastNavFrom = '';
  const savedListScroll = {school:0,providers:0};
  let messageView = '咨询';
  let activeConversation = null;
  const CHAT_KEY = 'tonglu-v4-local-consultations';
  let consults = [];
  try {const v=JSON.parse(localStorage.getItem(CHAT_KEY)||'[]');if(Array.isArray(v)) consults=v.filter(x=>x&&typeof x==='object').slice(0,60);}catch(_){}
  let chatSerial = 0;
  function persistBG(){try{localStorage.setItem(PROFILE_KEY,JSON.stringify(studentBG));return true;}catch(e){toast('本地存储不可用，资料可能不会保留');return false;}}
  function persistPlans(){try{localStorage.setItem(TASK_KEY,JSON.stringify(planTasks));return true;}catch(e){toast('本地存储不可用，进度可能不会保留');return false;}}
  function detectGrade(text){const x=String(text).match(/(?:大|本科)\s*([一二三四五12345])/);if(!x)return '';return {1:'大一',2:'大二',3:'大三',4:'大四',5:'大五','一':'大一','二':'大二','三':'大三','四':'大四','五':'大五'}[x[1]]||'';}
  function detectGoals(text){const goals=[];const v=String(text);if(/保研|推免|夏令营|预推免|申请院校|升学/.test(v))goals.push('保研');if(/竞赛|比赛|数学建模|建模|挑战杯|大创|互联网\+|蓝桥杯/.test(v))goals.push('竞赛');if(/科研|研究|课题|论文|实验室/.test(v))goals.push('科研');if(/学习|英语|四六级|绩点|课程/.test(v))goals.push('学业');return goals;}
  function hasBackground(text){return /大学|学院|高校|本科|专业|学校|绩点|排名|科研|竞赛|大创|\bGPA\b/i.test(text)&&text.trim().length>=10;}
  function profileReady(){return !!studentBG.confirmed && !!studentBG.grade && studentBG.goals.length>0 && hasBackground(studentBG.raw);}
  function inferNextQuestion(){
    if(!hasBackground(studentBG.raw))return '先随意介绍一下你的学校、专业或经历吧，不需要按固定表格填写。';
    if(!studentBG.grade)return '收到。你现在大几？例如大一、大二或大三，这会影响行动计划的阶段。';
    if(!studentBG.goals.length)return '你目前主要想实现什么目标？可以是保研、竞赛、科研，也可以同时有几个目标。';
    return '我已整理出你提供的背景和目标。请检查下面的文字，确认后才会开启服务者优先推荐和个人时间计划；也可以继续补充。';
  }
  function handleStudentBG(value){
    if(studentBG.confirmed){return '这是本地演示对话，已保存的 BG 不会被随口提问覆盖。要更新资料，请到「我的」选择重新整理 BG。真实分析需接入大模型与可靠数据。';}
    if(/^(你好|您好|在吗|hi|hello|嗨)[!！。\s]*$/i.test(value))return '你好！你可以自由描述当前背景和诉求，例如「我是某大学统计专业大二，想保研，也在准备数学建模竞赛」。';
    studentBG.raw=(studentBG.raw ? studentBG.raw+'\n' : '')+value;
    studentBG.raw=studentBG.raw.slice(-3500);
    studentBG.grade=detectGrade(value)||studentBG.grade||detectGrade(studentBG.raw);
    studentBG.goals=[...new Set([...(studentBG.goals||[]),...detectGoals(value)])];
    studentBG.updatedAt=new Date().toISOString();persistBG();
    return inferNextQuestion();
  }
  function aiMessagesHtml(){
    return messages.slice(-18).map(m=>`<div class="tl-v2-msg ${m.who==='me'?'mine':'bot'}">${H(m.text)}</div>`).join('');
  }
  function profileConfirmInline(){
    if(role!=='student')return '';
    const readyDraft=hasBackground(studentBG.raw)&&!!studentBG.grade&&studentBG.goals.length>0;
    if(studentBG.confirmed)return `<div class="tl-v3-confirmed"><span>✓ 档案已确认 · ${H(studentBG.grade)} · ${H(studentBG.goals.join(' / '))}</span><button onclick="go('#/me')">到「我的」看计划 ›</button></div>`;
    if(!studentBG.raw)return '';
    return `<div class="tl-v3-check"><small>待确认的个人信息（仅本机保存）</small><p>${H(studentBG.raw)}</p><div class="tl-v3-check-tags"><span>${H(studentBG.grade||'年级待补充')}</span><span>${H(studentBG.goals.join(' / ')||'目标待补充')}</span></div><button ${readyDraft?'':'disabled'} onclick="confirmTongluBG()">${readyDraft?'确认 BG 与诉求，开启个性化规划':'补充年级 / 目标后可确认'}</button><small>AI 追问为本地规则演示，不是真实大模型推理。请勿填写真实敏感信息。</small></div>`;
  }

  const H = (s) => escapeTL(s);
  const goRole = (r) => { role = r; document.body.dataset.role = r; if(r==='student')go('#/home'); else if(r==='mentor')go('#/mentorHome'); else go('#/guestHome'); };
  const roleName = () => ({student:'学生体验',mentor:'服务者体验',guest:'游客体验'}[role]||'选择身份');
  const origRender = render;
  const origActionbar = actionbar;
  const origHome = pageHome;
  const origSaved = schoolSavedView;
  const origRecords = schoolRecordsView;
  const origOpenDrawer = openDrawer;
  function demoLabel(){return '<span class="tl-v2-demo">交互演示 · 非真实登录</span>';}

  function roleChoose(){
    return `<section class="tl-role-chooser">
      <div class="tl-role-identity"><img src="assets/tonglu-logo.svg" alt="同路 Logo" /><span>同 路</span><small>与你并肩，走向理想院校</small></div>
      <h1>请选择你的体验身份</h1><p>三个入口，一段共同的保研旅程。</p>
      ${[['student','学生','建立个人档案 · AI 辅助规划','graduation-cap'],['mentor','服务者','完善履历与服务 · 查看学生需求','users'],['guest','游客','先看看平台有什么，再决定是否加入','compass']].map(([r,n,d,i])=>`<button class="tl-role-card" onclick="selectTongluRole('${r}')"><span class="tl-role-icon">${r==='student'?'✦':r==='mentor'?'◇':'◌'}</span><span><b>${n}</b><small>${d}</small></span><span class="tl-role-arrow">›</span></button>`).join('')}
      <p class="tl-role-legal">目前只切换演示角色，不验证账号身份、不提交个人资料至服务器。正式上线需要角色鉴权和数据保护。</p>
    </section>`;
  }

  function introAI(){
    const isGuest=role==='guest';const isMentor=role==='mentor';
    const hint=isGuest?'可以问我保研的基本流程、材料与常识。游客不提供个人匹配。':isMentor?'可以问我如何梳理辅导方向、设计服务流程；学生需求在「我的」工作台查看。':'直接说说你的背景与诉求。我会根据已知信息逐个补问，等你确认后再开启个性化功能。';
    return `<section class="tl-v3-ai">
      <div class="tl-v3-chatlog" id="tl-v2-chat" aria-live="polite">${messages.length?aiMessagesHtml():`<div class="tl-v3-welcome"><div class="tl-v3-orb">✦</div><h1>你好，欢迎来到同路</h1><p>${hint}</p></div>`}</div>
      ${profileConfirmInline()}
      <form class="tl-v3-form" onsubmit="sendTongluChat(event)"><textarea id="tl-v2-chat-input" maxlength="800" rows="2" aria-label="给同路 AI 助手输入消息" placeholder="${isGuest?'问问保研流程…':isMentor?'询问服务规划…':'自由描述你的 BG、目标或困惑…'}" required></textarea><button type="submit" aria-label="发送">↑</button></form>
      <div class="tl-v3-disclaimer">未接入真实大模型 · 不作院校录取预测 · 请勿输入敏感个人信息</div>
    </section>`;
  }
  function aiOnlyHome(){return `<div class="page tl-v3-home">${introAI()}</div>`;}
  function studentHome(){return aiOnlyHome();}
  function mentorHome(){return aiOnlyHome();}
  function guestHome(){return aiOnlyHome();}

    /* 三位额外的虚构供给侧样例，只用于让不同专业用户观察推荐布局。
     不是平台已招募或已核验的服务者。 */
  const EXTRA_MENTORS = [
    {id:'demo-stat',name:'许同学（演示）',verified:false,brief:'应用统计 / 数学建模方向 · 资料待核验',tags:['应用统计','数学建模','科研经历梳理','申请材料'],capacity:{u:3,l:1,h:0},check:[{k:'学历及去向',v:'演示资料 · 待核验'},{k:'辅导经验',v:'演示资料 · 待核验'}],services:[{name:'竞赛与研究经历梳理',desc:'内容和价格以实际服务方案为准',price:0}],rating:{score:'—',count:0},review:{text:'演示评价占位 · 暂无真实用户评价',meta:'请以正式核验记录为准'}},
    {id:'demo-ai',name:'唐同学（演示）',verified:false,brief:'计算机 / 人工智能方向 · 资料待核验',tags:['计算机','人工智能','科研经历梳理','竞赛材料'],capacity:{u:3,l:1,h:0},check:[{k:'学历及去向',v:'演示资料 · 待核验'},{k:'辅导经验',v:'演示资料 · 待核验'}],services:[{name:'AI 项目和竞赛材料整理',desc:'内容和价格以实际服务方案为准',price:0}],rating:{score:'—',count:0},review:{text:'演示评价占位 · 暂无真实用户评价',meta:'请以正式核验记录为准'}},
    {id:'demo-finance',name:'林同学（演示）',verified:false,brief:'金融商科 / 申请材料方向 · 资料待核验',tags:['金融','商科','材料诊断','面试辅导'],capacity:{u:3,l:1,h:0},check:[{k:'学历及去向',v:'演示资料 · 待核验'},{k:'辅导经验',v:'演示资料 · 待核验'}],services:[{name:'金融方向材料诊断',desc:'内容和价格以实际服务方案为准',price:0}],rating:{score:'—',count:0},review:{text:'演示评价占位 · 暂无真实用户评价',meta:'请以正式核验记录为准'}}
  ];
  M.providers.push(...EXTRA_MENTORS.filter(p=>!M.providers.some(v=>v.id===p.id)));

  const DEMAND = [
    {id:'s01',major:'金融 / 商科',needs:'院校规划、个人陈述修改',stage:'准备材料',tags:['材料诊断','院校规划'],about:'希望了解申请方向与材料结构；个人信息已作匿名化演示。'},
    {id:'s02',major:'计算机 / 人工智能',needs:'科研经历梳理、面试准备',stage:'院校调研',tags:['科研经历','面试辅导'],about:'主要关注科研经历表达与复试沟通的准备方式。'},
    {id:'s03',major:'数学 / 统计',needs:'申请材料、研究计划',stage:'建立院校清单',tags:['材料诊断','院校规划'],about:'希望梳理竞赛项目与研究经历之间的关联。'},
    {id:'s04',major:'工程 / 自动化',needs:'竞赛经历、科研规划',stage:'完善 BG',tags:['科研经历','竞赛'],about:'需要帮助评估项目经历的呈现方式和材料完整度。'}
  ];
  function demandReasons(d) {
    const services=String(mentorDraft.services||'').toLowerCase();
    const terms=d.tags.filter(t=>services.includes(t.toLowerCase().slice(0,2)));
    return terms.length?`服务方向相关 · ${terms.join(' / ')}`:'可查看需求后判断是否适合';
  }
  function mentorDemands(){
    const list = DEMAND.filter(d=>mentorFilter==='全部'||d.tags.includes(mentorFilter));
    return `<div class="page tl-v2-page">
      <div class="tl-v2-kicker">MENTOR WORKSPACE</div><h1 class="tl-v2-headline">发现适合你辅导的学生需求</h1><p class="tl-v2-sub">先展示匿名需求，再决定是否提供服务。这里不展示学生个人隐私或虚构的匹配百分比。</p>
      <div class="tl-v2-mini-profile"><span class="tl-v2-avatar">${H((mentorDraft.name||'服').slice(0,1))}</span><div><b>${H(mentorDraft.name||'完善你的服务者资料')}</b><small>${H(mentorDraft.destination||'去向院校待填写')} · ${H(mentorDraft.services||'服务方向待填写')}</small></div><button onclick="go('#/mentorProfile')">编辑 ›</button></div>
      <div class="tl-v2-filters">${['全部','院校规划','材料诊断','科研经历','面试辅导','竞赛'].map(t=>`<button class="${mentorFilter===t?'on':''}" onclick="setMentorDemandFilter('${t}')">${t}</button>`).join('')}</div>
      <div class="tl-v2-panel-title"><h3>学生需求广场</h3><span>${list.length} 条演示需求</span></div>
      ${list.map(d=>`<article class="tl-v2-demand"><div class="tl-v2-panel-title"><b>匿名需求 · ${H(d.major)}</b><span>${H(d.stage)}</span></div><h3>${H(d.needs)}</h3><div class="tl-v2-reason">${H(demandReasons(d))}</div><div class="tl-v2-demand-actions"><button onclick="showTongluDemand('${d.id}')">了解需求</button><button onclick="go('#/mentorProfile')">完善服务资料 ›</button></div></article>`).join('')||'<div class="tl-v2-empty">暂无符合筛选条件的演示需求。</div>'}
      <section class="tl-v2-panel"><div class="tl-v2-panel-title"><h3>服务工作台</h3><button onclick="go('#/workbench')">查看原型后台 ›</button></div><div class="tl-v2-stats"><span><strong>—</strong><small>真实完成服务数</small></span><span><strong>—</strong><small>待处理申请</small></span><span><strong>${H(mentorDraft.slots)}</strong><small>自设可接单名额</small></span></div><p class="tl-v2-sub">真实服务次数、预约记录与评价需从经过授权的服务订单后台计算；这里暂不虚构业绩。</p></section>
      <div class="tl-v2-footnote">以上需求均为匿名虚构样例，当前不支持真实联系学生或接单。</div>
    </div>`;
  }
  function mentorProfile(){
    return `<div class="page tl-v2-page"><div class="tl-v2-kicker">MENTOR PROFILE</div><h1 class="tl-v2-headline">完善服务者资料</h1><p class="tl-v2-sub">未来用于学生筛选、资质核验和服务展示。当前只保存在本机浏览器。</p>
      <form class="tl-v2-profile-form" onsubmit="saveTongluMentor(event)">
      ${[['name','展示姓名或称呼','例如：陈同学'],['school','本科院校','例如：天津大学'],['major','本科专业','例如：金融学'],['destination','升学去向','例如：复旦大学金融专硕'],['services','可提供的服务','例如：材料诊断、科研经历、院校规划'],['bio','奖项、科研与辅导经验','请填写真实经历，未经核验不显示认证']].map(([id,label,placeholder])=>`<label>${label}${id==='bio'?`<textarea name="${id}" maxlength="300" rows="4" placeholder="${placeholder}">${H(mentorDraft[id])}</textarea>`:`<input name="${id}" maxlength="120" placeholder="${placeholder}" value="${H(mentorDraft[id])}" />`}</label>`).join('')}
      <label>自设可接单名额（演示）<select name="slots">${['0','1','2','3','4','5'].map(v=>`<option value="${v}" ${mentorDraft.slots===v?'selected':''}>${v} 人</option>`).join('')}</select></label>
      <button class="tl-v2-main-button" type="submit">保存服务者资料</button>
      </form><div class="tl-v2-footnote">身份、学历、论文、辅导经历需后台核验；填写资料不代表已认证。</div>
      <button class="tl-v2-plain-button" onclick="go('#/workbench')">查看原服务者工作台（演示） ›</button>
    </div>`;
  }

    function guestSchools(){return `<div class="page tl-v2-page"><div class="tl-v2-kicker">CAMPUS PREVIEW</div><h1 class="tl-v2-headline">院校资讯 · 游客预览</h1><p class="tl-v2-sub">只展示少量公开演示信息。官方报名时间和资格要求需以学校公告为准。</p>${M.notices.slice(0,2).map(n=>`<div class="tl-v2-guest-card"><b>${H(n.title)}</b><small>${H(n.source)} · ${H(n.status)}</small><button onclick="needTongluSignIn()">查看详情与收藏 ›</button></div>`).join('')}<button class="tl-v2-main-button" onclick="needTongluSignIn()">登录查看全部院校资讯</button></div>`;}
  function guestProviders(){return `<div class="page tl-v2-page"><div class="tl-v2-kicker">MENTOR PREVIEW</div><h1 class="tl-v2-headline">服务者 · 游客预览</h1><p class="tl-v2-sub">仅可预览少量演示服务者，详细履历、筛选和收藏需要登录。</p>${M.providers.slice(0,2).map(p=>`<div class="tl-v2-guest-card"><b>${H(p.name)}</b><small>${H(p.brief)} · ${H(p.tags.join(' / '))}</small><button onclick="needTongluSignIn()">查看详情 ›</button></div>`).join('')}<button class="tl-v2-main-button" onclick="needTongluSignIn()">登录查看更多服务者</button></div>`;}
  function mentorMe(){return `<div class="page tl-v2-page"><div class="tl-v2-kicker">MY SERVICE SPACE</div><h1 class="tl-v2-headline">我的服务空间</h1><p class="tl-v2-sub">服务者也可以浏览其他同行的公开资料；收藏不会影响排序。</p><div class="tl-v2-panel"><button class="tl-v2-link-row" onclick="go('#/mentorProfile')">我的个人信息与服务资料 <span>编辑 ›</span></button><button class="tl-v2-link-row" onclick="go('#/mentorDemands')">学生需求广场 <span>查看需求 ›</span></button><button class="tl-v2-link-row" onclick="go('#/workbench')">服务工作台 <span>演示 ›</span></button><button class="tl-v2-link-row" onclick="go('#/messages')">消息中心 <span>暂未接入真实咨询 ›</span></button><button class="tl-v2-link-row" onclick="S.providerView='saved';go('#/providers')">收藏的其他服务者 <span>${TL.savedMentors.length} 位 ›</span></button><button class="tl-v2-link-row" onclick="go('#/admin')">管理后台界面 <span>演示 ›</span></button></div><div class="tl-v2-footnote">正式版将分别配置服务者端和后台权限；原型内的演示入口并非真实授权。</div></div>`;}
  function guestMe(){return `<div class="page tl-v2-page"><h1 class="tl-v2-headline">加入同路</h1><p class="tl-v2-sub">登录学生身份可管理投递与收藏；服务者身份可维护履历和服务项目。</p><button class="tl-v2-main-button" onclick="go('#/choose')">选择体验身份</button></div>`;}

  function makeSuggestedTasks(){
    const grade=studentBG.grade;
    const out=[];
    const add=(cat,title,note,id)=>out.push({id,cat,title,note});
    if(studentBG.goals.includes('保研')){
      if(grade==='大一'){add('保研','了解本校推免条件','先核实本校政策与成绩排名规则','ba1');add('保研','建立学习与科研探索清单','关注课程基础，不提前承诺推免资格','ba2');}
      if(grade==='大二'){add('保研','回顾学业与综合表现','整理成绩、英语、科研和竞赛经历','bb1');add('保研','调研目标院校与项目','关注近年的官方要求，建立初步清单','bb2');}
      if(grade==='大三'||grade==='大四'||grade==='大五'){add('保研','准备申请材料','简历、成绩排名、个人陈述及其他证明','bc1');add('保研','跟踪院校官方通知','留意夏令营、预推免、报名与面试安排','bc2');add('保研','确认推免流程节点','所有截止日期以当年官方通知为准','bc3');}
    }
    if(studentBG.goals.includes('竞赛')){
      add('竞赛',grade==='大一'?'尝试适合的入门竞赛':'确定本学期的竞赛目标','根据兴趣和年级选择，不要求每项都参加','contest1');
      add('竞赛','组队、训练与作品准备','建立每周训练或项目检查节点','contest2');
      add('竞赛','核实竞赛报名与提交时间','时间以对应赛事官网为准','contest3');
    }
    if(studentBG.goals.includes('科研')){add('科研','梳理研究兴趣与基础','关注专业方向和可投入时间','research1');add('科研','记录科研过程与成果','保留贡献说明、证据和真实经历','research2');}
    if(studentBG.goals.includes('学业')){add('学业','设定本学期课程与英语计划','按每周进度检查，不设虚假达标承诺','study1');}
    if(!out.length)add('综合','梳理当前目标','根据自己的情况确定接下来最重要的一项工作','generic1');
    return out;
  }
  function timelineView(){
    if(!profileReady())return `<section class="tl-v3-card tl-v3-empty-plan"><h3>我的行动时间线</h3><p>还没有显示个性化计划。先到首页通过 AI 对话介绍 BG、年级和诉求，并确认档案。</p><button class="tl-v3-softbtn" onclick="go('#/home')">去首页完善档案 ›</button></section>`;
    const grade=studentBG.grade;
    const items=makeSuggestedTasks();
    const appItems=TL.applications.filter(a=>a.deadline).map(a=>({id:'application-'+a.id,cat:'院校投递',title:a.school+' · '+a.program,note:'自设报名提醒日期：'+a.deadline,deadline:a.deadline}));
    const all=[...items,...appItems];
    const cats=['全部',...new Set(all.map(t=>t.cat))];
    const filter=cats.includes(planCategory)?planCategory:'全部';
    const visible=all.filter(t=>filter==='全部'||t.cat===filter);
    const completed=all.filter(t=>(planTasks[t.id]||{}).status==='已完成').length;
    return `<section class="tl-v3-card"><div class="tl-v3-section-head"><div><small>MY ROADMAP · ${H(grade)}</small><h3>我的行动时间线</h3></div><span class="tl-v3-gold-label">${completed}/${all.length} 已完成</span></div>
      <p class="tl-v3-desc">当前日期：${new Date().toLocaleDateString('zh-CN',{year:'numeric',month:'long',day:'numeric'})}。依据你主动确认的年级与目标生成参考待办；具体日程请核实官方来源。</p>
      <div class="tl-v3-filters">${cats.map(c=>`<button class="${filter===c?'on':''}" onclick="filterTongluPlan('${c}')">${c}</button>`).join('')}</div>
      <div class="tl-v3-plan-list">${visible.map(t=>{
        const state=planTasks[t.id]||{};
        const status=state.status||'未开始';const due=state.due||t.deadline||'';
        return `<div class="tl-v3-plan-item"><div class="tl-v3-plan-dot ${status==='已完成'?'done':''}"></div><div class="tl-v3-plan-main"><div class="tl-v3-plan-title"><b>${H(t.title)}</b><span>${H(t.cat)}</span></div><p>${H(t.note)}</p><div class="tl-v3-plan-edit"><select aria-label="任务状态" onchange="updateTongluPlan('${t.id}','status',this.value)">${['未开始','进行中','已完成'].map(v=>`<option ${status===v?'selected':''}>${v}</option>`).join('')}</select><label>个人截止日 <input type="date" aria-label="个人设置的截止日期" value="${H(due)}" onchange="updateTongluPlan('${t.id}','due',this.value)"></label></div></div></div>`;
      }).join('')}</div>
      <div class="tl-v3-note">投递记录的截止日期来自你的手动设置，页面不会把示意时间当成院校官方报名日期。</div></section>`;
  }
  function studentMe(){
    const ready=profileReady();
    return `<div class="page tl-v2-page tl-v3-my"><div class="tl-v3-section-head"><div><small>MY SPACE</small><h1>我的同路</h1></div><span class="tl-v3-gold-label">学生体验</span></div>
      <section class="tl-v3-card tl-v3-bg-summary"><div class="tl-v3-section-head"><h3>个人 BG 与诉求</h3><button onclick="editTongluBG()">${ready?'重新整理':'去填写'} ›</button></div>
       ${ready?`<div class="tl-v3-bg-chips"><span>${H(studentBG.grade)}</span>${studentBG.goals.map(g=>`<span>${H(g)}</span>`).join('')}</div><p class="tl-v3-bgtext">${H(studentBG.raw)}</p><div class="tl-v3-note">此资料由你主动输入并确认，非 AI 自动验证。</div>`:`<p class="tl-v3-desc">尚未完成 BG 和诉求确认。此时可查看全部院校与服务者，但不会出现个人推荐或匹配分析。</p><button class="tl-v3-softbtn" onclick="go('#/home')">去首页和 AI 交流 ›</button>`}</section>
      ${timelineView()}
      <section class="tl-v3-card"><h3>我的收藏与投递</h3><button class="tl-v2-link-row" onclick="S.schoolView='saved';go('#/school')">院校收藏 <span>${TL.savedSchools.length+TL.customSchools.length} 条 ›</span></button><button class="tl-v2-link-row" onclick="S.schoolView='records';go('#/school')">投递记录本 <span>${TL.applications.length} 条 ›</span></button><button class="tl-v2-link-row" onclick="S.providerView='saved';go('#/providers')">服务者收藏 <span>${TL.savedMentors.length} 位 ›</span></button></section>
      <section class="tl-v3-card"><h3>消息与咨询</h3><button class="tl-v2-link-row" onclick="go('#/messages')">消息中心 <span>咨询 / 订单 / 系统 ›</span></button><p class="tl-v3-desc">将原售前沟通入口统一收进消息中心；本地咨询草稿未发送至任何真实服务者。</p></section>
      <section class="tl-v3-card"><h3>原型业务流程</h3><p class="tl-v3-desc">售前沟通、方案确认、付款和交付的演示功能仍保留。</p><button class="tl-v3-softbtn" onclick="go('#/presale')">查看业务流程 ›</button></section>
      <div class="tl-v2-footnote">原型仅本地保存资料；正式版需接入真实账号与权限管理。请勿输入敏感身份、联系方式或未授权资料。</div>
    </div>`;
  }
  window.filterTongluPlan=function(c){planCategory=c;render();};
  window.updateTongluPlan=function(id,key,value){const item=planTasks[id]||{};item[key]=value;planTasks[id]=item;persistPlans();render();};
  window.editTongluBG=function(){studentBG.confirmed=false;persistBG();messages.length=0;go('#/home');};
  window.confirmTongluBG=function(){
    if(!hasBackground(studentBG.raw)||!studentBG.grade||!studentBG.goals.length){toast('请先补充基本背景、年级和目标');return;}
    studentBG.confirmed=true;studentBG.updatedAt=new Date().toISOString();persistBG();
    messages.push({who:'bot',text:'已确认你的 BG 与诉求。现在「服务者」可查看 3 位优先推荐，「我的」可查看与你年级和目标相关的行动时间线。请留意：目前仍是规则演示，并未连接真实匹配模型。'});
    render();
  };

  /* 保留原服务者功能与收藏，去掉可能误导的百分制“匹配度”。 */
  function recommendationWeight(p){
    const t=studentBG.goals.join(' ')+' '+studentBG.raw;
    const hay=p.tags.join(' ')+p.brief+p.services.map(v=>v.name).join(' ');
    const rules=[['竞赛','竞赛'],['科研','研究'],['论文','研究'],['材料','材料'],['面试','面试'],['保研','材料']];
    let n=0;for(const [need,skill] of rules)if(t.includes(need)&&hay.includes(skill))n+=1;
    for(const [need,field] of [['统计','统计'],['数学','数学'],['数据','统计'],['AI','人工智能'],['人工智能','人工智能'],['计算机','计算机'],['金融','金融'],['经济','商科'],['机械','机械'],['工程','工程']])if(t.includes(need)&&hay.includes(field))n+=5;
    return n;
  }
  function recommendationReason(p){
    const text=studentBG.raw+' '+studentBG.goals.join(' ');
    const matched=p.tags.filter(t=>(/竞赛|建模/.test(text)&&/竞赛|建模/.test(t))||(/科研|研究|论文/.test(text)&&/科研|研究/.test(t))||(/保研|推免|材料/.test(text)&&/材料/.test(t))||(/统计|数学/.test(text)&&/统计|数学/.test(t))||(/AI|人工智能|计算机/i.test(text)&&/计算机|人工智能/.test(t))||(/金融|经济|商科/.test(text)&&/金融|商科/.test(t)));
    return matched.length?'与你提到的「'+matched.join('、')+'」方向相关':'可了解其'+p.tags.join('、')+'服务';
  }

  function providersV2(){
    let list=[...M.providers];
    if(S.providerView==='saved') list=list.filter(p=>isMentorSaved(p.id));
    if(S.providerFilter!=='全部') list=list.filter(p=>p.tags.some(t=>t.includes(S.providerFilter)));
    if(S.providerSearch) list=list.filter(p=>(p.name+p.brief+p.tags.join(' ')).includes(S.providerSearch));
    const isStudent=role==='student';
    const showRecommendations=isStudent&&profileReady()&&S.providerView==='all'&&!S.providerSearch&&S.providerFilter==='全部';
    const recommendations=showRecommendations?[...M.providers].sort((a,b)=>recommendationWeight(b)-recommendationWeight(a)).slice(0,Math.min(3,M.providers.length)):[];
    const recommendationsHtml=recommendations.length?`<section class="tl-v3-card tl-v3-recommend"><div class="tl-v3-section-head"><div><small>PERSONAL PICKS · 演示规则</small><h3>优先为你推荐</h3></div><span class="tl-v3-gold-label">${recommendations.length} 位</span></div><p class="tl-v3-desc">根据你确认的诉求与服务方向关键词初步排列，不代表真实匹配分数、身份核验或服务效果。</p>${recommendations.map(p=>`<div class="tl-v3-rec-row"><div class="tl-avatar">${H(p.name.slice(0,1))}</div><div><b>${H(p.name)}</b><small>${H(recommendationReason(p))}</small></div><button onclick="selectProvider('${p.id}')">详情 ›</button></div>`).join('')}</section>`:'';
    return `<div class="page tl-v2-page"><div class="tl-v2-kicker">MENTOR COMMUNITY</div><h1 class="tl-v2-headline">${role==='mentor'?'看看其他同行的服务方向':'全部服务者'}</h1>
      <p class="tl-v2-sub">按专业方向、服务内容和可核验资料选择。演示数据不展示匹配分数或录取概率。</p>
      ${isStudent&&!profileReady()?`<div class="tl-v3-unmatched">目前展示的是全部服务者。确认 BG 和诉求后，才会出现针对你的优先推荐；现在不显示个人匹配度。<button onclick="go('#/home')">去首页填写 ›</button></div>`:''}
      ${recommendationsHtml}
      <div class="tl-switch"><button class="${S.providerView==='all'?'on':''}" onclick="setProviderView('all')">全部服务者</button><button class="${S.providerView==='saved'?'on':''}" onclick="setProviderView('saved')">♡ 已收藏 (${TL.savedMentors.length})</button></div>
      <form class="tl-search" onsubmit="searchMentors(event)"><input id="tl-provider-search" aria-label="搜索服务者" placeholder="搜索专业、服务或姓名" value="${H(S.providerSearch)}" /><button type="submit">搜索</button></form>
      <div class="tl-chips">${['全部','材料诊断','研究经历','竞赛'].map(t=>`<button class="${S.providerFilter===t?'on':''}" onclick="setProviderFilter('${t}')">${t}</button>`).join('')}</div>
      <div class="tl-v2-panel-title"><h3>服务者资料</h3><span>${list.length} 位演示样例</span></div>
      ${list.length?list.map(p=>`<article class="tl-mentor-card"><div class="tl-mentor-header"><span class="tl-avatar">${H(p.name.slice(0,1))}</span><div class="grow"><b>${H(p.name)}</b><div class="tiny dim mt6">${H(p.brief)}</div></div><button aria-label="${isMentorSaved(p.id)?'取消收藏':'收藏服务者'}" class="tl-heart ${isMentorSaved(p.id)?'on':''}" onclick="toggleMentorFavorite('${p.id}')">${isMentorSaved(p.id)?'♥':'♡'}</button></div>
      <div class="tl-v2-reason">${H(showRecommendations?recommendationReason(p):'擅长：'+p.tags.join('、'))} · 资料待核验</div><div class="tl-tags">${p.tags.map(t=>`<span>${H(t)}</span>`).join('')}</div><div class="tl-mentor-bottom"><span>核验状态：演示 / 待核实</span><button onclick="selectProvider('${p.id}')">查看履历 ›</button></div></article>`).join(''):`<div class="tl-v2-empty">暂无符合条件的收藏或服务者。<button onclick="S.providerView='all';S.providerFilter='全部';S.providerSearch='';render()">重置筛选</button></div>`}
      <div class="tl-v2-footnote">排序暂为示例资料展示顺序，不作录取预测或服务效果保证。</div></div>`;
  }
  function addPlanBtn(id,label,isNotice){return `<button class="tl-v2-secondary" onclick="planTongluSchool('${id}',${isNotice?'true':'false'})">加入投递计划</button>`;}
  function savedSchoolsV2(){
    return `<div class="tl-section-kicker">MY CAMPUS COLLECTION</div><h2 class="tl-page-title">我的院校收藏</h2><p class="tl-desc">收藏院校后可以一键加入投递记录本，无需再次输入院校名称。</p>
      <form class="tl-school-form" onsubmit="addCustomSchool(event)"><input id="tl-school-name" maxlength="60" placeholder="输入要关注的院校名称" required /><button>＋ 收藏</button></form>
      ${TL.customSchools.map(s=>`<div class="tl-saved-row tl-v2-saved"><div class="grow"><b>${H(s.name)}</b><small>自选关注院校</small></div>${addPlanBtn(s.id,'',false)}<button class="tl-heart on" aria-label="取消收藏" onclick="removeCustomSchool('${s.id}')">♥</button></div>`).join('')}
      ${M.notices.filter(n=>isSchoolSaved(n.id)).map(n=>`<div class="tl-saved-row tl-v2-saved"><div class="grow"><b>${H(n.title)}</b><small>${H(n.source)} · ${H(n.status)}</small></div>${addPlanBtn(n.id,'',true)}<button class="tl-heart on" aria-label="取消收藏" onclick="toggleSchoolFavorite('${n.id}')">♥</button></div>`).join('')}
      ${!TL.customSchools.length&&!TL.savedSchools.length?'<div class="tl-v2-empty">还没有收藏的院校。可以先浏览资讯或添加院校。</div>':''}
      <div class="tl-v2-footnote">收藏和投递记录仅保存在当前浏览器，尚未接入真实账户。</div>`;
  }
  function recordsV2(){
    let html=origRecords();
    if(planPrefill){html=html.replace('name="school" maxlength="80"',`name="school" value="${H(planPrefill)}" maxlength="80"`);}
    html=html.replace('name="date" type="date"', 'name="date" type="date"').replace('<button class="tl-submit" type="submit">', '<label class="tl-v3-deadline-label">报名截止日期（手动填写，非官方同步）<input name="deadline" type="date"></label><button class="tl-submit" type="submit">');
    return html;
  }
  function noticeDetailV2(){const n=M.notices.find(x=>x.id===S.currentNoticeId);if(!n)return pageNoticeDetail();return pageNoticeDetail()+`<div class="tl-v2-detail-action"><button class="tl-v2-secondary" onclick="planTongluSchool('${n.id}',true)">加入投递计划</button></div>`;}

  // Register new pages without touching the original workflow functions.
  PAGES.choose=roleChoose;
  PAGES.mentorHome=mentorHome;
  PAGES.mentorDemands=mentorDemands;
  PAGES.mentorProfile=mentorProfile;
  PAGES.mentorMe=mentorMe;
  PAGES.guestHome=guestHome;
  PAGES.guestSchools=guestSchools;
  PAGES.guestProviders=guestProviders;
  PAGES.guestMe=guestMe;
  PAGES.profile=function(){return `<div class="page tl-v2-page"><div class="tl-v3-card"><h3>BG 建档已改为对话方式</h3><p>无需填写多项表单。直接在首页自由描述你的学校、专业、年级和诉求，由演示助手逐步追问。</p><button class="tl-v3-softbtn" onclick="go('#/home')">去首页对话建档 ›</button></div></div>`;};
  PAGES.diagnosis=function(){if(!profileReady())return `<div class="page tl-v2-page"><div class="tl-v3-card"><h3>请先确认 BG 与诉求</h3><p>未建档无法查看个人定位分析，也不会显示个人匹配度。</p><button class="tl-v3-softbtn" onclick="go('#/home')">去 AI 对话建档 ›</button></div></div>`;return `<div class="page tl-v2-page"><div class="tl-v3-card"><div class="tl-v3-section-head"><div><small>PERSONAL INSIGHTS · 演示</small><h3>你的背景与行动建议</h3></div></div><p class="tl-v3-bgtext">${H(studentBG.raw)}</p><p class="tl-v3-desc">暂不展示量化匹配度、录取概率或未经验证的优劣评价。可以到服务者列表了解与你诉求相关的辅导方向，到「我的」查看行动时间线。</p><button class="tl-v3-softbtn" onclick="go('#/providers')">浏览服务者 ›</button></div></div>`;};
  PAGES.home=studentHome;
  PAGES.me=studentMe;
  PAGES.providers=providersV2;
  PAGES.noticeDetail=noticeDetailV2;
  PAGES.messages=function(){return messagesCenter();};
  PAGES.conversation=function(){return conversationCenter();};
  NAV.choose={hidden:true};
  NAV.mentorHome={brand:true};NAV.mentorDemands={title:'学生需求广场'}; NAV.mentorProfile={title:'服务者资料'};NAV.mentorMe={title:'我的服务空间'};
  NAV.guestHome={brand:true};NAV.guestSchools={title:'院校资讯 · 预览'};NAV.guestProviders={title:'服务者 · 预览'};NAV.guestMe={title:'加入同路'};
  NAV.messages={title:'消息中心'};NAV.conversation={title:'咨询草稿'};
  schoolSavedView=savedSchoolsV2;
  schoolRecordsView=recordsV2;
  actionbar=function(name){
    if(name==='choose'||role==='guest'||name==='home'||name==='mentorHome'||name==='guestHome'||name==='me')return '';
    if(role==='mentor'){
      if(name==='mentorDemands')return `<button class="btn line" onclick="go('#/providers')">浏览其他服务者</button><button class="btn primary wide" onclick="go('#/mentorProfile')">完善我的服务</button>`;
      if(name==='mentorProfile')return '';
      if(name==='mentorMe')return '';
      if(name==='providers')return `<button class="btn line" onclick="setProviderView('saved')">我的收藏</button><button class="btn primary wide" onclick="go('#/mentorHome')">返回需求广场</button>`;
      if(name==='provider')return `<button class="btn line" onclick="toggleMentorFavorite('${provider().id}')">${isMentorSaved(provider().id)?'♥ 已收藏':'♡ 收藏同行'}</button><button class="btn primary wide" onclick="go('#/mentorMe')">回我的服务空间</button>`;
    }
    if(name==='providers')return `<button class="btn line" onclick="setProviderView('saved')">我的收藏</button><button class="btn primary wide" onclick="go('#/home')">AI 交流 / 完善 BG</button>`;
    if(name==='diagnosis')return `<button class="btn line" onclick="go('#/home')">继续 AI 交流</button><button class="btn primary wide" onclick="go('#/providers')">浏览服务者 ›</button>`;
    if(name==='messages'||name==='conversation')return '';
    if(name==='provider'){
      const p=provider();const full=remain(p)===0;
      return `<button class="btn line" onclick="toggleMentorFavorite('${p.id}')">${isMentorSaved(p.id)?'♥ 已收藏':'♡ 收藏'}</button><button class="btn primary wide" onclick="${full?"go('#/providers');showTongluNext('该演示服务者当前已满额，可查看其他服务者','查看全部服务者','providers')":"startTongluConsult('"+p.id+"')"}">${full?'查看其他服务者':'咨询该服务者 ›'}</button>`;
    }
    if(name==='noticeDetail')return `<button class="btn line" onclick="toggleSchoolFavorite(S.currentNoticeId)">${isSchoolSaved(S.currentNoticeId)?'♥ 已收藏':'♡ 收藏院校'}</button><button class="btn primary wide" onclick="planTongluSchool(S.currentNoticeId,true)">加入投递计划 ›</button>`;
    if(name==='presale')return `<button class="btn line" onclick="go('#/messages')">消息中心</button><button class="btn primary wide" onclick="go('#/proposal')">查看演示方案 ›</button>`;
    if(name==='delivery'&&role==='student')return `<button class="btn line" onclick="go('#/messages')">消息 / 服务记录</button><button class="btn primary wide" onclick="go('#/me')">回到我的 ›</button>`;
    return origActionbar(name);
  };
  /* V4 可用性增强：可操作的收藏反馈、统一消息草稿、稳定返回与流程联动。 */
  let nextTimer=0;
  function showNext(text,label,callback){
    const screen=document.querySelector('.screen');if(!screen)return;
    let bar=document.getElementById('tl-v4-next');
    if(!bar){bar=document.createElement('div');bar.id='tl-v4-next';bar.className='tl-v4-next';bar.setAttribute('role','status');screen.appendChild(bar);}
    bar.replaceChildren();
    const msg=document.createElement('span');msg.textContent=text;bar.appendChild(msg);
    if(label&&callback){const b=document.createElement('button');b.type='button';b.textContent=label+' ›';b.addEventListener('click',()=>{bar.classList.remove('show');callback();});bar.appendChild(b);}
    bar.classList.add('show');clearTimeout(nextTimer);nextTimer=setTimeout(()=>bar.classList.remove('show'),6500);
  }
  window.showTongluNext=function(message,label,path){showNext(message,label,()=>go('#/'+path));};
  const baseMentorFav=toggleMentorFavorite;
  toggleMentorFavorite=function(id){const was=isMentorSaved(id);baseMentorFav(id);showNext(was?'已取消服务者收藏':'已收藏服务者',was?'查看全部':'查看收藏',()=>{S.providerView=was?'all':'saved';S.providerFilter='全部';S.providerSearch='';go('#/providers');});};
  const baseSchoolFav=toggleSchoolFavorite;
  toggleSchoolFavorite=function(id){const was=isSchoolSaved(id);baseSchoolFav(id);showNext(was?'已取消院校收藏':'已收藏院校通知',was?'浏览院校':'查看收藏',()=>{S.schoolView=was?'notices':'saved';go('#/school');});};
  const baseAddCustom=addCustomSchool;
  addCustomSchool=function(event){const before=TL.customSchools.length;baseAddCustom(event);if(TL.customSchools.length>before)showNext('已添加院校收藏','加入投递计划',()=>{S.schoolView='saved';go('#/school');});};
  function saveConsults(){try{localStorage.setItem(CHAT_KEY,JSON.stringify(consults.slice(0,60)));return true;}catch(e){toast('浏览器存储不可用，草稿无法保存');return false;}}
  function currentConsult(){return consults.find(c=>c.id===activeConversation);}
  function providerForChat(c){return M.providers.find(p=>p.id===c?.providerId);}
  function messagesCenter(){
    const cats=['咨询','订单','系统'];
    let inner='';
    if(role==='mentor')inner=`<div class="tl-v4-empty">服务者消息尚未接入真实后台，当前没有可处理的用户咨询。<button onclick="go('#/mentorMe')">返回服务者空间 ›</button></div>`;
    else if(messageView==='咨询')inner=consults.length?consults.map(c=>{
      const p=providerForChat(c);return `<button class="tl-v4-thread" onclick="openTongluConversation('${H(c.id)}')"><span class="tl-v4-thread-icon">${H((p?.name||'服').slice(0,1))}</span><span><b>${H(p?.name||'演示服务者')}</b><small>${c.entries?.length?'已保存 '+c.entries.length+' 条本地咨询草稿':'待撰写咨询内容'} · 未发送给真实服务者</small></span><span>›</span></button>`;
    }).join(''):`<div class="tl-v4-empty">还没有咨询记录。可以从服务者详情点击「咨询该服务者」。<button onclick="go('#/providers')">去找服务者 ›</button></div>`;
    else if(messageView==='订单')inner=`<div class="tl-v4-empty">当前没有真实订单消息，原有服务方案与交付页面仅供流程演示。<button onclick="go('#/presale')">查看售前流程演示 ›</button></div>`;
    else inner=`<div class="tl-v4-empty">暂无系统消息。报名节点请以院校官方通知及个人设置的截止日为准。<button onclick="go('#/me')">查看我的行动时间线 ›</button></div>`;
    return `<div class="page tl-v2-page tl-v4-message-page"><div class="tl-v2-kicker">MESSAGE CENTER</div><h1 class="tl-v2-headline">消息中心</h1><p class="tl-v2-sub">咨询、订单与系统通知都在这里。当前仅为本地流程演示，不会向外部发送消息。</p><div class="tl-v4-message-tabs">${cats.map(cat=>`<button class="${messageView===cat?'on':''}" onclick="setTongluMessageView('${cat}')">${cat}</button>`).join('')}</div>${inner}</div>`;
  }
  function conversationCenter(){
    const c=currentConsult();if(!c)return `<div class="page tl-v2-page"><div class="tl-v4-empty">没有找到这段咨询草稿。<button onclick="go('#/messages')">返回消息中心 ›</button></div></div>`;
    const p=providerForChat(c);
    return `<div class="page tl-v2-page tl-v4-message-page"><div class="tl-v2-kicker">LOCAL DRAFT</div><h1 class="tl-v2-headline">${H(p?.name||'演示服务者')} · 咨询草稿</h1><p class="tl-v2-sub">咨询内容仅保存在当前浏览器，尚未发给服务者。正式消息系统上线后才能实际沟通。</p><div class="tl-v4-chat-drafts">${(c.entries||[]).length?c.entries.map(e=>`<div class="tl-v4-draft"><small>我 · 本地保存</small><p>${H(e.text)}</p></div>`).join(''):'<div class="tl-v4-empty">描述你想获得哪些辅导帮助，例如材料诊断、研究方向建议或面试训练。</div>'}</div><form class="tl-v4-compose" onsubmit="saveTongluDraft(event)"><textarea name="draft" aria-label="咨询草稿" rows="3" maxlength="500" placeholder="写下想咨询的问题…" required></textarea><button type="submit">保存到消息中心</button></form><button class="tl-v3-softbtn" onclick="go('#/messages')">返回全部消息 ›</button></div>`;
  }
  window.setTongluMessageView=function(v){messageView=v;render();};
  window.openTongluConversation=function(id){activeConversation=id;go('#/conversation');};
  window.startTongluConsult=function(providerId){
    if(role!=='student'){toast('学生身份才能建立咨询草稿');return;}
    const p=M.providers.find(x=>x.id===providerId);if(!p){toast('没有找到服务者');return;}
    if(remain(p)===0){showNext('演示服务者当前已满额，请查看其他服务者','浏览服务者',()=>go('#/providers'));return;}
    let c=consults.find(x=>x.providerId===providerId);
    if(!c){c={id:'chat-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),providerId,entries:[],updatedAt:new Date().toISOString()};consults.unshift(c);saveConsults();}
    activeConversation=c.id;go('#/conversation');
  };
  window.saveTongluDraft=function(e){e.preventDefault();const c=currentConsult();if(!c)return;const form=e.target;const v=String(form.elements.draft.value||'').trim().slice(0,500);if(!v){toast('请先输入咨询内容');return;}c.entries=(c.entries||[]).slice(-29);c.entries.push({text:v,at:new Date().toISOString()});c.updatedAt=new Date().toISOString();if(saveConsults()){render();showNext('咨询草稿已保存到消息中心（未发送）','查看消息',()=>go('#/messages'));}};
  const oldSaveApp=saveApplication;
  saveApplication=function(e){
    e.preventDefault();const f=e.target;const school=String(f.elements.school.value||'').trim(),program=String(f.elements.program.value||'').trim();
    if(!school||!program){toast('请填写院校与专业');return;}
    if(school.length>80||program.length>80){toast('名称请控制在 80 字以内');return;}
    const duplicate=TL.applications.some(a=>a.school===school&&a.program===program&&a.status!=='未通过');
    if(duplicate){showNext('这所院校和专业已有进行中的记录，可直接更新状态','查看记录',()=>{S.schoolView='records';go('#/school');});return;}
    const oldLength=TL.applications.length;oldSaveApp(e);
    if(TL.applications.length>oldLength){showNext('已保存投递记录，时间线可关联你填写的截止日','查看计划',()=>go('#/me'));}
  };

  const allowedGuest=new Set(['choose','guestHome','guestSchools','guestProviders','guestMe']);
  const allowedMentor=new Set(['choose','mentorHome','mentorDemands','mentorProfile','mentorMe','school','providers','provider','noticeDetail','workbench','admin','messages']);
  const studentForbidden=new Set(['mentorHome','mentorDemands','mentorProfile','mentorMe','guestHome','guestSchools','guestProviders','guestMe']);
  const mentorTabs=[['首页','mentorHome',ICON.home],['院校资讯','school',ICON.school],['服务者','providers',ICON.users],['我的','mentorMe',ICON.me]];
  const guestTabs=[['首页','guestHome',ICON.home],['院校资讯','guestSchools',ICON.school],['服务者','guestProviders',ICON.users],['登录','guestMe',ICON.me]];
  const studentTabs=[['首页','home',ICON.home],['院校资讯','school',ICON.school],['服务者','providers',ICON.users],['我的','me',ICON.me]];
  const tabKeys=new Set(['mentorHome','mentorMe','guestHome','guestSchools','guestProviders','guestMe']);
  function renderV3(){
    let key=(location.hash.replace(/^#\/?/,'')||'choose').split('/')[0];
    if((!role&&key!=='choose')||(role==='guest'&&!allowedGuest.has(key))||(role==='mentor'&&!allowedMentor.has(key))||(role==='student'&&studentForbidden.has(key))){history.replaceState(null,'',location.pathname+location.search+'#/choose');key='choose';}
    document.body.dataset.role=role||'none';
    document.body.dataset.chatHome=(key==='home'||key==='mentorHome'||key==='guestHome')?'yes':'no';
    document.body.classList.toggle('tl-debug', QS.has('debug') && role!=='guest' && !!role);
    origRender();
    const tab=document.getElementById('tabbar');
    if(role && key!=='choose'){
      const tabs=role==='mentor'?mentorTabs:role==='guest'?guestTabs:studentTabs;
      const activeKey=(key==='provider'||key==='presale'||key==='proposal'||key==='checkout'||key==='delivery'||key==='conversation')?'providers':
        (key==='noticeDetail'?'school':(key==='messages'?(role==='mentor'?'mentorMe':'me'):(['workbench','admin','mentorProfile','mentorDemands'].includes(key)?'mentorMe':(['diagnosis','quota','nocandidate'].includes(key)?'me':key))));
      tab.innerHTML=tabs.map(([title,path,icon])=>`<button class="tab ${path===activeKey?'active':''}" onclick="go('#/${path}')">${icon}<span>${title}</span></button>`).join('');
      tab.className='tabbar';
    }else{tab.className='tabbar hidden';tab.innerHTML='';}
    const appArea=document.getElementById('app');
    if(key==='providers'&&lastNavFrom==='provider') appArea.scrollTop=savedListScroll.providers;
    if(key==='school'&&lastNavFrom==='noticeDetail') appArea.scrollTop=savedListScroll.school;
    const nav=document.getElementById('navbar');
    if(key!=='choose'){
      nav.querySelectorAll('.tl-v2-switch-role').forEach(x=>x.remove());
      const btn=document.createElement('button');btn.className='tl-v2-switch-role';btn.textContent=roleName()+' · 切换';btn.addEventListener('click',()=>go('#/choose'));
      nav.appendChild(btn);
    }
    document.getElementById('fabDemo').style.display=(role==='guest'||key==='choose')?'none':'';
    if(role==='guest'||key==='choose')document.querySelectorAll('#actionbar button').forEach(b=>b.disabled=true);
    if(key==='choose') {tab.className='tabbar hidden';document.getElementById('actionbar').innerHTML='';}
  }
  render=renderV3;
  const baseGo=go;
  go=function(hash){
    const current=(location.hash.replace(/^#\/?/,'')||'choose').split('/')[0];
    lastNavFrom=current;
    if(current==='providers'||current==='school'){
      const app=document.getElementById('app');if(app)savedListScroll[current]=app.scrollTop;
    }
    baseGo(hash);
  };
  back=function(){
    const key=(location.hash.replace(/^#\/?/,'')||'choose').split('/')[0];
    const backTo={provider:'providers',noticeDetail:'school',conversation:'messages',messages:role==='mentor'?'mentorMe':'me',presale:'messages',proposal:'presale',checkout:'proposal',delivery:'messages',mentorProfile:'mentorMe',mentorDemands:'mentorMe',workbench:'mentorMe',admin:'mentorMe',diagnosis:'me'};
    const home=role==='mentor'?'mentorHome':role==='guest'?'guestHome':'home';
    go('#/'+(backTo[key]||home));
  };
  // Replace original hash-change listener with role-aware guard instead of rendering twice.
  window.removeEventListener('hashchange',origRender);
  window.addEventListener('hashchange',renderV3);
  openDrawer=function(){if(role==='guest'||!role){toast('游客体验不包含内部演示流程，请先选择学生或服务者身份');return;}origOpenDrawer();};
  // The original script's hashchange listener invokes the reassigned render binding.
  window.selectTongluRole=function (r){if(!['student','mentor','guest'].includes(r))return;messages.length=0;chatSerial+=1;chatBusy=false;goRole(r);};
  window.sendTongluChat=function(event){
    event.preventDefault();if(chatBusy)return;
    const field=document.getElementById('tl-v2-chat-input');if(!field)return;
    const value=field.value.trim().slice(0,800);if(!value)return;
    messages.push({who:'me',text:value});
    const currentRole=role;
    const reply=currentRole==='guest'?'这里是保研常识演示：可以提前准备成绩排名证明、个人陈述和目标项目清单；实际时间以院校官方通知为准。游客不提供个人匹配。':
      currentRole==='mentor'?'这里是服务者端的本地 AI 演示。你可以在「我的」进入学生需求广场、管理服务方向和服务工作台；真实需求匹配和订单管理仍需后端支持。':handleStudentBG(value);
    messages.push({who:'bot',text:'正在整理演示回复…'});
    field.value='';chatBusy=true;
    const serial=++chatSerial;
    const log=document.getElementById('tl-v2-chat');if(log){log.innerHTML=aiMessagesHtml();log.scrollTop=log.scrollHeight;}
    setTimeout(()=>{if(serial!==chatSerial||role!==currentRole)return;messages[messages.length-1].text=reply;chatBusy=false;render();const c=document.getElementById('tl-v2-chat');if(c)c.scrollTop=c.scrollHeight;},440);
  };
    window.setMentorDemandFilter=function(v){mentorFilter=v;render();};
  window.showTongluDemand=function(id){const d=DEMAND.find(x=>x.id===id);if(!d)return;toast(`${d.major}：${d.about}`);};
  window.saveTongluMentor=function(event){
    event.preventDefault();const f=event.target;
    const next={};for(const k of Object.keys(stubMentor)){const field=f.elements.namedItem(k);next[k]=field?String(field.value||'').trim().slice(0,k==='bio'?300:120):'';}
    mentorDraft=next;
    try{localStorage.setItem(K,JSON.stringify(mentorDraft));toast('服务者资料已保存在本机');}catch(e){toast('本机存储不可用，请检查浏览器设置');}
    go('#/mentorHome');
  };
  window.needTongluSignIn=function(){toast('请先选择学生或服务者身份体验');setTimeout(()=>go('#/choose'),520);};
  window.planTongluSchool=function(id,isNotice){
    const item=isNotice?M.notices.find(n=>n.id===id):TL.customSchools.find(n=>n.id===id);
    if(!item)return;planPrefill=isNotice?schoolNameForNotice(item):item.name;S.schoolView='records';go('#/school');
  };
  // Existing record form saves through the original local-only function; reset prefill only after submit.
  const origSaveApplication=saveApplication;
  saveApplication=function(e){const deadline=e.target.elements.deadline?.value||'';origSaveApplication(e);if(deadline&&TL.applications[0]){TL.applications[0].deadline=deadline;saveTL();}planPrefill='';};
  /* 加载页：Logo 以流线型遮罩扫过入场，品牌字逐字升起，尾部收束成一条流光。
     仅用 opacity / transform / clip-path / mask，单次播放，可被 reduced-motion 降级。 */
  function showBrandSplash(){
    const screen=document.querySelector('.screen');if(!screen)return;
    if(FAST){return;}
    if(document.getElementById('tlSplash'))return;
    const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    const overlay=document.createElement('div');
    overlay.id='tlSplash';overlay.className='tl-v2-splash v4-splash';overlay.setAttribute('aria-hidden','true');
    overlay.innerHTML=`<div class="v4-splash-glow"></div>
      <div class="v4-splash-logo"><img src="assets/tonglu-logo.svg" alt="" /></div>
      <div class="v4-splash-word">${['同','路'].map((c,i)=>`<span style="--i:${i}">${c}</span>`).join('')}</div>
      <div class="v4-splash-line"></div>
      <div class="v4-splash-sub">每一步，都有人与你同路</div>`;
    screen.appendChild(overlay);
    const wait=reduce?200:1200;
    setTimeout(()=>{overlay.classList.add('out');setTimeout(()=>overlay.remove(),420);},wait);
  }
  // 状态桥：V4 页面层（assets/v4.js）需要复用本层的角色、档案与推荐逻辑。
  window.__TL={get role(){return role;},get bg(){return studentBG;},profileReady,hasBackground,H,
    planTasks:()=>planTasks,consults:()=>consults,recommendationWeight,recommendationReason,
    setRole:r=>{role=r;},openNext:(m,l,p)=>showNext(m,l,()=>go('#/'+p))};
  // Enter the role gateway on every new load. Local draft and saved lists remain separate.
  history.replaceState(null,'',location.pathname+location.search+'#/choose');
  render();showBrandSplash();
})();
