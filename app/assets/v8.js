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
  const canReadChat=c=>T.role!=='mentor'||!!(c&&window.TongluMarket?.auth()?.mentorId===c.providerId);
  const currentChat=()=>consults().find(c=>c.id===activeId()&&canReadChat(c))||null;
  const persistChats=()=>{try{localStorage.setItem(CHAT_KEY,JSON.stringify(consults().slice(0,60)));return true;}catch(e){toast('消息未能保存，请检查设备存储空间后重试');return false;}};
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

  /* 服务者注册与资料完善：简历大框上传 + 个人信息/辅导经验 + 学历证明/入营 + 能力/条件 + 证书/经验 */
  const MBTI=['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'];
  const TEACHING_YEARS=['暂无辅导经验（新入驻）','1 年以内','1–2 年','2–3 年','3–5 年','5 年以上'];
  const CAPABILITY_GROUPS=[
    {group:'简历润色',items:['简历结构优化','科研经历表达','竞赛经历表达','个人陈述修改']},
    {group:'面试模拟',items:['综合面试','专业课面试','英语面试','面试复盘']},
    {group:'科研竞赛规划（保研延伸）',items:['已有项目经历梳理','文献阅读复盘','大创经历表达','竞赛经历复盘']},
    {group:'保研规划辅导',items:['院校定位','夏令营申请','预推免申请','全流程规划']}
  ];
  const mentorSteps=[
    {title:'基本信息',sub:'上传个人简历或填写个人信息与辅导经验',fields:['name','teachingYears','mbti','specialty','bio']},
    {title:'学历与入营',sub:'填写教育背景、上传学历证明及入营情况',fields:['school','major','destination','educationProof','summerCamp','preAdmission']},
    {title:'服务能力',sub:'写明你的能力、可提供的服务与接单条件',fields:['capabilities','services','conditions','slots']},
    {title:'证书与经验',sub:'补充科研成果、获奖证书与历史辅导经验',fields:['achievements','certificates','certFiles','servedTypes','served','experience','cases']}
  ];
  const fieldMeta={
    name:['姓名或称呼 *','input','例如：陈同学'],
    teachingYears:['辅导经验 *','select',''],
    mbti:['MBTI 性格类型（选填）','select',''],
    specialty:['个人特长','input','例如：跨专业保研规划、英文面试模拟、科研经历表达'],
    bio:['个人简介','textarea','简单介绍你的学习经历、辅导风格与优势'],
    school:['本科院校 *','input','例如：天津大学'],
    major:['本科专业 *','input','例如：金融学'],
    destination:['升学去向 / 录取院校与专业','input','例如：复旦大学金融专硕'],
    educationProof:['学历证明 *','proof',''],
    summerCamp:['夏令营入营情况','textarea','例如：清华经管夏令营入营、复旦泛海优秀营员（如无可填暂无）'],
    preAdmission:['预推免 / 推免入营情况','textarea','例如：上海交大安泰预推免拟录取、人大财政金融入营'],
    capabilities:['可提供的核心能力与服务 *','capabilities',''],
    services:['服务内容与能力补充说明','textarea','例如：可提供简历精修、专业课/英语模拟面试、科研项目梳理、夏令营投递规划等'],
    conditions:['接单条件 / 偏好说明','textarea','例如：擅长经管/计算机方向、大二至大三学生；每周可约晚间及周末沟通'],
    slots:['每周期可接待人数','select',''],
    achievements:['科研 / 竞赛成果','textarea','请填写项目、论文、竞赛及个人贡献'],
    certificates:['荣誉与证书说明','textarea','例如：国家奖学金、美赛 M 奖、雅思 7.5、CCF 认证等'],
    certFiles:['荣誉 / 能力证书上传（选填）','certs',''],
    servedTypes:['曾服务对象背景（请脱敏）','textarea','例如：统计、计算机等专业；双非/一本背景；大二至大三学生'],
    served:['历史辅导人数（个人申报）','input','例如：曾辅导 5 位同学'],
    experience:['个人辅导经验','textarea','你通常如何帮助学生？有哪些方法和心得？'],
    cases:['典型服务案例（请脱敏）','textarea','描述学生原始需求、你提供的帮助和交付内容']
  };
  function formatFileSize(bytes){
    if(!bytes||bytes<1024)return (bytes||0)+' B';
    if(bytes<1024*1024)return (bytes/1024).toFixed(0)+' KB';
    return (bytes/1024/1024).toFixed(1)+' MB';
  }
  function proofUploadControl(d){
    const proof=d.educationProof&&d.educationProof.name?d.educationProof:null;
    const preview=proof?'<div class="v8-proof-card">'+(proof.preview?'<img class="v8-proof-thumb" src="'+proof.preview+'" alt="学历证明预览" />':'<span class="v8-proof-badge">PDF</span>')+'<div class="v8-proof-meta"><b>'+esc(proof.name)+'</b><small>'+esc(formatFileSize(proof.size))+' · 已上传 · 待审核</small></div><button type="button" class="v8-proof-remove" onclick="tlV8RemoveEduProof()">移除</button></div>':'';
    return '<div class="v8-field"><span>学历证明 * <em class="v8-field-tip">学信网证明 / 学生证 / 录取通知书</em></span>'+
      '<label class="v8-proof-upload"><span class="v8-proof-icon" aria-hidden="true">⬆</span><span><b>'+(proof?'重新上传学历证明':'上传学历证明')+'</b><small>支持 JPG / PNG / WEBP / PDF · 单份最大 8 MB</small></span><input type="file" aria-label="上传学历证明" accept="image/*,.pdf" onchange="tlV8UploadEduProof(event)" /></label>'+
      preview+
      '<small>仅用于服务者资质核验，不对外展示原件敏感信息。</small></div>';
  }
  function certUploadControl(d){
    const list=Array.isArray(d.certFiles)?d.certFiles:[];
    const items=list.length?'<div class="v8-uploaded-list">'+list.map((f,i)=>'<div class="v8-uploaded-item"><span>'+(f.isImage?'🖼':'▤')+'</span><div><b>'+esc(f.name)+'</b><small>'+esc(formatFileSize(f.size))+' · 已上传</small></div><button type="button" onclick="tlV8RemoveCertFile('+i+')">移除</button></div>').join('')+'</div>':'';
    return '<div class="v8-field"><span>荣誉 / 能力证书上传（选填，最多 6 份）</span>'+
      '<label class="v8-proof-upload compact"><span class="v8-proof-icon" aria-hidden="true">＋</span><span><b>上传获奖 / 英语 / 技能证书</b><small>支持 JPG / PNG / WEBP / PDF</small></span><input type="file" aria-label="上传证书" accept="image/*,.pdf" multiple onchange="tlV8UploadCertFiles(event)" /></label>'+
      items+'</div>';
  }
  function capabilityPickerControl(d){
    const selected=Array.isArray(d.capabilities)?d.capabilities:[];
    return '<div class="v8-field"><span>可提供的核心能力与服务 * <em class="v8-field-tip">可多选</em></span>'+
      '<div class="v8-cap-groups">'+CAPABILITY_GROUPS.map(g=>{
        const mainOn=selected.includes(g.group);
        return '<div class="v8-cap-group"><button type="button" class="v8-cap-main'+(mainOn?' active':'')+'" aria-pressed="'+mainOn+'" onclick="tlV8ToggleCapability(\''+esc(g.group)+'\')"><span>'+esc(g.group)+'</span><em>'+(mainOn?'✓ 已选':'选择')+'</em></button>'+
          '<div class="v8-cap-chips">'+g.items.map(item=>{
            const on=selected.includes(item);
            return '<button type="button" class="v8-cap-chip'+(on?' active':'')+'" aria-pressed="'+on+'" onclick="tlV8ToggleCapability(\''+esc(item)+'\')">'+esc(item)+'</button>';
          }).join('')+'</div></div>';
      }).join('')+'</div></div>';
  }
  function mentorControl(id,d){
    const [label,type,placeholder]=fieldMeta[id];
    const value=d[id]||'';
    if(type==='proof')return proofUploadControl(d);
    if(type==='certs')return certUploadControl(d);
    if(type==='capabilities')return capabilityPickerControl(d);
    if(id==='teachingYears'){
      return '<label class="v8-field"><span>'+label+'</span><select name="teachingYears" onchange="tlV8MentorField(\'teachingYears\',this.value)"><option value="">请选择辅导经验</option>'+TEACHING_YEARS.map(v=>'<option value="'+esc(v)+'"'+(value===v?' selected':'')+'>'+esc(v)+'</option>').join('')+'</select><small>请按实际情况选择辅导年限，帮助学生了解你。</small></label>';
    }
    if(id==='mbti'){
      return '<label class="v8-field"><span>'+label+'</span><select name="mbti" onchange="tlV8MentorField(\'mbti\',this.value)"><option value="">暂不填写</option>'+MBTI.map(v=>'<option value="'+v+'"'+(value===v?' selected':'')+'>'+v+'</option>').join('')+'</select><small>仅用于了解沟通偏好，不作为服务能力或推荐排序依据。</small></label>';
    }
    if(id==='slots'){
      const opts=['0','1','2','3','4','5'];
      return '<label class="v8-field"><span>'+label+'</span><select name="slots" onchange="tlV8MentorField(\'slots\',this.value)">'+opts.map(v=>'<option value="'+v+'"'+(String(value||'3')===v?' selected':'')+'>'+v+' 人</option>').join('')+'</select></label>';
    }
    const attr=' oninput="tlV8MentorField(\''+id+'\',this.value)"';
    if(type==='textarea')return '<label class="v8-field"><span>'+label+'</span><textarea name="'+id+'" rows="'+(id==='bio'||id==='summerCamp'||id==='preAdmission'?3:4)+'" maxlength="'+(id==='bio'?300:1000)+'" placeholder="'+placeholder+'"'+attr+'>'+esc(value)+'</textarea></label>';
    return '<label class="v8-field"><span>'+label+'</span><input name="'+id+'" maxlength="120" placeholder="'+placeholder+'" value="'+esc(value)+'"'+attr+' /></label>';
  }
  function mentorWizard(){
    if(T.role!=='mentor')return '<div class="page tl-v2-page"><p>请切换到服务者身份后完善资料。</p></div>';
    const d=draft(), step=mentorSteps[mentorStep]||mentorSteps[0];
    const registration=window.TongluRegistration;
    const intro=mentorStep===3?'<div class="v8-declaration">请确保学历、入营经历、荣誉证书与辅导经验真实准确；涉及过往辅导案例时请做好隐私脱敏。</div>':'';
    const files=window.__TLV5?.getState().mentor.files||[];
    return '<div class="page tl-v2-page v8-mentor-wizard tl-registration tl-reg-wizard">'+registration.stepper(mentorSteps,mentorStep,'tlV8MentorGo')+
      '<section class="tl-reg-panel">'+registration.heading(step.title,mentorStep,step.sub)+
      (mentorStep===0?registration.resumeBar('mentor',files.some(file=>file.ok),window.__TLV5?.getState().mentor.text):'')+
      '<div class="v8-step-fields tl-reg-fields" id="v8-mentor-manual-fields">'+step.fields.map(id=>mentorControl(id,d)).join('')+'</div>'+intro+
      '<div class="v8-step-actions tl-reg-actions"><button type="button" class="v8-btn secondary tl-reg-secondary" onclick="'+(mentorStep>0?'tlV8MentorGo('+(mentorStep-1)+')':"go(\'#/mentorAuth\')")+'">上一步</button>'+
      (mentorStep<3?'<button type="button" class="v8-btn primary tl-reg-primary" onclick="tlV8MentorGo('+(mentorStep+1)+')">下一步 →</button>':'<button type="button" class="v8-btn primary tl-reg-primary" onclick="tlV8MentorSave()">'+(d.registered?'保存修改':'完成注册并进入')+'</button>')+'</div>'+
      '<button type="button" class="tl-reg-manual" onclick="go(\'#/choose\')">返回身份选择</button><p class="tl-reg-footnote">请填写真实资料，认证状态以实际审核结果为准。</p></section></div>';
  }

  window.tlV8FocusMentorManual=function(){
    const box=document.getElementById('v8-mentor-manual-fields');
    if(!box)return;
    box.scrollIntoView({behavior:'smooth',block:'center'});
    const first=box.querySelector('input,select,textarea');
    if(first)setTimeout(()=>first.focus({preventScroll:true}),240);
  };
  window.tlV8MentorField=function(id,value){
    if(!fieldMeta[id])return;
    const patch={};patch[id]=String(value||'').trim().slice(0,id==='bio'?300:1000);
    saveMentor(patch);
  };
  window.tlV8ToggleCapability=function(name){
    const d=draft();
    const cur=Array.isArray(d.capabilities)?d.capabilities.slice():[];
    const idx=cur.indexOf(name);
    if(idx>=0)cur.splice(idx,1);else cur.push(name);
    const patch={capabilities:cur};
    if(!String(d.services||'').trim()&&cur.length)patch.services=cur.join('、');
    saveMentor(patch);
    render();
  };
  window.tlV8UploadEduProof=function(event){
    const input=event.target, f=input&&input.files&&input.files[0];
    if(!f)return;
    if(f.size>8*1024*1024){toast('学历证明文件不能超过 8 MB');input.value='';return;}
    const isImg=/^image\//i.test(f.type)||/\.(png|jpe?g|webp|gif)$/i.test(f.name);
    const isPdf=/pdf$/i.test(f.type)||/\.pdf$/i.test(f.name);
    if(!isImg&&!isPdf){toast('请上传图片（JPG/PNG/WEBP）或 PDF 格式的学历证明');input.value='';return;}
    const commit=preview=>{
      saveMentor({educationProof:{name:String(f.name).slice(0,120),size:f.size,type:f.type||(isPdf?'application/pdf':'image/*'),preview:preview||'',uploadedAt:new Date().toISOString()}});
      try{input.value='';}catch(_){}
      toast('学历证明已上传');
      render();
    };
    if(isImg&&f.size<=900*1024&&typeof FileReader!=='undefined'){
      const reader=new FileReader();
      reader.onload=()=>commit(typeof reader.result==='string'?reader.result:'');
      reader.onerror=()=>commit('');
      reader.readAsDataURL(f);
    }else{commit('');}
  };
  window.tlV8RemoveEduProof=function(){
    saveMentor({educationProof:null});
    toast('已移除学历证明');
    render();
  };
  window.tlV8UploadCertFiles=function(event){
    const input=event.target, selected=Array.from(input&&input.files||[]);
    if(!selected.length)return;
    const d=draft();
    const list=Array.isArray(d.certFiles)?d.certFiles.slice():[];
    let added=0;
    for(const f of selected){
      if(list.length>=6){toast('最多上传 6 份证书证明');break;}
      if(f.size>8*1024*1024){toast(f.name+' 超过 8 MB，已跳过');continue;}
      const isImg=/^image\//i.test(f.type)||/\.(png|jpe?g|webp|gif)$/i.test(f.name);
      const isPdf=/pdf$/i.test(f.type)||/\.pdf$/i.test(f.name);
      if(!isImg&&!isPdf){toast(f.name+' 格式不支持，请上传图片或 PDF');continue;}
      list.push({name:String(f.name).slice(0,120),size:f.size,isImage:isImg,uploadedAt:new Date().toISOString()});
      added++;
    }
    try{input.value='';}catch(_){}
    if(added){saveMentor({certFiles:list});toast('已添加 '+added+' 份证书证明');render();}
  };
  window.tlV8RemoveCertFile=function(index){
    const d=draft();
    const list=Array.isArray(d.certFiles)?d.certFiles.slice():[];
    list.splice(index,1);
    saveMentor({certFiles:list});
    render();
  };
  function validateMentorStep(n){
    const d=draft();
    if(n===0&&!String(d.name||'').trim()){toast('请先填写姓名或称呼');return false;}
    if(n===1&&(!String(d.school||'').trim()||!String(d.major||'').trim())){toast('请先填写本科院校和专业');return false;}
    if(n===2&&!(Array.isArray(d.capabilities)&&d.capabilities.length)&&!String(d.services||'').trim()){toast('请至少选择一项服务能力或填写服务说明');return false;}
    return true;
  }
  window.tlV8MentorGo=function(n){
    if(!Number.isInteger(n)||n<0||n>3)return;
    if(n>mentorStep){for(let i=mentorStep;i<n;i++){if(!validateMentorStep(i)){mentorStep=i;render();return;}}}
    mentorStep=n;try{localStorage.setItem(STEP_KEY,String(n));}catch(_){}
    render();
    document.querySelector('.tl-reg-heading h1')?.focus({preventScroll:true});
  };
  window.tlV8ResetMentorStep=function(){mentorStep=0;try{localStorage.setItem(STEP_KEY,'0');}catch(_){}};
  window.tlV8MentorSave=function(){
    const d=draft();
    for(let i=0;i<3;i++){if(!validateMentorStep(i)){mentorStep=i;try{localStorage.setItem(STEP_KEY,String(i));}catch(_){}render();return;}}
    if(!d.educationProof||!d.educationProof.name){
      toast('请先在「学历与入营」步骤上传学历证明');
      mentorStep=1;try{localStorage.setItem(STEP_KEY,'1');}catch(_){}
      render();
      return;
    }
    const wasRegistered=!!d.registered;
    const caps=Array.isArray(d.capabilities)?d.capabilities:[];
    const servicesText=String(d.services||'').trim()||caps.join('、');
    if(!saveMentor({...d,services:servicesText,updatedAt:new Date().toISOString(),declared:true,registered:true}))return;
    syncDraftMbti();
    toast(wasRegistered?'服务者资料已更新':'服务者注册资料已保存');
    go(wasRegistered?'#/mentorMe':'#/messages');
  };
  window.tlV8ApplyParsedMentor=function(silent){
    if(!window.__TLV5||!window.__TLV5.getState)return;
    const st=window.__TLV5.getState().mentor;
    const f=st&&st.fields||{};
    const d=draft();
    const patch={};
    ['name','mbti','school','major','destination','summerCamp','preAdmission','specialty','certificates','services','servedTypes','served','results','experience','cases'].forEach(k=>{
      if(f[k]&&!String(d[k]||'').trim())patch[k]=String(f[k]).slice(0,k==='experience'||k==='cases'||k==='results'||k==='services'||k==='servedTypes'||k==='summerCamp'||k==='preAdmission'||k==='certificates'?1000:150);
    });
    if(f.achievements&&!String(d.achievements||'').trim())patch.achievements=String(f.achievements).slice(0,1000);
    const bio=[f.achievements,f.experience].filter(Boolean).join('；');
    if(bio&&!String(d.bio||'').trim())patch.bio=bio.slice(0,300);
    if(!Object.keys(patch).length){if(!silent)toast('暂未识别出可填入的资料，请手动填写');return;}
    saveMentor(patch);
    if(!silent){render();toast('已将识别结果填入资料步骤，请检查并修改');}
  };
  window.tlV8ImportMentor=function(){
    const box=document.getElementById('v5-mentor-text');
    if(box&&box.value&&window.v5KeepText)window.v5KeepText('mentor',box.value);
    if(!window.v5Analyze||!window.__TLV5){toast('暂时无法整理资料，请刷新页面后重试');return;}
    window.v5Analyze('mentor',{silent:true});
    window.tlV8ApplyParsedMentor(false);
  };
  PAGES.mentorProfile=mentorWizard;

  /* 我的：把消息提升为第一组快捷入口，保留原有收藏、投递、规划、经验库与数据管理。 */
  const oldMe=PAGES.me;
  window.tlV8ScrollPlan=function(){
    const cards=[...document.querySelectorAll('.tl-v3-card')];
    const target=cards.find(el=>/MY ROADMAP|我的行动时间线/.test(el.textContent||''))||document.querySelector('.tl-v3-empty-plan');
    if(target)target.scrollIntoView({behavior:'smooth',block:'start'});else toast('请先完善个人个人资料，生成行动计划');
  };
  PAGES.me=function(){
    let html=oldMe();
    if(T.role!=='student')return html;
    const bg=T.bg||{}, goals=Array.isArray(bg.goals)?bg.goals:[];
    const consultations=consults().length;
    const ready=!!(T.profileReady&&T.profileReady());
    const banner='<section class="v8-profile-banner"><div class="v8-profile-avatar">同</div><div class="v8-profile-copy"><b>学生个人档案</b><small>'+esc([bg.grade,...goals].filter(Boolean).join(' · ')||'完善个人资料，开启个性化服务')+'</small><span class="v8-profile-state '+(ready?'ready':'')+'">'+(ready?'资料已确认':'资料待完善')+'</span></div><button onclick="go(\'#/profile\')">编辑 ›</button></section>';
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
  /* 微信 / 闲鱼式聊天：会话按服务者区分；本机保存，不伪装为真实发送。 */
  window.openTongluConversation=function(id){const c=consults().find(x=>x.id===id&&canReadChat(x));if(!c){toast('没有找到该会话');return;}window.TongluMessages?.readChat(id);setActive(id);go('#/conversation');};
  window.startTongluConsult=function(providerId){
    if(T.role!=='student'){toast('请以学生身份开始咨询');return;}
    const p=getProvider(providerId);if(!p){toast('没有找到该服务者');return;}
    let c=consults().find(x=>x.providerId===providerId);
    if(!c){c={id:'chat-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),providerId,studentName:T.bg.name||'同路同学',entries:[],updatedAt:new Date().toISOString()};consults().unshift(c);}
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
    if(c?.skuId){go('#/sku/'+encodeURIComponent(c.skuId));return;}
    if(!p){toast('暂时找不到这位服务者，请返回集市重新选择');return;}
    if(typeof remain==='function'&&remain(p)===0){toast('该服务者当前名额已满');return;}
    if(!p.services||!p.services.length){toast('这位服务者暂未发布可预约服务，可以先查看其他服务');return;}
    go('#/providers');toast('请在同路集市查看当前在售服务');
  };
  window.tlV8Remind=function(){
    const c=currentChat(),p=c&&getProvider(c.providerId);
    if(!c||!p){toast('暂时找不到这位服务者，请返回集市重新选择');return;}
    const now=Date.now();
    if(c.lastRemindedAt&&(now-Number(c.lastRemindedAt))<15000){
      toast('已记录提醒，请稍后查看会话');
      return;
    }
    c.entries=Array.isArray(c.entries)?c.entries:[];
    c.entries.push({text:'已记录提醒：希望 '+p.name+' 尽快回复你的消息',who:'system',at:new Date().toISOString()});
    c.lastRemindedAt=now;
    c.updatedAt=new Date().toISOString();
    if(persistChats()){
      toast('提醒已保存在此设备，暂未发送给对方');
      render();
      const log=document.querySelector('.v8-chat-log');
      if(log)log.scrollTop=log.scrollHeight;
    }
  };
  window.tlV8Phone=window.tlV8Remind;
  PAGES.messages=function(){return window.TongluMessages?window.TongluMessages.page():'<div class="page"><p role="status">正在载入消息…</p></div>';};
  PAGES.conversation=function(){
    const c=currentChat();
    if(!c)return '<div class="page tl-v2-page v8-chat-page"><div class="v8-empty"><b>没有找到这段会话</b><button onclick="go(\'#/messages\')">返回消息中心</button></div></div>';
    window.TongluMessages?.readChat(c.id);
    const p=getProvider(c.providerId),name=T.role==='mentor'?(c.studentName||'学生咨询'):(p&&p.name||'服务者'),brief=T.role==='mentor'?'来自学生的咨询':(p&&p.brief||'同路服务者');
    const entries=(c.entries||[]).map(e=>{
      const time=e.at?new Date(e.at).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}):'';
      if(e.who==='system'){
        return '<div class="v8-chat-system"><span>'+esc(e.text)+(time?' · '+esc(time):'')+'</span></div>';
      }
      const incoming=T.role==='mentor'?(e.who!=='mentor'):(e.who==='mentor'||e.from==='mentor');
      const avatar=T.role==='mentor'?'学':name.slice(0,1);
      return '<div class="v8-chat-row '+(incoming?'incoming':'outgoing')+'">'+(!incoming?'<span class="v8-chat-bubble">'+esc(e.text)+'<small class="v8-chat-time">'+esc(time)+'</small></span>':'<span class="v8-chat-avatar">'+esc(avatar)+'</span><span class="v8-chat-bubble">'+esc(e.text)+'<small class="v8-chat-time">'+esc(time)+'</small></span>')+'</div>';
    }).join('');
    const actions=T.role==='mentor'?'':'<div class="v8-chat-actions"><button type="button" onclick="tlV8Appointment()">查看服务详情</button><button type="button" onclick="tlV8Remind()">提醒回复</button></div>';
    const placeholder=T.role==='mentor'?'回复学生消息…':'发送消息…';
    return '<div class="page tl-v2-page v8-chat-page"><header class="v8-chat-header"><button class="v8-chat-back" onclick="go(\'#/messages\')" aria-label="返回">‹</button><span class="v8-thread-avatar">'+esc(T.role==='mentor'?'学':name.slice(0,1))+'</span><span class="v8-chat-person"><b>'+esc(name)+'</b><small>'+esc(brief)+'</small></span></header>'+
      (c.skuSnapshot?'<section class="v9-provider"><small>咨询的服务</small><b>'+esc(c.skuSnapshot.title)+'</b><p>¥'+esc(c.skuSnapshot.price)+' · '+esc(c.skuSnapshot.deliveryCycle)+'</p></section>':'')+
      actions+
      '<div class="v8-chat-log">'+(entries||'<div class="v8-chat-empty">可以记录你希望了解的问题，也可以点击上方查看服务详情。消息保存在此设备，暂不支持跨设备发送。</div>')+'</div>'+
      '<form class="v8-chat-compose" onsubmit="tlV8SendMessage(event)"><textarea name="message" rows="1" maxlength="500" placeholder="'+placeholder+'" aria-label="发送消息" oninput="this.style.height=&quot;auto&quot;;this.style.height=Math.min(this.scrollHeight,110)+&quot;px&quot;" required></textarea><button type="submit" aria-label="发送">↑</button></form></div>';
  };

  /* 本轮页面使用内置 composer / wizard，隐藏原有页面底部动作栏。 */
  const oldActionbar=actionbar;
  actionbar=function(name){if(['messages','conversation','mentorProfile'].includes(name))return '';return oldActionbar(name);};
  NAV.messages={title:'消息中心'};
  NAV.conversation={title:'聊天'};
  NAV.mentorProfile={title:'服务者资料'};
})();
