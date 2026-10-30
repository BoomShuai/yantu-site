/* ============================================================
   app.js — 可交互演示（11 屏 · 双设计版本）
   路由：hash（#/home #/profile …）
   主题：?theme=v1|v2 ；嵌入模式：?embed=1
   ============================================================ */

const M = window.MOCK;
const QS = new URLSearchParams(location.search);
const EMBED = QS.has("embed");
const FAST = QS.has("shot");

/* ---------------- 主题 ---------------- */
function currentTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}
function setTheme(t) {
  const dark = t === "dark";
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  QS.set("theme", dark ? "dark" : "light");
  const url = location.pathname + "?" + QS.toString() + location.hash;
  history.replaceState(null, "", url);
  document.querySelectorAll("[data-theme-btn]").forEach((b) =>
    b.classList.toggle("on", (b.dataset.themeBtn === "dark") === dark));
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", dark ? "#0e1220" : "#f7f5fc");
  try { localStorage.setItem("yantu-theme", dark ? "dark" : "light"); } catch (e) {}
  // 通知外层官网
  try { window.parent.postMessage({ type: "yantu-theme", theme: dark ? "dark" : "light" }, "*"); } catch (e) {}
}

/* ---------------- 状态 ---------------- */
const S = {
  profileStep: 0,
  rankNo: "8",
  rankTotal: "120",
  rankErr: false,
  goal: "985 学硕",
  diagDone: false,
  activeProvider: "chen",
  proposalVer: "v1",   // v1 → v2（演示改价）
  paid: false,
  deliveryState: 0,    // 0 服务中 / 1 待确认 / 2 已完成
  schoolCat: "全部",
  adminTab: "审核队列",
  grade: "大三",
  english: "CET-6",
  hasProof: "已有",
};

/* ---------------- 图标 ---------------- */
const ICON = {
  back: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.8 9.2V20h12.4V9.2"/><path d="M9.8 20v-5.6h4.4V20"/></svg>',
  school: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 3 7.4l9 4.4 9-4.4L12 3Z"/><path d="M5.8 10.2v5.3c0 1.4 2.8 2.5 6.2 2.5s6.2-1.1 6.2-2.5v-5.3"/><path d="M21 7.4v5"/></svg>',
  me: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="8.4" r="3.5"/><path d="M4.9 19.8c.7-3.4 3.5-5.2 7.1-5.2s6.4 1.8 7.1 5.2"/></svg>',
  tutor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2.8" y="4.6" width="18.4" height="12.4" rx="2"/><path d="M7.5 20.4h9"/><path d="M12 17v3.4"/><path d="M7.4 9.6h5.2"/><path d="M7.4 12.8h8"/></svg>'
};

/* ---------------- 屏单（与文档 01–11 一一对应） ---------------- */
const SCREENS = [
  { no: "01", key: "home", title: "首页", prd: "P01 · 未建档态" },
  { no: "02", key: "profile", title: "需求建档", prd: "P04 · 分步表单" },
  { no: "03", key: "diagnosis", title: "定位结果", prd: "P05 · 三层信息" },
  { no: "04", key: "provider", title: "服务者详情", prd: "P06 · 满额态" },
  { no: "05", key: "presale", title: "售前沟通", prd: "P07 · 材料授权" },
  { no: "06", key: "proposal", title: "服务方案", prd: "P07 · 双向确认" },
  { no: "07", key: "checkout", title: "付款与订单", prd: "P08 · 容量拦截" },
  { no: "08", key: "delivery", title: "服务交付", prd: "P07 · 版本保留" },
  { no: "09", key: "school", title: "院校资讯", prd: "P02 · 日期精度" },
  { no: "10", key: "quota", title: "额度用尽", prd: "F02 · 异常态" },
  { no: "11", key: "nocandidate", title: "无候选", prd: "F03 · 异常态" },
  { no: "12", key: "me", title: "我的", prd: "P03 · 档案/订单" },
  { no: "13", key: "noticeDetail", title: "通知详情", prd: "P09 · 版本变更" },
  { no: "14", key: "workbench", title: "服务者工作台", prd: "P10 · 容量/排班" },
  { no: "15", key: "admin", title: "管理后台", prd: "P11 · 审核队列" },
  { no: "16", key: "tutor", title: "辅导端", prd: "服务者视角 · 接单容量" },
  { no: "17", key: "about", title: "关于与设置", prd: "上架必需 · 隐私/协议/版本" }
];
const NAV = {
  home: { brand: true },
  profile: { title: "建立定位档案" },
  diagnosis: { title: "定位结果" },
  provider: { title: "服务者详情" },
  presale: { title: "售前沟通" },
  proposal: { title: "服务方案" },
  checkout: { title: "付款与订单" },
  delivery: { title: "服务交付" },
  school: { title: "院校资讯" },
  quota: { title: "定位额度" },
  nocandidate: { title: "为你推荐" },
  me: { title: "我的" },
  noticeDetail: { title: "通知详情" },
  workbench: { title: "服务者工作台" },
  admin: { title: "管理后台" },
  tutor: { hidden: true },
  about: { title: "关于与设置" }
};
const TABS = { home: "home", school: "school", tutor: "tutor", me: "me" };

/* ---------------- 工具 ---------------- */
function go(hash) {
  const t = document.getElementById("toast");
  if (t) { t.classList.remove("show"); clearTimeout(toastTimer); }
  if (location.hash === hash) render(); else location.hash = hash;
}
function back() { if (history.length > 1) history.back(); else go("#/home"); }
let toastTimer;
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2000);
}
function provider() { return M.providers.find((p) => p.id === S.activeProvider) || M.providers[0]; }
function remain(p) { return Math.max(0, p.capacity.u - p.capacity.l - p.capacity.h); }
function evTag(ev) {
  const map = { fact: "事实", infer: "推断", todo: "待核实" };
  return `<span class="ev ${ev}">${map[ev]}</span>`;
}

/* ============================================================
   页面
   ============================================================ */

function pageHome() {
  const st = M.student;
  return `
  <div class="page">
    <section class="hero">
      <span class="h-chip">● 定位助手</span>
      <h1>先弄清<em>你的情况</em>，<br/>再决定找谁帮你。</h1>
      <p>3 分钟说清背景与问题，给出阶段判断与下一步建议。</p>
      <div class="btn-row">
        <button class="btn primary" onclick="go('#/profile')">开始定位</button>
        <button class="btn line" onclick="go('#/profile')">描述我的需求</button>
      </div>
    </section>

    <div class="quick-chips">
      <button class="btn xs line" onclick="go('#/profile')">适合准备哪些项目？</button>
      <button class="btn xs line" onclick="go('#/profile')">帮我看看申请材料</button>
    </div>

    <div class="alert mt12">
      <span class="ico">⚠</span>
      <span><b>尚未建档：</b>下方为公开精选内容，完成定位后才会出现与你匹配的服务者。</span>
    </div>

    <div class="sec-head"><h3><span class="sec-num">01</span>近期院校通知</h3><span class="link" onclick="go('#/school')">全部 ›</span></div>
    <div class="card">
      ${M.notices.map((n) => `
        <div class="notice-item" onclick="go('#/noticeDetail')">
          <div class="n-date">
            <div class="d ${n.day === "—" ? "none" : ""}">${n.day}</div>
            <div class="m">${n.month}</div>
          </div>
          <div class="grow">
            <div class="n-title">${n.title}</div>
            <div class="n-meta">
              <span class="badge ${n.tone}">${n.status}</span>
              <span class="tiny dim">${n.source}</span>
            </div>
            ${n.note ? `<div class="tiny dim mt6">${n.note}</div>` : ""}
          </div>
        </div>`).join("")}
    </div>

    <div class="sec-head"><h3><span class="sec-num">02</span>可参考案例</h3><span class="link">更多 ›</span></div>
    <div class="card">
      ${M.cases.map((c) => `
        <div class="case-item">
          <div class="case-logo">${c.logo}</div>
          <div class="grow">
            <div class="bold small">${c.title}</div>
            <div class="tiny dim mt6">${c.desc}</div>
            <div class="n-meta">${c.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>
          </div>
        </div>`).join('<div class="divider"></div>')}
    </div>

    <div class="tiny dim center mt16">
      内容均标注来源与核验时间 · 不提供录取概率或保录取承诺
    </div>
  </div>`;
}

function pageProfile() {
  const st = M.student;
  const step = S.profileStep;
  const bar = `<div class="step-bar">${[0, 1, 2, 3].map((i) => `<i class="${i <= step ? "on" : ""}"></i>`).join("")}</div>
    <div class="tiny dim mb12">第 ${step + 1} / 4 步 · ${["基本信息", "学业情况", "目标与问题", "材料授权"][step]}</div>`;

  let body = "";
  if (step === 0) {
    body = `
      <div class="field"><label>学校 <span class="req">*</span></label>
        <input class="input" value="${st.school}" /></div>
      <div class="field"><label>专业 <span class="req">*</span></label>
        <input class="input" value="${st.major}" /></div>
      <div class="field"><label>年级</label>
        <div class="two-col">
          ${["大三", "大四"].map((g) => `<div class="choice ${S.grade === g ? "active" : ""}" onclick="setPick('grade','${g}')">${g}</div>`).join("")}
        </div>
      </div>
      <div class="field"><label>目标入学年份</label>
        <input class="input" value="2027 级" /></div>`;
  } else if (step === 1) {
    body = `
      <div class="field">
        <label>专业排名 <span class="req">*</span> <span class="hint">名次 / 总人数</span></label>
        <div class="two-col">
          <input class="input ${S.rankErr ? "err" : ""}" id="rankNo" value="${S.rankNo}" oninput="S.rankNo=this.value;S.rankErr=false" />
          <input class="input ${S.rankErr ? "err" : ""}" id="rankTotal" value="${S.rankTotal}" oninput="S.rankTotal=this.value;S.rankErr=false" />
        </div>
        ${S.rankErr
          ? `<div class="field-err">名次不能大于总人数，请检查后再提交。（AC02）</div>`
          : `<div class="tiny dim mt6">名次不超过总人数；未参加排名可切换为「暂无」</div>`}
        <button class="btn xs line mt8" onclick="fillBadRank()">填入 20 / 10（演示校验）</button>
      </div>
      <div class="field"><label>英语成绩</label>
        <div class="two-col">
          ${["CET-6", "CET-4"].map((g) => `<div class="choice ${S.english === g ? "active" : ""}" onclick="setPick('english','${g}')">${g}</div>`).join("")}
        </div>
        <input class="input mt8" value="512" />
      </div>
      <div class="field"><label>是否已有排名证明</label>
        <div class="two-col">${["已有", "待开"].map((g) => `<div class="choice ${S.hasProof === g ? "active" : ""}" onclick="setPick('hasProof','${g}')">${g}</div>`).join("")}</div>
      </div>`;
  } else if (step === 2) {
    body = `
      <div class="field"><label>目标 <span class="req">*</span></label>
        <div class="two-col">
          ${["985 学硕", "985 专硕"].map((g) => `<div class="choice ${S.goal === g ? "active" : ""}" onclick="setGoal('${g}')">${g}</div>`).join("")}
        </div>
        <div class="two-col mt8">
          ${["211 学硕", "科研院所"].map((g) => `<div class="choice ${S.goal === g ? "active" : ""}" onclick="setGoal('${g}')">${g}</div>`).join("")}
        </div>
      </div>
      <div class="field"><label>你现在最想解决的问题 <span class="req">*</span></label>
        <textarea class="input" rows="4">${st.issue}</textarea>
      </div>`;
  } else {
    body = `
      <div class="alert info"><span class="ico">🔒</span>
        <span><b>按需授权：</b>材料只在本次需求内授权给指定服务者，可随时撤回。</span></div>
      <div class="field"><label>上传材料 <span class="hint">PDF / Word，单个不超过 20MB</span></label>
        <div class="card" style="border-style:dashed">
          <div class="row"><div class="list-row ico" style="margin:0">＋</div>
            <div class="grow"><div class="bold small">点击上传或拖入文件</div>
            <div class="tiny dim">未上传也可以先完成定位</div></div></div>
        </div>
        <div class="mt12">${st.materials.map((m) => `
          <div class="row between" style="padding:8px 0;border-bottom:1px solid var(--line)">
            <span class="small">📄 ${m}</span><span class="tiny dim">已上传</span>
          </div>`).join("")}
        </div>
      </div>`;
  }

  return `
  <div class="page">
    ${bar}
    <div class="card">${body}</div>
    <div class="tiny dim center mt16">档案可随时修改 · 未确认的信息不会用于匹配</div>
  </div>`;
}

function pageDiagnosis() {
  const d = M.diagnosis;
  if (!S.diagDone) {
    return `
    <div class="page" style="padding-top:26px">
      <div class="card center" style="padding:34px 18px">
        <div style="font-size:26px">◎</div>
        <div class="bold mt12">正在生成定位结果…</div>
        <div class="tiny dim mt8">读取已确认档案 v3 · 约 10 秒</div>
        <div class="progress mt16"><i style="width:62%"></i></div>
      </div>
      <div class="tiny dim center mt16">生成失败不会扣减额度</div>
    </div>`;
  }
  return `
  <div class="page">
    <div class="row between mt6">
      <span class="badge green">定位完成</span>
      <span class="tiny dim">生成于 ${d.genAt} · 档案版本 ${d.version}</span>
    </div>
    <h2 style="font-size:19px;font-weight:800;margin:11px 0 4px;line-height:1.45">
      当前处于<em style="font-style:normal;color:var(--accent)">材料准备期</em>，优势在排名。
    </h2>

    <div class="card mt12">
      <div class="row between">
        <span class="tiny dim bold">需求摘要</span>
        <span class="row" style="gap:5px">
          <span class="ev fact">事实</span><span class="ev infer">推断</span><span class="ev todo">待核实</span>
        </span>
      </div>
      <div class="small mt8" style="line-height:1.65">${d.summary}</div>
      <div class="divider"></div>
      <div class="tiny">
        <div class="row top"><span class="dim" style="width:34px;flex:none">已知</span>
          <span class="grow">${d.known.map((k) => `${k.k} ${evTag(k.ev)}`).join(" · ")}</span></div>
        <div class="row top mt8"><span class="dim" style="width:34px;flex:none">缺失</span>
          <span class="grow">${d.missing.join(" · ")}</span></div>
      </div>
    </div>

    <div class="sec-head"><h3><span class="sec-num">03</span>下一步建议</h3></div>
    <div class="card">
      ${d.next.map((n, i) => `
        <div class="row top" style="padding:11px 0;${i ? "border-top:1px solid var(--line)" : ""}">
          <span class="bold" style="color:var(--accent);font-size:13px">${n.no}</span>
          <span class="grow small">${n.text}</span>
        </div>`).join("")}
    </div>

    <div class="alert mt12"><span class="ico">⚠</span>
      <span><b>本结果不含录取概率或保录承诺。</b>依据不足处已标注，请以官方信息为准。</span></div>
  </div>`;
}

function pageProvider() {
  const p = provider();
  const rest = remain(p);
  const full = rest === 0;
  return `
  <div class="page">
    <div class="card">
      <div class="row top">
        <div class="case-logo" style="width:52px;height:52px;font-size:18px">陈</div>
        <div class="grow">
          <div class="row" style="gap:7px"><span class="bold" style="font-size:16px">${p.name}</span>
            <span class="badge">已核验</span></div>
          <div class="presence mt6">${p.presence.state === "online"
            ? `<i class="dot-on"></i><span class="on">${p.presence.text}</span>`
            : `<i class="dot-off"></i><span class="off">${p.presence.text}</span>`}
            <span class="sep">·</span><span class="dim">${p.presence.replyIn}</span></div>
          <div class="tiny dim mt6">${p.brief}</div>
          <div class="n-meta">${p.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>
        </div>
      </div>
    </div>

    ${full ? `<div class="alert mt12"><span class="ico">⚠</span>
      <span><b>当前已满额（${p.capacity.l}/${p.capacity.u}），暂不可预约。</b>可收藏后等待名额释放，或查看其他有余量的服务者。</span></div>` : ""}

    <div class="sec-head"><h3><span class="sec-num">04</span>核验范围</h3></div>
    <div class="card">
      ${p.check.map((c) => `<div class="kv"><span class="k">${c.k}</span><span class="v">${c.v}</span></div>`).join("")}
    </div>
    <div class="alert mt10"><span class="ico">⚠</span>
      <span>身份核验不等于能力认证。能力来自历史服务记录。</span></div>

    <div class="sec-head"><h3><span class="sec-num">05</span>服务项目</h3><span class="link">${p.services.length} 项</span></div>
    <div class="card">
      ${p.services.map((s, i) => `
        <div class="row top" style="padding:11px 0;${i ? "border-top:1px solid var(--line)" : ""}">
          <div class="grow">
            <div class="bold small">${s.name}</div>
            <div class="tiny dim mt6">${s.desc}</div>
          </div>
          <div class="price">¥${s.price}</div>
        </div>`).join("")}
    </div>

    <div class="sec-head"><h3><span class="sec-num">06</span>服务评价</h3><span class="link">${p.rating.score} · ${p.rating.count} 条</span></div>
    <div class="card">
      <div class="small" style="line-height:1.65">${p.review.text}</div>
      <div class="tiny dim mt6">${p.review.meta}</div>
    </div>
    <div class="tiny dim center mt16">名额按服务承诺计数，付款前会再次校验</div>
  </div>`;
}

function pagePresale() {
  const p = provider();
  return `
  <div class="page">
    <div class="chat-head">
      <div class="ava">陈</div>
      <div class="grow">
        <div class="nm">${p.name} · 售前沟通</div>
        <div class="presence mt6">${p.presence.state === "online"
          ? `<i class="dot-on"></i><span class="on">${p.presence.text}</span>`
          : `<i class="dot-off"></i><span class="off">${p.presence.text}</span>`}
          <span class="sep">·</span><span class="dim">${p.presence.replyIn}</span></div>
      </div>
    </div>

    <div class="alert info mt12"><span class="ico">🛡</span>
      <span>本次沟通与需求 <b>${M.student.key}</b> 绑定，聊天记录仅用于本次服务。</span></div>

    <div class="mt16">
      ${M.chat.map((c) => `
        <div class="chat-row ${c.me ? "me" : ""}">
          <div class="chat-ava">${c.me ? "我" : "陈"}</div>
          <div class="bubble">${c.text}</div>
        </div>`).join("")}
    </div>

    <div class="card mt8">
      <div class="row between">
        <span class="tiny dim bold">材料授权</span><span class="badge green">已授权</span>
      </div>
      <div class="mt8">${M.authCard.files.map((f) => `<div class="tiny">📄 ${f}</div>`).join("")}</div>
      <div class="tiny dim mt8">${M.authCard.note}</div>
    </div>

    <div class="alert mt12"><span class="ico">⚠</span>
      <span><b>平台审核中：</b>请勿在聊天中交换微信号、手机号或二维码，否则订单可能被拦截。</span></div>

    <div class="card mt12">
      <div class="row between">
        <span class="bold small">陈老师已发来服务方案 v1</span>
        <span class="price">¥${M.proposal.v1.price}</span>
      </div>
      <div class="tiny dim mt6">材料诊断 · 1 次 60 分钟 · 沟通后 3 日内交付</div>
      <button class="btn primary block sm mt12" onclick="go('#/proposal')">查看方案 v1</button>
    </div>
    <div class="tiny dim center mt16">售前沟通不产生费用</div>
  </div>`;
}

function pageProposal() {
  const v2 = M.proposal.v2;
  const isV2 = S.proposalVer === "v2";
  return `
  <div class="page">
    <div class="row between mt6">
      <span class="tiny dim bold">方案版本 <span class="bold" style="color:var(--ink);margin-left:4px">${isV2 ? "v2（当前）" : "v1（当前）"}</span></span>
      <span class="badge ${isV2 ? "orange" : "green"}">${isV2 ? "待双方确认" : "已双方确认"}</span>
    </div>

    <div class="card mt12">
      <div class="row between">
        <span class="bold">材料诊断</span>
        <span class="price">¥${isV2 ? v2.price : M.proposal.v1.price}</span>
      </div>
      ${isV2 ? `<div class="tiny dim mt6">${v2.note}</div>` : `<div class="tiny dim mt6">初版方案 · 双方已确认，价格 ¥380</div>`}
      <div class="divider"></div>
      ${(isV2 ? v2.items : [
        { k: "问题范围", v: "个人陈述 + 简历" },
        { k: "服务方式", v: "1 次 60 分钟 + 批注" },
        { k: "交付时间", v: "沟通后 3 日内" },
        { k: "追问范围", v: "7 天内 2 轮" }
      ]).map((i) => `<div class="kv"><span class="k">${i.k}</span><span class="v">${i.v}</span></div>`).join("")}
    </div>

    ${isV2 ? `
      <div class="alert danger mt12"><span class="ico">!</span>
        <span><b>你在 v1 的确认已失效。</b>价格变更后需双方重新确认 v2，v1 不能再付款。</span></div>
    ` : ""}

    <div class="sec-head"><h3><span class="sec-num">07</span>确认状态</h3>
      <span class="link" onclick="toggleVer()">${isV2 ? "查看 v1（已确认）" : "查看 v2（已改价）"}</span></div>
    <div class="card">
      <div class="kv"><span class="k">服务者（陈老师）</span>
        <span class="v">${isV2 ? '<span class="badge green">已确认 v2</span>' : '<span class="badge green">已确认 v1</span>'}</span></div>
      <div class="kv"><span class="k">你</span>
        <span class="v">${isV2 ? '<span class="badge orange">待确认</span>' : '<span class="badge green">已确认 v1</span>'}</span></div>
    </div>

    <div class="alert mt12"><span class="ico">⚠</span>
      <span>双方确认同一版本后才会开放付款。仅服务者确认不足以付款。</span></div>
    <div class="tiny dim center mt16">方案变更会生成新版本，旧版本永久留档</div>
  </div>`;
}

function pageCheckout() {
  const price = M.proposal.v2.price;
  return `
  <div class="page">
    <div class="card">
      <div class="tiny dim bold">应付金额</div>
      <div class="row between mt8">
        <span class="price" style="font-size:30px">¥${price}</span>
        <span class="badge gray">材料诊断 · v2</span>
      </div>
      <div class="tiny dim mt8">取自服务端方案快照 v2 · 不可修改</div>
    </div>

    <div class="alert danger mt12"><span class="ico">!</span>
      <span><b>名额刚刚被占用，暂不可付款。</b>推荐时有名额，不等于付款时仍有名额。</span></div>

    <div class="card mt12">
      <div class="kv"><span class="k">占位有效期</span><span class="v">未取得占位</span></div>
      <div class="kv"><span class="k">支付状态</span><span class="v">未发起</span></div>
      <div class="kv"><span class="k">方案版本</span><span class="v">v2 · 双方已确认</span></div>
      <div class="kv"><span class="k">服务者</span><span class="v">陈老师 · 3/3 满额</span></div>
    </div>

    <div class="alert mt12"><span class="ico">⚠</span>
      <span>若你已支付但名额被占，平台将原路退回，不进入服务流程。</span></div>

    <div class="sec-head"><h3><span class="sec-num">08</span>这笔钱包含什么</h3></div>
    <div class="card">
      <div class="kv"><span class="k">服务内容</span><span class="v">1 次 60 分钟 + 逐段批注</span></div>
      <div class="kv"><span class="k">交付时间</span><span class="v">沟通后 3 日内</span></div>
      <div class="kv"><span class="k">退款规则</span><span class="v">未开始服务可全额退</span></div>
    </div>
    <div class="tiny dim center mt16">支付前会再次校验名额与方案版本</div>
  </div>`;
}

function pageDelivery() {
  const d = M.delivery;
  const st = S.deliveryState;
  const steps = ["已付款", "服务中", "待确认", "已完成"];
  return `
  <div class="page">
    <div class="card">
      <div class="steps4">
        ${steps.map((s, i) => `${i ? '<span class="line ' + (i <= st + 1 ? "done" : "") + '"></span>' : ""}
          <div class="st ${i < st + 1 ? "done" : i === st + 1 ? "now" : ""}">
            <div class="dot">${i < st + 1 ? "✓" : i + 1}</div>
            <div class="lb">${s}</div>
          </div>`).join("")}
      </div>
    </div>

    <div class="sec-head"><h3><span class="sec-num">09</span>交付文件</h3><span class="link">保留全部版本</span></div>
    <div class="card">
      ${d.files.map((f, i) => `
        <div class="row between" style="padding:11px 0;${i ? "border-top:1px solid var(--line)" : ""}">
          <div class="grow">
            <div class="small bold">📄 ${f.name}</div>
            <div class="tiny dim mt6">${f.time}</div>
          </div>
          <span class="badge ${i ? "gray" : "green"}">${f.ver}</span>
        </div>`).join("")}
    </div>

    <div class="alert mt12"><span class="ico">⚠</span>
      <span><b>系统不会自动完成订单。</b>需你确认交付或提出修改，超时未确认将保持「待确认」。</span></div>

    ${st === 0 ? `<div class="card mt12">
      <div class="bold small">本次交付说明</div>
      <div class="tiny dim mt8" style="line-height:1.7">
        已按「问题—方法—结果」重写第二段，并标注 3 处建议补充的数据。7 天内可追问 2 轮。
      </div>
    </div>` : ""}
    ${st >= 1 ? `<div class="alert info mt12"><span class="ico">✓</span><span>你已确认交付，服务者奖励将在 T+1 结算。</span></div>` : ""}
    <div class="tiny dim center mt16">材料版本永久保留，可随时回看</div>
  </div>`;
}

function pageSchool() {
  const cats = ["全部", "机械", "能源", "材料"];
  const list = M.notices;
  return `
  <div class="page">
    <div class="quick-chips" style="overflow-x:auto">
      ${cats.map((c) => `<button class="btn xs ${S.schoolCat === c ? "primary" : "line"}" onclick="setCat('${c}')">${c}</button>`).join("")}
    </div>

    <div class="alert mt12"><span class="ico">⚠</span>
      <span>官方只给日期时，本平台不会推测为 23:59；只给月份时显示「时间待公布」。</span></div>

    <div class="sec-head"><h3><span class="sec-num">10</span>推免通知</h3><span class="link">${list.length} 条</span></div>
    ${list.map((n) => `
      <div class="card tap" onclick="go('#/noticeDetail')">
        <div class="row between">
          <div class="row" style="gap:10px">
            <div class="n-date">
              <div class="d ${n.day === "—" ? "none" : ""}">${n.day}</div>
              <div class="m">${n.month}</div>
            </div>
            <div>
              <div class="n-title" style="max-width:200px">${n.title}</div>
              <div class="n-meta">
                <span class="badge ${n.tone}">${n.status}</span>
                ${n.days ? `<span class="tiny dim">剩余 ${n.days} 天</span>` : `<span class="tiny dim">${n.precision}</span>`}
              </div>
            </div>
          </div>
        </div>
        <div class="divider"></div>
        <div class="tiny dim" style="line-height:1.65">${n.detail}</div>
        <div class="row between mt10">
          <span class="tiny dim">${n.source}</span>
          <span class="tiny" style="color:var(--accent)">查看原文 ›</span>
        </div>
      </div>`).join("")}
    <div class="tiny dim center mt16">所有时间以院校官网为准 · 核验时间见详情</div>
  </div>`;
}

function pageQuota() {
  const q = M.student.quota;
  return `
  <div class="page">
    <div class="card center" style="padding:28px 18px">
      <div style="font-size:30px">◷</div>
      <div class="bold mt12" style="font-size:16px">今日定位额度已用完</div>
      <div class="small dim mt8">${q.resetAt} 恢复 ${q.total} 次额度</div>
    </div>

    <div class="sec-head"><h3><span class="sec-num">11</span>这些功能不受影响</h3></div>
    <div class="card">
      ${[
        ["🗂", "历史定位结果", "随时回看，不限次数", "#/diagnosis"],
        ["💬", "售前沟通", "与已联系的服务者继续沟通", "#/presale"],
        ["📦", "已有订单", "查看交付与进度", "#/delivery"],
        ["📰", "院校资讯", "全部内容免额度浏览", "#/school"]
      ].map(([i, t, d, go], idx) => `
        <div class="list-row" onclick="go('${go}')" style="${idx ? "" : "padding-top:2px"}">
          <div class="ico">${i}</div>
          <div class="grow"><div class="small bold">${t}</div><div class="tiny dim">${d}</div></div>
          <span class="tiny dim">›</span>
        </div>`).join("")}
    </div>

    <div class="alert mt12"><span class="ico">⚠</span>
      <span>额度上限不可绕过；用量与恢复时间可在「我的」中查看。</span></div>
    <div class="tiny dim center mt16">额度为示意值，实际由后台配置（D02）</div>
  </div>`;
}

function pageNoCandidate() {
  return `
  <div class="page">
    <div class="card center" style="padding:28px 18px">
      <div style="font-size:30px">⌕</div>
      <div class="bold mt12" style="font-size:16px">暂时没有匹配的服务者</div>
      <div class="small dim mt8" style="line-height:1.7">
        你的需求是「材料诊断 · 机械 · 985 学硕」，<br/>当前没有满足全部条件的已核验服务者。
      </div>
    </div>

    <div class="sec-head"><h3><span class="sec-num">12</span>缺口说明</h3></div>
    <div class="card">
      <div class="kv"><span class="k">要求的服务类型</span><span class="v">材料诊断</span></div>
      <div class="kv"><span class="k">要求的专业方向</span><span class="v">机械工程</span></div>
      <div class="kv"><span class="k">当前可约人数</span><span class="v">0 人</span></div>
      <div class="kv"><span class="k">最近一位</span><span class="v">已满额 · 预计 11-02 释放</span></div>
    </div>

    <div class="alert mt12"><span class="ico">⚠</span>
      <span><b>不会为你补一个虚拟人选。</b>可放宽条件，或留下需求等待匹配。</span></div>

    <div class="sec-head"><h3><span class="sec-num">13</span>可以这样调整</h3></div>
    <div class="card">
      <div class="list-row" onclick="go('#/provider')">
        <div class="ico">①</div>
        <div class="grow"><div class="small bold">放宽专业方向</div><div class="tiny dim">相近专业有 2 位可约</div></div>
        <span class="tiny dim">›</span>
      </div>
      <div class="list-row" onclick="go('#/provider')">
        <div class="ico">②</div>
        <div class="grow"><div class="small bold">改为研究经历梳理</div><div class="tiny dim">1 位可约</div></div>
        <span class="tiny dim">›</span>
      </div>
      <div class="list-row" onclick="toast('已记录：名额释放后通知你（仅站内消息）')">
        <div class="ico">③</div>
        <div class="grow"><div class="small bold">等待名额释放</div><div class="tiny dim">仅站内消息提醒</div></div>
        <span class="tiny dim">›</span>
      </div>
    </div>
  </div>`;
}

/* ============================================================
   辅导端（服务者视角）
   ============================================================ */
function pageTutor() {
  const t = M.tutor;
  const rest = Math.max(0, t.capacity.u - t.capacity.l - t.capacity.h);
  return `
  <div class="page">
    <div class="card mt6">
      <div class="row between">
        <div class="row" style="gap:10px">
          <div class="case-logo" style="width:46px;height:46px;font-size:16px">陈</div>
          <div>
            <div class="bold" style="font-size:15.5px">${t.me.name}</div>
            <div class="tiny dim mt6">${t.me.role} · ${t.me.since}</div>
          </div>
        </div>
        <span class="badge green">${t.me.state}</span>
      </div>
      <div class="presence mt10"><i class="dot-on"></i><span class="on">${t.presence.text}</span>
        <span class="sep">·</span><span class="dim">${t.presence.replyIn}</span></div>
      <div class="divider"></div>
      <div class="row" style="text-align:center">
        ${t.stats.map((x) => `<div class="grow">
          <div class="bold num" style="font-size:17px">${x.v}</div>
          <div class="xs dim">${x.k}</div></div>`).join("")}
      </div>
    </div>

    <div class="sec-head"><h3><span class="sec-num">T1</span>接单容量</h3><span class="link">剩余 ${rest}</span></div>
    <div class="card">
      <div class="row" style="text-align:center">
        <div class="grow"><div class="bold num" style="font-size:18px">${t.capacity.u}</div><div class="xs dim">上限 U</div></div>
        <div class="grow"><div class="bold num" style="font-size:18px">${t.capacity.l}</div><div class="xs dim">已付费 L</div></div>
        <div class="grow"><div class="bold num" style="font-size:18px">${t.capacity.h}</div><div class="xs dim">占位 H</div></div>
        <div class="grow"><div class="bold num" style="font-size:18px;color:var(--accent)">${rest}</div><div class="xs dim">剩余</div></div>
      </div>
      <div class="tiny dim mt10">剩余 = max(0, U − L − H) · 满额即不进入推荐</div>
    </div>

    <div class="sec-head"><h3><span class="sec-num">T2</span>常用操作</h3></div>
    <div class="card">
      ${t.actions.map((a, i) => `
        <div class="list-row" onclick="go('${a.go}')" style="${i === 0 ? "padding-top:2px" : ""}">
          <div class="ico">${a.ico}</div>
          <div class="grow"><div class="small bold">${a.t}</div><div class="tiny dim mt6">${a.d}</div></div>
          <span class="tiny dim">›</span>
        </div>`).join("")}
    </div>

    <div class="sec-head"><h3><span class="sec-num">T3</span>接单规则</h3></div>
    <div class="card">
      ${t.rules.map((r) => `<div class="kv"><span class="k" style="flex:1;padding-right:8px;line-height:1.6">${r}</span></div>`).join("")}
    </div>

    <div class="card mt12" style="border:1px dashed var(--line)">
      <div class="small bold">${t.apply.t}</div>
      <div class="tiny dim mt6">${t.apply.d}</div>
      <button class="btn full mt10" onclick="toast('已提交入驻申请：材料核验通常 1 个工作日')">${t.apply.btn}</button>
    </div>

    <div class="tiny dim center mt16">辅导端与学员端共用同一套账号 · 切换不改变数据</div>
  </div>`;
}

/* ============================================================
   关于与设置（应用上架必需）
   ============================================================ */
function pageAbout() {
  const a = M.about;
  return `
  <div class="page">
    <div class="card center mt6" style="padding:22px 16px">
      <img class="about-logo" src="assets/logo.svg" alt="同路" width="76" height="71" />
      <div class="bold mt10" style="font-size:16px">同路</div>
      <div class="tiny dim mt6">AI 保研服务平台 · v${a.version}（${a.build}）</div>
    </div>

    ${a.groups.map((g, gi) => `
      <div class="sec-head"><h3><span class="sec-num">A${gi + 1}</span>${g.t}</h3></div>
      <div class="card">
        ${g.items.map((it, i) => `
          <div class="list-row" onclick="aboutDetail('${it.go}')" style="${i === 0 ? "padding-top:2px" : ""}">
            <div class="grow"><div class="small bold">${it.k}</div><div class="tiny dim mt6">${it.d}</div></div>
            <span class="tiny dim">›</span>
          </div>`).join("")}
      </div>`).join("")}

    <div class="alert mt12"><span class="ico">⚠</span>
      <span>用户隐私政策、用户服务协议、第三方共享清单为<b>应用商店上架必需项</b>，正式提审前需由主体方补齐法务文本（D07）。</span></div>

    <div class="tiny dim center mt16">同路 · 演示版本，内容为示意</div>
  </div>`;
}

function aboutDetail(k) {
  const a = M.about;
  if (k === "changelog") {
    openSheet("版本更新", a.changelog.map((c) => `
      <div class="card" style="margin-bottom:10px">
        <div class="row between"><span class="bold small">v${c.v}</span><span class="tiny dim">${c.d}</span></div>
        <div class="mt8">${c.log.map((l) => `<div class="tiny dim" style="line-height:1.75">· ${l}</div>`).join("")}</div>
      </div>`).join(""));
    return;
  }
  const txt = {
    appinfo: ["应用详情", "名称：同路<br>定位：AI 保研服务平台<br>形态：微信小程序<br>版本：v" + a.version + "（" + a.build + "）<br>主体：待填（D07）<br>客服：站内消息 · 交易安全审核"],
    developer: ["开发者信息", "开发者主体：待填（D07）<br>注册地址：待填<br>联系邮箱：待填<br><br>个人主体无法开通微信支付，需企业或个体工商户主体（D07 待决）。"],
    privacy: ["用户隐私政策", "本政策说明同路如何收集、使用、存储与共享你的个人信息。<br><br><b>一、收集范围</b><br>· 账号信息：微信昵称、头像、OpenID<br>· 建档信息：院校、专业、名次与总人数、目标方向<br>· 材料文件：成绩单、排名证明、个人陈述等（你主动上传）<br>· 沟通记录：站内会话内容<br><br><b>二、使用目的</b><br>仅用于定位诊断、服务者匹配、订单履约与交易安全审核。<br><br><b>三、保存期限</b><br>账号存续期间保存；注销后 7 个工作日内删除或匿名化。<br><br><b>四、你的权利</b><br>可随时查看、更正、导出、删除个人信息，或在「账号注销」中申请注销。<br><br><b>五、未成年人</b><br>未满 18 周岁需监护人同意后使用。<br><br>正式文本以主体方法务版本为准。"],
    terms: ["用户服务协议", "<b>一、服务性质</b><br>同路提供信息匹配与交易撮合服务，辅导服务由服务者个人提供。<br><br><b>二、名额规则</b><br>服务者接单量有上限；满额时系统不显示可约。推荐本身不锁名额，付款前进行二次校验，校验失败全额退回。<br><br><b>三、方案确认</b><br>方案需双方确认后生效；方案版本变更时，旧版本确认自动作废。<br><br><b>四、退款</b><br>服务开始前可全额退款；服务开始后按已交付比例结算。<br><br><b>五、禁止行为</b><br>禁止在站内交换微信、手机号、二维码等站外联系方式，违者订单可能被拦截。<br><br>正式文本以主体方法务版本为准。"],
    sdk: ["第三方信息共享清单", "· <b>微信登录</b>：获取 OpenID、昵称、头像，用于账号识别<br>· <b>微信支付</b>：获取订单号与支付结果，用于订单履约<br>· <b>微信订阅消息</b>：获取消息推送结果，用于名额释放、订单状态通知<br><br>除上述场景外，不向任何第三方提供你的个人信息。"],
    collect: ["个人信息收集清单", "· 微信昵称 / 头像 — 用于展示与识别 — 账号存续期间<br>· 院校 / 专业 / 名次 / 总人数 — 用于定位匹配 — 账号存续期间<br>· 上传材料文件 — 用于诊断与交付 — 服务结束 90 天后删除<br>· 站内会话 — 用于履约与安全审核 — 账号存续期间<br><br>可随时在「隐私与授权管理」中撤回授权。"],
    cancel: ["账号注销", "注销前需先完结服务中订单。<br><br><b>注销后</b><br>· 个人信息在 7 个工作日内删除或匿名化<br>· 交易记录按法规要求保留 3 年<br>· 已支付订单不影响服务者已完成的服务<br><br>如需注销，请点下方按钮提交申请。"],
    feedback: ["意见反馈", "遇到的问题、想加的功能、界面上的建议，都可以直接告诉我们。<br><br>提审前反馈会优先处理影响使用的阻塞问题。"]
  }[k] || ["详情", "暂无内容"];

  openSheet(txt[0], `<div class="small" style="line-height:1.85">${txt[1]}</div>
    <button class="btn full mt16" onclick="closeSheet();toast('已记录你的反馈')">我知道了</button>`);
}

/* ============================================================
   动作条
   ============================================================ */
function actionbar(name) {
  const p = provider();
  switch (name) {
    case "home":
      return `<button class="btn line" onclick="go('#/quota')">额度说明</button>
              <button class="btn primary wide" onclick="go('#/profile')">开始定位</button>`;
    case "profile":
      return `${S.profileStep > 0 ? '<button class="btn line" onclick="prevStep()">上一步</button>' : '<button class="btn line" onclick="go(\'#/home\')">取消</button>'}
              <button class="btn primary wide" onclick="nextStep()">${S.profileStep === 3 ? "提交并生成定位" : "下一步"}</button>`;
    case "diagnosis":
      return S.diagDone
        ? `<button class="btn line" onclick="go('#/profile')">重新定位</button>
           <button class="btn primary wide" onclick="go('#/provider')">查看匹配服务者 ›</button>`
        : "";
    case "provider": {
      const full = remain(p) === 0;
      return `<button class="btn line" onclick="toast('已收藏，名额释放后站内提醒')">收藏</button>
        ${full
          ? `<button class="btn primary wide" onclick="switchProvider()">查看其他有余量的服务者</button>`
          : `<button class="btn primary wide" onclick="go('#/presale')">预约售前沟通</button>`}`;
    }
    case "presale":
      return `<button class="btn line" onclick="toast('已发送：想先确认交付时间')">先问一句</button>
              <button class="btn primary wide" onclick="go('#/proposal')">查看方案 v1</button>`;
    case "proposal":
      return S.proposalVer === "v2"
        ? `<button class="btn line" onclick="toast('已提交修改请求')">请求修改</button>
           <button class="btn primary wide" onclick="confirmV2()">确认方案 v2 并继续</button>`
        : `<button class="btn line" onclick="toggleVer()">查看 v2</button>
           <button class="btn primary wide" onclick="upgradeV2()">服务者已改价 · 查看 v2 ›</button>`;
    case "checkout":
      return `<button class="btn line" onclick="go('#/proposal')">返回方案</button>
              <button class="btn primary wide" onclick="releaseSeat()">演示：名额释放后可付款</button>`;
    case "delivery":
      return S.deliveryState === 0
        ? `<button class="btn line" onclick="toast('已提交修改意见，等对方返修')">申请修改</button>
           <button class="btn primary wide" onclick="completeDelivery()">确认完成</button>`
        : `<button class="btn line" onclick="go('#/home')">回首页</button>
           <button class="btn primary wide" onclick="go('#/me')">去「我的」评价</button>`;
    case "school":
      return "";
    case "quota":
      return `<button class="btn line" onclick="go('#/school')">去逛资讯</button>
              <button class="btn primary wide" onclick="go('#/home')">明天再来</button>`;
    case "nocandidate":
      return `<button class="btn line" onclick="go('#/profile')">调整条件</button>
              <button class="btn primary wide" onclick="toast('已订阅：名额释放后站内通知')">留下需求</button>`;
    case "me":
      return `<button class="btn line" onclick="go('#/quota')">额度与恢复</button>
              <button class="btn primary wide" onclick="go('#/profile')">更新档案</button>`;
    case "noticeDetail":
      return `<button class="btn line" onclick="toast('已收藏，截止前 1 天站内提醒')">收藏并提醒</button>
              <button class="btn primary wide" onclick="toast('演示：跳转院校官网原文')">查看官网原文</button>`;
    case "workbench":
      return `<button class="btn line" onclick="toast('已标记：今日不再接受新预约')">暂停接单</button>
              <button class="btn primary wide" onclick="toast('演示：进入交付提交页')">提交交付</button>`;
    case "admin":
      return `<button class="btn line" onclick="toast('已导出本周审核记录')">导出记录</button>
              <button class="btn primary wide" onclick="toast('演示：进入线索详情与处置')">处理选中线索</button>`;
    default:
      return "";
  }
}

/* ============================================================
   交互
   ============================================================ */
function nextStep() {
  if (S.profileStep === 1) {
    const a = Number(S.rankNo), b = Number(S.rankTotal);
    if (!a || !b || a > b) {
      S.rankErr = true; render();
      toast("名次不能大于总人数");
      return;
    }
  }
  if (S.profileStep < 3) { S.profileStep += 1; render(); return; }
  S.diagDone = false;
  go("#/diagnosis");
}
function prevStep() { if (S.profileStep > 0) { S.profileStep -= 1; render(); } }
function fillBadRank() {
  S.rankNo = "20"; S.rankTotal = "10"; S.rankErr = true; render();
  const n = document.getElementById("rankNo"); if (n) n.value = "20";
  const t = document.getElementById("rankTotal"); if (t) t.value = "10";
}
function setGoal(g) { S.goal = g; render(); }
function setPick(field, v) { S[field] = v; render(); }
function setAdminTab(t) { S.adminTab = t; render(); }
function toggleVer() { S.proposalVer = S.proposalVer === "v2" ? "v1" : "v2"; render(); }
function upgradeV2() { S.proposalVer = "v2"; render(); toast("方案已更新为 v2：价格 ¥420，需你重新确认"); }
function switchProvider() { S.activeProvider = "wang"; go("#/provider"); render(); }
function confirmV2() { S.proposalVer = "v2"; go("#/checkout"); }
function releaseSeat() {
  toast("演示：名额已释放，支付成功后进入交付");
  S.deliveryState = 0;
  setTimeout(() => go("#/delivery"), 900);
}
function completeDelivery() { S.deliveryState = 1; render(); toast("已确认交付"); }
function setCat(c) { S.schoolCat = c; render(); }
function resetDemo() {
  S.profileStep = 0; S.rankNo = "8"; S.rankTotal = "120"; S.rankErr = false;
  S.diagDone = false; S.activeProvider = "chen"; S.proposalVer = "v1";
  S.paid = false; S.deliveryState = 0; S.schoolCat = "全部";
  closeDrawer(); go("#/home");
}

/* ============================================================
   渲染
   ============================================================ */
const PAGES = {
  home: pageHome, profile: pageProfile, diagnosis: pageDiagnosis, provider: pageProvider,
  presale: pagePresale, proposal: pageProposal, checkout: pageCheckout, delivery: pageDelivery,
  school: pageSchool, quota: pageQuota, nocandidate: pageNoCandidate,
  me: pageMe, noticeDetail: pageNoticeDetail, workbench: pageWorkbench, admin: pageAdmin,
  tutor: pageTutor, about: pageAbout
};

function render() {
  const name = (location.hash.replace(/^#\/?/, "") || "home").split("/")[0];
  const fn = PAGES[name] || pageHome;

  renderNav(name);
  document.getElementById("tabbar").innerHTML = TABS[name]
    ? [["home", "首页", ICON.home, "#/home"], ["school", "院校资讯", ICON.school, "#/school"], ["tutor", "辅导端", ICON.tutor, "#/tutor"], ["me", "我的", ICON.me, "#/me"]]
        .map(([k, t, ic, href]) =>
          `<button class="tab ${TABS[name] === k ? "active" : ""}" onclick="go('${href}')">${ic}<span>${t}</span></button>`).join("")
    : "";
  document.getElementById("tabbar").className = TABS[name] ? "tabbar" : "tabbar hidden";

  const app = document.getElementById("app");
  app.innerHTML = fn();
  app.scrollTop = 0;

  document.getElementById("actionbar").innerHTML = actionbar(name);

  // 定位页加载动画
  if (name === "diagnosis" && !S.diagDone) {
    const done = () => { S.diagDone = true; if ((location.hash.replace(/^#\/?/, "") || "home") === "diagnosis") render(); };
    FAST ? done() : setTimeout(done, 1500);
  }
  if (name === "proposal") S.proposalVer = S.proposalVer || "v1";
  markConsole(name);
}

function renderNav(name) {
  const nav = document.getElementById("navbar");
  const cfg = NAV[name] || {};
  if (cfg.hidden) { nav.className = "navbar hidden"; return; }
  nav.className = "navbar";
  const capsule = `<span class="nav-capsule"><span class="dot"></span><span class="dot"></span><span class="ring"></span></span>`;
  nav.innerHTML = cfg.brand
    ? `<span class="nav-brand"><img class="nav-logo" src="assets/logo.svg" alt="" width="22" height="21" />同路<small>保研服务</small></span>${capsule}`
    : `<button class="nav-back" onclick="back()">${ICON.back}</button><span class="nav-title">${cfg.title || ""}</span>${capsule}`;
}

/* ---------------- 控制台 ---------------- */
function buildConsole() {
  const list = document.getElementById("conList");
  if (!list) return;
  list.innerHTML = SCREENS.map((s) =>
    `<button class="con-item" data-k="${s.key}" onclick="go('#/${s.key}')">
      <span class="no">${s.no}</span><span class="grow">${s.title}</span>
    </button>`).join("");
}
function markConsole(name) {
  document.querySelectorAll(".con-item").forEach((el) => el.classList.toggle("on", el.dataset.k === name));
}

/* ---------------- 双版本对比 ---------------- */

/* ---------------- 抽屉 ---------------- */
function openDrawer() {
  document.getElementById("drBody").innerHTML =
    SCREENS.map((s) =>
      `<button class="dr-item" onclick="jump('${s.key}')">
        <span class="no dim">${s.no}</span> ${s.title} <span class="tiny dim">· ${s.prd}</span>
      </button>`).join("") +
    `<div class="dr-group">演示控制</div>
     <button class="dr-item" onclick="resetDemo()">↺ 重置演示数据</button>
     <button class="dr-item" onclick="closeDrawer();setTheme(currentTheme()==='dark'?'light':'dark')">◑ 白天 / 黑夜</button>`;
  document.getElementById("drawer").classList.add("show");
  document.getElementById("mask").classList.add("show");
}
function closeDrawer() {
  document.getElementById("drawer").classList.remove("show");
  document.getElementById("mask").classList.remove("show");
}
function openSheet(title, html) {
  const t = document.getElementById("bsTitle"), b = document.getElementById("bsBody"), sh = document.getElementById("bsheet"), m = document.getElementById("sheetMask");
  if (!t || !b || !sh || !m) return;
  t.textContent = title; b.innerHTML = html; b.scrollTop = 0;
  sh.classList.add("show"); m.classList.add("show");
}
function jumpAbout(k) { go("#/about"); setTimeout(() => aboutDetail(k), 220); }
function closeSheet() {
  const sh = document.getElementById("bsheet"), m = document.getElementById("sheetMask");
  if (sh) sh.classList.remove("show");
  if (m) m.classList.remove("show");
}
function jump(k) { closeDrawer(); go("#/" + k); }

/* ---------------- 启动 ---------------- */
if (EMBED) {
  document.body.classList.add("embed");
  const c = document.getElementById("console"); if (c) c.remove();
  const sf = document.querySelector(".stage-foot"); if (sf) sf.remove();
  const fab = document.getElementById("fabDemo"); if (fab) fab.style.display = "none";
}
(function initTheme() {
  let t = QS.get("theme");
  if (!t) { try { t = localStorage.getItem("yantu-theme"); } catch (e) {} }
  if (!t) t = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.dataset.theme = t === "dark" ? "dark" : "light";
})();
buildConsole();
document.querySelectorAll("#segTheme button").forEach((b) =>
  b.addEventListener("click", () => setTheme(b.dataset.t)));

const on = (id, ev, fn) => { const el = document.getElementById(id); if (el) el.addEventListener(ev, fn); };
on("btnReset", "click", resetDemo);
on("fabDemo", "click", openDrawer);
on("bsClose", "click", closeSheet);
on("sheetMask", "click", closeSheet);
on("drClose", "click", closeDrawer);
on("mask", "click", closeDrawer);

window.addEventListener("hashchange", render);
window.addEventListener("keydown", (e) => {
  if (e.key === "v" || e.key === "V") setTheme(currentTheme() === "dark" ? "light" : "dark");
  if (e.key === "d" || e.key === "D") openDrawer();
  if (e.key === "r" || e.key === "R") resetDemo();
  if (e.key === "Escape") { closeDrawer(); closeSheet(); }
  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
    const cur = (location.hash.replace(/^#\/?/, "") || "home").split("/")[0];
    const i = SCREENS.findIndex((s) => s.key === cur);
    const n = e.key === "ArrowRight" ? Math.min(SCREENS.length - 1, i + 1) : Math.max(0, i - 1);
    go("#/" + SCREENS[n].key);
  }
});

if (!location.hash) location.hash = "#/home";
setTheme(currentTheme());
render();

/* ============================================================
   P03 我的 / P09 通知详情 / P10 工作台 / P11 管理后台
   ============================================================ */
function pageMe() {
  const m = M.me;
  return `
  <div class="page">
    <div class="card mt6">
      <div class="row">
        <div class="case-logo" style="width:52px;height:52px;font-size:17px">林</div>
        <div class="grow">
          <div class="bold" style="font-size:16px">${m.name}</div>
          <div class="tiny dim mt6">${m.sub}</div>
        </div>
      </div>
      <div class="divider"></div>
      <div class="row between tiny">
        <span class="dim">档案完整度</span><span class="bold">${m.profileRate}%</span>
      </div>
      <div class="progress mt8"><i style="width:${m.profileRate}%"></i></div>
      <div class="row between mt10 tiny dim">
        <span>今日定位额度 ${m.quota.left}/${m.quota.total}</span>
        <span>${m.quota.resetAt} 恢复</span>
      </div>
    </div>

    <div class="sec-head"><h3><span class="sec-num">14</span>我的服务</h3></div>
    <div class="card">
      ${m.entries.map((e, i) => `
        <div class="list-row" style="${i === 0 ? "padding-top:2px" : ""}" onclick="go('${e.go}')">
          <div class="ico">${e.ico}</div>
          <div class="grow">
            <div class="small bold">${e.t}</div>
            <div class="tiny dim mt6">${e.d}</div>
          </div>
          ${e.badge ? `<span class="badge red">${e.badge}</span>` : ""}
          <span class="tiny dim">›</span>
        </div>`).join("")}
    </div>

    <div class="sec-head"><h3><span class="sec-num">15</span>设置</h3></div>
    <div class="card">
      ${m.settings.map((t, i) => `
        <div class="list-row" style="${i === 0 ? "padding-top:2px" : ""}" onclick="${t.go === "page" ? `go('${t.k}')` : t.go === "about" ? `jumpAbout('${t.k}')` : `toast('${t.k}')`}">
          <div class="grow small">${t.t}</div><span class="tiny dim">›</span>
        </div>`).join("")}
    </div>

    <div class="tiny dim center mt16">服务者请从「我的」进入工作台 · 后台为网页端</div>
  </div>`;
}

function pageNoticeDetail() {
  const d = M.noticeDetail;
  return `
  <div class="page">
    <div class="row between mt6">
      <span class="badge green">报名中</span>
      <span class="tiny dim">${d.verified}</span>
    </div>
    <h2 style="font-size:17px;font-weight:800;line-height:1.45;margin:10px 0 4px">${d.title}</h2>
    <div class="tiny dim">${d.school} · ${d.year} · ${d.version}</div>

    <div class="card mt12">
      <div class="kv"><span class="k">开始</span><span class="v num">${d.start}</span></div>
      <div class="kv"><span class="k">截止</span><span class="v num">${d.end}</span></div>
      <div class="kv"><span class="k">时间精度</span><span class="v">${d.precision}</span></div>
    </div>

    <div class="alert mt12"><span class="ico">⚠</span>
      <span>官方原文只给到「日」，本平台不补 23:59 之类的推测时刻。</span></div>

    <div class="sec-head"><h3><span class="sec-num">16</span>原文要点</h3></div>
    <div class="card"><div class="small" style="line-height:1.7">${d.summary}</div></div>

    <div class="sec-head"><h3><span class="sec-num">17</span>材料清单</h3></div>
    <div class="card">
      ${d.need.map((n, i) => `<div class="list-row" onclick="toast('${n.replace(/"/g,"")}：以院校官方原文要求为准，本平台不代填')" style="${i === 0 ? "padding-top:2px" : ""}">
        <div class="grow small">${n}</div><span class="tiny dim">查看要求 ›</span></div>`).join("")}
    </div>

    <div class="sec-head"><h3><span class="sec-num">18</span>版本变更</h3></div>
    <div class="card">
      ${d.changes.map((c) => `<div class="kv">
        <span class="k">${c.v} · ${c.d}</span><span class="v" style="font-weight:400">${c.t}</span></div>`).join("")}
    </div>

    <div class="card mt12">
      <div class="tiny dim bold">来源</div>
      <div class="small mt6">${d.source}</div>
      <div class="tiny mt6" style="color:var(--accent)">${d.sourceUrl}</div>
    </div>
  </div>`;
}

function pageWorkbench() {
  const w = M.workbench;
  const rest = Math.max(0, w.capacity.u - w.capacity.l - w.capacity.h);
  return `
  <div class="page">
    <div class="card mt6">
      <div class="row between">
        <div class="row" style="gap:10px">
          <div class="case-logo" style="width:44px;height:44px">陈</div>
          <div>
            <div class="bold">${w.name}</div>
            <div class="tiny dim mt6">服务者工作台</div>
          </div>
        </div>
        <span class="badge green">接单中</span>
      </div>
      <div class="divider"></div>
      <div class="row" style="text-align:center">
        <div class="grow"><div class="bold num" style="font-size:18px">${w.capacity.u}</div><div class="xs dim">上限 U</div></div>
        <div class="grow"><div class="bold num" style="font-size:18px">${w.capacity.l}</div><div class="xs dim">已付费 L</div></div>
        <div class="grow"><div class="bold num" style="font-size:18px">${w.capacity.h}</div><div class="xs dim">占位 H</div></div>
        <div class="grow"><div class="bold num" style="font-size:18px;color:var(--accent)">${rest}</div><div class="xs dim">剩余</div></div>
      </div>
      <div class="tiny dim mt10">剩余 = max(0, U − L − H)</div>
    </div>

    <div class="sec-head"><h3><span class="sec-num">19</span>今日排班</h3><span class="link">3 项</span></div>
    <div class="card">
      ${w.today.map((t, i) => `
        <div class="row between" style="padding:11px 0;${i ? "border-top:1px solid var(--line)" : ""}">
          <div class="grow">
            <div class="small bold num">${t.t}</div>
            <div class="tiny dim mt6">${t.s}</div>
          </div>
          <span class="badge ${t.st === "待响应" ? "orange" : t.st === "服务中" ? "green" : "gray"}">${t.st}</span>
        </div>`).join("")}
    </div>

    <div class="sec-head"><h3><span class="sec-num">20</span>待处理</h3></div>
    <div class="card">
      ${w.todo.map((t, i) => `
        <div class="list-row" onclick="${t.go ? `go('${t.go}')` : `toast('已记录：${t.act}（演示）')`}" style="${i === 0 ? "padding-top:2px" : ""}">
          <div class="ico">${t.urgent ? "!" : "·"}</div>
          <div class="grow">
            <div class="small bold">${t.t}</div>
            <div class="tiny dim mt6">${t.d}</div>
          </div>
          <span class="tiny" style="color:var(--accent)">${t.act} ›</span>
        </div>`).join("")}
    </div>

    <div class="sec-head"><h3><span class="sec-num">21</span>收入</h3></div>
    <div class="card">
      <div class="kv"><span class="k">本月已结算</span><span class="v num">¥${w.income.month.toLocaleString()}</span></div>
      <div class="kv"><span class="k">待结算（服务中）</span><span class="v num">¥${w.income.pending}</span></div>
      <div class="kv"><span class="k">提现规则</span><span class="v" style="font-weight:400">T+1 · 待定（D07）</span></div>
    </div>

    <div class="alert mt12"><span class="ico">⚠</span>
      <span>暂停接单后不生成新推荐与新占位；已确认订单按原约定继续。</span></div>
  </div>`;
}

function pageAdmin() {
  const a = M.admin;
  const tab = S.adminTab || a.tabs[0];
  return `
  <div class="page">
    <div class="quick-chips" style="overflow-x:auto">
      ${a.tabs.map((t) => `<button class="btn xs ${tab === t ? "primary" : "line"}" onclick="setAdminTab('${t}')">${t}</button>`).join("")}
    </div>

    <div class="card mt12">
      <div class="row" style="text-align:center">
        ${a.stats.map((s) => `<div class="grow">
          <div class="bold num" style="font-size:17px;${s.tone === "red" ? "color:var(--danger)" : s.tone === "orange" ? "color:var(--accent)" : ""}">${s.v}</div>
          <div class="xs dim">${s.k}</div></div>`).join("")}
      </div>
    </div>

    ${tab === "queue" ? `
      <div class="alert mt12"><span class="ico">🛡</span>
        <span><b>交易安全审核：</b>只处理外部联系方式与私下交易线索，不是客服入口。误报可直接判为正常。</span></div>

      <div class="sec-head"><h3><span class="sec-num">22</span>待审核线索</h3><span class="link">${a.queue.length} 条</span></div>
      ${a.queue.map((q) => `
        <div class="card tap" onclick="toast('演示：查看完整会话上下文与处置记录')">
          <div class="row between">
            <span class="badge ${q.risk === "高" ? "red" : q.risk === "中" ? "orange" : "gray"}">${q.id} · 风险${q.risk}</span>
            <span class="tiny dim">${q.time}</span>
          </div>
          <div class="small bold mt8">${q.type}</div>
          <div class="tiny dim mt6">${q.target}</div>
          <div class="divider"></div>
          <div class="tiny" style="line-height:1.65">${q.detail}</div>
          <div class="row mt10" style="gap:7px">
            <button class="btn xs line" onclick="event.stopPropagation();toast('已记录：判为正常（误报）')">判为正常</button>
            <button class="btn xs line" onclick="event.stopPropagation();toast('已记录：发送提醒')">发送提醒</button>
            <button class="btn xs line" onclick="event.stopPropagation();toast('已记录：转入人工处置')">转入处置</button>
          </div>
        </div>`).join("")}
    ` : tab === "订单" ? `
      <div class="alert mt12"><span class="ico">📦</span>
        <span>审核员<b>看不到完整聊天记录</b>，只看到命中规则的片段；无退款权限。</span></div>
      ${[
        ["T-20261030-118", "材料诊断 · 机械 · 985 学硕", "¥399", "待确认", "gray"],
        ["T-20261029-097", "复试模拟 · 3 次", "¥259", "服务中", "green"],
        ["T-20261027-063", "材料诊断 · 能源", "¥399", "已完成", "gray"],
      ].map(([id, item, amt, st, tone]) => `
        <div class="card tap" onclick="toast('演示：${id} 的订单详情与履约记录')">
          <div class="row between"><span class="tiny dim num">${id}</span><span class="badge ${tone}">${st}</span></div>
          <div class="row between mt8"><span class="small bold">${item}</span><span class="price" style="font-size:15px">${amt}</span></div>
        </div>`).join("")}
    ` : tab === "资讯" ? `
      <div class="alert mt12"><span class="ico">📰</span>
        <span>资讯只做<b>原样转载</b>并标注来源；不得改写院校原文，日期统一来源为准。</span></div>
      ${["某高校机械工程学院 2027 推免通知", "某高校能源与动力工程学院 推免日程", "某高校材料科学与工程学院 复试办法"].map((t, i) => `
        <div class="card tap" onclick="toast('演示：编辑${i === 0 ? "新建" : "复核"}资讯条目')">
          <div class="row between"><span class="small bold" style="max-width:220px">${t}</span><span class="badge ${i === 2 ? "gray" : "green"}">${i === 2 ? "待复核" : "已发布"}</span></div>
          <div class="tiny dim mt6">来源：学院官网 · 转载不改写</div>
        </div>`).join("")}
    ` : `
      <div class="alert mt12"><span class="ico">⚙</span>
        <span>配置项变更<b>全部留痕</b>；名额上限、价格、抽成比例仅超级管理员可改。</span></div>
      ${[
        ["服务者名额上限 U", "3 单 / 周", "超管"],
        ["材料诊断定价", "¥399", "超管"],
        ["方案修改次数上限", "2 次", "超管"],
        ["审核员权限", "仅审核 · 无退款", "只读"],
      ].map(([k, v, who]) => `
        <div class="list-row" onclick="toast('演示：${k} 的变更需超级管理员二次确认')">
          <div class="grow"><div class="small bold">${k}</div><div class="tiny dim">当前 ${v}</div></div>
          <span class="badge ${who === "只读" ? "gray" : ""}">${who}</span>
        </div>`).join("")}
    `}

    <div class="tiny dim center mt16">所有处置留操作记录 · 审核员无退款与全部下载权限</div>
  </div>`;
}
