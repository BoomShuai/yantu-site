/* 同路 V12 · 服务者四栏导航
 * 仅调整服务者端导航与默认入口；学生端、游客端沿用原有逻辑。
 */
(function () {
  'use strict';

  const mentorRole = () => window.__TL && window.__TL.role === 'mentor';
  const routeKey = () => (location.hash.replace(/^#\/?/, '') || 'choose').split('/')[0];
  const originalRender = render;
  const originalGo = go;
  const originalBack = back;
  const originalActionbar = actionbar;
  const originalRenderNav = renderNav;
  const originalSelectRole = window.selectTongluRole;
  const originalExperiencePage = PAGES.experience;
  const originalDemandPage = PAGES.mentorDemands;
  const originalMessagesPage = PAGES.messages;

  const navConfig = {
    messages: NAV.messages ? { ...NAV.messages } : {},
    mentorDemands: NAV.mentorDemands ? { ...NAV.mentorDemands } : {},
    mentorMe: NAV.mentorMe ? { ...NAV.mentorMe } : {},
    experience: NAV.experience ? { ...NAV.experience } : {},
    conversation: NAV.conversation ? { ...NAV.conversation } : {}
  };

  const icons = {
    messages: '<path d="M4 5.5h16v11H9l-5 3v-14Z"/><path d="M8 9h8M8 13h5"/>',
    publish: '<path d="M12 3v12M7 8l5-5 5 5"/><path d="M4 14v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/>',
    personal: '<circle cx="12" cy="8" r="3.3"/><path d="M4.5 20c.6-3.5 3.2-5.3 7.5-5.3s6.9 1.8 7.5 5.3"/>',
    training: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17Z"/><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20M8 6h8M8 9.5h8"/>'
  };

  const tabs = [
    { label: '消息', path: 'messages', key: 'messages', routes: ['messages', 'conversation', 'mentorHome'] },
    { label: '发布', path: 'mentorDemands', key: 'publish', routes: ['mentorDemands', 'providers', 'provider', 'noticeDetail', 'workbench', 'admin'] },
    { label: '个人', path: 'mentorMe', key: 'personal', routes: ['mentorMe', 'mentorProfile'] },
    { label: '培训', path: 'experience', key: 'training', routes: ['experience', 'dataCenter'] }
  ];

  function activeTab(key) {
    return tabs.find(tab => tab.routes.includes(key)) || tabs[0];
  }

  function renderMentorTabs() {
    const bar = document.getElementById('tabbar');
    if (!bar || !mentorRole()) return;
    const key = routeKey();
    if (key === 'choose') {
      bar.className = 'tabbar hidden';
      bar.innerHTML = '';
      return;
    }
    const active = activeTab(key).key;
    bar.innerHTML = tabs.map(tab => {
      const selected = tab.key === active;
      const path = tab.path;
      return `<button class="tab v12-mentor-tab${selected ? ' active' : ''}" type="button" aria-label="${tab.label}" aria-current="${selected ? 'page' : 'false'}" onclick="go('#/${path}')"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icons[tab.key === 'publish' ? 'publish' : tab.key === 'personal' ? 'personal' : tab.key === 'training' ? 'training' : 'messages']}</svg><span>${tab.label}</span></button>`;
    }).join('');
    bar.className = 'tabbar v12-mentor-tabbar';
  }

  function applyMentorTitles() {
    if (mentorRole()) {
      NAV.messages = { title: '消息中心' };
      NAV.mentorDemands = { title: '发布中心' };
      NAV.mentorMe = { title: '个人中心' };
      NAV.experience = { title: '培训中心' };
      NAV.conversation = { title: '消息详情' };
    } else {
      NAV.messages = { ...navConfig.messages };
      NAV.mentorDemands = { ...navConfig.mentorDemands };
      NAV.mentorMe = { ...navConfig.mentorMe };
      NAV.experience = { ...navConfig.experience };
      NAV.conversation = { ...navConfig.conversation };
    }
  }

  // 服务者的“培训”是平台服务规范入口，不与学生经验库混用。
  PAGES.experience = function () {
    if (!mentorRole()) return originalExperiencePage ? originalExperiencePage() : '<div class="page"></div>';
    return `<div class="page tl-v2-page v12-training-page">
      <div class="tl-v2-kicker">MENTOR LEARNING CENTER</div>
      <h1 class="tl-v2-headline">培训中心</h1>
      <p class="tl-v2-sub">了解平台服务流程与基本规范，让每一次经验分享都更清晰、更有帮助。</p>
      <section class="v12-training-intro"><span class="v12-training-mark">同路 · 服务者指南</span><b>先了解规则，再开始服务</b><p>以下为平台体验版指引入口。正式培训课程、学习进度和结业记录尚未接入。</p></section>
      <div class="v12-training-list">
        <article><span class="v12-training-no">01</span><div><b>平台入驻与服务流程</b><p>了解资料完善、服务展示、咨询沟通及服务边界。</p><small>平台基础指南 · 内容筹备中</small></div><span class="v12-training-arrow">›</span></article>
        <article><span class="v12-training-no">02</span><div><b>沟通与咨询规范</b><p>如何了解学生诉求、明确服务范围，并保护双方隐私。</p><small>服务规范 · 内容筹备中</small></div><span class="v12-training-arrow">›</span></article>
        <article><span class="v12-training-no">03</span><div><b>简历与申请材料辅导</b><p>围绕真实经历进行梳理和表达，不夸大、不编造材料。</p><small>简历润色服务 · 内容筹备中</small></div><span class="v12-training-arrow">›</span></article>
        <article><span class="v12-training-no">04</span><div><b>面试与科研竞赛辅导</b><p>明确辅导目标、准备方式和反馈边界，帮助学生形成自己的表达。</p><small>专项服务指南 · 内容筹备中</small></div><span class="v12-training-arrow">›</span></article>
      </div>
      <p class="v12-training-note">说明：当前页面仅展示培训栏目框架，不代表已开设真实课程或颁发培训证书。</p>
    </div>`;
  };

  // 将旧“学生需求广场”作为当前发布栏目的承载页面，并统一页面标题。
  PAGES.mentorDemands = function () {
    let html = originalDemandPage ? originalDemandPage() : '<div class="page"></div>';
    if (!mentorRole()) return html;
    html = html.replace('发现适合你辅导的学生需求', '发布中心');
    html = html.replace('先展示匿名需求，再决定是否提供服务。这里不展示学生个人隐私或虚构的匹配百分比。', '在这里查看学生发布的需求，了解可以提供帮助的方向。学生信息以匿名方式展示。');
    html = html.replace('学生需求广场', '学生需求');
    return html;
  };

  // 消息页沿用现有本地会话能力，不伪装成已接入实时通信。
  PAGES.messages = function () {
    let html = originalMessagesPage ? originalMessagesPage() : '<div class="page"></div>';
    if (!mentorRole()) return html;
    return html.replace("onclick=\"go('#/mentorMe')\">返回服务者空间", "onclick=\"go('#/mentorDemands')\">查看发布中心");
  };

  renderNav = function (name) {
    applyMentorTitles();
    return originalRenderNav(name);
  };

  actionbar = function (name) {
    if (mentorRole() && ['messages', 'conversation', 'mentorDemands', 'mentorMe', 'experience', 'mentorProfile', 'mentorHome'].includes(name)) return '';
    return originalActionbar(name);
  };

  render = function () {
    applyMentorTitles();
    originalRender();
    renderMentorTabs();
  };

  go = function (hash) {
    if (mentorRole() && hash === '#/mentorHome') hash = '#/messages';
    return originalGo(hash);
  };

  back = function () {
    if (mentorRole()) {
      const key = routeKey();
      if (key === 'conversation') return go('#/messages');
      if (['messages', 'mentorDemands', 'mentorMe', 'experience', 'mentorHome'].includes(key)) return go('#/messages');
    }
    return originalBack();
  };

  if (typeof originalSelectRole === 'function') {
    window.selectTongluRole = function (role) {
      originalSelectRole(role);
      if (role === 'mentor') go('#/messages');
    };
  }

  // role-v3 使用独立 hashchange 监听器；此监听确保路由变化后导航同步。
  window.addEventListener('hashchange', renderMentorTabs);
  applyMentorTitles();
  renderMentorTabs();
})();
