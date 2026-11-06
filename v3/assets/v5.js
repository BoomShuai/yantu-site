/* 同路 V5 · 学生与服务者智能资料录入体验
 * 仅本地演示：规则提取，不调用真实大模型；PDF/Word 不读取正文；无后台身份认证。
 * 依赖：role-v3.js / v4.js；保留原有申请、服务、收藏、时间轴流程。
 */
(function () {
  'use strict';
  const T = window.__TL, V4 = window.__TLV4;
  if (!T || !V4) return;
  const STORE = 'tonglu-v5-intake-draft';
  const blank = () => ({ text:'', files:[], fields:{}, preview:false, confirmed:false, intro:'', source:'', question:'' });
  let state = {student:blank(), mentor:blank()};
  try {
    const o=JSON.parse(localStorage.getItem(STORE)||'{}');
    ['student','mentor'].forEach(k=>{if(o[k]&&typeof o[k]==='object')state[k]={...blank(),...o[k],files:Array.isArray(o[k].files)?o[k].files.slice(0,5):[]};});
  } catch(e){}
  let voice=null;
  const E=v=>escapeTL(String(v==null?'':v));
  const $=id=>document.getElementById(id);
  const clip=(v,n=400)=>String(v||'').trim().slice(0,n);
  function persist(){try{localStorage.setItem(STORE,JSON.stringify(state));return true;}catch(e){toast('本地存储不可用，内容可能不会保留');return false;}}
  function read(id){const e=$(id);return e?String(e.value||''):'';}
  function getText(k){return read('v5-'+k+'-text')||state[k].text;}
  function one(text,regex){const m=String(text).match(regex);return m?clip(m[1],90):'';}
  function excerpt(text,rx){const ss=String(text).split(/[。；;\n]/).map(x=>x.trim());return clip(ss.find(x=>rx.test(x))||'',240);}
  function detectGrade(text){const m=String(text).match(/(?:大|本科)\s*([一二三四五12345])/);if(!m)return '';const n={'1':'大一','2':'大二','3':'大三','4':'大四','5':'大五','一':'大一','二':'大二','三':'大三','四':'大四','五':'大五'};return n[m[1]]||'';}
  function detectGoals(text){const out=[];if(/保研|推免|夏令营|预推免|升学/.test(text))out.push('保研');if(/竞赛|比赛|建模|挑战杯/.test(text))out.push('竞赛');if(/科研|论文|研究|课题/.test(text))out.push('科研');if(/课程|英语|学业|绩点/.test(text))out.push('学业');return out.join('、');}
  function guessSchool(text){return one(text,/(?:本科(?:院校|学校|就读于|毕业于)?|就读于|毕业于|我(?:是|在|来自))\s*[：:\s]*([\u4e00-\u9fa5]{2,18}?(?:大学|学院))/);}
  function parseStudent(text){
    const school=one(text,/本科(?:院校|学校)\s*[：:]\s*([^，,。；;\n]{2,30})/)||guessSchool(text);
    const major=one(text,/本科专业\s*[：:\s]*([^，,。；;\n]{2,28})/)||one(text,/(?:大学|学院)([\u4e00-\u9fa5]{2,20}?)(?:专业|系)/)||one(text,/我(?:是|读)\s*([^，,。；;\n]{2,24}?)(?:专业|方向)/);
    return {
      school,major,grade:detectGrade(text),
      rank:one(text,/(排名(?:前|第)?\s*[\d.]+(?:\s*%|\s*\/\s*\d+|\s*名)?)/)||one(text,/(GPA\s*[:：]?\s*[\d.]+)/i),
      research:excerpt(text,/科研|课题|研究|大创|论文|实验室/),
      contest:excerpt(text,/竞赛|比赛|建模|获奖|国奖|省奖/),
      goals:detectGoals(text),
      targetSchool:one(text,/(?:目标院校|申请院校|想去|希望去|保研到)\s*[：:\s]*([\u4e00-\u9fa5]{2,18}?(?:大学|学院))/),
      targetMajor:one(text,/(?:目标专业|申请专业|意向专业)\s*[：:]\s*([^，,。；;\n]{2,28})/),
      direction:one(text,/(?:研究方向|意向方向)\s*[：:]\s*([^，,。；;\n]{2,30})/)
    };
  }
  function parseMentor(text){
    return {
      name:one(text,/(?:称呼|姓名|我叫)\s*[：:\s]*([^，,。；;\n]{2,14})/),
      school:one(text,/(?:本科(?:院校|学校|毕业于)|毕业于)\s*[：:\s]*([\u4e00-\u9fa5]{2,18}?(?:大学|学院))/)||guessSchool(text),
      major:one(text,/本科专业\s*[：:\s]*([^，,。；;\n]{2,30})/)||one(text,/(?:大学|学院)([\u4e00-\u9fa5]{2,18}?)(?:专业|系)/),
      destination:one(text,/(?:保研到|升学去向|就读于|考入)\s*[：:\s]*([^，,。；;\n]{2,38})/),
      achievements:excerpt(text,/论文|竞赛|国奖|省奖|获奖|科研|SCI|SSCI/i),
      services:one(text,/(?:擅长|服务方向|辅导方向|提供)\s*[：:\s]*([^，,。；;\n]{2,80})/)||excerpt(text,/材料诊断|院校规划|科研辅导|面试辅导|申请指导/),
      served:one(text,/(?:辅导过|服务过|指导过|辅导)\s*(\d+\s*(?:位|名|人)\s*(?:学生|同学)?)/),
      results:excerpt(text,/录取|上岸|去向|最终结果|保研成功/),
      experience:one(text,/(?:个人经验(?:是)?|我的经验(?:是)?|经验是)\s*[：:\s]*([^。；;\n]{2,120})/)||excerpt(text,/个人经验|方法|策略|心得|经验|复盘/),
      cases:excerpt(text,/案例|曾帮助|服务对象|指导学生|学生背景/)
    };
  }
  const CFG={
    student:[['school','本科院校'],['major','本科专业'],['grade','当前年级'],['rank','成绩 / 排名'],['research','科研经历'],['contest','竞赛经历'],['goals','目标与诉求'],['targetSchool','目标院校'],['targetMajor','目标专业'],['direction','研究方向']],
    mentor:[['name','展示姓名或称呼'],['school','本科院校'],['major','本科专业'],['destination','升学去向'],['achievements','科研 / 竞赛成果'],['services','擅长辅导方向'],['served','历史辅导人数（个人申报）'],['results','历史辅导结果（个人申报）'],['experience','个人辅导经验'],['cases','典型服务案例（需脱敏）']]
  };
  const large=new Set(['research','contest','goals','achievements','services','results','experience','cases']);
  function missingQuestion(k,fields){
    if(k==='student'){
      if(!fields.school&&!fields.major)return '你本科就读哪所学校、什么专业？';
      if(!fields.grade)return '你现在大几？这会影响保研和竞赛的规划阶段。';
      if(!fields.goals)return '你现在最希望获得哪些帮助？例如保研、科研、竞赛或学业规划。';
      if(!fields.targetSchool)return '有目标院校或目标方向吗？暂时没有也可以先留空。';
      return '科研、竞赛或排名有需要补充的细节吗？你也可以直接确认当前档案。';
    }
    if(!fields.school||!fields.destination)return '请补充本科院校、专业和实际升学去向。';
    if(!fields.services)return '你最擅长哪些辅导内容？请结合实际经历描述。';
    if(!fields.experience)return '你有哪些亲身经验或常用的辅导方法？';
    if(fields.served&&!fields.cases)return '辅导人数是个人申报，可否补充一项经过授权且去标识化的真实案例？';
    return '如果有证明材料可以后续申请核验；无法证明的成果仍保留“个人申报”。';
  }
  function formatPreview(k){
    const s=state[k];if(!s.preview)return '';
    const labels=CFG[k];
    const body=labels.map(([id,label])=>{
      const value=s.fields[id]||'';
      return '<label class="v5-field"><span>'+E(label)+'</span>'+(large.has(id)?'<textarea id="v5-'+k+'-'+id+'" rows="2" maxlength="420">'+E(value)+'</textarea>':'<input id="v5-'+k+'-'+id+'" maxlength="150" value="'+E(value)+'" placeholder="未识别，可自行补充">')+'</label>';
    }).join('');
    return '<section class="v5-preview"><div class="v5-section-head"><b>资料草稿</b><span>确认后保存</span></div>'+
      '<p class="v5-sub">根据文字描述整理的本地演示草稿。无需对照原文；如需使用，可修改后确认保存。PDF / Word 正文暂不识别。</p>'+
      '<div class="v5-preview-fields">'+body+'</div>'+
      '<div class="v5-followup"><b>建议补充追问</b><p>'+E(missingQuestion(k,s.fields))+'</p></div>'+
      (k==='mentor'?'<div class="v5-trust"><b>信息状态：</b>个人申报 / 待平台核验。AI 自动整理 ≠ 证书、学历、服务结果核验。平台完成服务次数：—（未来从真实订单自动统计）。</div>':'')+
      (k==='mentor'?'<button type="button" class="v5-btn v5-secondary" onclick="v5MakeIntro()">根据已填写事实生成服务者介绍</button>'+(s.intro?'<div class="v5-intro"><b>介绍草稿 · 可人工编辑</b><textarea id="v5-mentor-intro" rows="4" maxlength="600">'+E(s.intro)+'</textarea><small>仅根据已填写资料生成，不添加虚构荣誉或服务结果。</small></div>':''):'')+
      '<button type="button" class="v5-btn v5-primary" onclick="v5Confirm(\''+k+'\')">确认资料并保存到'+(k==='student'?'学生 BG':'服务者档案')+'</button>'+
      '<p class="v5-sub">资料不完整也可保存草稿。学生端只有确认年级、背景和诉求后才会开启个性化推荐与时间轴。</p></section>';
  }
  function fileRows(k){
    const files=state[k].files;
    if(!files.length)return '<p class="v5-sub">尚未选择简历。可先用文字描述，之后再补。</p>';
    return files.map((f,i)=>'<div class="v5-file"><span>▤</span><div><b>'+E(f.name)+'</b><small>'+E(f.status)+'</small></div><button type="button" onclick="v5RemoveFile(\''+k+'\','+i+')">移除</button></div>').join('');
  }
  function intakeCard(k){
    const s=state[k], mentor=k==='mentor';
    const guide=mentor?'可以写：本科院校与专业、升学去向、科研成果、擅长辅导方向、曾服务对象的类型、具体帮助、结果和个人经验。不要提交其他学生的实名资料。':'可以写：本科院校、专业、年级、排名、科研竞赛、目标院校及你最希望解决的问题，不要求按固定顺序。';
    return '<div class="v5-card" id="v5-intake"><div class="v5-eyebrow">AI PROFILE STUDIO · 本地体验</div><h2>'+(mentor?'智能完善服务者资料':'用你习惯的方式完善 BG')+'</h2>'+
      '<p class="v5-sub">规范表单仍保留在下方。上传简历后先显示文件状态，不展开核对界面；自由文字和语音可按需整理为草稿。</p>'+
      '<div class="v5-input-modes"><span><b>01</b> 自由描述</span><span><b>02</b> 上传简历</span><span><b>03</b> 语音口述</span></div>'+
      '<label class="v5-field"><span>自由输入 · 想写什么都可以</span><textarea id="v5-'+k+'-text" rows="5" maxlength="6000" placeholder="'+E(guide)+'" oninput="v5KeepText(\''+k+'\',this.value)">'+E(s.text)+'</textarea></label>'+
      '<div class="v5-voicebar"><button type="button" class="v5-btn v5-secondary" onclick="v5Voice(\''+k+'\')">语音转文字</button><span id="v5-'+k+'-voice-status">支持情况取决于手机浏览器，必要时可直接打字</span></div>'+
      '<label class="v5-upload"><b>选择简历 / 经历说明文件</b><small>PDF / Word / TXT / MD，最多 5 份，单份不超过 8 MB</small><input type="file" accept=".pdf,.doc,.docx,.txt,.md" multiple onchange="v5ChooseFiles(\''+k+'\',event)" /></label>'+
      fileRows(k)+
      '<div class="v5-local">隐私提示：此演示不会上传简历文件；TXT / MD 可在本地读取文字。PDF / Word 仅登记文件信息，须接入后端解析与大模型后才能自动识别正文。语音识别可能使用浏览器或系统的语音服务，请勿输入真实敏感资料。</div>'+
      '<button type="button" class="v5-btn v5-primary" onclick="v5Analyze(\''+k+'\')">整理文字资料（演示）</button>'+
      formatPreview(k)+
      '<div class="v5-bottom-note"><b>正式版预留：</b>文档解析 → 模型结构化提取 → 缺失项追问 → 用户确认 → 安全保存。未经平台核验的信息不显示认证标识。</div></div>';
  }
  function syncFields(k){
    if(!state[k].preview)return;
    CFG[k].forEach(([id])=>{const el=$('v5-'+k+'-'+id);if(el)state[k].fields[id]=clip(el.value,500);});
    if(k==='mentor'&&$('v5-mentor-intro'))state.mentor.intro=clip($('v5-mentor-intro').value,600);
    persist();
  }
  window.v5KeepText=function(k,value){if(!state[k])return;const changed=state[k].text!==clip(value,6000);state[k].text=clip(value,6000);if(changed&&state[k].preview){state[k].preview=false;const el=document.querySelector('.v5-preview');if(el)el.remove();}persist();};
  window.v5RemoveFile=function(k,i){if(!state[k])return;state[k].files.splice(i,1);persist();render();};
  window.v5ChooseFiles=async function(k,event){
    const selected=Array.from(event.target.files||[]);if(!selected.length)return;
    let out=[];
    for(const f of selected){
      if(state[k].files.length>=5){toast('最多保留 5 份文件');break;}
      if(f.size>8*1024*1024){toast('请使用不超过 8 MB 的文件');continue;}
      if(!/\.(pdf|doc|docx|txt|md)$/i.test(f.name)){toast('目前仅支持选择 PDF、Word、TXT 或 MD');continue;}
      const isText=/\.(txt|md)$/i.test(f.name);
      state[k].files.push({name:clip(f.name,100),status:isText?'可本地读取文字':'待接入后端解析 PDF / Word 正文'});
      if(isText){try{out.push((await f.text()).slice(0,4500));}catch(e){toast('文本读取失败，请复制内容到输入框');}}
    }
    if(out.length){state[k].text=clip([state[k].text,...out].filter(Boolean).join('\n'),6000);}state[k].preview=false;
    persist();render();toast(out.length?'已读取文本，暂不自动展开核对；需要时可整理为草稿':'已记录文件，PDF/Word 正文尚未解析');
  };
  window.v5Voice=function(k){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){toast('当前浏览器不支持此语音入口，请使用文字输入');return;}
    if(voice){try{voice.stop();}catch(e){}voice=null;return;}
    let rec=new SR();voice=rec;rec.lang='zh-CN';rec.interimResults=false;rec.continuous=false;
    const status=$('v5-'+k+'-voice-status');if(status)status.textContent='正在倾听…再次点击可停止';
    rec.onresult=e=>{const t=Array.from(e.results).map(v=>v[0]&&v[0].transcript||'').join(' ');state[k].text=clip((state[k].text+'\n'+t).trim(),6000);state[k].preview=false;persist();render();toast('已转为文字，可继续补充描述');};
    rec.onerror=e=>{toast('语音识别未完成：'+(e.error||'请检查麦克风权限'));};
    rec.onend=()=>{voice=null;const s=$('v5-'+k+'-voice-status');if(s)s.textContent='语音已结束，可继续打字';};
    try{rec.start();}catch(e){voice=null;toast('无法启动语音，请检查麦克风权限');}
  };
  window.v5Analyze=function(k){
    const text=getText(k);if(!text.trim()){toast('请先输入或粘贴文字；PDF/Word 当前无法直接解析正文');return;}
    state[k].text=clip(text,6000);
    const parsed=k==='student'?parseStudent(text):parseMentor(text);
    const existing=state[k].fields||{};
    state[k].fields={...existing};
    Object.keys(parsed).forEach(field=>{if(parsed[field])state[k].fields[field]=parsed[field];});
    state[k].preview=true;state[k].confirmed=false;state[k].intro='';
    state[k].source=state[k].files.some(f=>/可本地读取/.test(f.status))?'文字描述 + 本地 TXT/MD':'自由文字 / 语音转写';
    state[k].question=missingQuestion(k,state[k].fields);persist();render();
    const el=$('v5-intake');if(el)el.scrollIntoView({block:'start',behavior:'smooth'});
    toast('已整理文字草稿；如需保存，请确认必要字段');
  };
  window.v5MakeIntro=function(){
    syncFields('mentor');const f=state.mentor.fields||{};
    const parts=[];
    if(f.school||f.major)parts.push('本科背景：'+[f.school,f.major].filter(Boolean).join(' · '));
    if(f.destination)parts.push('升学去向：'+f.destination);
    if(f.achievements)parts.push('个人成果：'+f.achievements);
    if(f.services)parts.push('可提供的服务：'+f.services);
    if(f.experience)parts.push('辅导经验：'+f.experience);
    if(f.served)parts.push('历史辅导人数（个人申报，待核验）：'+f.served);
    if(f.results)parts.push('辅导结果（个人申报，待核验）：'+f.results);
    state.mentor.intro=clip(parts.join('。')+(parts.length?'。':''),600);
    persist();render();toast('已根据填写事实整理介绍草稿');
  };
  window.v5Confirm=function(k){
    syncFields(k);const f=state[k].fields||{};
    if(k==='student'){
      const bg=T.bg;
      const pieces=[f.school?'本科院校：'+f.school:'',f.major?'本科专业：'+f.major:'',f.grade?'当前年级：'+f.grade:'',f.rank?'成绩排名：'+f.rank:'',f.research?'科研经历：'+f.research:'',f.contest?'竞赛经历：'+f.contest:'',f.goals?'目标与诉求：'+f.goals:'',f.targetSchool?'目标院校：'+f.targetSchool:'',f.targetMajor?'目标专业：'+f.targetMajor:'',f.direction?'研究方向：'+f.direction:''].filter(Boolean);
      if(!pieces.length){toast('请至少确认一项个人背景信息');return;}
      bg.raw=clip(pieces.join('；'),3500);
      const grades=['大一','大二','大三','大四','大五'];bg.grade=grades.includes(f.grade)?f.grade:'';
      bg.goals=['保研','竞赛','科研','学业'].filter(x=>(f.goals||'').includes(x));
      bg.confirmed=!!(f.school||f.major)&&!!bg.grade&&bg.goals.length>0&&T.hasBackground(bg.raw);
      bg.updatedAt=new Date().toISOString();
      if(!T.persistBG()){return;}
      const st=V4.state.targets;
      st.undergrad=clip(f.major||st.undergrad,40);
      st.major=clip(f.targetMajor||st.major,40);
      st.schools=clip(f.targetSchool||st.schools,80);
      st.direction=clip(f.direction||st.direction,40);
      V4.persist();
      state.student.confirmed=true;persist();render();
      toast(bg.confirmed?'BG 已确认，推荐与时间轴已解锁':'草稿已保存，补充年级与目标后可解锁个性化内容');
    } else {
      const basic={name:clip(f.name,120),school:clip(f.school,120),major:clip(f.major,120),destination:clip(f.destination,120),services:clip(f.services,120),bio:clip([f.achievements,f.experience].filter(Boolean).join('；'),300)};
      if(!Object.values(basic).some(Boolean)){toast('请至少补充一项服务者资料');return;}
      if(!T.persistMentor(basic))return;
      state.mentor.confirmed=true;persist();render();
      toast('服务者资料已保存为个人申报，尚未平台核验');
    }
  };

  /* 不覆盖既有路由或功能，只扩展两个资料页。 */
  const oldStudent=PAGES.profile;
  const oldMentor=PAGES.mentorProfile;
  PAGES.profile=function(){
    const html=oldStudent();
    if(T.role!=='student')return html;
    return html.replace('<div class="v4-card"><div class="v4-head"><h3>申请目标</h3>',intakeCard('student')+'<div class="v4-card"><div class="v4-head"><h3>申请目标</h3>');
  };
  PAGES.mentorProfile=function(){
    const html=oldMentor();
    if(T.role!=='mentor')return html;
    return html.replace('<form class="tl-v2-profile-form"',intakeCard('mentor')+'<div class="v5-manual-heading"><b>规范化表单 · 手动核对与修改</b><small>与上方智能录入互为补充</small></div><form class="tl-v2-profile-form"');
  };
  /* 继承 V4 的完整筛选与收藏，只恢复“确认 BG 后顶部 3 位优先推荐”区域。 */
  const oldProviders=PAGES.providers;
  PAGES.providers=function(){
    const html=oldProviders();
    if(T.role!=='student'||!T.profileReady()||S.providerView==='saved'||S.v4Search||S.providerFilter!=='全部'||S.v4Identity!=='全部')return html;
    const picks=M.providers.slice().sort((a,b)=>{
      const available=(remain(b)>0?1:0)-(remain(a)>0?1:0);
      return available||T.recommendationWeight(b)-T.recommendationWeight(a);
    }).slice(0,3);
    if(!picks.length)return html;
    const rec='<div class="v5-recommended v4-card flat"><div class="v4-head"><h3>优先为你推荐</h3><span class="v4-count">'+picks.length+' 位 · 规则演示</span></div>'+
      '<p class="v5-sub">基于你确认的 BG 和服务方向做关键词排序，不代表录取概率、正式匹配度或服务者核验结果。</p>'+
      picks.map(p=>'<button type="button" class="v5-pick" onclick="v4Open(\''+p.id+'\')"><span class="v5-avatar">'+E(p.name.slice(0,1))+'</span><span><b>'+E(p.name)+'</b><small>'+E(T.recommendationReason(p))+'</small></span><strong>详情 ›</strong></button>').join('')+'</div>';
    return html.replace('<div class="tl-switch">',rec+'<div class="tl-switch">');
  };
  const oldMe=PAGES.me;
  PAGES.me=function(){return oldMe().replace('补充资料与申请目标','AI 智能建档 · 文字 / 简历 / 语音');};
  NAV.profile={title:'学生智能建档'};
  NAV.mentorProfile={title:'服务者智能建档'};
})();
