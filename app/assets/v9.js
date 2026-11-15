/* 学生板块改版：通知导航、院校库及服务者多选。沿用既有资料与咨询页面。 */
(function(){
  'use strict';
  const T=window.__TL,V4=window.__TLV4,C=window.TongluV9Core,D=window.TL_SCHOOL_CATALOGUE;
  if(!T||!V4||!C||!D)return;
  const E=v=>escapeTL(String(v??''));
  const safeUrl=u=>/^https?:\/\//i.test(String(u||''))?String(u):'';
  const link=(url,label)=>safeUrl(url)?`<a href="${E(safeUrl(url))}" target="_blank" rel="noopener noreferrer">${E(label)} ↗</a>`:'';
  const schools=D.schools,schoolByName=name=>schools.find(s=>s.name===name);
  const years=C.recentYears();
  const filters={news:{major:'全部',type:'全部',city:'全部',year:'全部',q:''},library:{type:'全部',city:'全部'},providers:{identities:[],capabilities:[],q:''}};
  let programmeQuery='',rosterYear='',providerReturn='',noticeContext=null;
  const parts=()=>location.hash.replace(/^#\//,'').split('/');
  const route=path=>go('#/'+path);
  const cities=[...new Set(schools.map(s=>s.city))].sort((a,b)=>a.localeCompare(b,'zh'));
  function select(scope,key,label,choices){
    const value=filters[scope][key];
    return `<label class="v9-nav-select"><span>${label}</span><select aria-label="${label}" onchange="v9Filter('${scope}','${key}',this.value)">${['全部',...choices].map(v=>`<option value="${E(v)}"${v===value?' selected':''}>${E(v==='211'?'211（非985）':v)}</option>`).join('')}</select></label>`;
  }
  function search(scope,value,placeholder){return `<form class="v9-search" onsubmit="v9Search(event,'${scope}')"><input name="q" aria-label="${placeholder}" type="search" value="${E(value)}" placeholder="${placeholder}" oninput="v9KeepQuery('${scope}',this.value)" maxlength="100"><button type="submit">搜索</button></form>`;}
  function empty(title,detail,button='重置筛选',handler='v9Reset(\'news\')'){return `<div class="v9-empty"><b>${E(title)}</b><p>${E(detail)}</p><button type="button" onclick="${handler}">${E(button)}</button></div>`;}
  function schoolTabs(active){return `<nav class="v9-section-tabs" aria-label="院校资讯栏目">${[['notices','招生通知'],['library','院校库'],['saved','院校收藏'],['records','投递记录本']].map(([key,label])=>`<button type="button" class="${active===key?'active':''}" onclick="v9SchoolTab('${key}')">${label}</button>`).join('')}</nav>`;}
  const news=()=>M.notices||[];
  function newsCard(n){
    const s=schoolByName(n.school);
    return `<article class="v9-news"><button class="v9-news-open" onclick="v9OpenNotice('${E(n.id)}')"><div class="v9-news-meta"><span>${E(n.school)}</span><span>${E(s?.type||'类型待补充')} · ${E(s?.city||'城市待补充')}</span></div><h2>${E(n.title)}</h2><p>${E(n.summary||n.detail||'点击查看公告详情')}</p><div class="v9-news-foot"><span>${E(n.category||'招生通知')}</span><time>${E(n.publishedText||n.publishedAt||'发布日期未标注')}</time><span>${E(n.status||'')}</span></div></button><button class="v9-notice-save" onclick="toggleSchoolFavorite('${E(n.id)}')" aria-label="${isSchoolSaved(n.id)?'取消收藏通知':'收藏通知'}">${isSchoolSaved(n.id)?'♥':'♡'}</button></article>`;
  }
  function noticesPage(){
    const f=filters.news,list=news().filter(n=>C.newsMatches(n,f,schoolByName(n.school)));
    list.sort((a,b)=>((a.status==='已截止')-(b.status==='已截止'))||((a.days??Infinity)-(b.days??Infinity))||String(b.publishedAt||'').localeCompare(String(a.publishedAt||'')));
    return schoolTabs('notices')+`<div class="page v9-page"><div class="v9-heading"><h1>招生通知</h1><span>${list.length} 条</span></div>${search('news',f.q,'搜索院校、学院、专业或通知')}
      <nav class="v9-filter-nav" aria-label="招生通知筛选">${select('news','major','专业',Object.keys(C.MAJORS))}${select('news','type','院校类型',['985','211','普通本科'])}${select('news','city','城市',cities)}${select('news','year','年份',years)}</nav>
      <div class="v9-results"><span>按报名紧迫度排序</span><button onclick="v9Reset('news')">重置</button></div>${list.length?list.map(newsCard).join(''):empty('暂无符合条件的通知','换个条件试试，或清空关键词。')}
      <p class="v9-footnote">年份按公告发布日期筛选。现有资料为静态整理，详情以官方原文为准。</p></div>`;
  }
  function libraryPage(){
    const f=filters.library,list=schools.filter(s=>(f.type==='全部'||s.type===f.type)&&(f.city==='全部'||s.city===f.city));
    return schoolTabs('library')+`<div class="page v9-page"><div class="v9-heading"><h1>院校库</h1><span>${list.length} 所</span></div><nav class="v9-filter-nav v9-two" aria-label="院校库筛选">${select('library','type','院校类型',['985','211','普通本科'])}${select('library','city','城市',cities)}</nav>
      ${list.length?list.map(s=>`<button class="v9-university" onclick="v9OpenUniversity('${s.id}')"><span class="v9-school-mark">${E(s.name.slice(0,1))}</span><span class="v9-grow"><b>${E(s.name)}</b><small>${E(s.type)} · ${E(s.city)}</small><span class="v9-library-caption">${s.colleges.length?s.colleges.length+' 个已整理学院':'学院资料待补充'}</span></span><span class="v9-arrow">›</span></button>`).join(''):empty('暂无符合条件的院校','调整院校类型或城市。','重置筛选',"v9Reset('library')")}
      <p class="v9-footnote">城市按学校主校区整理。仅展示已整理的学院资料。</p></div>`;
  }
  function universityPage(id,collegeId){
    const s=schools.find(s=>s.id===id);if(!s)return empty('未找到院校','请返回院校库重新选择。','返回院校库',"v9SchoolTab('library')");
    const q=programmeQuery.trim().toLowerCase();
    const colleges=s.colleges.filter(c=>(!collegeId||c.id===collegeId)&&(!q||c.name.toLowerCase().includes(q)||c.programs.some(p=>(p.name+p.code).toLowerCase().includes(q))));
    return schoolTabs('library')+`<div class="page v9-page"><button class="v9-back-link" onclick="v9SchoolTab('library')">‹ 院校库</button><div class="v9-university-title"><span class="v9-school-mark">${E(s.name.slice(0,1))}</span><div><h1>${E(s.name)}</h1><p>${E(s.type)} · ${E(s.city)}</p></div></div>
      ${search('programme',programmeQuery,'搜索学院或专业')}<div class="v9-subheading"><h2>${collegeId?'学院专业':'学院情况'}</h2>${collegeId?`<button onclick="v9OpenUniversity('${s.id}')">全部学院</button>`:''}</div>
      ${colleges.length?colleges.map(c=>`<section class="v9-college"><div class="v9-college-head"><h3>${E(c.name)}</h3>${!collegeId?`<button onclick="v9OpenCollege('${s.id}','${c.id}')">查看学院 ›</button>`:''}</div><p>${E(c.summary)}</p>
        <div class="v9-program-list">${c.programs.filter(p=>!q||c.name.toLowerCase().includes(q)||(p.name+p.code).toLowerCase().includes(q)).map(p=>`<button onclick="v9OpenMajor('${p.id}')"><span><b>${E(p.name)}</b><small>${E(p.code||'查看录取公示与辅导员')}</small></span><span>›</span></button>`).join('')||'<div class="v9-muted">专业信息正在补充，可先查看学院原文。</div>'}</div><div class="v9-source-link">${link(c.sourceUrl,'学院资料来源')}</div></section>`).join(''):empty('暂无匹配的学院或专业',q?'可以尝试更短的关键词。':'该校学院资料暂未整理，可先浏览该校招生通知。',q?'清空搜索':'查看该校通知',q?"v9ClearProgrammeQuery()":`v9UniversityNotices('${s.id}')`)}</div>`;
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
    if(mode==='saved')return schoolTabs('saved')+`<div class="page tl-page v9-page">${schoolSavedView()}</div>`;
    if(mode==='records')return schoolTabs('records')+`<div class="page tl-page v9-page">${schoolRecordsView()}</div>`;
    return noticesPage();
  };
  PAGES.noticeDetail=function(){
    const n=news().find(n=>n.id===S.currentNoticeId);
    if(!n)return empty('未找到通知','请返回招生通知重新选择。','招生通知',"v9SchoolTab('notices')");
    return `<div class="page v9-page"><button class="v9-back-link" onclick="v9SchoolTab('notices')">‹ 招生通知</button><p class="v9-eyebrow">${E(n.sourceLabel||n.school)}</p><h1 class="v9-notice-title">${E(n.title)}</h1><div class="v9-notice-dates"><span>发布 ${E(n.publishedText||n.publishedAt||'未标注')}</span><span>截止 ${E(n.deadlineText||'待公布')}</span></div><section class="v9-notice-body"><h2>公告摘要</h2><p>${E(n.summary||n.detail||'请通过原文查看完整通知。')}</p>${link(n.url,'查看官方原文')}</section>
      <form class="v9-position-form" onsubmit="v9AskNotice(event,'${E(n.id)}')"><label for="v9-position-question">帮我定位</label><div><input id="v9-position-question" name="question" placeholder="结合我的背景，看看这条通知是否适合我" maxlength="350"><button type="submit">帮我定位</button></div></form></div>`;
  };
  function providerCard(p){
    const m=V4.metaOf(p),free=remain(p)>0;const rank=V4.state.ranks.indexOf(p.id);
    return `<article class="v9-provider"><div class="v9-provider-head"><span class="v9-avatar">${E(p.name.slice(0,1))}</span><div class="v9-grow"><h2>${E(p.name)}</h2><p>${E(m.idType)} · ${E(p.brief)}</p></div><span class="v9-availability${free?'':' full'}">${free?'可承接':'已满额'}</span></div><div class="v9-tags">${(p.tags||[]).map(t=>`<span>${E(t)}</span>`).join('')}</div><div class="v9-provider-actions"><button onclick="v4Rank('${p.id}')">${rank>=0?'移出意向':'设为意向'}</button><button class="v9-primary" onclick="v9OpenProvider('${p.id}',false)">查看个人资料 ›</button></div></article>`;
  }
  PAGES.providers=function(){
    if(T.role==='guest')return '<div class="page v9-page">'+empty('选择学生身份查看服务者','可以查看服务方向、资料和咨询入口。','选择身份',"go('#/choose')")+'</div>';
    const f=filters.providers,saved=S.providerView==='saved';
    const list=M.providers.filter(p=>(!saved||isMentorSaved(p.id))&&C.providerMatches(p,f,V4.metaOf(p)));
    list.sort((a,b)=>(Number(remain(b)>0)-Number(remain(a)>0))||T.recommendationWeight(b)-T.recommendationWeight(a));
    const chips=(key,choices)=>`<div class="v9-multiselect" aria-label="${key==='identities'?'身份筛选':'能力筛选'}"><button aria-pressed="${f[key].length===0}" class="${!f[key].length?'active':''}" onclick="v9ProviderFilter('${key}','全部')">全部</button>${choices.map(v=>`<button aria-pressed="${f[key].includes(v)}" class="${f[key].includes(v)?'active':''}" onclick="v9ProviderFilter('${key}','${v}')">${v}</button>`).join('')}</div>`;
    return `<div class="page v9-page"><p class="v9-eyebrow">${saved?'已收藏的服务者':'专业陪伴 · 按需选择'}</p><div class="v9-heading"><h1>${saved?'我的服务者':'为你推荐专业的金牌辅导员'}</h1></div>${saved?'<button class="v9-back-link" onclick="v9AllProviders()">查看全部服务者 ›</button>':''}
      ${search('providers',f.q,'搜索姓名、专业或服务方向')}<div class="v9-filter-caption"><span>身份</span><small>可多选</small></div>${chips('identities',['申请经验前辈','科研辅导老师','院校招生导师'])}<div class="v9-filter-caption"><span>能力</span><small>可多选</small></div>${chips('capabilities',Object.keys(C.CAPABILITIES))}
      <div class="v9-results"><span>共 ${list.length} 位 · 可承接优先</span><button onclick="v9Reset('providers')">重置</button></div>
      ${V4.state.ranks.length?`<details class="v9-intents"><summary>我的意向顺序 · ${V4.state.ranks.length} 位</summary>${V4.state.ranks.map((id,i)=>{const p=M.providers.find(p=>p.id===id);return p?`<div><b>${i+1}. ${E(p.name)}</b><button onclick="v4Rank('${p.id}')">移出意向</button></div>`:'';}).join('')}</details>`:''}
      ${list.length?list.map(providerCard).join(''):empty('暂无符合条件的服务者','可以调整身份、能力或关键词。','重置筛选',"v9Reset('providers')")}</div>`;
  };
  const baseHome=PAGES.home;
  PAGES.home=function(){const html=baseHome();if(!noticeContext||T.role!=='student')return html;
    return html.replace('<form class="tl-v3-form"',`<div class="v9-context"><span>已引用：${E(noticeContext.title)}</span><button type="button" onclick="v9ClearNoticeContext()" aria-label="清除引用通知">×</button></div><form class="tl-v3-form"`);
  };
  const previousActionbar=actionbar;
  actionbar=function(name){if(name==='providers'||name==='noticeDetail')return '';return previousActionbar(name);};
  const previousBack=back;
  back=function(){const p=parts();if(p[0]==='provider'&&providerReturn){const path=providerReturn;providerReturn='';go(path);return;}
    if(p[0]==='school'&&['university','college','major'].includes(p[1])){if(p[1]==='college'){v9OpenUniversity(p[2]);return;}if(p[1]==='major'){const info=programmeInfo(p[2]);if(info){v9OpenCollege(info.school.id,info.college.id);return;}}v9SchoolTab('library');return;}previousBack();};
  window.v9SchoolTab=function(key){S.schoolView=key;programmeQuery='';route('school/'+key);};
  window.v9Filter=function(scope,key,value){if(!filters[scope]||!(key in filters[scope]))return;filters[scope][key]=value;render();};
  window.v9Reset=function(scope){if(scope==='providers')Object.assign(filters.providers,{identities:[],capabilities:[],q:''});else if(scope==='library')Object.assign(filters.library,{type:'全部',city:'全部'});else Object.assign(filters.news,{major:'全部',type:'全部',city:'全部',year:'全部',q:''});render();};
  window.v9KeepQuery=function(scope,value){if(scope==='programme')programmeQuery=value;else if(filters[scope])filters[scope].q=value;};
  window.v9Search=function(event,scope){event.preventDefault();v9KeepQuery(scope,event.target.elements.q.value);render();};
  window.v9ClearProgrammeQuery=function(){programmeQuery='';render();};
  window.v9OpenUniversity=function(id){programmeQuery='';route('school/university/'+id);};
  window.v9OpenCollege=function(id,college){programmeQuery='';route('school/college/'+id+'/'+college);};
  window.v9OpenMajor=function(id){rosterYear='';route('school/major/'+id);};
  window.v9PreviewMajor=function(id){route('school/major/'+id+'/preview');};
  window.v9RosterYear=function(year){rosterYear=year;render();};
  window.v9UniversityNotices=function(id){const s=schools.find(s=>s.id===id);if(!s)return;Object.assign(filters.news,{major:'全部',type:'全部',city:'全部',year:'全部',q:s.name});v9SchoolTab('notices');};
  window.v9OpenNotice=function(id){S.currentNoticeId=id;route('noticeDetail');};
  window.v9OpenProvider=function(id,fromProgramme){providerReturn=fromProgramme?location.hash:'';v4Open(id);};
  window.v9ProviderFilter=function(key,value){if(!['identities','capabilities'].includes(key))return;const list=filters.providers[key];filters.providers[key]=value==='全部'?[]:list.includes(value)?list.filter(v=>v!==value):[...list,value];render();};
  window.v9AllProviders=function(){S.providerView='all';render();};
  window.v9ClearNoticeContext=function(){noticeContext=null;render();};
  window.v9AskNotice=function(event,id){event.preventDefault();if(T.role!=='student'){toast('请使用学生身份进行个人定位');return;}const n=news().find(n=>n.id===id);if(!n)return;
    const question=event.target.elements.question.value.trim()||'帮我结合这条招生通知梳理申请准备方向';noticeContext={id,title:n.title,url:n.url};
    window.addEventListener('hashchange',()=>window.tlStartNotice(question,{title:n.title,summary:n.summary,url:n.url}),{once:true});route('home');
  };
  NAV.school={title:'院校资讯'};
  render();
})();
