/* 同路 · 学生主动发布需求模块 V1
 * 本地原型：需求保存在当前浏览器 localStorage，同一浏览器切换服务者身份可查看。
 * 不包含真实账号同步、云端发布或站内实时联系。
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'tonglu-student-demands-v1';
  const CATEGORIES = [
    { name: '简历润色', desc: '优化简历结构、科研竞赛经历与个人陈述', items: ['简历结构优化', '科研经历表达', '竞赛经历表达', '个人陈述修改'] },
    { name: '面试模拟', desc: '针对目标项目进行模拟问答与复盘', items: ['综合面试', '专业课面试', '英语面试', '面试复盘'] },
    { name: '科研竞赛规划（保研延伸）', desc: '围绕已有项目与竞赛经历，整理保研申请表达与准备计划', items: ['科研项目梳理', '论文阅读', '大创项目', '学科竞赛'] },
    { name: '保研规划辅导', desc: '围绕院校定位、夏令营与预推免提供经验指导', items: ['院校定位', '夏令营申请', '预推免申请', '申请材料准备', '保研经验分享'] }
  ];

  let editingId = '';
  let providerFilter = '全部';
  const originalHome = PAGES.home;
  const originalMe = PAGES.me;
  const market = window.TongluMarket;
  let disciplineFilter='全部', sortMode='recommended', rankKey='', rankCache=[], rankError='', rankLoading=false, rankSerial=0;
  const originalRender = render;
  const originalActionbar = actionbar;

  const escapeHtml = (value) => {
    const h = window.__TL && window.__TL.H;
    if (typeof h === 'function') return h(String(value == null ? '' : value));
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  };

  function readDemands() {
    return market.demands().map(item=>({...item,categories:(item.categories||[]).map(name=>name==='竞赛科研辅导'?'科研竞赛规划（保研延伸）':name==='保研辅导'?'保研规划辅导':name)}));
  }

  function writeDemands(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      return true;
    } catch (_) {
      if (typeof toast === 'function') toast('未能保存，请检查设备存储空间或浏览器设置后重试');
      return false;
    }
  }

  function currentBg() {
    return window.__TL && window.__TL.bg ? window.__TL.bg : {};
  }

  function formatDate(value) {
    if (!value) return '时间待定';
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function categoryOptions(selected) {
    return CATEGORIES.map(category => {
      const checked = selected.includes(category.name) ? 'checked' : '';
      return `<label class="tl-demand-category-option ${checked ? 'is-selected' : ''}">
        <input type="checkbox" name="categories" value="${escapeHtml(category.name)}" ${checked}>
        <span class="tl-demand-check"></span>
        <span class="tl-demand-category-copy"><b>${escapeHtml(category.name)}</b><small>${escapeHtml(category.desc)}</small></span>
      </label>`;
    }).join('');
  }

  function demandCard(item, owner) {
    const status = item.status === 'withdrawn' ? '已撤回' : item.acceptStatus==='completed'?'已完成':item.acceptStatus==='accepted'?'已承接':'已发布';
    const categories = (item.categories || []).map(name => `<span class="tl-demand-tag">${escapeHtml(name)}</span>`).join('');
    return `<article class="tl-demand-card">
      <div class="tl-demand-card-top">
        <span class="tl-demand-status ${item.status === 'withdrawn' ? 'is-withdrawn' : ''}">${status}</span>
        <time>${escapeHtml(formatDate(item.createdAt))}</time>
      </div>
      <h3>${escapeHtml(item.description || '保研服务需求')}</h3>
      <div class="tl-demand-tags">${categories}</div>
      <p class="tl-demand-card-meta">${escapeHtml([item.school, item.major, item.grade].filter(Boolean).join(' · ') || '暂未填写完整背景')}</p>
      <p class="tl-demand-card-target">${escapeHtml([item.targetSchool, item.targetMajor].filter(Boolean).join(' · ') || '暂未填写目标院校或专业')}</p>
      ${owner && item.acceptStatus==='open' ? `<div class="tl-demand-card-actions">
        <button class="tl-demand-link" type="button" onclick="editStudentDemand('${escapeHtml(item.id)}')">修改需求</button>
        ${item.status === 'published' ? `<button class="tl-demand-danger" type="button" onclick="withdrawStudentDemand('${escapeHtml(item.id)}')">撤回需求</button>` : ''}
      </div>` : `<div class="tl-demand-card-actions"><button class="tl-demand-primary" type="button" onclick="viewStudentDemand('${escapeHtml(item.id)}')">查看需求详情</button></div>`}
    </article>`;
  }

  // 首页已改为左侧精简推荐条入口，不再在对话首页底部插入大卡片。
  PAGES.home = function () {
    return originalHome();
  };

  PAGES.me = function () {
    const html = originalMe();
    if (!window.__TL || window.__TL.role !== 'student') return html;
    const items = readDemands().filter(item => item.status === 'published' && item.acceptStatus !== 'completed');
    const module = `<section class="tl-demand-me-entry">
      <div><span class="tl-demand-eyebrow">MY REQUESTS</span><h2>我的发布需求</h2><p>查看、修改或撤回已发布的保研需求。</p></div>
      <div class="tl-demand-me-actions"><b>${items.length} 条进行中</b><button type="button" class="tl-demand-secondary" onclick="go('#/studentDemandList')">查看全部 ›</button><button type="button" class="tl-demand-primary" onclick="openStudentDemand()">发布新需求</button></div>
    </section>`;
    return html.replace(/<\/div>\s*$/, `${module}</div>`);
  };

  function studentDemandForm() {
    const bg = currentBg();
    const goals = Array.isArray(bg.goals) ? bg.goals.join('、') : String(bg.goals || '');
    const existing = editingId ? readDemands().find(item => item.id === editingId) : null;
    if(existing&&existing.acceptStatus!=='open')return '<div class="page"><p>需求已被承接，无法修改。</p></div>';
    const value = key => existing && existing[key] != null ? existing[key] : (key === 'grade' ? (bg.grade || '') : '');
    const selected = existing ? (existing.categories || []) : [];
    return `<div class="page tl-demand-page">
      <div class="tl-demand-page-head">
        <span class="tl-demand-eyebrow">STUDENT REQUEST</span>
        <h1>${existing ? '修改我的需求' : '发布我的保研需求'}</h1>
        <p>说明你的背景方向和需要的帮助，方便契合的学长学姐看到你。</p>
      </div>
      ${bg.raw || bg.grade ? `<div class="tl-demand-bg-hint"><span>✦</span><div><b>已关联个人档案</b><p>${escapeHtml([bg.grade, goals].filter(Boolean).join(' · ') || bg.raw || '可继续补充下方信息')}</p></div><button type="button" onclick="go('#/profile/basic')">修改 ›</button></div>` : ''}
      <form class="tl-demand-form" onsubmit="saveStudentDemand(event)">
        <section class="tl-demand-form-section">
          <div class="tl-demand-section-title"><span>01</span><div><h2>你需要哪类帮助？</h2><p>可多选，方便服务者了解你的需求方向。</p></div></div>
          <div class="tl-demand-category-grid">${categoryOptions(selected)}</div>
          <small class="tl-demand-error" id="tl-demand-category-error" aria-live="polite"></small>
        </section>
        <section class="tl-demand-form-section">
          <div class="tl-demand-section-title"><span>02</span><div><h2>你的基本情况</h2><p>选填背景信息可以帮助服务者判断是否适合提供帮助。</p></div></div>
          <div class="tl-demand-field-grid">
            <label><span>本科院校</span><input name="school" maxlength="80" value="${escapeHtml(value('school'))}" placeholder="例如：某某大学"></label>
            <label><span>学科分类</span><select name="discipline">${market.disciplines.map(x=>`<option ${x===(value('discipline')||'通用学科')?'selected':''}>${escapeHtml(x)}</option>`).join('')}</select></label>
            <label><span>本科专业</span><input name="major" maxlength="80" value="${escapeHtml(value('major'))}" placeholder="例如：金融学"></label>
            <label><span>当前年级</span><select name="grade"><option value="">请选择</option>${['大一','大二','大三','大四','研究生','其他'].map(x=>`<option ${value('grade')===x?'selected':''}>${x}</option>`).join('')}</select></label>
            <label><span>成绩排名（选填）</span><input name="rank" maxlength="40" value="${escapeHtml(value('rank'))}" placeholder="例如：专业前 10%"></label>
            <label><span>目标院校（选填）</span><input name="targetSchool" maxlength="100" value="${escapeHtml(value('targetSchool'))}" placeholder="例如：复旦大学"></label>
            <label><span>目标专业（选填）</span><input name="targetMajor" maxlength="100" value="${escapeHtml(value('targetMajor'))}" placeholder="例如：金融专硕"></label>
          </div>
        </section>
        <section class="tl-demand-form-section">
          <div class="tl-demand-section-title"><span>03</span><div><h2>具体想获得什么帮助？</h2><p>尽量描述目前的问题、目标和期待。</p></div></div>
          <label class="tl-demand-textarea-wrap"><textarea name="description" rows="5" maxlength="800" minlength="10" required placeholder="例如：我目前是金融专业大三学生，科研经历比较少，希望找有金融方向保研经验的学长学姐，帮我梳理夏令营申请材料和面试准备。">${escapeHtml(value('description'))}</textarea><small>建议写清楚目前遇到的问题和希望获得的帮助，10—800 字。</small></label>
        </section>
        <section class="tl-demand-form-section">
          <div class="tl-demand-section-title"><span>04</span><div><h2>期望开始时间</h2><p>选填，帮助服务者了解你的时间安排。</p></div></div>
          <label class="tl-demand-date"><span>期望开始服务的日期</span><input type="date" name="expectedTime" value="${escapeHtml(value('expectedTime'))}"></label>
        </section>
        <div class="tl-demand-privacy-note"><span aria-hidden="true">♢</span><p>公开需求会遮蔽常见手机号、证件号与邮箱；请勿在描述中填写姓名、地址或其他隐私信息。简历原件不公开。</p></div>
        <div class="tl-demand-submit-row">
          <button type="button" class="tl-demand-secondary" onclick="go('#/studentDemandList')">我的需求</button>
          <button type="submit" class="tl-demand-primary">${existing ? '保存修改' : '确认发布需求'} <span>→</span></button>
        </div>
      </form>
    </div>`;
  }

  function studentDemandList() {
    const items = readDemands().sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
    const active = items.filter(item => item.status === 'published' && item.acceptStatus !== 'completed').length;
    const withdrawn=items.filter(item=>item.status==='withdrawn').length,completed=items.filter(item=>item.acceptStatus==='completed').length;
    return `<div class="page tl-demand-page">
      <div class="tl-demand-page-head">
        <span class="tl-demand-eyebrow">MY REQUESTS</span><h1>我的发布需求</h1>
        <p>查看、修改或撤回你发布的保研服务需求。</p>
        <div class="tl-demand-list-summary"><span><b>${active}</b> 条进行中</span><span><b>${withdrawn}</b> 条已撤回</span><span><b>${completed}</b> 条已完成</span></div>
      </div>
      <div class="tl-demand-list-toolbar"><span>全部需求 · ${items.length}</span><button class="tl-demand-primary" type="button" onclick="openStudentDemand()">＋ 发布新需求</button></div>
      ${items.length ? `<div class="tl-demand-list">${items.map(item => demandCard(item, true)).join('')}</div>` : `<div class="tl-demand-empty"><span>✦</span><h2>还没有发布需求</h2><p>描述你需要的帮助，让合适的服务者主动发现你。</p><button class="tl-demand-primary" type="button" onclick="openStudentDemand()">发布第一条需求</button></div>`}
    </div>`;
  }

  PAGES.studentDemand = studentDemandForm;
  PAGES.studentDemandList = studentDemandList;
  NAV.studentDemand = { title: '发布我的需求' };
  NAV.studentDemandList = { title: '我的发布需求' };

  document.addEventListener('change', function (event) {
    if (event.target && event.target.matches('input[name="categories"]')) {
      const label = event.target.closest('.tl-demand-category-option');
      if (label) label.classList.toggle('is-selected', event.target.checked);
    }
  });

  window.openStudentDemand = function () {
    editingId = '';
    go('#/studentDemand');
  };
  window.editStudentDemand = function (id) {
    if (window.__TL?.role !== 'student') { toast('请切换到学生身份管理自己的需求'); return; }
    const item=readDemands().find(x=>x.id===id);
    if(!item||item.acceptStatus!=='open'){toast('需求已被承接或不存在，无法修改');return;}
    editingId = id;
    go('#/studentDemand');
  };
  window.saveStudentDemand = function (event) {
    event.preventDefault();
    if (window.__TL?.role !== 'student') { toast('请使用学生身份发布需求'); return; }
    const form = event.currentTarget;
    const selected = Array.from(form.querySelectorAll('input[name="categories"]:checked')).map(input => input.value);
    const error = document.getElementById('tl-demand-category-error');
    if (!selected.length) {
      if (error) error.textContent = '请至少选择一类需要的服务。';
      form.querySelector('.tl-demand-category-grid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (error) error.textContent = '';
    const data = new FormData(form);
    const description = String(data.get('description') || '').trim();
    if (description.length < 10) { toast('请至少用 10 个字描述你的需求'); return; }
    const items = readDemands();
    const now = new Date().toISOString();
    const current = editingId ? items.find(item => item.id === editingId) : null;
    if(editingId&&(!current||current.acceptStatus!=='open')){toast('需求已被承接或不存在，无法修改');return;}
    const record = {
      id: current ? current.id : `sd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      school: String(data.get('school') || '').trim().slice(0, 80),
      major: String(data.get('major') || '').trim().slice(0, 80),
      discipline: market.disciplines.includes(data.get('discipline'))?data.get('discipline'):'通用学科',
      acceptStatus: current?.acceptStatus || 'open',
      acceptedBy: current?.acceptedBy || null,
      grade: String(data.get('grade') || '').trim(),
      rank: String(data.get('rank') || '').trim().slice(0, 40),
      targetSchool: String(data.get('targetSchool') || '').trim().slice(0, 100),
      targetMajor: String(data.get('targetMajor') || '').trim().slice(0, 100),
      categories: selected,
      description: description.slice(0, 800),
      expectedTime: String(data.get('expectedTime') || ''),
      status: current?.status === 'withdrawn' ? 'published' : 'published',
      createdAt: current?.createdAt || now,
      updatedAt: now
    };
    if (current) items[items.findIndex(item => item.id === current.id)] = record;
    else items.unshift(record);
    if (!writeDemands(items)) return;
    editingId = '';
    toast(current ? '需求已更新' : '需求已发布');
    go('#/studentDemandList');
  };
  window.withdrawStudentDemand = function (id) {
    if (window.__TL?.role !== 'student') { toast('请使用学生身份管理需求'); return; }
    const items = readDemands();
    const item = items.find(entry => entry.id === id);
    if (!item) return;
    if(item.acceptStatus!=='open'){toast('已承接的需求不可撤回，请先沟通服务安排');return;}
    if (!window.confirm('确定撤回这条需求吗？撤回后服务者将不再看到它。')) return;
    item.status = 'withdrawn';
    item.updatedAt = new Date().toISOString();
    if (writeDemands(items)) { toast('需求已撤回'); render(); }
  };

  const publicText=value=>String(value||'').replace(/(?<!\d)1[3-9]\d{9}(?!\d)/g,'[手机号已隐藏]').replace(/(?<!\d)\d{17}[\dXx](?!\d)/g,'[证件号已隐藏]').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[邮箱已隐藏]');
  function dynamicProviderDemandSection() {
    const current=readDemands().filter(item=>item.status==='published');
    const key=JSON.stringify([current,market.profile(),sortMode]);
    if(key!==rankKey){
      rankKey=key;rankError='';rankLoading=true;const serial=++rankSerial;
      const publicItems=current.map(item=>({...item,description:publicText(item.description),school:publicText(item.school),major:publicText(item.major),targetSchool:publicText(item.targetSchool),targetMajor:publicText(item.targetMajor)}));
      // 远端适配器只能看到公开需求，不传简历、联系方式和学历证明。
      const p=market.profile(),profile={major:p.major,specialty:p.specialty,services:p.services,capabilities:p.capabilities};
      Promise.resolve().then(()=>window.TongluAdapters.matching.rankDemands(publicItems,profile,{sortMode})).then(result=>{
        if(serial!==rankSerial)return;
        const map=new Map(current.map(x=>[x.id,x])),seen=new Set();
        rankCache=(Array.isArray(result)?result:[]).filter(x=>map.has(x.id)&&!seen.has(x.id)&&seen.add(x.id)).map(x=>({...map.get(x.id),matchMeta:x.matchMeta}));
        rankCache.push(...current.filter(x=>!seen.has(x.id)));rankLoading=false;
        if(location.hash==='#/mentorDemands')render();
      }).catch(()=>{if(serial!==rankSerial)return;rankCache=current.slice().sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));rankError='推荐暂不可用，已按最新发布排序。';rankLoading=false;if(location.hash==='#/mentorDemands')render();});
    }
    const ranked=rankLoading?current:rankCache;
    const items=ranked.filter(item=>providerFilter==='全部'||(item.categories||[]).includes(providerFilter)).filter(item=>disciplineFilter==='全部'||item.discipline===disciplineFilter);
    const filters=['全部',...CATEGORIES.map(item=>item.name)];
    return `<section class="tl-demand-provider-section"><div class="tl-demand-provider-heading"><div><h2>学生需求</h2><p>查看匿名公开需求，选择与你服务方向相符的项目。</p></div><span>${items.length} 条</span></div>
      <div class="tl-demand-provider-filters">${filters.map(name=>`<button class="${providerFilter===name?'is-active':''}" onclick="setStudentDemandFilter('${name}')">${escapeHtml(name)}</button>`).join('')}</div>
      <label class="tl-demand-sort">学科 <select aria-label="需求学科筛选" onchange="setDemandDiscipline(this.value)">${['全部',...market.disciplines].map(x=>`<option ${x===disciplineFilter?'selected':''}>${x}</option>`).join('')}</select></label>
      <label class="tl-demand-sort">排序 <select aria-label="需求排序" onchange="setDemandSort(this.value)"><option value="recommended" ${sortMode==='recommended'?'selected':''}>推荐排序</option><option value="latest" ${sortMode==='latest'?'selected':''}>最新发布</option></select></label>
      <p class="v9-market-footnote" role="status">${rankLoading?'正在整理需求…':rankError||'按你的服务方向整理，方便你找到合适的需求。'}</p>
      ${items.length?items.map(item=>`<article class="tl-demand-provider-card"><small>匿名学生 · ${escapeHtml(item.discipline)} · ${escapeHtml(formatDate(item.createdAt))}</small><h3>${escapeHtml(publicText([item.major,item.grade].filter(Boolean).join(' · '))||'保研申请准备需求')}</h3><div class="tl-demand-tags">${(item.categories||[]).map(x=>`<span class="tl-demand-tag">${escapeHtml(x)}</span>`).join('')}</div><p>${escapeHtml(publicText(item.description).slice(0,110))}</p>${item.matchMeta?.reasons?.length?`<small>${escapeHtml(item.matchMeta.reasons.join(' · '))}</small>`:''}<div class="tl-demand-card-actions"><button class="tl-demand-secondary" onclick="viewStudentDemand('${escapeHtml(item.id)}')">查看完整需求</button>${item.acceptStatus==='open'?`<button class="tl-demand-primary" ${market.workbench().accepting?'':'disabled'} onclick="acceptStudentDemand('${escapeHtml(item.id)}')">${market.workbench().accepting?'接单':'已暂停接单'}</button>`:`<span>${item.acceptStatus==='completed'?'已完成':'已被承接'}</span>`}</div></article>`).join(''):'<div class="tl-demand-empty"><h3>暂时没有匹配的需求</h3><p>试试切换学科或服务分类，也可以稍后再来查看。</p></div>'}</section>`;
  }
  window.setDemandDiscipline=function(value){disciplineFilter=value;render();};
  window.setDemandSort=function(value){sortMode=value==='latest'?'latest':'recommended';render();};
  window.acceptStudentDemand=function(id){
    if(window.__TL?.role!=='mentor'){toast('请先登录服务者身份');return;}
    try{market.acceptDemand(id);window.closeStudentDemandDetail();render();toast('已接单，可在订单管理查看');}catch(error){toast(error.message);}
  };

  window.setStudentDemandFilter = function (name) { providerFilter = name; render(); };
  window.viewStudentDemand = function (id) {
    const item = readDemands().find(entry => entry.id === id && entry.status === 'published');
    if (!item) { toast('这条需求可能已撤回或不存在'); return; }
    if(window.__TL?.role==='mentor'){try{market.requireMentor(true);}catch(error){toast(error.message);return;}}
    document.getElementById('tl-demand-detail-modal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'tl-demand-detail-modal';
    modal.className = 'tl-demand-modal-backdrop';
    modal.innerHTML = `<section class="tl-demand-modal" role="dialog" aria-modal="true" aria-labelledby="tl-demand-modal-title">
      <button type="button" class="tl-demand-modal-close" aria-label="关闭" onclick="closeStudentDemandDetail()">×</button>
      <span class="tl-demand-eyebrow">ANONYMOUS STUDENT REQUEST</span><h2 id="tl-demand-modal-title">学生需求详情</h2>
      <div class="tl-demand-tags">${(item.categories || []).map(name => `<span class="tl-demand-tag">${escapeHtml(name)}</span>`).join('')}</div>
      <dl class="tl-demand-detail-grid">
        <div><dt>本科院校</dt><dd>${escapeHtml(publicText(item.school) || '暂未填写')}</dd></div>
        <div><dt>专业 / 年级</dt><dd>${escapeHtml(publicText([item.major, item.grade].filter(Boolean).join(' · ')) || '暂未填写')}</dd></div>
        <div><dt>成绩排名</dt><dd>${escapeHtml(publicText(item.rank) || '暂未填写')}</dd></div>
        <div><dt>目标院校</dt><dd>${escapeHtml(publicText(item.targetSchool) || '暂未填写')}</dd></div>
        <div><dt>目标专业</dt><dd>${escapeHtml(publicText(item.targetMajor) || '暂未填写')}</dd></div>
        <div><dt>期望开始时间</dt><dd>${escapeHtml(formatDate(item.expectedTime))}</dd></div>
      </dl>
      <div class="tl-demand-detail-description"><b>具体需求</b><p>${escapeHtml(publicText(item.description))}</p></div>
      <div class="tl-demand-modal-note">为保护学生隐私，此处已隐去姓名、联系方式与简历原件。</div>
      ${window.__TL?.role==='mentor'&&item.acceptStatus==='open'?`<button type="button" class="tl-demand-primary full" ${market.workbench().accepting?'':'disabled'} onclick="acceptStudentDemand('${escapeHtml(item.id)}')">${market.workbench().accepting?'接单':'已暂停接单'}</button>`:'<button type="button" class="tl-demand-primary full" onclick="closeStudentDemandDetail()">关闭</button>'}
    </section>`;
    modal.addEventListener('click', event => { if (event.target === modal) modal.remove(); });
    document.body.appendChild(modal);
  };
  window.closeStudentDemandDetail = function () { document.getElementById('tl-demand-detail-modal')?.remove(); };

  PAGES.mentorDemands = function () {
    market.requireMentor(true);
    return `<div class="page tl-demand-page tl-published-demands">${tlPublicationTabs('demands')}<p class="v9-market-lead">学生发布的匿名需求会显示在这里，选择与你服务方向相符的需求。</p>${!market.workbench().accepting?'<p class="tl-work-status">当前已暂停接单。<button onclick="go(\'#/workbench\')">到工作台恢复 ›</button></p>':''}${dynamicProviderDemandSection()}</div>`;
  };

  NAV.studentDemand = { title: '发布我的需求' };
  NAV.studentDemandList = { title: '我的发布需求' };

  // 新页面沿用学生端底部导航，并将首页入口标记为当前主导航。
  function syncStudentDemandTab() {
    const key = (location.hash.replace(/^#\/?/, '') || 'choose').split('/')[0];
    if (window.__TL?.role === 'student' && ['studentDemand', 'studentDemandList'].includes(key)) {
      const tabs = document.getElementById('tabbar');
      const buttons = tabs ? Array.from(tabs.querySelectorAll('.tab')) : [];
      buttons.forEach((button, index) => button.classList.toggle('active', index === 0));
    }
  }
  render = function () {
    originalRender();
    syncStudentDemandTab();
  };
  window.addEventListener('hashchange', syncStudentDemandTab);

  actionbar = function (name) {
    if (['studentDemand', 'studentDemandList'].includes(name)) return '';
    return originalActionbar(name);
  };

  // Allow the student demand form/list to be reached only after selecting student identity.
  // The existing role gate already blocks these routes for guest and mentor identities.
})();
