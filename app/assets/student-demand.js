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
    { name: '竞赛科研辅导', desc: '梳理科研项目、论文阅读与竞赛经历', items: ['科研项目梳理', '论文阅读', '大创项目', '学科竞赛'] },
    { name: '保研辅导', desc: '围绕院校定位、夏令营与预推免提供经验指导', items: ['院校定位', '夏令营申请', '预推免申请', '申请材料准备', '保研经验分享'] }
  ];

  let editingId = '';
  let providerFilter = '全部';
  const originalHome = PAGES.home;
  const originalMe = PAGES.me;
  const originalMentorDemands = PAGES.mentorDemands;
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
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : [];
    } catch (_) {
      return [];
    }
  }

  function writeDemands(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      return true;
    } catch (_) {
      if (typeof toast === 'function') toast('本地保存失败，请检查浏览器存储空间或设置');
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
    const status = item.status === 'withdrawn' ? '已撤回' : '已发布';
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
      ${owner ? `<div class="tl-demand-card-actions">
        <button class="tl-demand-link" type="button" onclick="editStudentDemand('${escapeHtml(item.id)}')">修改需求</button>
        ${item.status === 'published' ? `<button class="tl-demand-danger" type="button" onclick="withdrawStudentDemand('${escapeHtml(item.id)}')">撤回需求</button>` : ''}
      </div>` : `<div class="tl-demand-card-actions"><button class="tl-demand-primary" type="button" onclick="viewStudentDemand('${escapeHtml(item.id)}')">查看需求详情</button></div>`}
    </article>`;
  }

  function publishModule() {
    const items = readDemands().filter(item => item.status === 'published');
    return `<section class="tl-demand-home-module">
      <div class="tl-demand-home-copy">
        <span class="tl-demand-eyebrow">FIND YOUR SUPPORT</span>
        <h2>让合适的学长学姐主动找到你</h2>
        <p>说出你的目标和需要的帮助，发布需求后，服务者可以在需求广场了解你的公开信息。</p>
        <div class="tl-demand-home-actions">
          <button type="button" class="tl-demand-primary" onclick="openStudentDemand()">发布我的需求 <span>→</span></button>
          <button type="button" class="tl-demand-secondary" onclick="go('#/studentDemandList')">我的需求${items.length ? `（${items.length}）` : ''}</button>
        </div>
      </div>
      <div class="tl-demand-home-art" aria-hidden="true"><span class="tl-demand-art-orbit"></span><span class="tl-demand-art-star">✦</span><span class="tl-demand-art-path">同路 · 让帮助双向发生</span></div>
    </section>`;
  }

  PAGES.home = function () {
    const html = originalHome();
    if (!window.__TL || window.__TL.role !== 'student') return html;
    return html.replace(/<\/div>\s*$/, `${publishModule()}</div>`);
  };

  PAGES.me = function () {
    const html = originalMe();
    if (!window.__TL || window.__TL.role !== 'student') return html;
    const items = readDemands().filter(item => item.status === 'published');
    const module = `<section class="tl-demand-me-entry">
      <div><span class="tl-demand-eyebrow">MY REQUESTS</span><h2>我的发布需求</h2><p>管理已发布的保研服务需求，随时可以修改或撤回。</p></div>
      <div class="tl-demand-me-actions"><b>${items.length} 条进行中的需求</b><button type="button" class="tl-demand-secondary" onclick="go('#/studentDemandList')">查看全部 ›</button><button type="button" class="tl-demand-primary" onclick="openStudentDemand()">发布新需求</button></div>
    </section>`;
    return html.replace(/<\/div>\s*$/, `${module}</div>`);
  };

  function studentDemandForm() {
    const bg = currentBg();
    const goals = Array.isArray(bg.goals) ? bg.goals.join('、') : String(bg.goals || '');
    const existing = editingId ? readDemands().find(item => item.id === editingId) : null;
    const value = key => existing && existing[key] != null ? existing[key] : (key === 'grade' ? (bg.grade || '') : '');
    const selected = existing ? (existing.categories || []) : [];
    return `<div class="page tl-demand-page">
      <div class="tl-demand-page-head">
        <span class="tl-demand-eyebrow">STUDENT REQUEST</span>
        <h1>${existing ? '修改我的需求' : '发布我的保研需求'}</h1>
        <p>把你需要的帮助说清楚，让有相关经历的学长学姐发现你。</p>
      </div>
      ${bg.raw || bg.grade ? `<div class="tl-demand-bg-hint"><span>✦</span><div><b>已读取你的 BG 建档信息</b><p>${escapeHtml([bg.grade, goals].filter(Boolean).join(' · ') || bg.raw || '可继续补充下方信息')}</p></div><button type="button" onclick="go('#/home')">查看 ›</button></div>` : ''}
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
        <div class="tl-demand-privacy-note"><span aria-hidden="true">♢</span><p>发布内容不会展示手机号、身份证或简历原件。当前为本机原型数据，仅保存在此浏览器，不会同步到其他设备。</p></div>
        <div class="tl-demand-submit-row">
          <button type="button" class="tl-demand-secondary" onclick="go('#/studentDemandList')">我的需求</button>
          <button type="submit" class="tl-demand-primary">${existing ? '保存修改' : '确认发布需求'} <span>→</span></button>
        </div>
      </form>
    </div>`;
  }

  function studentDemandList() {
    const items = readDemands().sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
    const active = items.filter(item => item.status === 'published').length;
    return `<div class="page tl-demand-page">
      <div class="tl-demand-page-head">
        <span class="tl-demand-eyebrow">MY REQUESTS</span><h1>我的发布需求</h1>
        <p>查看、修改或撤回你发布的保研服务需求。</p>
        <div class="tl-demand-list-summary"><span><b>${active}</b> 条进行中</span><span><b>${items.length - active}</b> 条已撤回</span></div>
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
    const record = {
      id: current ? current.id : `sd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      school: String(data.get('school') || '').trim().slice(0, 80),
      major: String(data.get('major') || '').trim().slice(0, 80),
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
    if (!window.confirm('确定撤回这条需求吗？撤回后服务者将不再看到它。')) return;
    item.status = 'withdrawn';
    item.updatedAt = new Date().toISOString();
    if (writeDemands(items)) { toast('需求已撤回'); render(); }
  };

  function dynamicProviderDemandSection() {
    const items = readDemands().filter(item => item.status === 'published')
      .filter(item => providerFilter === '全部' || (item.categories || []).includes(providerFilter))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const filters = ['全部', ...CATEGORIES.map(item => item.name)];
    return `<section class="tl-demand-provider-section">
      <div class="tl-demand-provider-heading"><div><span class="tl-demand-eyebrow">STUDENT REQUESTS</span><h2>学生主动发布的需求</h2><p>以下为当前浏览器中学生发布的匿名需求。服务者可查看公开背景与需求描述。</p></div><span class="tl-demand-provider-count">${items.length} 条</span></div>
      <div class="tl-demand-provider-filters">${filters.map(name => `<button type="button" class="${providerFilter === name ? 'is-active' : ''}" onclick="setStudentDemandFilter('${escapeHtml(name)}')">${escapeHtml(name)}</button>`).join('')}</div>
      ${items.length ? `<div class="tl-demand-provider-list">${items.map(item => `<article class="tl-demand-provider-card">
        <div class="tl-demand-provider-card-head"><span>匿名学生需求</span><time>${escapeHtml(formatDate(item.createdAt))}</time></div>
        <h3>${escapeHtml([item.major, item.grade].filter(Boolean).join(' · ') || '学生保研需求')}</h3>
        <div class="tl-demand-tags">${(item.categories || []).map(name => `<span class="tl-demand-tag">${escapeHtml(name)}</span>`).join('')}</div>
        <p>${escapeHtml(item.description.length > 110 ? item.description.slice(0, 110) + '…' : item.description)}</p>
        <div class="tl-demand-provider-meta">${escapeHtml([item.school, item.targetSchool, item.targetMajor].filter(Boolean).join(' · ') || '背景信息待补充')}</div>
        <button type="button" class="tl-demand-secondary" onclick="viewStudentDemand('${escapeHtml(item.id)}')">查看完整需求</button>
      </article>`).join('')}</div>` : `<div class="tl-demand-empty compact"><h3>${readDemands().some(item => item.status === 'published') ? '当前分类暂无需求' : '暂时还没有学生发布的需求'}</h3><p>学生发布需求后，会显示在这里。当前不展示虚构的真实需求。</p></div>`}
      <p class="tl-demand-local-note">本机原型说明：需求仅保存在当前浏览器，真实跨账号共享、消息联系和服务撮合需要后端支持。</p>
    </section>`;
  }

  window.setStudentDemandFilter = function (name) { providerFilter = name; render(); };
  window.viewStudentDemand = function (id) {
    const item = readDemands().find(entry => entry.id === id && entry.status === 'published');
    if (!item) { toast('这条需求可能已撤回或不存在'); return; }
    document.getElementById('tl-demand-detail-modal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'tl-demand-detail-modal';
    modal.className = 'tl-demand-modal-backdrop';
    modal.innerHTML = `<section class="tl-demand-modal" role="dialog" aria-modal="true" aria-labelledby="tl-demand-modal-title">
      <button type="button" class="tl-demand-modal-close" aria-label="关闭" onclick="closeStudentDemandDetail()">×</button>
      <span class="tl-demand-eyebrow">ANONYMOUS STUDENT REQUEST</span><h2 id="tl-demand-modal-title">学生需求详情</h2>
      <div class="tl-demand-tags">${(item.categories || []).map(name => `<span class="tl-demand-tag">${escapeHtml(name)}</span>`).join('')}</div>
      <dl class="tl-demand-detail-grid">
        <div><dt>本科院校</dt><dd>${escapeHtml(item.school || '暂未填写')}</dd></div>
        <div><dt>专业 / 年级</dt><dd>${escapeHtml([item.major, item.grade].filter(Boolean).join(' · ') || '暂未填写')}</dd></div>
        <div><dt>成绩排名</dt><dd>${escapeHtml(item.rank || '暂未填写')}</dd></div>
        <div><dt>目标院校</dt><dd>${escapeHtml(item.targetSchool || '暂未填写')}</dd></div>
        <div><dt>目标专业</dt><dd>${escapeHtml(item.targetMajor || '暂未填写')}</dd></div>
        <div><dt>期望开始时间</dt><dd>${escapeHtml(formatDate(item.expectedTime))}</dd></div>
      </dl>
      <div class="tl-demand-detail-description"><b>具体需求</b><p>${escapeHtml(item.description)}</p></div>
      <div class="tl-demand-modal-note">为保护学生隐私，此处不展示姓名、手机号、简历原件等联系方式。当前原型尚未接入真实跨账号消息联系。</div>
      <button type="button" class="tl-demand-primary full" onclick="closeStudentDemandDetail()">我知道了</button>
    </section>`;
    modal.addEventListener('click', event => { if (event.target === modal) modal.remove(); });
    document.body.appendChild(modal);
  };
  window.closeStudentDemandDetail = function () { document.getElementById('tl-demand-detail-modal')?.remove(); };

  PAGES.mentorDemands = function () {
    let html = originalMentorDemands();
    html = html.replace('以上需求均为匿名虚构样例，当前不支持真实联系学生或接单。', '上方为平台内置的匿名示例需求；下方为学生在本机发布的需求。真实跨账号共享与联系仍需后端支持。');
    return html.replace(/<\/div>\s*$/, `${dynamicProviderDemandSection()}</div>`);
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
