/* 同路 V6 · AI / 数据产品预留层
 * 本地版：不连接 AI、数据库或支付；所有事实来源、审核与授权状态明确展示。
 * 依赖 data.js/app.js/role-v3.js/v4.js/v5.js；不覆盖已有业务及数据结构。
 */
(function(){
  'use strict';
  const T=window.__TL, V4=window.__TLV4;
  if(!T||!V4)return;
  const H=x=>escapeTL(x==null?'':String(x));
  const $=id=>document.getElementById(id);
  const STORAGE='tonglu-v6-demo-experience-plans';
  const KEY_GROUP=['tonglu-purple-gold-v1','tonglu-role-v3-mentor-draft','tonglu-v3-student-bg','tonglu-v3-plan-tasks','tonglu-v4-local-consultations','tonglu-v4-supplement','tonglu-v5-intake-draft',STORAGE];
  const formatDate=()=>new Date().toLocaleDateString('zh-CN');
  let store={extraTasks:[], accepted:[], consent:{model:false, sharing:false}, lastExperienceQuery:''};
  try{const saved=JSON.parse(localStorage.getItem(STORAGE)||'{}');if(saved&&typeof saved==='object'){store={...store,...saved,extraTasks:Array.isArray(saved.extraTasks)?saved.extraTasks:[],accepted:Array.isArray(saved.accepted)?saved.accepted:[],consent:{...store.consent,...saved.consent}};}}catch(_){ }
  const persist=()=>{try{localStorage.setItem(STORAGE,JSON.stringify(store));return true;}catch(e){toast('本地存储失败，本次操作可能不会保留');return false;}};
  function route(key){go('#/'+key)}
  function note(text){return '<p class="v6-note">'+text+'</p>';}
  const exampleCases=[
    {id:'demo-ai-01',title:'计算机 / AI · 项目经历如何描述',direction:'人工智能',stage:'材料准备',year:'虚构案例',tags:['人工智能','计算机','科研','竞赛','保研'],q:'项目很多但不知道如何证明个人贡献',a:'把每个项目整理成背景、你的行动、可核验成果；面试中使用实际代码或研究笔记说明方法。',source:'内容设计示例，不代表真实学长经历'},
    {id:'demo-stat-02',title:'数学统计 · 竞赛成果整理',direction:'统计与数学',stage:'规划',year:'虚构案例',tags:['统计','数学','竞赛','保研','材料'],q:'建模比赛成果和申请目标联系不明确',a:'按建模问题、个人负责内容、验证过程与复盘经验整理成结构化清单。',source:'内容设计示例，不代表真实申请记录'},
    {id:'demo-fin-03',title:'金融商科 · 面试准备路径',direction:'金融与商科',stage:'面试',year:'虚构案例',tags:['金融','商科','面试','保研'],q:'对面试中的项目追问准备不足',a:'针对每一段研究或实习经历准备事实、方法、结果、局限性四个部分，避免编造。',source:'内容设计示例，不代表真实录取结果'},
    {id:'demo-general-04',title:'跨方向申请 · 材料逻辑',direction:'通用',stage:'申请前',year:'虚构案例',tags:['跨专业','材料','保研','科研'],q:'本科专业与目标方向差异较大',a:'先检查目标项目是否接收跨专业，再说明既有课程与项目如何支持新方向，缺少部分要明确承认。',source:'内容设计示例，不代表具体院校要求'}
  ];
  let expFilter='全部', expQuery='', expOpen='';
  function scoreCase(x){const context=T.profileReady()?T.bg.raw+' '+(T.bg.goals||[]).join(' '):'';let score=0;for(const tag of x.tags)if(context.includes(tag))score++;return score;}
  function casesFiltered(){const q=(expQuery||'').toLowerCase();return exampleCases.filter(c=>(expFilter==='全部'||c.tags.includes(expFilter))&&(!q||[c.title,c.direction,c.q,c.a,...c.tags].join(' ').toLowerCase().includes(q))).sort((a,b)=>scoreCase(b)-scoreCase(a));}
  function experiencePage(){
    if(T.role==='guest')return '<div class="page tl-v2-page v4-page"><div class="v4-kicker">CASE LIBRARY</div><h1 class="v4-h1">保研经验库</h1><div class="v6-card"><b>游客可预览经验库的内容结构</b><p>完整检索、收藏与个性化问答将在账号系统上线后开放。</p><button class="v6-primary" onclick="go(\'#/choose\')">选择身份体验 ›</button></div></div>';
    const cards=casesFiltered().map(c=>'<article class="v6-case"><div class="v6-case-top"><span class="v6-pill">'+H(c.direction)+'</span><span class="v6-muted">'+H(c.year)+'</span></div><h3>'+H(c.title)+'</h3><p>关注问题：'+H(c.q)+'</p><div class="v6-case-foot"><span>'+H(c.stage)+'</span><button type="button" onclick="v6OpenExperience(\''+c.id+'\')">'+(expOpen===c.id?'收起':'查看经验摘要')+' ›</button></div>'+(expOpen===c.id?'<div class="v6-extract"><b>内容摘要</b><p>'+H(c.a)+'</p><small>'+H(c.source)+'</small></div>':'')+'</article>').join('');
    return '<div class="page tl-v2-page v4-page"><div class="v4-kicker">EXPERIENCE INDEX</div><h1 class="v4-h1">经验库 · 内容体验</h1><p class="v4-sub">未来按真实授权经历、具体院校、专业和年份检索；当前只提供虚构案例示例，不是已采集的数据。</p>'+note('正式版接入 RAG：先检索可用且经过授权的经验片段，再给出带来源、年份和限制说明的回答。暂不收费、不提供录取概率。')+
      '<div class="v6-card"><b>查找相关经验</b><label class="v6-field">关键词<input id="v6-experience-query" value="'+H(expQuery)+'" placeholder="例如：人工智能 项目 竞赛" maxlength="80" /></label><button class="v6-primary" onclick="v6SearchExperience()">查找内容</button><div class="v6-filters">'+['全部','保研','竞赛','科研','面试','材料'].map(f=>'<button class="'+(expFilter===f?'active':'')+'" onclick="v6FilterExperience(\''+f+'\')">'+f+'</button>').join('')+'</div><div class="v6-inline">'+(T.profileReady()?'已读取你确认的 BG 关键词，用于本地排序。':'尚未确认 BG，按通用主题浏览。')+'</div></div>'+
      '<div class="v6-card v6-soft"><b>未来的智能问答</b><p>问答将引用来源片段，并区分申请者亲身经历、经验建议与推断。公开院校通知需另行核实。</p><div class="v6-placeholder">大模型接入位置：/api/v1/experience/search + /api/v1/experience/answer</div></div>'+
      '<h2 class="v6-section-heading">'+(expQuery?'检索结果':'精选主题')+' · '+casesFiltered().length+' 条</h2>'+(cards||'<div class="v6-empty">未找到相关主题。可以尝试更短的关键词，或切换「全部」。</div>')+'</div>';
  }
  window.v6FilterExperience=function(x){expFilter=x;render();};
  window.v6SearchExperience=function(){expQuery=( $('v6-experience-query')?.value ||'' ).trim().slice(0,80);store.lastExperienceQuery=expQuery;persist();render();};
  window.v6OpenExperience=function(id){expOpen=expOpen===id?'':id;render();};
  
  // 提醒：不能把聊天内容在用户未确认时自动转为正式 BG。
  // 该按钮只打开建档预览：最终保存仍需要用户逐字段确认。
  window.v6PrepareConversation=function(){
    if(T.role!=='student'){toast('请先使用学生身份');return;}
    const raw=String(T.bg.raw||'').trim();
    if(!raw){toast('先在首页描述学校、年级或目标，再整理为档案');return;}
    go('#/profile');
    // hash 路由异步触发 render，必须在新页面渲染后再写入草稿。
    setTimeout(()=>{
      const field=$('v5-student-text');
      if(!field){toast('建档页面尚未就绪，请进入「我的 → 智能建档」');return;}
      if(field.value.trim() && field.value.trim()!==raw && !confirm('当前资料草稿和首页对话不同。用对话内容替换草稿并重新生成待确认预览吗？'))return;
      field.value=raw;
      v5KeepText('student',raw);
      v5Analyze('student');
    },80);
  };
  const baseHome=PAGES.home;
  PAGES.home=function(){
    const html=baseHome();
    if(T.role!=='student')return html;
    // 仍坚持“首页只有 AI 对话”，清理旧版本额外插入的快捷入口。
    const cleaned=html.replace(/<div class="v4-quick">[\s\S]*?<\/div><div class="v4-quick-note">[\s\S]*?<\/div>/,'');
    const hasDraft=!!String(T.bg.raw||'').trim();
    const helper='<div class="v6-ai-helper">'+(hasDraft?'<div><b>'+(T.profileReady()?'BG 已确认 · 可继续完善':'已记录你的描述 · 待核对')+'</b><small>聊天内容只作为草稿，不会未经你确认就写入正式档案</small></div><button type="button" onclick="v6PrepareConversation()">整理为 BG ›</button>':'<div><b>自然语言填写 BG</b><small>可以先聊，也可以前往「我的」上传简历与语音口述</small></div>')+'</div>';
    return cleaned.replace('<div class="tl-v3-disclaimer">',helper+'<div class="tl-v3-disclaimer">');
  };
  const oldProfile=PAGES.profile;
  PAGES.profile=function(){
    const html=oldProfile();if(T.role!=='student')return html;
    const source=String(T.bg.raw||'').trim();
    const top='<div class="v6-card v6-soft"><b>同一份 BG，三个入口</b><p>首页对话、自由描述、简历与语音最终整理到同一份可编辑档案。所有识别结果都需要你主动确认。</p>'+(source?'<button class="v6-secondary" onclick="v6PrepareConversation()">将首页对话导入下方识别预览 ›</button>':'')+'</div>';
    return html.replace('<div class="v5-card"',top+'<div class="v5-card"');
  };
  const oldProvider=PAGES.provider;
  PAGES.provider=function(){
    const html=oldProvider();if(T.role==='guest')return html;
    const block='<div class="v6-card v6-trust"><h3>资料可信度如何判断？</h3><div class="v6-trust-row"><span>个人申报</span><small>来自服务者自填或简历提取，未经审核</small></div><div class="v6-trust-row"><span>待平台核验</span><small>可申请核验学历、成果与经授权的辅导案例</small></div><div class="v6-trust-row"><span>平台服务记录</span><small>正式上线后由真实订单、交付和评价产生，不可自行填写</small></div><p class="v6-note">服务者资料由本人申报，页面上的核验状态只表示提交进度，不构成能力或录取结论。</p></div>';
    return html.replace('<div class="page tl-v2-page v4-page">','<div class="page tl-v2-page v4-page">'+block)
      .replace('<h3>真实服务案例</h3>','<h3>服务案例</h3>')
      .replace(/已核验/g,'待核实')
      .replace(/条真实评价/g,'条评价');
  };
  const oldMentorProfile=PAGES.mentorProfile;
  PAGES.mentorProfile=function(){
    const html=oldMentorProfile();if(T.role!=='mentor')return html;
    const trust='<div class="v6-card"><h3>资质证明与服务记录 · 预留</h3><p>整理学历、获奖证明、脱敏授权案例后，可在正式平台提交审核。当前不会上传、验证或公开文件。</p><div class="v6-trust-row"><span>个人申报</span><small>可以修改，并可生成介绍草稿</small></div><div class="v6-trust-row"><span>平台核验</span><small>尚未接入审核流程</small></div><div class="v6-trust-row"><span>真实订单</span><small>尚未接入服务数据库，次数不允许手填为认证</small></div><div class="v6-placeholder">预留接口：/api/v1/mentors/me/verification /api/v1/orders/stats</div></div>';
    return html.replace('<div class="v5-card"',trust+'<div class="v5-card"');
  };
  function buildPlanSuggestions(){
    if(!T.profileReady())return [];
    const grade=T.bg.grade||'未填', goals=T.bg.goals||[], raw=T.bg.raw||'';
    const items=[];
    const add=(id,cat,title,detail)=>items.push({id,cat,title,detail,source:'基于已确认的 '+grade+'、'+cat+' 目标（本地规则）'});
    if(goals.includes('保研')){
      if(grade==='大一'||grade==='大二')add('v6-early-bg','保研','建立可以持续更新的经历清单','把课程、英语、项目与个人贡献记录到档案；按学期回顾，不预设学校截止日。');
      else add('v6-later-apply','保研','核对目标项目的官方通知','把最新招生条件和截止日期关联到投递记录，避免按往年时间做决定。');
    }
    if(goals.includes('竞赛'))add('v6-competition','竞赛','建立竞赛准备与复盘计划','记录组队、练习、作品提交和赛后复盘，实际报名日期以主办方公告为准。');
    if(goals.includes('科研'))add('v6-research','科研','整理项目证据与个人贡献','写清研究问题、方法、你的贡献、可核实成果和待完善的地方。');
    if(goals.includes('学业'))add('v6-study','学业','梳理本学期课程与英语安排','结合课程进度安排复习与自测，不使用虚构绩点预测。');
    const school=(V4.state.targets||{}).schools||'';
    if(school.trim())add('v6-target-program','院校投递','核实意向院校申请条件','当前意向：'+school.slice(0,85)+'。核实专业要求及发布渠道，再由你确认自己的截止时间。');
    return items.slice(0,5);
  }
  function planSuggestionCard(){
    if(!T.profileReady())return '<section class="v6-card v6-soft"><h3>AI 成长规划 · 待解锁</h3><p>确认年级、个人 BG 与诉求后，这里会提供可采纳的参考任务。不会在未确认资料前擅自制定个人计划。</p><button class="v6-secondary" onclick="go(\'#/profile\')">完善个人 BG ›</button></section>';
    const suggested=buildPlanSuggestions().filter(x=>!store.accepted.includes(x.id));
    const accepted=store.extraTasks||[];
    return '<section class="v6-card"><div class="v6-card-head"><h3>成长规划建议</h3><span class="v6-pill">待你确认</span></div><p>依据已确认 BG、目标和现有投递记录提出参考任务。当前为本地规则模板，未来支持 AI 提议；不会自动修改你的日程。</p>'+
      (suggested.length?suggested.map(it=>'<div class="v6-task"><span class="v6-pill">'+H(it.cat)+'</span><b>'+H(it.title)+'</b><p>'+H(it.detail)+'</p><small>'+H(it.source)+'</small><button onclick="v6AcceptPlan(\''+it.id+'\')">加入我的计划 ›</button></div>').join(''):'<p class="v6-empty">当前的建议已处理。你可以继续完善 BG 或变更目标，下一轮再核对新的计划。</p>')+
      '<h4>我已采纳的任务 · '+accepted.length+'</h4>'+(accepted.length?accepted.map(it=>'<div class="v6-task confirmed"><b>'+H(it.title)+'</b><p>'+H(it.detail)+'</p><div class="v6-task-edit"><label>状态 <select onchange="v6EditPlan(\''+it.id+'\',\'status\',this.value)">'+['未开始','进行中','已完成'].map(s=>'<option'+(s===(it.status||'未开始')?' selected':'')+'>'+s+'</option>').join('')+'</select></label><label>自设截止日 <input type="date" value="'+H(it.due||'')+'" onchange="v6EditPlan(\''+it.id+'\',\'due\',this.value)"></label></div><button class="v6-textbtn" onclick="v6DropPlan(\''+it.id+'\')">从我的计划移除</button></div>').join(''):'<p class="v6-muted">采纳后会显示在这里，可设自己的截止日与完成状态。</p>')+
      '<p class="v6-note">自动规划与学校真实日期不是一回事；重要时间请核实官方公告。</p></section>';
  }
  window.v6AcceptPlan=function(id){const it=buildPlanSuggestions().find(x=>x.id===id);if(!it)return;store.extraTasks=store.extraTasks.filter(t=>t.id!==id);store.extraTasks.push({...it,status:'未开始',due:'',acceptedAt:formatDate()});if(!store.accepted.includes(id))store.accepted.push(id);if(persist()){toast('已加入个人计划，可修改进度和截止日期');render();}};
  window.v6EditPlan=function(id,key,value){const it=store.extraTasks.find(x=>x.id===id);if(!it)return;if(key==='status'&&!['未开始','进行中','已完成'].includes(value))return;if(key==='due'&&value&&!/^\d{4}-\d{2}-\d{2}$/.test(value))return;it[key]=value;persist();render();};
  window.v6DropPlan=function(id){store.extraTasks=store.extraTasks.filter(x=>x.id!==id);store.accepted=store.accepted.filter(x=>x!==id);persist();render();};
  
  const oldMe=PAGES.me;
  PAGES.me=function(){
    const html=oldMe();if(T.role!=='student')return html;
    return html.replace('<section class="tl-v3-card"><h3>我的收藏与投递</h3>',planSuggestionCard()+'<section class="tl-v3-card"><h3>我的收藏与投递</h3>')
      .replace('<section class="tl-v3-card"><h3>资料与档案</h3>', '<section class="tl-v3-card"><h3>资料与档案</h3><button class="tl-v2-link-row" onclick="go(\'#/experience\')">真实经验库 · 未来 RAG <span>进入 ›</span></button>')
      .replace('<div class="tl-v2-footnote">', '<section class="tl-v3-card"><h3>隐私与本机资料</h3><button class="tl-v2-link-row" onclick="go(\'#/dataCenter\')">资料管理与接口状态 <span>查看 / 导出 / 清理 ›</span></button></section><div class="tl-v2-footnote">');
  };
  const oldSchool=PAGES.school;
  PAGES.school=function(){const html=oldSchool();if(T.role!=='student')return html;return html.replace('<div class="v4-kicker">ADMISSION INTELLIGENCE</div>','<div class="v4-kicker">ADMISSION INTELLIGENCE</div><div class="v6-school-shortcut"><button onclick="go(\'#/experience\')">保研经验库 · 探索来源化经验 ›</button></div>');};
  const oldMentorMe=PAGES.mentorMe;
  PAGES.mentorMe=function(){const html=oldMentorMe();if(T.role!=='mentor')return html;return html.replace('<div class="tl-v2-footnote">','<section class="v6-card"><h3>数据与核验管理</h3><p>当前服务次数、学历核验和资质审核均为占位，未连接真实后台。</p><button class="v6-secondary" onclick="go(\'#/dataCenter\')">查看资料管理与接口状态 ›</button></section><div class="tl-v2-footnote">');};
  
  function dataCenter(){
    if(T.role==='guest')return '<div class="page tl-v2-page v4-page"><div class="v6-card"><h3>游客没有个人档案</h3><p>请选择身份后再使用资料管理。</p><button class="v6-secondary" onclick="go(\'#/choose\')">选择身份 ›</button></div></div>';
    const keys=KEY_GROUP.filter(k=>{try{return localStorage.getItem(k)!==null;}catch(_){return false;}});
    return '<div class="page tl-v2-page v4-page"><div class="v4-kicker">DATA & PERMISSIONS</div><h1 class="v4-h1">我的资料与权限</h1><p class="v4-sub">数据目前只存在本机浏览器，尚未建立账号或云数据库。不要存入真实身份证、电话、未授权的简历或完整辅导案例。</p>'+
      '<div class="v6-card"><h3>数据存放位置</h3><p>目前只保存在这台设备的浏览器 localStorage。无法自动跨设备同步，也不能当作正式备份。</p><div class="v6-trust-row"><span>本机记录</span><small>'+keys.length+' 组 · 仅本机</small></div><div class="v6-trust-row"><span>身份与访问</span><small>仅前端角色切换，尚无真实鉴权</small></div><div class="v6-trust-row"><span>模型调用</span><small>关闭 · 尚未接入后台或发送简历</small></div><div class="v6-trust-row"><span>数据库</span><small>未连接 · 仅预留接口约定</small></div></div>'+
      '<div class="v6-card"><h3>将来的数据处理授权（仅记录偏好）</h3><label class="v6-toggle"><input type="checkbox" '+(store.consent.model?'checked':'')+' onchange="v6Consent(\'model\',this.checked)"><span>未来允许在明确告知后，将必要的 BG 字段交给 AI 模型处理</span></label><label class="v6-toggle"><input type="checkbox" '+(store.consent.sharing?'checked':'')+' onchange="v6Consent(\'sharing\',this.checked)"><span>未来允许将我选定的必要信息分享给我主动联系的服务者</span></label><p class="v6-note">这些勾选只影响本地界面展示，不代表已取得正式版法律授权，也不会触发任何传输。正式版应重新单独告知、获得有效授权并支持随时撤回。</p></div>'+
      '<div class="v6-card"><h3>数据管理</h3><p>仅导出本机已有的记录，文件可能包含你输入的内容，请自行安全保管。</p><div class="v6-actions"><button class="v6-secondary" onclick="v6ExportData()">导出本机记录</button><button class="v6-danger" onclick="v6ClearData()">清除本机记录</button></div></div>'+
      '<div class="v6-card v6-soft"><h3>正式版服务预留</h3><p>统一通过后端保存和授权处理；不直接将 API Key 放进 H5。接口草案见压缩包内 <code>docs/API_INTEGRATION.md</code>。</p><div class="v6-placeholder">/api/v1/auth · /api/v1/profiles · /api/v1/ai/extract · /api/v1/mentors · /api/v1/experience</div></div></div>';
  }
  window.v6Consent=function(key,checked){if(Object.prototype.hasOwnProperty.call(store.consent,key)){store.consent[key]=!!checked;persist();}};
  window.v6ExportData=function(){if(!confirm('将下载含你输入内容的本地 JSON 文件。请在安全设备上保存，确认导出吗？'))return;const data={schema:'tonglu-demo-export-v1',generatedAt:new Date().toISOString(),records:{}};for(const key of KEY_GROUP){try{const val=localStorage.getItem(key);if(val!==null)data.records[key]=JSON.parse(val);}catch(_){}}
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='tonglu-local-demo-export.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);toast('已生成本机数据导出文件');};
  window.v6ClearData=function(){if(!confirm('确定清除同路此原型的本机 BG、收藏、投递、任务和草稿吗？此操作不可撤销。'))return;if(!confirm('再次确认：清除后刷新页面才能以空白状态开始，是否继续？'))return;for(const key of KEY_GROUP){try{localStorage.removeItem(key);}catch(_){}}location.reload();};
  PAGES.experience=experiencePage;PAGES.dataCenter=dataCenter;
  NAV.experience={title:'保研经验库'};NAV.dataCenter={title:'资料与数据管理'};
  if(!SCREENS.some(x=>x.key==='experience'))SCREENS.push({no:'D6',key:'experience',title:'经验检索与来源示例',prd:'V6'});
  if(!SCREENS.some(x=>x.key==='dataCenter'))SCREENS.push({no:'D7',key:'dataCenter',title:'本机资料与接口占位',prd:'V6'});
  window.__TLV6={getExperienceCases:()=>exampleCases.slice(),getPlanSuggestions:buildPlanSuggestions,getStore:()=>JSON.parse(JSON.stringify(store))};
})();
