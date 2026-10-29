/* ============================================================
   site.js — 官网外壳逻辑（与演示页完全独立）
   ============================================================ */

(function () {
  const root = document.documentElement;
  const KEY = "yantu-theme";

  /* ---------------- 主题 ---------------- */
  function apply(theme) {
    const dark = theme === "dark";
    root.dataset.theme = dark ? "dark" : "light";
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#0e1220" : "#f4f5f7");
    // 同步给页面内所有演示 iframe
    document.querySelectorAll("iframe").forEach((f) => {
      try {
        const q = new URL(f.src, location.href);
        q.searchParams.set("theme", dark ? "dark" : "light");
        if (f.src !== q.href) f.src = q.href;
      } catch (e) {}
    });
  }

  function current() {
    return root.dataset.theme === "dark" ? "dark" : "light";
  }

  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  apply(saved || (prefersDark ? "dark" : "light"));

  const btn = document.getElementById("themeToggle");
  if (btn) {
    btn.addEventListener("click", () => {
      const next = current() === "dark" ? "light" : "dark";
      apply(next);
      try { localStorage.setItem(KEY, next); } catch (e) {}
    });
  }

  // 跟随系统（用户没有手动选过时）
  if (window.matchMedia) {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e) => {
      let s = null;
      try { s = localStorage.getItem(KEY); } catch (err) {}
      if (!s) apply(e.matches ? "dark" : "light");
    };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  // 演示页里按 V 切换时，同步回官网
  window.addEventListener("message", (e) => {
    if (e.data && e.data.type === "yantu-theme") {
      apply(e.data.theme);
      try { localStorage.setItem(KEY, e.data.theme); } catch (err) {}
    }
  });

  /* ---------------- 界面截图卡 ---------------- */
  const SHOTS = [
    { k: "home", no: "01", t: "首页", d: "未建档 · 只给定位入口" },
    { k: "diagnosis", no: "03", t: "定位结果", d: "事实 / 推断 / 待核实" },
    { k: "provider", no: "04", t: "服务者详情", d: "满额不显示可约" },
    { k: "proposal", no: "06", t: "服务方案", d: "改价则旧确认失效" },
    { k: "delivery", no: "08", t: "服务交付", d: "全部版本保留" }
  ];

  const wrap = document.getElementById("shots");
  if (wrap) {
    wrap.innerHTML = SHOTS.map(
      (s) => `
      <a class="shot" href="demo.html#/${s.k}">
        <div class="shot-img">
          <span class="shot-badge">${s.no}</span>
          <iframe src="app.html?embed=1#/${s.k}" loading="lazy" title="${s.t}"></iframe>
        </div>
        <div class="shot-cap">
          <b>${s.t}</b>
          <span>${s.d}</span>
        </div>
      </a>`
    ).join("");
    // 让新插入的 iframe 也带上主题
    apply(current());
  }

  /* ---------------- Hero 手机预览滚动 ---------------- */
  const heroFrame = document.getElementById("heroFrame");
  if (heroFrame) {
    heroFrame.addEventListener("load", () => {
      // 轻微自动滚动，制造"活着"的感觉
      let y = 0, dir = 1;
      const inner = () => {
        try {
          const d = heroFrame.contentDocument;
          const app = d && d.getElementById("app");
          if (!app) return;
          const max = app.scrollHeight - app.clientHeight;
          if (max <= 20) return;
          y += dir * 0.6;
          if (y > max) { y = max; dir = -1; }
          if (y < 0) { y = 0; dir = 1; }
          app.scrollTop = y;
        } catch (e) {}
      };
      setInterval(inner, 60);
    });
  }

  /* ---------------- 平滑锚点 ---------------- */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href").slice(1);
      if (!id) return;
      const el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      const top = el.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top, behavior: "smooth" });
    });
  });
})();
