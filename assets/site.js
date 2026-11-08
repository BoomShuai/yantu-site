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
    if (meta) meta.setAttribute("content", dark ? "#0e1220" : "#f7f5fc");
    // 静态界面截图按主题切换
    document.querySelectorAll("img[data-shot]").forEach((img) => {
      const next = `assets/shots/${dark ? "dark" : "light"}-${img.dataset.shot}.jpg`;
      if (img.getAttribute("src") !== next) img.setAttribute("src", next);
    });
  }

  function current() {
    return root.dataset.theme === "dark" ? "dark" : "light";
  }

  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  // ?theme=light|dark 可强制指定，优先于本地记忆与系统偏好（便于分享固定主题的链接）
  const forced = new URLSearchParams(location.search).get("theme");
  apply(forced === "dark" || forced === "light" ? forced : (saved || (prefersDark ? "dark" : "light")));

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
    { k: "choose", no: "01", t: "选择身份", d: "学生 / 服务者 / 游客", href: "app/" },
    { k: "home", no: "02", t: "学生首页", d: "没建档 · 只给建档入口", href: "app/?role=student#/home" },
    { k: "profile", no: "03", t: "智能建档", d: "上传简历 · 逐项确认", href: "app/?role=student#/profile" },
    { k: "school", no: "04", t: "院校资讯", d: "原文链接 · 时间按精度", href: "app/?role=student#/school" },
    { k: "provider", no: "05", t: "服务者详情", d: "满额不显示可约", href: "app/?role=student#/provider" },
    { k: "experience", no: "06", t: "保研经验库", d: "经验可追溯到来源", href: "app/?role=student#/experience" },
    { k: "me", no: "07", t: "我的与规划", d: "成长建议 · 数据管理", href: "app/?role=student#/me" },
    { k: "workbench", no: "08", t: "服务者工作台", d: "接单 · 排班 · 结算", href: "app/?role=mentor#/workbench" }
  ];

  const wrap = document.getElementById("shots");
  if (wrap) {
    wrap.innerHTML = SHOTS.map(
      (s) => `
      <a class="shot" href="${s.href}">
        <div class="shot-img">
          <span class="shot-badge">${s.no}</span>
          <img src="assets/shots/v6-${s.k}.jpg" loading="lazy" alt="${s.t}界面" />
        </div>
        <div class="shot-cap">
          <b>${s.t}</b>
          <span>${s.d}</span>
        </div>
      </a>`
    ).join("");
  }

  /* ---------------- 院校资讯：真实条目 ---------------- */
  (function renderNews() {
    const grid = document.getElementById("newsGrid");
    const foot = document.getElementById("newsFoot");
    const data = window.TL_SCHOOL_NEWS;
    const items = data && Array.isArray(data.items) ? data.items : [];
    if (!grid) return;
    if (!items.length) {
      grid.style.display = "none";
      if (foot) foot.style.display = "none";
      return;
    }

    const pad = (n) => String(n).padStart(2, "0");
    const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    function dayOf(it) {
      const p = it.deadlinePrecision;
      if (!it.deadline || (p !== "date" && p !== "minute")) return null;
      const iso = p === "minute" ? String(it.deadline).slice(0, 10) : String(it.deadline);
      const d = new Date(iso + "T00:00:00");
      if (isNaN(d.getTime())) return null;
      return Math.round((d - today) / 86400000);
    }
    function deadlineText(it) {
      const p = it.deadlinePrecision;
      if (!it.deadline) return "截止时间未公布";
      if (p === "minute") return "截止 " + String(it.deadline).slice(0, 16).replace("T", " ");
      if (p === "date") return "截止 " + it.deadline;
      if (p === "month") return "截止 " + it.deadline + "（原文只到月份）";
      return "截止时间未公布";
    }
    function badgeOf(it) {
      const d = dayOf(it);
      if (d == null) return { t: "时间待公布", c: "" };
      if (d < 0) return { t: "已截止", c: "over" };
      if (d === 0) return { t: "今天截止", c: "urgent" };
      if (d <= 3) return { t: "还剩 " + d + " 天", c: "urgent" };
      return { t: "报名中", c: "" };
    }

    const CAT_RANK = { "夏令营": 0, "预推免": 1, "招生简章": 2, "推免办法": 3, "复试录取": 4, "名单公示": 5, "其他": 6 };
    const rank = (it) => (CAT_RANK[it.category] == null ? 9 : CAT_RANK[it.category]);
    const live = items.filter((it) => { const d = dayOf(it); return d != null && d >= 0; })
      .sort((a, b) => dayOf(a) - dayOf(b) || rank(a) - rank(b));
    const undated = items.filter((it) => dayOf(it) == null)
      .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)) || rank(a) - rank(b));
    // 先保证院校与栏目都不重复，凑不够再逐步放宽，避免整块都是同一类公告
    let pool = live.concat(undated);
    // 落地页只展示与推免直接相关的栏目，「其他」类留在应用内
    const focused = pool.filter((it) => it.category !== "其他");
    if (focused.length >= 3) pool = focused;
    const picks = [];
    const seenSchool = new Set();
    const seenCat = new Set();
    const take = (strictCat) => {
      for (const it of pool) {
        if (picks.length >= 3) return;
        if (seenSchool.has(it.school)) continue;
        if (strictCat && seenCat.has(it.category)) continue;
        seenSchool.add(it.school);
        seenCat.add(it.category);
        picks.push(it);
      }
    };
    take(true);
    take(false);
    if (picks.length < 3) {
      for (const it of pool) {
        if (picks.length >= 3) break;
        if (picks.indexOf(it) >= 0) continue;
        picks.push(it);
      }
    }

    grid.innerHTML = picks.map((it) => {
      const b = badgeOf(it);
      const href = "app/?role=student&notice=" + encodeURIComponent(it.id) + "#/noticeDetail";
      return `<a class="news-card" href="${href}" target="_blank" rel="noopener">
        <div class="nc-top">
          <span class="nc-school">${esc(it.school)}</span>
          <span class="nc-cat">${esc(it.category)}</span>
          <span class="nc-badge ${b.c}">${esc(b.t)}</span>
        </div>
        <h4 class="nc-title">${esc(it.title)}</h4>
        <div class="nc-meta">
          <span>发布 <b>${esc(String(it.publishedAt || "").slice(0, 10) || "未标注")}</b></span>
          <span>${esc(deadlineText(it))}</span>
        </div>
      </a>`;
    }).join("");

    if (foot) {
      const schools = new Set(items.map((i) => i.school)).size;
      const liveN = live.length;
      const liveText = liveN > 0 ? `，其中 ${liveN} 条仍在报名期内。` : "。";
      foot.innerHTML = `以上为院校资讯中的真实条目：共 <b>${items.length}</b> 条，覆盖 <b>${schools}</b> 所院校${liveText}` +
        `时间只按原文精度呈现，原文没写就不补。<a href="app/?role=student#/school" target="_blank" rel="noopener">查看全部并打开原文 ›</a>`;
    }
  })();

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
