/* ============================================================
   demo.js — 演示容器逻辑
   iframe 内是 app.html（真实可点），外层负责导航与说明
   ============================================================ */

(function () {
  const root = document.documentElement;
  const KEY = "yantu-theme";
  const frame = document.getElementById("frame");

  /* ---------------- 主题 ---------------- */
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const forced = new URLSearchParams(location.search).get("theme");
  let theme = (forced === "dark" || forced === "light")
    ? forced
    : (saved || (prefersDark ? "dark" : "light"));

  function applyTheme(t, syncFrame = true) {
    theme = t === "dark" ? "dark" : "light";
    const dark = theme === "dark";
    root.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#0e1220" : "#f7f5fc");
    if (syncFrame) setFrameTheme();
  }

  function setFrameTheme() {
    if (!frame) return;
    try {
      const d = frame.contentDocument;
      const w = frame.contentWindow;
      if (w && typeof w.setTheme === "function") { w.setTheme(theme); return; }
      if (d) d.documentElement.dataset.theme = theme;
    } catch (e) {}
  }

  applyTheme(theme, false);
  if (frame) {
    frame.addEventListener("load", () => {
      setFrameTheme();
      hookIframe();
      syncSide();
    });
  }

  const btnTheme = document.getElementById("btnTheme");
  if (btnTheme) {
    btnTheme.addEventListener("click", () => {
      applyTheme(theme === "dark" ? "light" : "dark");
      try { localStorage.setItem(KEY, theme); } catch (e) {}
    });
  }

  /* ---------------- 屏幕元数据 ---------------- */
  const SCREENS = [
    { no: "01", key: "home",      title: "首页",       prd: "未建档态",     desc: "没建档时，不给任何「看起来已经匹配好了」的内容，只给定位入口。" },
    { no: "02", key: "profile",   title: "需求建档",   prd: "分步表单",     desc: "名次 20、总人数 10 会当场拦住。校验失败不清空已填内容。" },
    { no: "03", key: "diagnosis", title: "定位结果",   prd: "三层信息",     desc: "事实、推断、待核实分开标注。不生成录取概率。" },
    { no: "04", key: "provider",  title: "服务者详情", prd: "满额态",       desc: "满额就不出现「立即预约」，主按钮直接换成看别人。" },
    { no: "05", key: "presale",   title: "售前沟通",   prd: "材料授权",     desc: "授权精确到文件。聊天里提示不要换微信、不要私下交易。" },
    { no: "06", key: "proposal",  title: "服务方案",   prd: "双向确认",     desc: "改价后旧版本的确认自动失效，必须双方重新确认新版本。" },
    { no: "07", key: "checkout",  title: "付款与订单", prd: "容量拦截",     desc: "金额取服务端快照。推荐时有名额，不代表付款时还有。" },
    { no: "08", key: "delivery",  title: "服务交付",   prd: "版本保留",     desc: "交付文件保留全部历史版本。系统不会自动完成订单。" },
    { no: "09", key: "school",    title: "院校资讯",   prd: "日期精度",     desc: "官方只给到日就显示到日，不推测成 23:59。" },
    { no: "10", key: "quota",     title: "额度用尽",   prd: "异常态",       desc: "定位额度用尽，但浏览、历史记录和已有订单不受影响。" },
    { no: "11", key: "nocandidate", title: "无候选",   prd: "异常态",       desc: "不补一个虚拟人选。直接说清楚缺口在哪、怎么调整。" },
    { no: "12", key: "me",        title: "我的",       prd: "档案/订单",    desc: "档案完整度、当日额度、六类入口都在这。" },
    { no: "13", key: "noticeDetail", title: "通知详情", prd: "版本变更",    desc: "来源、年份、时间精度、版本变更历史全部可查。" },
    { no: "14", key: "workbench", title: "服务者工作台", prd: "容量/排班",  desc: "剩余 = max(0, U − L − H)。暂停接单后不再生成新推荐。" },
    { no: "15", key: "admin",     title: "管理后台",   prd: "审核队列",     desc: "交易安全审核，不是客服。误报可以直接判为正常。" },
    { no: "16", key: "tutor",     title: "辅导端",      prd: "服务者视角",   desc: "服务者从底部入口进辅导端，看接单容量、可约时段和结算。" },
    { no: "17", key: "about",     title: "关于与设置",  prd: "上架必需",     desc: "隐私政策、服务协议、第三方共享清单、版本更新，应用商店提审要看这些。" }
  ];

  /* ---------------- 侧栏列表 ---------------- */
  const sideList = document.getElementById("sideList");
  if (sideList) {
    sideList.innerHTML = SCREENS.map(
      (s) => `<button class="side-item" data-k="${s.key}">
        <span class="no">${s.no}</span><span>${s.title}</span>
        <span class="tag">${s.prd}</span>
      </button>`
    ).join("");
    sideList.querySelectorAll("[data-k]").forEach((b) => {
      b.addEventListener("click", () => go(b.dataset.k));
    });
  }

  /* ---------------- 抽屉 ---------------- */
  const sheet = document.getElementById("sheet");
  const sheetBody = document.getElementById("sheetBody");
  if (sheetBody) {
    sheetBody.innerHTML =
      `<div class="ds-group">全部画面</div>` +
      SCREENS.map(
        (s) => `<button class="ds-item" data-k="${s.key}">
          <span class="no">${s.no}</span>${s.title}
          <span class="prd">${s.prd}</span>
        </button>`
      ).join("");
    sheetBody.querySelectorAll("[data-k]").forEach((b) => {
      b.addEventListener("click", () => { closeSheet(); go(b.dataset.k); });
    });
  }
  function openSheet() { if (sheet) sheet.classList.add("show"); }
  function closeSheet() { if (sheet) sheet.classList.remove("show"); }
  const btnJump = document.getElementById("btnJump");
  if (btnJump) btnJump.addEventListener("click", openSheet);
  const sheetClose = document.getElementById("sheetClose");
  if (sheetClose) sheetClose.addEventListener("click", closeSheet);
  if (sheet) sheet.addEventListener("click", (e) => { if (e.target === sheet) closeSheet(); });

  /* ---------------- 跳转 ---------------- */
  function go(key) {
    if (!frame) return;
    syncSide(key);
    try {
      frame.contentWindow.location.hash = "#/" + key;
      frame.contentWindow.scrollTo(0, 0);
    } catch (e) {
      frame.src = "app.html?embed=1#/" + key;
    }
  }

  function currentKey() {
    const h = (location.hash || "").replace(/^#\/?/, "").split("/")[0];
    return h || "home";
  }

  function syncSide(forceKey) {
    const key = forceKey || currentKey();
    const s = SCREENS.find((x) => x.key === key) || SCREENS[0];
    const now = document.getElementById("sideNow");
    const p = document.getElementById("sideP");
    if (now) now.textContent = `${s.title} · ${s.prd}`;
    if (p) p.textContent = s.desc;
    document.querySelectorAll(".side-item").forEach((el) =>
      el.classList.toggle("on", el.dataset.k === key));
  }

  /* ---------------- 监听 iframe 路由变化 ---------------- */
  function hookIframe() {
    try {
      const w = frame.contentWindow;
      w.addEventListener("hashchange", () => {
        const k = (w.location.hash || "").replace(/^#\/?/, "").split("/")[0];
        if (k) syncSide(k);
      });
      // 拦截面板内的「演示」浮层按钮，交给外层抽屉
      const d = frame.contentDocument;
      const fab = d && d.getElementById("fabDemo");
      if (fab) {
        fab.addEventListener("click", (e) => { e.stopImmediatePropagation(); openSheet(); }, true);
      }
    } catch (e) {}
  }

  window.addEventListener("hashchange", () => {
    const k = currentKey();
    syncSide(k);
    // 深链：首页带 #/xxx 时把手机跳到那一屏
    if (frame && frame.contentWindow) {
      const inner = (frame.contentWindow.location.hash || "").replace(/^#\/?/, "").split("/")[0];
      if (inner !== k) go(k);
    }
  });

  /* ---------------- 启动 ---------------- */
  if (location.hash && location.hash !== "#/home") {
    const k = currentKey();
    if (frame) frame.src = "app.html?embed=1#/" + k;
  }
  syncSide();

  /* ---------------- 快捷键 ---------------- */
  window.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    if (e.key === "v" || e.key === "V") {
      applyTheme(theme === "dark" ? "light" : "dark");
      try { localStorage.setItem(KEY, theme); } catch (err) {}
    }
    if (e.key === "Escape") closeSheet();
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      const i = SCREENS.findIndex((s) => s.key === currentKey());
      const n = e.key === "ArrowRight"
        ? Math.min(SCREENS.length - 1, i + 1)
        : Math.max(0, i - 1);
      go(SCREENS[n].key);
    }
  });
})();
