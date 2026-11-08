/* ============================================================
   v7.js — 正式站合并层
   1) 院校资讯：接入真实公开公告数据（window.TL_SCHOOL_NEWS）
   2) 通知详情：原文链接 / 时间精度 / 不推测截止时刻
   3) 深链：?role=student#/profile 直接从落地页进入指定页面
   加载顺序：data.js → app.js → role-v3.js → v4.js → extract.js
             → v5.js → integration-adapters.js → v6.js → school-news.js → v7.js
   ============================================================ */
(function () {
  "use strict";

  var E = function (v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var $ = function (id) { return document.getElementById(id); };
  var pad = function (n) { return n < 10 ? "0" + n : "" + n; };
  var q1 = function (s) { return String(s == null ? "" : s).replace(/\\/g, "\\\\").replace(/'/g, "\\'"); };

  /* ============================================================
     一、真实院校资讯数据
     ============================================================ */
  var PREC = { minute: "时刻级", date: "日期级", month: "月份级", none: "未公布" };
  var CATS = ["全部", "夏令营", "预推免", "推免办法", "招生简章", "复试录取", "名单公示", "其他"];
  var STATES = ["全部", "进行中", "往期"];
  var RAW = window.TL_SCHOOL_NEWS && Array.isArray(window.TL_SCHOOL_NEWS.items)
    ? window.TL_SCHOOL_NEWS.items : null;

  function pick(o, names) {
    for (var i = 0; i < names.length; i++) {
      var v = o[names[i]];
      if (v != null && v !== "") return v;
    }
    return "";
  }

  function parseWhen(s) {
    if (!s) return null;
    s = String(s).trim();
    var m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(s);
    if (m) return { kind: "minute", y: +m[1], mo: +m[2], d: +m[3], hh: +m[4], mi: +m[5],
      ms: new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime() };
    m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (m) return { kind: "date", y: +m[1], mo: +m[2], d: +m[3],
      ms: new Date(+m[1], +m[2] - 1, +m[3]).getTime() };
    m = /^(\d{4})-(\d{2})/.exec(s);
    if (m) return { kind: "month", y: +m[1], mo: +m[2], ms: new Date(+m[1], +m[2] - 1, 1).getTime() };
    return null;
  }

  function dayDiff(ms) {
    var t = new Date();
    var today = new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
    return Math.round((ms - today) / 86400000);
  }

  function viewOf(w) {
    var now = Date.now();
    var out = { status: "时间待公布", tone: "orange", days: null, precision: "未公布",
      day: "—", month: "待公布", text: "时间待公布", note: "" };
    if (!w) { out.note = "原文未给出明确截止时间"; return out; }
    out.precision = PREC[w.kind] || "未公布";
    if (w.kind === "month") {
      out.month = w.mo + " 月";
      out.text = w.y + " 年 " + w.mo + " 月";
      var d = new Date(), cy = d.getFullYear(), cm = d.getMonth() + 1;
      if (w.y * 12 + w.mo < cy * 12 + cm) { out.status = "已截止"; out.tone = "gray"; }
      else if (w.y === cy && w.mo === cm) { out.status = "本月截止"; out.tone = "orange"; }
      else { out.status = "报名中"; out.tone = "green"; }
      return out;
    }
    out.day = pad(w.d);
    out.month = w.mo + " 月";
    out.text = w.kind === "minute"
      ? w.y + "-" + pad(w.mo) + "-" + pad(w.d) + " " + pad(w.hh) + ":" + pad(w.mi)
      : w.y + "-" + pad(w.mo) + "-" + pad(w.d);
    var diff = dayDiff(w.ms);
    var passed = w.kind === "minute" ? w.ms < now : diff < 0;
    if (passed) { out.status = "已截止"; out.tone = "gray"; out.days = null; }
    else if (diff <= 0) { out.status = "今天截止"; out.tone = "red"; out.days = 0; }
    else if (diff <= 3) { out.status = "即将截止"; out.tone = "red"; out.days = diff; }
    else { out.status = "报名中"; out.tone = "green"; out.days = diff; }
    return out;
  }

  function normalize(item, i) {
    item = item || {};
    var school = String(pick(item, ["school", "university", "schoolName"]) || "").trim();
    var college = String(pick(item, ["college", "department", "faculty", "institute"]) || "").trim();
    var title = String(pick(item, ["title", "name"]) || "").trim();
    var catRaw = String(pick(item, ["category", "type", "cat"]) || "").trim();
    var url = String(pick(item, ["url", "link", "sourceUrl", "href"]) || "").trim();
    var summary = String(pick(item, ["summary", "detail", "desc", "abstract"]) || "").trim();
    var publishedRaw = String(pick(item, ["publishedAt", "published", "publishDate", "date"]) || "").trim();
    var deadlineRaw = String(pick(item, ["deadline", "endDate", "deadlineAt"]) || "").trim();
    var labelRaw = String(pick(item, ["deadlineText", "deadlineLabel"]) || "").trim();

    var w = parseWhen(deadlineRaw);
    var v = viewOf(w);
    if (!w && labelRaw) { v.text = labelRaw; v.note = labelRaw; }
    var pub = parseWhen(publishedRaw);

    return {
      id: String(pick(item, ["id"]) || ("sn-" + (i + 1))),
      school: school,
      college: college,
      title: title,
      category: CATS.indexOf(catRaw) > 0 ? catRaw : "其他",
      publishedAt: publishedRaw,
      publishedMs: pub ? pub.ms : 0,
      publishedText: pub
        ? (pub.kind === "month" ? pub.y + " 年 " + pub.mo + " 月" : pub.y + "-" + pad(pub.mo) + "-" + pad(pub.d))
        : "",
      deadline: deadlineRaw,
      deadlineText: v.text,
      precision: v.precision,
      status: v.status,
      tone: v.tone,
      days: v.days,
      day: v.day,
      month: v.month,
      note: v.note,
      source: "来源：" + (college || school || "公开渠道"),
      sourceLabel: college ? school + " · " + college : school,
      summary: summary,
      detail: summary,
      url: url
    };
  }

  var NEWS = null;
  if (RAW && RAW.length) {
    NEWS = RAW.map(normalize).filter(function (n) { return n.title; });
    if (NEWS.length) M.notices = NEWS;
  }
  var HAS_REAL = !!(NEWS && NEWS.length);

  /* ============================================================
     二、院校资讯列表页（替换 v4 的占位筛选）
     ============================================================ */
  function allNews() { return (M.notices || []); }

  function schoolList() {
    var count = {}, order = [];
    allNews().forEach(function (n) {
      var s = n.school || "未标注院校";
      if (!count[s]) { count[s] = 0; order.push(s); }
      count[s]++;
    });
    order.sort(function (a, b) { return count[b] - count[a]; });
    return order;
  }

  function filtered() {
    var q = String(S.v7NewsQ || "").trim().toLowerCase();
    var cat = S.v7NewsCat || "全部";
    var sch = S.v7NewsSchool || "全部院校";
    var st = S.v7NewsState || "全部";
    var list = allNews().filter(function (n) {
      if (st === "进行中" && n.status === "已截止") return false;
      if (st === "往期" && n.status !== "已截止") return false;
      if (cat !== "全部" && n.category !== cat) return false;
      if (sch !== "全部院校" && (n.school || "未标注院校") !== sch) return false;
      if (q) {
        var hay = (n.school + " " + (n.college || "") + " " + n.title + " " + (n.summary || "")).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
    list.sort(function (a, b) {
      var ra = a.status === "已截止" ? 2 : (a.days == null ? 1 : 0);
      var rb = b.status === "已截止" ? 2 : (b.days == null ? 1 : 0);
      if (ra !== rb) return ra - rb;
      if (a.days != null && b.days != null && a.days !== b.days) return a.days - b.days;
      return (b.publishedMs || 0) - (a.publishedMs || 0);
    });
    return list;
  }

  // 数据集是静态快照，把「整理时间」显式写出来，避免让人以为天天在自动同步
  function updatedLabel() {
    var raw = (window.TL_SCHOOL_NEWS && window.TL_SCHOOL_NEWS.fetchedAt) || "";
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(raw));
    return m ? " · 整理于 " + m[2] + "-" + m[3] : "";
  }

  function cardHTML(n) {
    var meta = ['<span class="v7-cat">' + E(n.category) + "</span>"];
    if (n.status === "时间待公布") {
      meta.push("<em>截止 <b>时间待公布</b></em>");
    } else {
      meta.push("<em>截止 <b>" + E(n.deadlineText) + "</b></em>");
      if (n.days != null && n.days > 0) meta.push("<em>剩余 <b>" + n.days + "</b> 天</em>");
    }
    var out = n.url
      ? '<a class="v7-out" href="' + E(n.url) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()">原文 ↗</a>'
      : "";
    return '<div class="v7-news" onclick="S.currentNoticeId=\'' + q1(n.id) + '\';go(\'#/noticeDetail\')">' +
      '<div class="v7-news-top"><span class="v7-news-school">' + E(n.sourceLabel || n.school || "公开渠道") + "</span>" +
      '<span class="badge ' + n.tone + '">' + E(n.status) + "</span></div>" +
      '<div class="v7-news-title">' + E(n.title) + "</div>" +
      '<div class="v7-news-meta">' + meta.join("") + "</div>" +
      (n.summary ? '<div class="v7-news-sum">' + E(n.summary) + "</div>" : "") +
      '<div class="v7-news-foot"><span class="v7-src">' + E(n.source) + "</span>" + out +
      '<button class="tl-heart ' + (isSchoolSaved(n.id) ? "on" : "") + '" onclick="event.stopPropagation();toggleSchoolFavorite(\'' + q1(n.id) + '\')" aria-label="收藏通知">♥</button>' +
      "</div></div>";
  }

  window.pageSchoolNotices = function () {
    var list = filtered();
    var schools = schoolList();
    var cat = S.v7NewsCat || "全部";
    var sch = S.v7NewsSchool || "全部院校";
    var st = S.v7NewsState || "全部";
    var q = S.v7NewsQ || "";

    var seg = STATES.map(function (s) {
      return '<button type="button" class="' + (st === s ? "on" : "") + '" onclick="v7NewsState(\'' + q1(s) + '\')">' + s + "</button>";
    }).join("");
    var chips = CATS.map(function (c) {
      return '<button type="button" class="' + (cat === c ? "on" : "") + '" onclick="v7NewsCat(\'' + q1(c) + '\')">' + c + "</button>";
    }).join("");
    var schChips = ['<button type="button" class="' + (sch === "全部院校" ? "on" : "") + '" onclick="v7NewsSchool(\'全部院校\')">全部院校</button>']
      .concat(schools.map(function (s) {
        return '<button type="button" class="' + (sch === s ? "on" : "") + '" onclick="v7NewsSchool(\'' + q1(s) + '\')">' + E(s) + "</button>";
      })).join("");

    var empty = '<div class="v7-empty"><b>没有符合条件的通知</b>' +
      "<p>换个关键词，或切回「全部」分类与「全部院校」。</p>" +
      '<button type="button" onclick="v7NewsReset()">重置筛选</button></div>';

    return '<div class="page tl-v2-page v4-page">' +
      '<div class="v4-kicker">ADMISSION INTELLIGENCE</div><h1 class="v4-h1">院校资讯</h1>' +
      '<p class="v4-sub">整理自各高校研究生院与学院官网的公开通知，每条都带原文链接。时间只按原文精度呈现，不推测截止时刻。</p>' +
      '<div class="v7-tools">' +
      '<div class="tl-search"><input id="v7-news-q" type="search" placeholder="搜索院校、学院或标题" value="' + E(q) + '" oninput="v7NewsQ(this.value)" /></div>' +
      '<div class="v7-seg">' + seg + "</div>" +
      '<div class="tl-chips">' + chips + "</div>" +
      '<div class="v7-schools">' + schChips + "</div>" +
      "</div>" +
      '<div class="v7-count">共 <b>' + list.length + "</b> 条" + updatedLabel() + " · 按截止紧迫度排序" +
      (q ? " · 关键词「" + E(q) + "」" : "") + "</div>" +
      (list.length ? list.map(cardHTML).join("") : empty) +
      '<p class="v4-note">整理自公开渠道 · 请以院校官网与官方通知为准。平台不对截止时刻做推测。</p>' +
      "</div>";
  };

  window.v7NewsState = function (s) { S.v7NewsState = s; render(); };

  window.v7NewsQ = function (v) {
    S.v7NewsQ = v;
    var a = $("app"), y = a ? a.scrollTop : 0;
    render();
    if (a) a.scrollTop = y;
    var el = $("v7-news-q");
    if (el) { el.focus(); try { el.setSelectionRange(v.length, v.length); } catch (e) {} }
  };
  window.v7NewsCat = function (c) { S.v7NewsCat = c; render(); };
  window.v7NewsSchool = function (s) { S.v7NewsSchool = s; render(); };
  window.v7NewsReset = function () { S.v7NewsQ = ""; S.v7NewsCat = "全部"; S.v7NewsSchool = "全部院校"; S.v7NewsState = "全部"; render(); };

  /* ============================================================
     三、通知详情（真实原文链接 + 时间精度）
     ============================================================ */
  window.pageNoticeDetail = function () {
    var list = allNews();
    var n = null;
    for (var i = 0; i < list.length; i++) if (list[i].id === S.currentNoticeId) { n = list[i]; break; }
    if (!n) n = list[0];
    // 兜底命中时同步回状态，避免底部操作栏（收藏 / 加入投递计划）拿到失效 id 后静默无响应
    if (n) { try { S.currentNoticeId = n.id; } catch (e) {} }
    if (!n) {
      return '<div class="page tl-page"><div class="v7-empty"><b>没有找到这条通知</b>' +
        "<p>它可能已被移除，或链接已过期。</p>" +
        '<button type="button" onclick="go(\'#/school\')">回到院校资讯</button></div></div>';
    }

    var left = n.days === 0 ? "今天截止（按官方日期计算）"
      : (n.days != null ? "剩余 " + n.days + " 天（按官方日期计算）"
        : (n.status === "已截止" ? "已过截止时间" : "原文未给出明确截止时间"));
    var link = n.url
      ? '<a class="primary" href="' + E(n.url) + '" target="_blank" rel="noopener">查看原文 ↗</a>'
      : '<a class="primary" href="javascript:void(0)" style="opacity:.55">原文链接缺失</a>';

    var alert = n.precision === "时刻级" ? ""
      : '<div class="alert mt12"><span class="ico">⚠</span><span>' +
        (n.precision === "日期级" ? "官方原文只给到「日」，本平台不补 23:59 之类的推测时刻。"
          : n.precision === "月份级" ? "官方原文只给到「月」，具体日期请以院校后续公告为准。"
            : "官方原文未给出明确截止时间，请以院校公告为准。") +
        "</span></div>";

    return '<div class="page tl-v2-page">' +
      '<div class="v7-detail-head">' +
      '<div class="v7-detail-school">' + E(n.sourceLabel || n.school || "公开渠道") + "</div>" +
      '<h1 class="v7-detail-title">' + E(n.title) + "</h1>" +
      '<div class="v7-detail-tags"><span class="v7-cat">' + E(n.category) + "</span>" +
      '<span class="badge ' + n.tone + '">' + E(n.status) + "</span></div>" +
      "</div>" +
      '<div class="v7-detail-card"><h4>关键时间</h4>' +
      '<div class="v7-kv"><span class="k">发布</span><span class="v mono">' + (n.publishedText ? E(n.publishedText) : "未标注") + "</span></div>" +
      '<div class="v7-kv"><span class="k">截止</span><span class="v mono">' + E(n.deadlineText) + "</span></div>" +
      '<div class="v7-kv"><span class="k">时间精度</span><span class="v">' + E(n.precision) + "</span></div>" +
      '<div class="v7-kv"><span class="k">进度</span><span class="v">' + E(left) + "</span></div>" +
      "</div>" +
      (n.summary ? '<div class="v7-detail-card"><h4>原文要点</h4><div class="v7-detail-body">' + E(n.summary) + "</div></div>" : "") +
      alert +
      '<div class="v7-detail-actions">' + link + "</div>" +
      '<p class="v7-detail-foot">本页整理自公开渠道，仅呈现原文已给出的信息，不补推测时刻，也不代表院校官方立场。' +
      (n.url ? '<br>原文：<a href="' + E(n.url) + '" target="_blank" rel="noopener">' + E(n.url) + "</a>" : "") +
      "<br>请以院校官网与官方通知为准。</p>" +
      "</div>";
  };

  if (typeof PAGES === "object") {
    PAGES.noticeDetail = function () { return window.pageNoticeDetail(); };
  }

  /* ============================================================
     四、收藏页里的通知卡片
     ============================================================ */
  window.savedSchoolNoticeCards = function () {
    var list = allNews().filter(function (n) { return isSchoolSaved(n.id); });
    if (!list.length) return "";
    return list.map(function (n) {
      return '<div class="tl-saved-row" onclick="S.currentNoticeId=\'' + q1(n.id) + '\';go(\'#/noticeDetail\')">' +
        '<div class="grow"><b>' + E(n.title) + "</b>" +
        '<div class="tiny dim mt6">' + E(n.school) + " · " + E(n.status) + " · 截止 " + E(n.deadlineText) + "</div></div>" +
        '<button class="tl-heart on" onclick="event.stopPropagation();toggleSchoolFavorite(\'' + q1(n.id) + '\')" aria-label="取消收藏">♥</button></div>';
    }).join("");
  };

  /* ============================================================
     五、底部「院校资讯」角标：3 天内截止的条数
     首页是对话式布局，不再插入资讯列表；改为在 tab 上提示紧迫度。
     ============================================================ */
  function urgentCount() {
    var n = 0;
    allNews().forEach(function (x) { if (x.days != null && x.days >= 0 && x.days <= 3) n++; });
    return n;
  }
  function patchTabbar() {
    var tab = document.getElementById("tabbar");
    if (!tab || String(tab.className || "").indexOf("hidden") >= 0) return;
    var btn = tab.querySelector('button.tab[onclick*="#/school"]');
    if (!btn) return;
    var old = btn.querySelector(".v7-dot");
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var n = urgentCount();
    if (n <= 0) return;
    var i = document.createElement("i");
    i.className = "v7-dot";
    i.textContent = n > 99 ? "99+" : String(n);
    i.setAttribute("aria-label", n + " 条通知将在 3 天内截止");
    btn.appendChild(i);
  }
  if (typeof window.render === "function") {
    var baseRender = window.render;
    window.render = function () {
      var r = baseRender.apply(this, arguments);
      try { patchTabbar(); } catch (e) {}
      return r;
    };
  }

  /* ============================================================
     六、深链：?role=student#/profile
     index.html <head> 里的内联脚本会在 role-v3.js 改写 hash 之前
     把原始 ?role= 与 #/ 路由存进 window.__TL_DEEP。
     ============================================================ */
  (function deepLink() {
    var D = window.__TL_DEEP || {};
    var r = D.role;
    if (!r || ["student", "mentor", "guest"].indexOf(r) < 0) return;
    if (typeof window.selectTongluRole !== "function") return;
    var want = D.hash || "";
    window.selectTongluRole(r);
    if (D.notice) { try { S.currentNoticeId = D.notice; } catch (e) {} }
    if (!/^#\//.test(want) || want === "#/choose") return;
    if (want === location.hash) return;
    history.replaceState(null, "", location.pathname + location.search + want);
    if (typeof render === "function") render();
  })();

  /* ============================================================
     七、调试出口
     ============================================================ */
  window.__TLV7 = {
    version: "v7",
    hasRealNews: HAS_REAL,
    newsCount: NEWS ? NEWS.length : 0,
    news: function () { return (NEWS || []).map(function (n) { return { id: n.id, school: n.school, title: n.title, category: n.category, status: n.status, days: n.days, precision: n.precision, url: n.url }; }); },
    filtered: function () { return filtered().map(function (n) { return n.id; }); }
  };
})();
