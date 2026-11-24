/* 学生板块改版：通知导航、院校库及服务者多选。沿用既有资料与咨询页面。 */
(function(){
  'use strict';
  const T=window.__TL,V4=window.__TLV4,C=window.TongluV9Core,D=window.TL_SCHOOL_CATALOGUE;
  if(!T||!V4||!C||!D)return;
  const E=v=>escapeTL(String(v??''));
  const safeUrl=u=>/^https?:\/\//i.test(String(u||''))?String(u):'';
  const link=(url,label)=>safeUrl(url)?`<a href="${E(safeUrl(url))}" target="_blank" rel="noopener noreferrer">${E(label)} ↗</a>`:'';
  const schools=D.schools,schoolMap=new Map(schools.map(s=>[s.name,s])),schoolByName=name=>schoolMap.get(name);
  const sync=window.TL_SCHOOL_NEWS?.sync;
  const years=C.recentYears();
  const filters={news:{category:'全部',major:'全部',type:'全部',city:'全部',year:'全部',q:''},library:{type:'全部',city:'全部'},providers:{identities:[],capabilities:[],serviceCategory:'all',serviceDetail:'all',q:''}};
  let programmeQuery='',rosterYear='',providerReturn='',noticeContext=null;
  let newsLimit=40,libraryLimit=40,newsCacheKey='',newsCache=[],libraryKey='';
  const parts=()=>location.hash.replace(/^#\//,'').split('/');
  const route=path=>go('#/'+path);
  const cities=[...new Set(schools.map(s=>s.city).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'zh'));
  const SERVICE_CATEGORIES=[
    {id:'resume',title:'简历润色',icon:'简',desc:'梳理结构与经历重点，让材料表达更清楚。',details:[
      {id:'resume-structure',title:'简历结构优化',pattern:/简历|材料诊断|材料结构/},
      {id:'resume-experience',title:'科研与竞赛经历表达',pattern:/研究经历|科研经历|科研|竞赛材料|竞赛/},
      {id:'resume-ps',title:'个人陈述优化',pattern:/个人陈述|文书|自我介绍/},
      {id:'resume-check',title:'申请材料检查',pattern:/申请材料|材料检查|材料诊断/}
    ],pattern:/简历|材料诊断|个人陈述|文书|申请材料|材料结构/},
    {id:'interview',title:'面试模拟',icon:'面',desc:'围绕常见考核场景，练习表达与临场应答。',details:[
      {id:'interview-general',title:'综合面试模拟',pattern:/综合面试|面试模拟|模拟面试/},
      {id:'interview-major',title:'专业课问答',pattern:/专业课|专业问题|专业面试/},
      {id:'interview-english',title:'英语面试训练',pattern:/英语面试|英文面试|英语口语/},
      {id:'interview-review',title:'面试复盘与表达',pattern:/面试复盘|表达训练|面试反馈/}
    ],pattern:/面试|模拟面试|专业课问答|英语口语/},
    {id:'research',title:'竞赛科研辅导',icon:'研',desc:'从科研项目到学科竞赛，拆解过程与成果表达。',details:[
      {id:'research-reading',title:'科研选题与文献阅读',pattern:/科研选题|文献阅读|文献梳理|课题/},
      {id:'research-project',title:'科研项目与大创梳理',pattern:/研究经历|科研|大创|项目梳理|项目经历/},
      {id:'research-contest',title:'学科竞赛备赛',pattern:/竞赛|比赛|建模|竞赛材料/},
      {id:'research-paper',title:'论文思路与学术表达',pattern:/论文|学术表达|科研成果/}
    ],pattern:/科研|研究经历|课题|论文|竞赛|建模|大创|项目/},
    {id:'guidance',title:'保研辅导',icon:'保',desc:'结合真实经历，梳理择校、申请与关键节点。',details:[
      {id:'guidance-school',title:'院校定位与择校策略',pattern:/院校定位|择校|申请策略/},
      {id:'guidance-camp',title:'夏令营与预推免规划',pattern:/夏令营|预推免|推免规划/},
      {id:'guidance-material',title:'申请材料与投递节奏',pattern:/申请材料|投递节奏|申请规划/},
      {id:'guidance-experience',title:'保研经验答疑',pattern:/保研经验|推免经验|保研辅导/}
    ],pattern:/保研|推免|夏令营|预推免|择校|院校定位|申请策略|保研规划/}
  ];
  const serviceText=p=>[...(p.tags||[]),...(p.services||[]).flatMap(x=>[x.name,x.desc]),p.brief].filter(Boolean).join(' ');
  function providerServiceMatches(p,f){
    const text=serviceText(p);
    const category=SERVICE_CATEGORIES.find(x=>x.id===f.serviceCategory);
    if(category&&!category.pattern.test(text))return false;
    if(f.serviceDetail!=='all'){
      const detail=SERVICE_CATEGORIES.flatMap(x=>x.details).find(x=>x.id===f.serviceDetail);
      if(detail&&!detail.pattern.test(text))return false;
    }
    return true;
  }
  function serviceCount(category){
    return M.providers.filter(p=>category.pattern.test(serviceText(p))).length;
  }
  function serviceCategorySection(f){
    const selected=SERVICE_CATEGORIES.find(x=>x.id===f.serviceCategory);
    const cards=SERVICE_CATEGORIES.map(c=>{
      const count=serviceCount(c),active=f.serviceCategory===c.id;
      return `<button type="button" class="v9-service-card${active?' active':''}" aria-pressed="${active}" onclick="v9ServiceCategory('${c.id}')">
        <span class="v9-service-icon" aria-hidden="true">${c.icon}</span>
        <span class="v9-service-copy"><b>${c.title}</b><small>${c.desc}</small>
          <span class="v9-service-examples">${c.details.slice(0,2).map(d=>`<i>${d.title}</i>`).join('')}</span>
        </span>
        <span class="v9-service-count">${count?count+' 位':'暂无收录'}</span>
      </button>`;
    }).join('');
    const details=selected?`<div class="v9-service-detail-panel"><div class="v9-service-detail-head"><span><b>${selected.title} · 具体服务</b><small>选择更具体的方向，筛选相关服务者</small></span><button type="button" onclick="v9ServiceCategory('all')">清除</button></div>
      <div class="v9-service-detail-chips"><button type="button" class="${f.serviceDetail==='all'?'active':''}" aria-pressed="${f.serviceDetail==='all'}" onclick="v9ServiceDetail('all')">全部</button>${selected.details.map(d=>`<button type="button" class="${f.serviceDetail===d.id?'active':''}" aria-pressed="${f.serviceDetail===d.id}" onclick="v9ServiceDetail('${d.id}')">${d.title}</button>`).join('')}</div></div>`:'';
    return `<section class="v9-market-services" aria-label="服务分类"><div class="v9-market-section-head"><span><b>服务</b><small>按保研准备阶段，选择你需要的帮助</small></span><button type="button" onclick="v9ServiceCategory('all')">全部服务</button></div><div class="v9-service-grid">${cards}</div>${details}</section>`;
  }
  const schoolMeta=s=>[s?.type,s?.city].filter(Boolean).join(' · ')||'资料待补充';
  function credits(){return sync?`<details class="v11-source-panel"><summary>来源：深研派开源合集 · MIT · 同步于 ${E(new Date(sync.syncedAt).toLocaleDateString('sv-SE',{timeZone:'Asia/Shanghai'}))}</summary><p>标题、截止时间与原文链接按开源仓库收录。合集年度与公告发布日期分别保留，学校最新要求以原文为准。</p>${sync.repositories.map(r=>`<div>${link(r.url,r.year+' '+r.collection)}${link(new URL(r.licenseUrl,location.href).href,'MIT 许可')}</div>`).join('')}</details>`:'';}
  function select(scope,key,label,choices){
    const value=filters[scope][key];
    return `<label class="v9-nav-select"><span>${label}</span><select aria-label="${label}" onchange="v9Filter('${scope}','${key}',this.value)">${['全部',...choices].map(v=>`<option value="${E(v)}"${v===value?' selected':''}>${E(v==='211'?'211（非985）':v)}</option>`).join('')}</select></label>`;
  }
  function search(scope,value,placeholder){return `<form class="v9-search" onsubmit="v9Search(event,'${scope}')"><input name="q" aria-label="${placeholder}" type="search" value="${E(value)}" placeholder="${placeholder}" oninput="v9KeepQuery('${scope}',this.value)" maxlength="100"><button type="submit">搜索</button></form>`;}
  function empty(title,detail,button='重置筛选',handler='v9Reset(\'news\')'){return `<div class="v9-empty"><b>${E(title)}</b><p>${E(detail)}</p><button type="button" onclick="${handler}">${E(button)}</button></div>`;}
  function schoolTabs(active){return `<nav class="v9-section-tabs" aria-label="院校资讯栏目">${[['notices','招生通知'],['library','院校库']].map(([key,label])=>`<button type="button" aria-current="${active===key?'page':'false'}" class="${active===key?'active':''}" onclick="v9SchoolTab('${key}')">${label}</button>`).join('')}</nav>`;}
  function categoryBadge(n){const category=C.noticeCategory(n);return `<span class="v10-category ${C.categoryTone(category)}">${E(category)}</span>`;}
  const news=()=>M.notices||[];
  const sourceUnavailable=n=>window.TL_NEWS_ARTICLES?.items?.[n.id]?.httpStatus===404;
  const noticeYear=n=>n.informationYears?.length?Math.max(...n.informationYears):Number(String(n.publishedAt).slice(0,4))||0;
  const noticeOrder=(a,b)=>(Number(sourceUnavailable(a))-Number(sourceUnavailable(b)))||((a.days??Infinity)-(b.days??Infinity))||(noticeYear(b)-noticeYear(a))||String(b.publishedAt||b.deadline||'').localeCompare(String(a.publishedAt||a.deadline||''));
  function newsCard(n){
    const s=schoolByName(n.school);
    const date=n.publishedText||n.publishedAt||(n.informationYears?.length?n.informationYears.join(' / ')+' 年度':'发布日期未标注');
    return `<article class="v9-news"><button class="v9-news-open" onclick="v9OpenNotice('${E(n.id)}')"><div class="v9-news-meta">${categoryBadge(n)}<time>${E(date)}</time></div><h2>${E(n.title)}</h2><div class="v10-school-line"><span class="v10-school-dot">${E(n.school.slice(0,1))}</span><span>${E(n.school)}</span><small>${E(schoolMeta(s))}</small></div><div class="v9-news-foot"><span>${n.deadline?'截止 '+E(n.deadlineText):E(n.college||(n.sourceRecords?.length?'深研派开源收录':'研究生招生'))}</span><span class="${n.status==='已截止'?'closed':'notice-status'}">${!n.url?'链接待补充':sourceUnavailable(n)?'原站暂不可用':E(n.status||'')}</span></div></button><button class="v9-notice-save" onclick="toggleSchoolFavorite('${E(n.id)}')" aria-label="${isSchoolSaved(n.id)?'取消收藏通知':'收藏通知'}">${isSchoolSaved(n.id)?'♥':'♡'}</button></article>`;
  }
  function noticesPage(){
    const f=filters.news,key=JSON.stringify(f);
    if(key!==newsCacheKey){newsCacheKey=key;newsLimit=40;newsCache=news().filter(n=>C.newsMatches(n,f,schoolByName(n.school)));newsCache.sort(noticeOrder);}
    const list=newsCache;
    return schoolTabs('notices')+`<div class="page v9-page"><div class="v9-heading"><h1>招生通知</h1><span>${list.length} 条</span></div>${search('news',f.q,'搜索院校、学院、专业或通知')}
      <nav class="v9-filter-nav" aria-label="招生通知筛选">${select('news','major','专业',Object.keys(C.MAJORS))}${select('news','type','院校类型',['985','211','普通本科'])}${select('news','city','城市',cities)}${select('news','year','年份',years)}</nav>
      <div class="v10-category-filters" role="group" aria-label="通知类别">${['全部',...C.CATEGORIES].map(v=>`<button type="button" aria-pressed="${f.category===v}" class="${f.category===v?'active':''}" onclick="v9Filter('news','category','${v}')">${v}</button>`).join('')}</div>
      <div class="v9-results"><span>${f.category==='全部'?'全部通知':E(f.category)} · ${list.length.toLocaleString('zh-CN')} 条</span><button onclick="v9Reset('news')">重置筛选</button></div>${list.length?list.slice(0,newsLimit).map(newsCard).join(''):empty('暂无符合条件的通知','换个条件试试，或清空关键词。')}
      ${list.length>newsLimit?`<button class="v11-load-more" onclick="v9MoreNews()">加载更多 <span>已显示 ${newsLimit} / ${list.length}</span></button>`:''}
      <p class="v9-footnote">开源通知按合集年度筛选；其他公告按发布日期筛选。时间与要求以原文为准。</p>${credits()}</div>`;
  }
  function libraryPage(){
    const f=filters.library,list=schools.filter(s=>(f.type==='全部'||s.type===f.type)&&(f.city==='全部'||s.city===f.city));
    const key=JSON.stringify(f);if(key!==libraryKey){libraryLimit=40;libraryKey=key;}
    return schoolTabs('library')+`<div class="page v9-page"><div class="v9-heading"><h1>院校库</h1><span>${list.length} 个院校与机构</span></div><nav class="v9-filter-nav v9-two" aria-label="院校库筛选">${select('library','type','院校类型',['985','211','普通本科'])}${select('library','city','城市',cities)}</nav>
      ${list.length?list.slice(0,libraryLimit).map(s=>`<button class="v9-university" onclick="v9OpenUniversity('${s.id}')"><span class="v9-school-mark">${E(s.name.slice(0,1))}</span><span class="v9-grow"><b>${E(s.name)}</b><small>${E(schoolMeta(s))}</small><span class="v9-library-caption">${s.colleges.length?s.colleges.length+' 个已整理学院 · ':''}${s.noticeCount||0} 条招生通知</span></span><span class="v9-arrow">›</span></button>`).join(''):empty('暂无符合条件的院校','调整院校类型或城市。','重置筛选',"v9Reset('library')")}
      ${list.length>libraryLimit?`<button class="v11-load-more" onclick="v9MoreLibrary()">加载更多 <span>已显示 ${libraryLimit} / ${list.length}</span></button>`:''}
      <p class="v9-footnote">城市依教育部学校所在地整理，多校区以学校官网为准。未匹配的机构资料标为待补充。</p>${credits()}</div>`;
  }
  function universityPage(id,collegeId){
    const s=schools.find(s=>s.id===id);if(!s)return empty('未找到院校','请返回院校库重新选择。','返回院校库',"v9SchoolTab('library')");
    const q=programmeQuery.trim().toLowerCase();
    const colleges=s.colleges.filter(c=>(!collegeId||c.id===collegeId)&&(!q||c.name.toLowerCase().includes(q)||c.programs.some(p=>(p.name+p.code).toLowerCase().includes(q))));
    const related=news().filter(n=>n.school===s.name&&(!q||(n.title+' '+n.college).toLowerCase().includes(q)));
    return schoolTabs('library')+`<div class="page v9-page"><button class="v9-back-link" onclick="v9SchoolTab('library')">‹ 院校库</button><div class="v9-university-title"><span class="v9-school-mark">${E(s.name.slice(0,1))}</span><div><h1>${E(s.name)}</h1><p>${E(schoolMeta(s))}</p></div></div>
      ${search('programme',programmeQuery,'搜索学院或专业')}${s.colleges.length?`<div class="v9-subheading"><h2>${collegeId?'学院专业':'学院情况'}</h2>${collegeId?`<button onclick="v9OpenUniversity('${s.id}')">全部学院</button>`:''}</div>`:''}
      ${colleges.length?colleges.map(c=>`<section class="v9-college"><div class="v9-college-head"><h3>${E(c.name)}</h3>${!collegeId?`<button onclick="v9OpenCollege('${s.id}','${c.id}')">查看学院 ›</button>`:''}</div><p>${E(c.summary)}</p>
        <div class="v9-program-list">${c.programs.filter(p=>!q||c.name.toLowerCase().includes(q)||(p.name+p.code).toLowerCase().includes(q)).map(p=>`<button onclick="v9OpenMajor('${p.id}')"><span><b>${E(p.name)}</b><small>${E(p.code||'查看录取公示与辅导员')}</small></span><span>›</span></button>`).join('')||'<div class="v9-muted">专业信息正在补充，可先查看学院原文。</div>'}</div><div class="v9-source-link">${link(c.sourceUrl,'学院资料来源')}</div></section>`).join(''):s.colleges.length?empty('暂无匹配的学院或专业','可以尝试更短的关键词。','清空搜索',"v9ClearProgrammeQuery()"):''}
      <div class="v9-subheading"><h2>该校招生通知 · ${related.length}</h2><button onclick="v9UniversityNotices('${s.id}')">查看全部 ›</button></div>${related.slice(0,8).map(newsCard).join('')||'<p class="v9-muted">暂无匹配的通知，可尝试其他学院或专业关键词。</p>'}</div>`;
  }
  function programmeInfo(id){for(const school of schools)for(const college of school.colleges){const programme=college.programs.find(p=>p.id===id);if(programme)return {school,college,programme};}return null;}
  function pinnedCard(provider,label){return `<article class="v9-pinned"><span class="v9-pin-label">${label}</span><div class="v9-pinned-person"><span class="v9-avatar">${E(provider.name.slice(0,1))}</span><div><b>${E(provider.name)}</b><p>${E(provider.brief)}</p></div></div><div class="v9-pinned-actions"><button onclick="v9OpenProvider('${provider.id}',true)">查看个人资料</button><button onclick="startTongluConsult('${provider.id}')">进入聊天</button></div></article>`;}
  function majorPage(id,isPreview){
    const info=programmeInfo(id);if(!info)return empty('未找到专业','请返回院校库重新选择。','返回院校库',"v9SchoolTab('library')");
    const {school,college,programme}=info;
    const available=[...new Set(D.admissions.filter(r=>r.programId===id).map(r=>String(r.year)))].sort().reverse();
    const year=rosterYear||available[0]||years[0];
    const partition=C.partitionAdmissions(D.admissions,D.providerAdmissions||[],M.providers,id,year);
    const officialRows=[...partition.pins.map(x=>({...x.record,pinned:true,provider:x.provider})),...partition.others];
    const schoolSources=news().filter(n=>n.school===school.name&&n.category==='名单公示'&&/拟录取.*名单|录取名单/.test(n.title)&&!/问题|统计|调档/.test(n.title));
    return schoolTabs('library')+`<div class="page v9-page"><button class="v9-back-link" onclick="v9OpenUniversity('${school.id}')">‹ ${E(school.name)}</button><p class="v9-eyebrow">${E(college.name)}</p><div class="v9-heading"><h1>${E(programme.name)}</h1><span>${E(programme.code)}</span></div>
      <div class="v9-subheading"><h2>往年录取公示</h2><select aria-label="录取年份" onchange="v9RosterYear(this.value)">${[...new Set([...years,...available])].sort().reverse().map(y=>`<option${y===year?' selected':''}>${y}</option>`).join('')}</select></div>
      ${partition.pins.map(({provider})=>pinnedCard(provider,'平台入驻辅导员 · 置顶')).join('')}
      ${isPreview?`<section class="v9-preview"><div class="v9-subheading"><h3>置顶交互预览</h3><button onclick="v9OpenMajor('${id}')">收起示例</button></div><p>使用现有服务者示例展示置顶与跳转，正式关联以授权录取记录为准。</p>${M.providers.slice(0,2).map(p=>pinnedCard(p,'置顶示例')).join('')}</section>`:`<button class="v9-preview-toggle" onclick="v9PreviewMajor('${id}')">查看辅导员置顶交互示例 ›</button>`}
      ${officialRows.length?`<div class="v9-roster-caption">${E(year)} 级 · 官方拟录取公示 · 已整理 ${officialRows.length} 条</div><div class="v9-roster-table"><div class="v9-roster-row v9-roster-head"><span>姓名（脱敏）</span><span>类型</span><span>状态</span></div>${officialRows.map(r=>`<div class="v9-roster-row${r.pinned?' is-pinned':''}"><span>${E(r.name)}${r.pinned?' · 平台辅导员':''}</span><span>${E(r.degree)}</span><span>${E(r.status)}</span></div>`).join('')}</div><div class="v9-source-link">${link(officialRows[0].sourceUrl,'查看该专业公示原表')}</div>`:
        `<div class="v9-empty"><b>${E(year)} 年专业名单待整理</b><p>暂无可展示的个人记录，先查看学校官方公示。</p></div>${schoolSources.map(n=>`<div class="v9-official-link">${link(n.url,n.title)}</div>`).join('')}`}
      <div class="v9-source-link">${link(programme.sourceUrl,'专业资料来源')}</div></div>`;
  }
  PAGES.school=function(){
    const p=parts(),mode=p[1]||S.schoolView||'notices';
    if(mode==='library')return libraryPage();
    if(mode==='university')return universityPage(p[2]);
    if(mode==='college')return universityPage(p[2],p[3]);
    if(mode==='major')return majorPage(p[2],p[3]==='preview');
    if(mode==='saved')return `<div class="page tl-page v9-page"><button class="v9-back-link" onclick="go('#/me')">‹ 我的</button>${schoolSavedView()}</div>`;
    if(mode==='records')return `<div class="page tl-page v9-page"><button class="v9-back-link" onclick="go('#/me')">‹ 我的</button>${schoolRecordsView()}</div>`;
    return noticesPage();
  };
  PAGES.noticeDetail=function(){
    const n=news().find(n=>n.id===S.currentNoticeId);
    if(!n)return empty('未找到通知','请返回招生通知重新选择。','招生通知',"v9SchoolTab('notices')");
    const original=window.tlOriginalNotice?.(n);
    const originalUrl=safeUrl(n.url);
    const meta=window.TL_NEWS_ARTICLES?.items?.[n.id];
    const unavailable=!originalUrl?'原文链接待补充。':meta?.status==='verification-required'?'原站需要访问验证，暂时无法转载正文。':meta?.status==='access-restricted'?'原站限制访问，暂时无法转载正文。':meta?.status==='login-required'?'原站需要登录后查看正文。':meta?.status==='source-removed'?'原站通知已移除，暂时无法读取正文。':sourceUnavailable(n)?'原站通知已失效（404），暂时无法读取正文。':'原站正文暂时无法读取。';
    return `<div class="page v9-page v10-notice-detail"><button class="v9-back-link" onclick="v9SchoolTab('notices')">‹ 招生通知</button><div class="v10-detail-category">${categoryBadge(n)}<span>${E(n.school)}</span></div><h1 class="v9-notice-title">${E(n.title)}</h1><p class="v9-eyebrow">${E(n.sourceLabel||n.school)}</p><div class="v9-notice-dates"><span>发布 ${E(n.publishedText||n.publishedAt||'未标注')}</span><span>截止 ${E(n.deadlineText||'待公布')}</span></div>
      ${original||`<p class="v12-body-unavailable">${E(unavailable)}${originalUrl?'可点击下方按钮查看。':''}</p>`}
      <footer class="v10-original-footer">${originalUrl?link(originalUrl,'查看官网'):'<button type="button" disabled>官网链接待补充</button>'}</footer>
      </div>`;
  };
  function providerCard(p){
    const m=V4.metaOf(p),free=remain(p)>0;const rank=V4.state.ranks.indexOf(p.id);
    const services=[...new Set([...(p.services||[]).map(x=>x.name),...(p.tags||[])].filter(Boolean))].slice(0,4);
    return `<article class="v9-provider"><div class="v9-provider-head"><span class="v9-avatar">${E(p.name.slice(0,1))}</span><div class="v9-grow"><h2>${E(p.name)}</h2><p>${E(m.idType)} · ${E(p.brief)}</p></div><span class="v9-availability${free?'':' full'}">${free?'可承接':'已满额'}</span></div><div class="v9-provider-service-label">提供服务</div><div class="v9-tags">${services.map(t=>`<span>${E(t)}</span>`).join('')||'<span>服务内容待补充</span>'}</div><div class="v9-provider-actions"><button onclick="v4Rank('${p.id}')">${rank>=0?'移出意向':'设为意向'}</button><button class="v9-primary" onclick="v9OpenProvider('${p.id}',false)">查看个人资料 ›</button></div></article>`;
  }
  PAGES.providers=function(){
    if(T.role==='guest')return '<div class="page v9-page">'+empty('选择学生身份查看同路市集','进入学生身份后，可以按服务类型浏览服务项目、查看服务者资料并发起咨询。','选择身份',"go('#/choose')")+'</div>';
    const f=filters.providers,saved=S.providerView==='saved';
    const list=M.providers.filter(p=>(!saved||isMentorSaved(p.id))&&C.providerMatches(p,f,V4.metaOf(p))&&providerServiceMatches(p,f));
    list.sort((a,b)=>(Number(remain(b)>0)-Number(remain(a)>0))||T.recommendationWeight(b)-T.recommendationWeight(a));
    const chips=(key,choices)=>`<div class="v9-multiselect" aria-label="服务者类型筛选"><button aria-pressed="${f[key].length===0}" class="${!f[key].length?'active':''}" onclick="v9ProviderFilter('${key}','全部')">全部</button>${choices.map(v=>`<button aria-pressed="${f[key].includes(v)}" class="${f[key].includes(v)?'active':''}" onclick="v9ProviderFilter('${key}','${v}')">${v}</button>`).join('')}</div>`;
    return `<div class="page v9-page v9-market-page"><p class="v9-eyebrow">${saved?'已收藏的服务者':'同路 · 保研服务市集'}</p><div class="v9-heading"><h1>${saved?'我的收藏':'同路市集'}</h1></div>
      <p class="v9-market-lead">从简历准备、面试训练到科研竞赛与保研规划，按当前需要选择具体服务，再了解服务者的真实经历。</p>
      ${search('providers',f.q,'搜索服务项目、专业方向或服务者姓名')}
      ${serviceCategorySection(f)}
      <div class="v9-filter-caption"><span>服务者类型</span><small>可多选</small></div>${chips('identities',['申请经验前辈','科研辅导老师','院校招生导师'])}
      <div class="v9-results"><span>共 ${list.length} 位服务者 · 可承接优先</span><button onclick="v9Reset('providers')">重置筛选</button></div>
      ${V4.state.ranks.length?`<details class="v9-intents"><summary>我的意向顺序 · ${V4.state.ranks.length} 位</summary>${V4.state.ranks.map((id,i)=>{const p=M.providers.find(p=>p.id===id);return p?`<div><b>${i+1}. ${E(p.name)}</b><button onclick="v4Rank('${p.id}')">移出意向</button></div>`:'';}).join('')}</details>`:''}
      ${list.length?list.map(providerCard).join(''):empty('暂时没有符合条件的服务者','可以切换其他服务分类，或清除具体服务筛选。','查看全部服务',"v9Reset('providers')")}<p class="v9-market-footnote">服务分类用于帮助你快速筛选；列表仅展示当前资料中已填写对应服务内容的服务者，暂无收录的方向不会用示例人员代替。服务范围与交付内容请在咨询时进一步确认。</p></div>`;
  };
  const baseHome=PAGES.home;
  PAGES.home=function(){const html=baseHome();if(!noticeContext||T.role!=='student')return html;
    return html.replace('<form class="tl-v3-form"',`<div class="v9-context"><span>已引用：${E(noticeContext.title)}</span><button type="button" onclick="v9ClearNoticeContext()" aria-label="清除引用通知">×</button></div><form class="tl-v3-form"`);
  };
  const previousActionbar=actionbar;
  actionbar=function(name){
    if(name==='noticeDetail')return news().some(n=>n.id===S.currentNoticeId)?`<button type="button" class="v12-position-button" onclick="v9AskNotice(null,'${E(S.currentNoticeId)}')">帮我定位</button>`:'';
    if(name==='providers')return '';
    return previousActionbar(name);
  };
  const previousBack=back;
  back=function(){const p=parts();if(p[0]==='provider'&&providerReturn){const path=providerReturn;providerReturn='';go(path);return;}
    if(p[0]==='school'&&['university','college','major'].includes(p[1])){if(p[1]==='college'){v9OpenUniversity(p[2]);return;}if(p[1]==='major'){const info=programmeInfo(p[2]);if(info){v9OpenCollege(info.school.id,info.college.id);return;}}v9SchoolTab('library');return;}previousBack();};
  window.v9SchoolTab=function(key){S.schoolView=key;programmeQuery='';route('school/'+key);};
  window.v9Filter=function(scope,key,value){if(!filters[scope]||!(key in filters[scope]))return;filters[scope][key]=value;render();};
  window.v9Reset=function(scope){newsLimit=40;libraryLimit=40;if(scope==='providers')Object.assign(filters.providers,{identities:[],capabilities:[],serviceCategory:'all',serviceDetail:'all',q:''});else if(scope==='library')Object.assign(filters.library,{type:'全部',city:'全部'});else Object.assign(filters.news,{category:'全部',major:'全部',type:'全部',city:'全部',year:'全部',q:''});render();};
  function showMore(kind){const app=document.getElementById('app'),scroll=app.scrollTop;if(kind==='news')newsLimit+=40;else libraryLimit+=40;render();document.getElementById('app').scrollTop=scroll;}
  window.v9MoreNews=function(){showMore('news');};
  window.v9MoreLibrary=function(){showMore('library');};
  window.v9KeepQuery=function(scope,value){if(scope==='programme')programmeQuery=value;else if(filters[scope])filters[scope].q=value;};
  window.v9Search=function(event,scope){event.preventDefault();v9KeepQuery(scope,event.target.elements.q.value);render();};
  window.v9ClearProgrammeQuery=function(){programmeQuery='';render();};
  window.v9OpenUniversity=function(id){programmeQuery='';route('school/university/'+id);};
  window.v9OpenCollege=function(id,college){programmeQuery='';route('school/college/'+id+'/'+college);};
  window.v9OpenMajor=function(id){rosterYear='';route('school/major/'+id);};
  window.v9PreviewMajor=function(id){route('school/major/'+id+'/preview');};
  window.v9RosterYear=function(year){rosterYear=year;render();};
  window.v9UniversityNotices=function(id){const s=schools.find(s=>s.id===id);if(!s)return;Object.assign(filters.news,{category:'全部',major:'全部',type:'全部',city:'全部',year:'全部',q:s.name});v9SchoolTab('notices');};
  window.v9OpenNotice=function(id){S.currentNoticeId=id;const url=new URL(location.href);url.searchParams.set('notice',id);history.replaceState(null,'',url.pathname+url.search+url.hash);route('noticeDetail');};
  window.v9OpenProvider=function(id,fromProgramme){providerReturn=fromProgramme?location.hash:'';v4Open(id);};
  window.v9ProviderFilter=function(key,value){if(!['identities','capabilities'].includes(key))return;const list=filters.providers[key];filters.providers[key]=value==='全部'?[]:list.includes(value)?list.filter(v=>v!==value):[...list,value];render();};
  window.v9ServiceCategory=function(id){filters.providers.serviceCategory=id==='all'?'all':(filters.providers.serviceCategory===id?'all':id);filters.providers.serviceDetail='all';render();};
  window.v9ServiceDetail=function(id){filters.providers.serviceDetail=id==='all'?'all':(filters.providers.serviceDetail===id?'all':id);render();};
  window.v9AllProviders=function(){S.providerView='all';render();};
  window.v9ClearNoticeContext=function(){noticeContext=null;render();};
  window.v9AskNotice=function(event,id){event?.preventDefault();if(T.role!=='student'){toast('请使用学生身份进行个人定位');return;}const n=news().find(n=>n.id===id);if(!n)return;
    const question='结合我的背景，帮我判断这条通知是否适合我，并梳理申请条件、材料和截止时间';noticeContext={id,title:n.title,url:n.url};
    window.addEventListener('hashchange',()=>window.tlStartNotice(question,{title:n.title,summary:n.summary,url:n.url}),{once:true});route('home');
  };
  NAV.providers={title:'同路市集'};
  NAV.school={title:'院校资讯'};
  render();
})();
