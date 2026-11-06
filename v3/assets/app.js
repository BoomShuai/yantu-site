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
function currentTheme() { return "light"; }
function setTheme(t) {
  const dark = false; // 品牌新版本统一浅紫金主题
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
  schoolView: "notices",
  providerView: "all",
  providerFilter: "全部",
  providerSearch: "",
  currentNoticeId: "n1",
};

/* ---------------- 图标 ---------------- */
const ICON = {
  back: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.8 9.2V20h12.4V9.2"/><path d="M9.8 20v-5.6h4.4V20"/></svg>',
  school: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 3 7.4l9 4.4 9-4.4L12 3Z"/><path d="M5.8 10.2v5.3c0 1.4 2.8 2.5 6.2 2.5s6.2-1.1 6.2-2.5v-5.3"/><path d="M21 7.4v5"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="9" cy="8" r="3"/><path d="M2 20c.4-3.4 3-5.6 7-5.6 4 0 6.6 2.2 7 5.6"/><path d="M16 5.3a3 3 0 0 1 0 5.7M18.5 14.5c2 .7 3.2 2.4 3.5 5.5"/></svg>',
  me: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="8.4" r="3.5"/><path d="M4.9 19.8c.7-3.4 3.5-5.2 7.1-5.2s6.4 1.8 7.1 5.2"/></svg>'
};

/* ---------------- 屏单（与文档 01–11 一一对应） ---------------- */
const SCREENS = [
  { no: "01", key: "home", title: "首页", prd: "P01 · 未建档态" },
  { no: "02", key: "profile", title: "需求建档", prd: "P04 · 分步表单" },
  { no: "03", key: "diagnosis", title: "定位结果", prd: "P05 · 三层信息" },
  { no: "04", key: "provider", title: "服务者详情", prd: "P06 · 满额态" },
  { no: "04A", key: "providers", title: "全部服务者", prd: "新增 · 列表/筛选/收藏" },
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
  { no: "15", key: "admin", title: "管理后台", prd: "P11 · 审核队列" }
];
const NAV = {
  home: { brand: true },
  profile: { title: "建立定位档案" },
  diagnosis: { title: "定位结果" },
  provider: { title: "服务者详情" },
  providers: { title: "服务者" },
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
  admin: { title: "管理后台" }
};
const TABS = { home: "home", school: "school", providers: "providers", me: "me" };

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
        <div class="notice-item" onclick="S.currentNoticeId='${n.id}';go('#/noticeDetail')">
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

    <div class="tl-home-shortcuts"><button onclick="go('#/providers')">✦ 逛全部服务者 <span>筛选与收藏 →</span></button><button onclick="S.schoolView='records';go('#/school')">✎ 我的投递记录 <span>院校资讯内 →</span></button></div>
    <div class="tiny dim center mt16">当前为交互原型 · 匹配数据与通知为示例内容 · 不提供保录承诺</div>
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
          <div class="choice active">大三</div><div class="choice">大四</div>
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
          <div class="choice active">CET-6</div><div class="choice">CET-4</div>
        </div>
        <input class="input mt8" value="512" />
      </div>
      <div class="field"><label>是否已有排名证明</label>
        <div class="two-col"><div class="choice active">已有</div><div class="choice">待开</div></div>
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
        <div class="case-logo" style="width:52px;height:52px;font-size:18px">${p.name.slice(0,1)}</div>
        <div class="grow">
          <div class="row" style="gap:7px"><span class="bold" style="font-size:16px">${p.name}</span>
            <span class="badge">演示资料</span></div>
          <div class="tiny dim mt6">${p.brief}</div>
          <div class="n-meta">${p.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>
        </div>
      </div>
    </div>

    <div class="tl-inline-note">服务者资料与核验日期为原型演示信息，正式上线须真实核实。</div>
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
    <div class="alert info"><span class="ico">🛡</span>
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


/* ========= 同路紫金版：独立服务者与院校收藏/投递记录 ========= */
const TL_KEY = "tonglu-purple-gold-v1";
function loadTL() {
  try {
    const raw = JSON.parse(localStorage.getItem(TL_KEY) || "{}");
    return {
      savedMentors: Array.isArray(raw.savedMentors) ? raw.savedMentors : [],
      savedSchools: Array.isArray(raw.savedSchools) ? raw.savedSchools : [],
      customSchools: Array.isArray(raw.customSchools) ? raw.customSchools : [],
      applications: Array.isArray(raw.applications) ? raw.applications : []
    };
  } catch(e) { return {savedMentors:[],savedSchools:[],customSchools:[],applications:[]}; }
}
const TL = loadTL();
function saveTL() {
  try {localStorage.setItem(TL_KEY,JSON.stringify(TL));}
  catch(e) {toast("本地存储不可用，本次修改可能无法保存");}
}
function escapeTL(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}
function isMentorSaved(id) {return TL.savedMentors.includes(id);}
function isSchoolSaved(id) {return TL.savedSchools.includes(id);}
function toggleMentorFavorite(id) {
  const i=TL.savedMentors.indexOf(id);
  if(i<0) TL.savedMentors.push(id); else TL.savedMentors.splice(i,1);
  saveTL(); render(); toast(i<0?"已收藏服务者":"已取消收藏");
}
function toggleSchoolFavorite(id) {
  const i=TL.savedSchools.indexOf(id);
  if(i<0) TL.savedSchools.push(id); else TL.savedSchools.splice(i,1);
  saveTL(); render(); toast(i<0?"已收藏院校通知":"已取消收藏");
}
function setSchoolView(v){S.schoolView=v;render();}
function setProviderView(v){S.providerView=v;render();}
function setAdminTab(t){S.adminTab=t;render();}
function setProviderFilter(v){S.providerFilter=v;render();}
function selectProvider(id){S.activeProvider=id;go("#/provider");}
function searchMentors(e){e.preventDefault();S.providerSearch=document.getElementById("tl-provider-search").value.trim();render();}
function mentorScore(p){return p.id==="chen"?91:86;} // 演示排序值，不代表真实算法
function mentorReason(p){return p.id==="chen"?"研究经历梳理与当前问题接近":"工程方向科研与竞赛材料辅导相关";}
function pageProviders() {
  let list=[...M.providers].sort((a,b)=>mentorScore(b)-mentorScore(a));
  if(S.providerView==="saved") list=list.filter(p=>isMentorSaved(p.id));
  if(S.providerFilter!=="全部") list=list.filter(p=>p.tags.some(t=>t.includes(S.providerFilter)));
  if(S.providerSearch) list=list.filter(p=>(p.name+p.brief+p.tags.join(" ")).includes(S.providerSearch));
  return `<div class="page tl-page">
    <div class="tl-section-kicker">MENTOR MATCHING</div><h2 class="tl-page-title">找到更适合你的同行者</h2>
    <p class="tl-desc">独立服务者列表，按演示匹配度排序。可筛选、进入详情并收藏。</p>
    <div class="tl-switch"><button class="${S.providerView==='all'?'on':''}" onclick="setProviderView('all')">全部服务者 <b>${M.providers.length}</b></button><button class="${S.providerView==='saved'?'on':''}" onclick="setProviderView('saved')">♥ 我的收藏 <b>${TL.savedMentors.length}</b></button></div>
    <form class="tl-search" onsubmit="searchMentors(event)"><input id="tl-provider-search" aria-label="搜索服务者" placeholder="按姓名、领域或研究方向搜索" value="${escapeTL(S.providerSearch)}"><button type="submit">搜索</button></form>
    <div class="tl-chips">${['全部','材料诊断','研究经历','竞赛'].map(t=>`<button class="${S.providerFilter===t?'on':''}" onclick="setProviderFilter('${t}')">${t}</button>`).join('')}</div>
    <div class="tl-small-cap">${list.length} 位演示服务者 · 匹配度由高到低</div>
    ${list.length?list.map(p=>`<article class="tl-mentor-card">
      <div class="tl-mentor-header"><div class="tl-avatar">${escapeTL(p.name.slice(0,1))}</div><div class="grow"><b>${escapeTL(p.name)}</b><div class="tiny dim mt6">${escapeTL(p.brief)}</div></div><button aria-label="收藏服务者" class="tl-heart ${isMentorSaved(p.id)?'on':''}" onclick="toggleMentorFavorite('${p.id}')">${isMentorSaved(p.id)?'♥':'♡'}</button></div>
      <div class="tl-score"><span>演示匹配度</span><strong>${mentorScore(p)}<small>/100</small></strong></div><div class="tl-meter"><span style="width:${mentorScore(p)}%"></span></div>
      <div class="tl-reason">✦ ${escapeTL(mentorReason(p))}</div>
      <div class="tl-tags">${p.tags.map(t=>`<span>${escapeTL(t)}</span>`).join('')}</div>
      <div class="tl-mentor-bottom"><span>身份核验：原型样例</span><button onclick="selectProvider('${p.id}')">查看履历与服务 →</button></div>
    </article>`).join(''):`<div class="tl-empty">这里暂时没有服务者${S.providerView==='saved'?'收藏':'结果'}。<br><button class="tl-inline-button" onclick="setProviderView('all');setProviderFilter('全部');S.providerSearch='';render()">查看全部服务者</button></div>`}
    <div class="tl-disclaimer">当前仅包含壹、贰原型中的 ${M.providers.length} 位演示服务者。匹配分与核验信息均非真实结论，收藏只在本机浏览器保存。</div>
  </div>`;
}
function schoolNameForNotice(n){return n.title.replace(/(20\\d{2}|2027|2025).*/,"").trim()||n.title;}
function savedSchoolNoticeCards(){
  return M.notices.filter(n=>isSchoolSaved(n.id)).map(n=>`<div class="tl-saved-row"><div class="grow"><b>${escapeTL(n.title)}</b><div class="tiny dim mt6">${escapeTL(n.status)} · ${escapeTL(n.source)}</div></div><button class="tl-heart on" onclick="toggleSchoolFavorite('${n.id}')">♥</button></div>`).join("");
}
function addCustomSchool(e){
  e.preventDefault();const input=document.getElementById('tl-school-name');const v=input.value.trim();
  if(!v){toast('请输入院校名称');return;}if(v.length>60){toast('名称请控制在 60 字以内');return;}
  if(TL.customSchools.some(x=>x.name===v)){toast('已收藏该院校');return;}
  TL.customSchools.unshift({id:'sc-'+Date.now(),name:v});saveTL();render();toast('已收藏院校');
}
function removeCustomSchool(id){TL.customSchools=TL.customSchools.filter(x=>x.id!==id);saveTL();render();}
function saveApplication(e){
  e.preventDefault();const f=e.target;
  const school=f.elements.school.value.trim(),program=f.elements.program.value.trim(),date=f.elements.date.value,status=f.elements.status.value;
  if(!school||!program){toast('请填写院校和专业');return;}
  if(school.length>80||program.length>80){toast('名称过长，请精简');return;}
  TL.applications.unshift({id:'app-'+Date.now(),school,program,date,status});saveTL();render();toast('投递记录已保存');
}
function changeApplicationStatus(id,v){const a=TL.applications.find(x=>x.id===id);if(a){a.status=v;saveTL();render();}}
function deleteApplication(id){if(!confirm('确认删除这条投递记录？'))return;TL.applications=TL.applications.filter(x=>x.id!==id);saveTL();render();}
function schoolSavedView(){return `<div class="tl-section-kicker">SAVED SCHOOLS</div><h2 class="tl-page-title">我的院校收藏</h2>
  <form class="tl-school-form" onsubmit="addCustomSchool(event)"><input id="tl-school-name" maxlength="60" placeholder="输入你想关注的院校名称" required><button type="submit">＋ 收藏</button></form>
  <div class="tl-small-cap">我的院校 ${TL.customSchools.length} 所 · 收藏通知 ${TL.savedSchools.length} 条</div>
  ${TL.customSchools.map(s=>`<div class="tl-saved-row"><div class="grow"><b>${escapeTL(s.name)}</b><div class="tiny dim">自行添加的关注院校</div></div><button class="tl-heart on" onclick="removeCustomSchool('${s.id}')" aria-label="取消院校收藏">♥</button></div>`).join('')}
  ${savedSchoolNoticeCards()}
  ${!TL.savedSchools.length&&!TL.customSchools.length?'<div class="tl-empty">还没有收藏的院校。<br>可以在资讯页收藏通知，也可以直接添加院校。</div>':''}
  <div class="tl-disclaimer">收藏与院校投递状态互不影响，均仅保存在当前浏览器。</div>`;}
function schoolRecordsView(){return `<div class="tl-section-kicker">APPLICATION JOURNAL</div><h2 class="tl-page-title">我的保研投递记录本</h2>
  <p class="tl-desc">记录已申请的院校与进度，便于后续跟踪材料审核、考核及录取结果。</p>
  <form class="tl-apply-form" onsubmit="saveApplication(event)">
    <label>院校名称<input name="school" maxlength="80" required placeholder="例如：某大学"></label>
    <label>申请专业<input name="program" maxlength="80" required placeholder="例如：应用统计"></label>
    <div class="tl-form-grid"><label>投递日期<input name="date" type="date"></label>
    <label>目前状态<select name="status"><option>准备中</option><option>已投递</option><option>审核中</option><option>进入面试</option><option>已录取</option><option>未通过</option></select></label></div>
    <button class="tl-submit" type="submit">＋ 保存投递记录</button>
  </form>
  <div class="tl-small-cap">已记录 ${TL.applications.length} 条</div>
  ${TL.applications.length?TL.applications.map(a=>`<div class="tl-application"><div class="row between"><div class="grow"><b>${escapeTL(a.school)}</b><div class="tiny dim mt6">${escapeTL(a.program)} · ${a.date?escapeTL(a.date):'日期未填写'}</div></div><button class="tl-delete" onclick="deleteApplication('${a.id}')">删除</button></div>
    <div class="tl-apply-status">进度：<select aria-label="更改投递状态" onchange="changeApplicationStatus('${a.id}',this.value)">${['准备中','已投递','审核中','进入面试','已录取','未通过'].map(v=>`<option ${a.status===v?'selected':''}>${v}</option>`).join('')}</select></div></div>`).join(''):'<div class="tl-empty">还没有投递记录，先添加一所目标院校吧。</div>'}
  <div class="tl-disclaimer">记录仅在本地浏览器保存，不会自动向任何院校提交申请，也不会跨设备同步。</div>`;}
function pageSchool(){
  const tabs=[['notices','院校资讯'],['saved','院校收藏'],['records','投递记录本']];
  return `<div class="tl-school-tabs">${tabs.map(([k,v])=>`<button class="${S.schoolView===k?'on':''}" onclick="setSchoolView('${k}')">${v}</button>`).join('')}</div>`+
    (S.schoolView==='notices'?pageSchoolNotices():S.schoolView==='saved'?`<div class="page tl-page">${schoolSavedView()}</div>`:`<div class="page tl-page">${schoolRecordsView()}</div>`);
}
function pageSchoolNotices() {
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
      <div class="card tap" onclick="S.currentNoticeId='${n.id}';go('#/noticeDetail')">
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
          <button class="tl-star" aria-label="收藏院校" onclick="event.stopPropagation();toggleSchoolFavorite('${n.id}')">${isSchoolSaved(n.id) ? "♥ 已收藏" : "♡ 收藏"}</button>
        </div>
      </div>`).join("")}
    <div class="tiny dim center mt16">演示数据 · 请核对官方院校通知与日期</div>
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
        ["🗂", "历史定位结果", "随时回看，不限次数"],
        ["💬", "售前沟通", "与已联系的服务者继续沟通"],
        ["📦", "已有订单", "查看交付与进度"],
        ["📰", "院校资讯", "全部内容免额度浏览"]
      ].map(([i, t, d], idx) => `
        <div class="list-row" style="${idx ? "" : "padding-top:2px"}">
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
        你的需求是「材料诊断 · 机械 · 985 学硕」，<br/>当前没有满足全部条件的服务者。
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
      return `<button class="btn line" onclick="toggleMentorFavorite('${p.id}')">${isMentorSaved(p.id) ? "♥ 已收藏" : "♡ 收藏服务者"}</button>
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
    case "providers":
      return `<button class="btn line" onclick="setProviderView('saved')">我的收藏</button><button class="btn primary wide" onclick="go('#/profile')">完善 BG 档案</button>`;
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
      return `<button class="btn line" onclick="toggleSchoolFavorite(S.currentNoticeId)">${isSchoolSaved(S.currentNoticeId) ? "♥ 已收藏" : "♡ 收藏院校"}</button>
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
  home: pageHome, profile: pageProfile, diagnosis: pageDiagnosis, provider: pageProvider, providers: pageProviders,
  presale: pagePresale, proposal: pageProposal, checkout: pageCheckout, delivery: pageDelivery,
  school: pageSchool, quota: pageQuota, nocandidate: pageNoCandidate,
  me: pageMe, noticeDetail: pageNoticeDetail, workbench: pageWorkbench, admin: pageAdmin
};

function render() {
  const name = (location.hash.replace(/^#\/?/, "") || "home").split("/")[0];
  const fn = PAGES[name] || pageHome;

  renderNav(name);
  document.getElementById("tabbar").innerHTML = TABS[name]
    ? [["home", "首页", ICON.home, "#/home"], ["school", "院校资讯", ICON.school, "#/school"], ["providers", "服务者", ICON.users, "#/providers"], ["me", "我的", ICON.me, "#/me"]]
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
  const capsule = `<img class="nav-logo-mark" src="assets/tonglu-logo.svg" alt="同路图标" />`;
  nav.innerHTML = cfg.brand
    ? `<span class="brand-lockup"><img src="assets/tonglu-logo.svg" class="brand-logo" alt="同路 Logo" /><span class="nav-brand">同路<small>AI 保研服务</small></span></span><span class="nav-end-tag">与你同路</span>`
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
     <button class="dr-item" onclick="resetDemo()">↺ 重置演示数据</button>`;
  document.getElementById("drawer").classList.add("show");
  document.getElementById("mask").classList.add("show");
}
function closeDrawer() {
  document.getElementById("drawer").classList.remove("show");
  document.getElementById("mask").classList.remove("show");
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
  if (!t) t = "light";
  document.documentElement.dataset.theme = "light";
})();
buildConsole();
document.querySelectorAll("#segTheme button").forEach((b) =>
  b.addEventListener("click", () => setTheme(b.dataset.t)));

const on = (id, ev, fn) => { const el = document.getElementById(id); if (el) el.addEventListener(ev, fn); };
on("btnReset", "click", resetDemo);
on("fabDemo", "click", openDrawer);
on("drClose", "click", closeDrawer);
on("mask", "click", closeDrawer);

window.addEventListener("hashchange", render);
window.addEventListener("keydown", (e) => {
  // 输入或编辑表单期间不触发演示快捷键，避免误切主题/重置数据。
  if (e.target && e.target.closest && e.target.closest("input, textarea, select, [contenteditable=true]")) return;
  if (e.key === "v" || e.key === "V") setTheme(currentTheme() === "dark" ? "light" : "dark");
  if (e.key === "d" || e.key === "D") openDrawer();
  if (e.key === "r" || e.key === "R") resetDemo();
  if (e.key === "Escape") closeDrawer();
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

    <div class="tl-home-shortcuts"><button onclick="S.schoolView='saved';go('#/school')">♡ 收藏院校 <span>${TL.savedSchools.length+TL.customSchools.length} 条 →</span></button><button onclick="S.providerView='saved';go('#/providers')">♥ 收藏服务者 <span>${TL.savedMentors.length} 人 →</span></button></div>
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
        <div class="list-row" style="${i === 0 ? "padding-top:2px" : ""}" onclick="toast('演示：${t}')">
          <div class="grow small">${t}</div><span class="tiny dim">›</span>
        </div>`).join("")}
    </div>

    <div class="tiny dim center mt16">服务者请从「我的」进入工作台 · 后台为网页端</div>
  </div>`;
}

function pageNoticeDetail() {
  const d = M.noticeDetail;
  const currentNotice = M.notices.find(n=>n.id === S.currentNoticeId) || M.notices[0];
  if (currentNotice.id !== 'n1') {
    return `<div class="page tl-page"><div class="tl-section-kicker">NOTICE DETAILS</div><h2 class="tl-page-title">${escapeTL(currentNotice.title)}</h2>
      <div class="card"><div class="kv"><span class="k">状态</span><span class="v">${escapeTL(currentNotice.status)}</span></div>
      <div class="kv"><span class="k">时间精度</span><span class="v">${escapeTL(currentNotice.precision)}</span></div>
      <div class="kv"><span class="k">来源</span><span class="v">${escapeTL(currentNotice.source)}</span></div></div>
      <div class="card mt12 small">${escapeTL(currentNotice.detail)}</div>
      <div class="tl-disclaimer">此为原型演示资料，不附带真实院校报名链接或已核实的截止日期。正式使用请以院校官网为准。</div></div>`;
  }
  return `
  <div class="page">
    <div class="row between mt6">
      <span class="badge green">报名中</span>
      <span class="tiny dim">${d.verified}</span>
    </div>
    <h2 style="font-size:17px;font-weight:800;line-height:1.45;margin:10px 0 4px">${d.title}</h2>
    <div class="tiny dim">${d.school} · ${d.year} · ${d.version}</div><div class="tl-inline-note">当前为统一演示详情模板；所选通知：${escapeTL(currentNotice.title)}</div>

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
      ${d.need.map((n, i) => `<div class="list-row" style="${i === 0 ? "padding-top:2px" : ""}">
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
        <div class="list-row" style="${i === 0 ? "padding-top:2px" : ""}">
          <div class="ico">${t.urgent ? "!" : "·"}</div>
          <div class="grow">
            <div class="small bold">${t.t}</div>
            <div class="tiny dim mt6">${t.d}</div>
          </div>
          <span class="tiny" style="color:var(--accent)">处理 ›</span>
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
  const tab = S.adminTab || "queue";
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
    ` : `
      <div class="card mt12 center" style="padding:30px 18px">
        <div class="small dim">「${tab}」模块演示数据未展开</div>
        <div class="tiny dim mt8">本页只演示审核队列，其余标签为 P11 的既有权限位</div>
      </div>
    `}

    <div class="tiny dim center mt16">所有处置留操作记录 · 审核员无退款与全部下载权限</div>
  </div>`;
}
