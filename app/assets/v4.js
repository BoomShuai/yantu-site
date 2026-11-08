/* ============================================================
   v4.js — 同路紫金 V4：补齐信息、打通路径、去掉无效点击
   依赖：data.js → app.js → role-v3.js（window.__TL 状态桥）
   ============================================================ */
(function () {
  var T = window.__TL;
  var E = function (s) { return escapeTL(s == null ? "" : String(s)); };
  var $ = function (id) { return document.getElementById(id); };
  var save = function () { try { localStorage.setItem(V4K, JSON.stringify(V4S)); } catch (e) { } };

  /* ---------------- 1. 本地补充档案 ---------------- */
  var V4K = "tonglu-v4-supplement";
  var V4S = {
    targets: { undergrad: M.student.major, major: "", schools: "", degree: "学硕", direction: "", cross: "否" },
    research: [], contests: [], files: [], ranks: [], myReviews: [], extracted: null
  };
  (function () {
    try {
      var raw = localStorage.getItem(V4K); if (!raw) return;
      var o = JSON.parse(raw); if (!o || typeof o !== "object") return;
      if (o.targets) Object.keys(V4S.targets).forEach(function (k) { if (o.targets[k] != null) V4S.targets[k] = String(o.targets[k]); });
      ["research", "contests", "files", "ranks", "myReviews"].forEach(function (k) { if (Array.isArray(o[k])) V4S[k] = o[k]; });
      if (o.extracted && o.extracted.demo) V4S.extracted = o.extracted;
    } catch (e) { }
  })();

  S.v4Tier = "值得尝试";
  S.v4Identity = "全部";
  S.v4Search = "";
  S.v4ReviewTab = "mentor";
  S.v4ReviewProvider = "chen";
  S.v4FeedbackType = "功能故障";
  S.v4Stars = 5;
  S.v4ReviewTags = [];

  /* ---------------- 2. 内容数据 ---------------- */
  var NODES = [
    { m: "3—5 月", t: "材料底稿", d: "简历、个人陈述、成绩单与排名证明先做出可修改的底稿。", s: "done" },
    { m: "6—8 月", t: "夏令营报名与考核", d: "各院校集中在官网发布，报名与考核时间以学院公告为准。", s: "done" },
    { m: "8—9 月", t: "预推免报名与复试", d: "多数院校在系统开放前后安排复试，注意材料重复投递成本。", s: "done" },
    { m: "9 月下旬", t: "推免服务系统填报", d: "教育部统一开放时间每年略有差异，以官方公告为准。", s: "done" },
    { m: "10—11 月", t: "待录取确认与补录", d: "确认拟录取、留意补录与递补通知，名额变化最快。", s: "now" },
    { m: "次年 3—6 月", t: "录取与入学准备", d: "按学院要求提交政审、体检与档案材料。", s: "next" }
  ];
  var NOTICE_CAT = { n1: "机械", n2: "能源", n3: "材料" };

  var SCHOOLS = {
    "值得尝试": [
      { n: "上海交通大学", c: "机械与动力工程学院", p: "机械工程（学硕）", why: "学院在机械工程方向科研资源集中，你已有校级大创与专业第 8/120 的排名，具备进入材料筛选与面试环节的基础。", gap: "六级 512 偏低；暂无论文或专利；没有夏令营与科研实习记录；部分方向复试含笔试。", check: "2027 级接收细则与名额、是否对本科院校设置额外要求、复试科目。" },
      { n: "浙江大学", c: "机械工程学院", p: "机械电子工程（学硕）", why: "与你「机械设计制造及其自动化」的课程结构衔接度高，机电方向对项目经历看重大于论文数量。", gap: "报名基数大；需要比现在更强的科研产出或竞赛奖项支撑。", check: "学院对双非院校的实际接收情况、夏令营报名的月份安排。" }
    ],
    "重点考虑": [
      { n: "华中科技大学", c: "机械科学与工程学院", p: "机械工程（学硕）", why: "本科课程匹配度高，学院规模大、方向多，可选导师范围广，材料合格后进入复试的机会相对稳定。", gap: "需要把大创经历改写成可核验的成果描述，否则容易在材料环节被略过。", check: "2027 级推免名额、目标导师当年是否接收。" },
      { n: "大连理工大学", c: "机械工程学院", p: "机械工程（学硕）", why: "工科背景友好，机械方向招收规模较大，对双非院校学生相对开放。", gap: "六级成绩可能影响英语考核判断；缺少竞赛经历会让材料厚度不足。", check: "夏令营与预推免的具体月份安排、是否要求提前联系导师。" },
      { n: "南京理工大学", c: "机械工程学院", p: "兵器科学与技术（学硕）", why: "你的机械设计与机构分析基础与该方向交叉性强，跨方向反而可以形成差异化叙述。", gap: "跨方向需要补充相关课程说明与项目动机，否则容易被质疑方向不清晰。", check: "是否接收跨方向推免、复试科目与参考书。" }
    ],
    "相对稳妥": [
      { n: "合肥工业大学", c: "机械与汽车工程学院", p: "机械工程（学硕）", why: "与当前排名、英语水平、科研体量相对匹配，历年接收规模较大，材料完整度是主要变量。", gap: "仍需完整材料包；注意本校与外校名额分配差异。", check: "当年接收推免生的比例与名额分配规则。" },
      { n: "现就读院校", c: "机械工程学院", p: "机械设计制造及其自动化（学硕 · 推免留校）", why: "专业排名 8/120 在多数院校的推免资格线内，留校的信息确定性最高，是最值得先确认的一条路径。", gap: "需要先确认本校推免资格线与学院名额分配规则，再做外部投递。", check: "本校推免资格线、名额分配规则与报名截止时间（最优先事项）。" }
    ]
  };

  var MATERIAL_TIPS = [
    { t: "个人陈述先做「一页式经历清单」", d: "把每段经历压成「背景—动作—结果」三句，先保证逻辑通顺，再谈文采。你现在的痛点是写不进材料，不是经历不够。" },
    { t: "把大创写成可核验成果", d: "写清时间、角色、你负责的具体部分、产出物（报告 / 代码 / 样机）与可验证的数字，避免「参与了」这类表述。" },
    { t: "成绩单与排名证明提前开具", d: "确认排名口径是专业还是年级，是否含重修，避免不同院校口径不一致导致材料被退。" },
    { t: "推荐信找项目指导老师", d: "附上一页你的贡献说明，老师更容易写出有细节的推荐内容。" }
  ];
  var RESEARCH_TIPS = [
    { t: "短期（1—3 个月）", d: "把大创整理成 1 篇技术报告或工作论文，重点是方法与结果可复述；同时报名 1 项与机械相关的学科竞赛。" },
    { t: "中期（3—6 个月）", d: "联系本科导师进课题组，争取署名产出；没有产出也要有一段稳定的科研参与记录。" },
    { t: "不建议", d: "为了凑数量参加与目标方向无关的竞赛。评审更在意方向一致性，而不是证书数量。" }
  ];

  function baseMeta(p) {
    return {
      idType: "申请经验前辈",
      sub: p.brief || "服务者 · 资料待核验",
      edu: [["学历", "本人申报 · 待补充"], ["申请经历", "本人申报 · 待补充"], ["本科背景", "本人申报 · 待补充"]],
      good: ["方向相关的材料结构问题", "院校与项目选择的信息梳理"],
      strength: ["按你的材料逐段给修改意见", "每轮给出可执行的清单，不只讲道理"],
      verify: [["学历身份", "待核验 · 本人申报"], ["申请经历", "待核验 · 本人申报"], ["服务记录", "暂无真实评价"]],
      cases: [{
        title: "双非工科 · 材料偏薄 · 目标 985",
        meta: "匿名案例 · 2025 年 · 结果未公开",
        problem: "科研与课程项目都有，但个人陈述写成流水账，看不出个人贡献。",
        help: "两轮拆段重写，先把「问题—方法—结果」写顺，再补可核验数字。",
        delivery: "个人陈述 2 版批注 + 简历结构重排清单 + 7 天追问。",
        similar: "同样是双非工科、排名靠前但缺少论文产出。",
        diff: "对方已有竞赛国奖，你的材料更需要靠项目细节补厚度。"
      }],
      reviews: []
    };
  }
  var MENTOR_META = {
    chen: {
      idType: "申请经验前辈",
      sub: "机械工程 · 硕士在读",
      edu: [["学历", "机械工程 硕士在读 · 某 985 院校（本人申报）"], ["申请经历", "2025 级推免 · 机械工程学硕（本人申报）"], ["本科背景", "双非院校 · 机械设计制造及其自动化（本人申报）"]],
      good: ["科研经历写不进材料", "个人陈述结构散、没有重点", "大创与课程项目无法量化成效"],
      strength: ["按「问题—方法—结果」逐段拆解，不替你代写", "每轮结束给一份可执行的修改优先级清单", "7 天内 2 轮追问，改完能自己写第二段"],
      verify: [["学历与在读状态", "已提交学信网在线验证报告 · 证件号已遮挡"], ["录取经历", "已提交录取通知截图 · 姓名与编号已遮挡"], ["服务记录", "0 条真实评价 · 新入驻服务者"]],
      cases: [
        { title: "双非机械 · 排名 8/120 · 目标 985 学硕", meta: "匿名案例 · 2025 年 · 结果未公开", problem: "科研经历不少，但写不进材料；个人陈述到第三段就没有主线。", help: "先做一页式经历清单，再把大创拆成「问题—方法—结果」三段重写。", delivery: "个人陈述 2 版批注 + 简历结构重排 + 修改优先级清单。", similar: "与你同样是双非机械、排名靠前、缺少论文产出。", diff: "对方已有 1 项省级竞赛奖项，你的材料更需要靠项目细节补厚度。" },
        { title: "双非能动 · 排名 5/96 · 目标 211", meta: "匿名案例 · 2025 年 · 结果未知", problem: "不确定该先定校还是先补科研，材料结构混乱。", help: "先按院校层级排出 6 所清单，再针对前 3 所调整材料侧重。", delivery: "院校清单 + 陈述结构模板 + 1 轮批注。", similar: "决策顺序上的困惑与你一致。", diff: "对方目标为 211，材料门槛低于你的 985 目标。" }
      ],
      reviews: [
        { name: "匿名同学", stars: 5, text: "来自服务记录的评价。结构上给了很具体的第一段改法。", meta: "材料诊断 · 服务完成后评价" },
        { name: "匿名同学", stars: 4, text: "来自服务记录的评价。追问响应快，但需要自己动手改。", meta: "研究经历梳理 · 服务完成后评价" }
      ]
    },
    wang: {
      idType: "科研辅导老师",
      sub: "机械工程 · 博士在读",
      edu: [["学历", "机械工程 博士在读 · 某 211 院校（本人申报）"], ["研究方向", "机构动力学与振动控制（本人申报）"], ["辅导经验", "本人申报 · 待补充"]],
      good: ["科研选题与文献梳理", "竞赛材料的技术叙述", "研究计划写作"],
      strength: ["按课题组标准给选题建议，说明可行性边界", "可陪同拆读 3 篇代表文献，示范怎么读", "交付含一份可继续推进的研究提纲"],
      verify: [["学历与在读状态", "已提交学生证与在读证明 · 学号已遮挡"], ["研究方向", "已提交 2 篇公开论文首页"], ["服务记录", "0 条真实评价 · 新入驻服务者"]],
      cases: [
        { title: "自动化 · 大创无产出 · 想补科研", meta: "匿名案例 · 2025 年 · 结果未公开", problem: "大创只做了仿真，没有可写进材料的结论。", help: "重新定义问题边界，把仿真结果整理成对比实验。", delivery: "研究提纲 + 图表重画建议 + 1 轮批注。", similar: "同样是有项目无产出。", diff: "对方是自动化专业，你的机械方向更看重机构与结构。" }
      ],
      reviews: []
    }
  };
  function metaOf(p) {
    if (MENTOR_META[p.id]) { var m = MENTOR_META[p.id]; return m; }
    var b = baseMeta(p); b.idType = p.id === "demo-ai" ? "科研辅导老师" : "申请经验前辈"; return b;
  }
  var IDENTITIES = ["全部", "申请经验前辈", "科研辅导老师", "院校招生导师"];

  /* ---------------- 3. 通用小组件 ---------------- */
  var v3Home = PAGES.home, v3Providers = PAGES.providers, v3Provider = PAGES.provider, v3Me = PAGES.me;
  function availHtml(p) {
    var r = remain(p);
    return r > 0
      ? '<span class="v4-avail">可承接 · 余 ' + r + ' 位</span>'
      : '<span class="v4-avail full">本周期已满额</span>';
  }
  function starsHtml(n) {
    var s = ""; for (var i = 1; i <= 5; i++) s += i <= n ? "★" : "☆"; return s;
  }
  function priceText(p) {
    var s = (p.services || []).filter(function (x) { return x.price > 0; });
    return s.length ? "¥" + Math.min.apply(null, s.map(function (x) { return x.price; })) + " 起" : "价格以方案为准";
  }
  function fold(summary, body, open) {
    return '<details class="v4-fold"' + (open ? ' open' : '') + '><summary>' + summary + '</summary><div class="v4-fold-body">' + body + '</div></details>';
  }
  function next(msg, label, path) { if (window.showTongluNext) window.showTongluNext(msg, label, path); }

  /* ---------------- 4. 首页：可发现入口 ---------------- */
  PAGES.home = function () {
    if (T.role !== "student") return v3Home();
    var ready = T.profileReady();
    var avail = M.providers.filter(function (p) { return remain(p) > 0; }).length;
    var row = '<div class="v4-quick">' +
      '<button type="button" onclick="go(\'#/diagnosis\')"><b>' + (ready ? "定位建议" : "先做定位") + '</b><small>' + (ready ? "分层院校清单" : "补 3 项即可") + '</small></button>' +
      '<button type="button" onclick="go(\'#/providers\')"><b>' + (ready ? "匹配服务者" : "浏览服务者") + '</b><small>' + avail + ' 位可承接</small></button>' +
      '<button type="button" onclick="go(\'#/profile\')"><b>补充资料</b><small>' + (V4S.research.length + V4S.contests.length) + ' 段经历</small></button>' +
      '</div>' +
      '<div class="v4-quick-note">' + (ready ? "已按你确认的 BG 生成建议；下方仍可直接和 AI 继续聊。" : "完成定位后，匹配的服务者会出现在「服务者」里。") + '</div>';
    var html = v3Home();
    var at = '<div class="page tl-v3-home">';
    return html.indexOf(at) === 0 ? at + row + html.slice(at.length) : row + html;
  };

  /* ---------------- 5. 补充资料与申请目标 ---------------- */
  function rowsHtml(list, kind) {
    if (!list.length) return '<p class="v4-note">还没有添加，可先留空，之后再补。</p>';
    return list.map(function (r, i) {
      return '<div class="v4-file"><span class="ic">' + (kind === "research" ? "◈" : "◇") + '</span><span class="grow"><b>' + E(kind === "research" ? (r.title || "未命名研究经历") : (r.title || "未命名竞赛")) + '</b><small>' + E([r.role, r.result].filter(Boolean).join(" · ") || "细节待补充") + '</small></span><button type="button" onclick="v4Drop(\'' + kind + '\',' + i + ')">删除</button></div>';
    }).join("");
  }
  function fileHtml() {
    if (!V4S.files.length) return '<p class="v4-note">支持 PDF / Word / 图片，最多 5 份。</p>';
    return V4S.files.map(function (f, i) {
      return '<div class="v4-file"><span class="ic">▤</span><span class="grow"><b>' + E(f.name) + '</b><small>' + E(guessKind(f.name)) + ' · ' + Math.max(1, Math.round((f.size || 0) / 1024)) + ' KB · 未上传服务器</small></span><button type="button" onclick="v4Drop(\'files\',' + i + ')">移除</button></div>';
    }).join("");
  }
  function guessKind(name) {
    var n = String(name || "");
    if (/简历|resume|cv/i.test(n)) return "疑似简历";
    if (/陈述|statement|ps/i.test(n)) return "疑似个人陈述";
    if (/成绩|transcript/i.test(n)) return "疑似成绩单";
    if (/排名|rank/i.test(n)) return "疑似排名证明";
    return "材料类型待确认";
  }
  function extractedHtml() {
    var x = V4S.extracted;
    if (!x) return "";
    return '<div class="v4-card flat"><div class="v4-head"><h3>材料识别结果</h3><span class="v4-badge gold">本地提取</span></div>' +
      '<div class="v4-kv"><span>识别到</span><span>' + E(x.keys.join(" / ")) + '</span></div>' +
      '<div class="v4-kv"><span>本科专业</span><span>' + E(x.major) + '</span></div>' +
      '<div class="v4-kv"><span>排名</span><span>' + E(x.rank) + '</span></div>' +
      '<div class="v4-kv"><span>英语</span><span>' + E(x.english) + '</span></div>' +
      '<p class="v4-note">当前只读取文件名与大小，不解析内容；接入解析服务后才会读取正文。</p>' +
      '<div class="v4-actions"><button class="v4-btn line" type="button" onclick="v4UseExtracted()" style="flex:1">写入申请目标</button></div></div>';
  }
  PAGES.profile = function () {
    if (T.role !== "student") return v3Home();
    var t = V4S.targets;
    return '<div class="page tl-v2-page v4-page">' +
      '<div class="v4-kicker">LOCATION DOSSIER</div><h1 class="v4-h1">补充资料与申请目标</h1>' +
      '<p class="v4-sub">这里的内容只影响定位建议与推荐顺序，全部保存在本机浏览器。标「选填」的可以以后再补。</p>' +
      '<div class="v4-card"><div class="v4-head"><h3>申请目标</h3><span class="v4-count">选填</span></div>' +
      '<label class="v4-field"><span>本科专业</span><input class="v4-input" id="v4f-undergrad" value="' + E(t.undergrad) + '" placeholder="如：机械设计制造及其自动化" /></label>' +
      '<label class="v4-field"><span>目标专业 <i>与本科可能不同</i></span><input class="v4-input" id="v4f-major" value="' + E(t.major) + '" placeholder="如：机械工程 / 机械电子工程" /></label>' +
      '<label class="v4-field"><span>目标院校 <i>可填多所，用逗号分隔</i></span><input class="v4-input" id="v4f-schools" value="' + E(t.schools) + '" placeholder="如：上海交通大学, 华中科技大学" /></label>' +
      '<div class="v4-grid"><label class="v4-field"><span>学位类型</span><select class="v4-select" id="v4f-degree">' + ["学硕", "专硕", "未定"].map(function (v) { return '<option' + (t.degree === v ? ' selected' : '') + '>' + v + '</option>'; }).join("") + '</select></label>' +
      '<label class="v4-field"><span>跨专业意向</span><select class="v4-select" id="v4f-cross">' + ["否", "考虑中", "是"].map(function (v) { return '<option' + (t.cross === v ? ' selected' : '') + '>' + v + '</option>'; }).join("") + '</select></label></div>' +
      '<label class="v4-field"><span>研究方向 <i>选填</i></span><input class="v4-input" id="v4f-direction" value="' + E(t.direction) + '" placeholder="如：机构动力学 / 增材制造" /></label>' +
      '</div>' +
      '<div class="v4-card"><div class="v4-head"><h3>科研经历</h3><span class="v4-count">' + V4S.research.length + ' 段 · 选填</span></div>' +
      rowsHtml(V4S.research, "research") +
      '<div class="v4-grid"><label class="v4-field"><span>题目 / 方向</span><input class="v4-input" id="v4r-title" placeholder="如：某机构减振方案设计" /></label>' +
      '<label class="v4-field"><span>个人贡献</span><input class="v4-input" id="v4r-role" placeholder="如：建模与仿真" /></label></div>' +
      '<label class="v4-field"><span>成果 <i>选填</i></span><input class="v4-input" id="v4r-result" placeholder="如：校级大创结题 / 技术报告" /></label>' +
      '<div class="v4-actions"><button class="v4-btn line" type="button" onclick="v4Add(\'research\')">添加这段经历</button></div></div>' +
      '<div class="v4-card"><div class="v4-head"><h3>竞赛经历</h3><span class="v4-count">' + V4S.contests.length + ' 段 · 选填</span></div>' +
      rowsHtml(V4S.contests, "contests") +
      '<div class="v4-grid"><label class="v4-field"><span>赛事名称</span><input class="v4-input" id="v4c-title" placeholder="如：全国大学生机械创新设计大赛" /></label>' +
      '<label class="v4-field"><span>角色</span><input class="v4-input" id="v4c-role" placeholder="如：队长 / 结构设计" /></label></div>' +
      '<label class="v4-field"><span>结果 <i>选填</i></span><input class="v4-input" id="v4c-result" placeholder="如：省赛二等奖" /></label>' +
      '<div class="v4-actions"><button class="v4-btn line" type="button" onclick="v4Add(\'contests\')">添加这段竞赛</button></div></div>' +
      '<p class="v4-note">补得越多，定位建议里的「依据」和「差距」越具体；不补也能看到基于已有 BG 的通用排序。</p>' +
      '</div>';
  };
  window.v4Add = function (kind) {
    var f = { research: ["v4r-title", "v4r-role", "v4r-result"], contests: ["v4c-title", "v4c-role", "v4c-result"] }[kind];
    var title = ($(f[0]) || {}).value || "", role = ($(f[1]) || {}).value || "", result = ($(f[2]) || {}).value || "";
    if (!title.trim()) { toast("先填写名称再添加"); return; }
    V4S[kind].push({ title: title.trim().slice(0, 60), role: role.trim().slice(0, 40), result: result.trim().slice(0, 40) });
    save(); render(); toast("已添加（仅本机保存）");
  };
  window.v4Drop = function (kind, i) { V4S[kind].splice(i, 1); save(); render(); toast("已移除"); };
  window.v4AddFiles = function (ev) {
    var list = Array.prototype.slice.call(ev.target.files || []);
    if (!list.length) return;
    list.forEach(function (f) { if (V4S.files.length < 5) V4S.files.push({ name: f.name.slice(0, 80), size: f.size, type: f.type }); });
    var keys = []; V4S.files.forEach(function (f) { var k = guessKind(f.name).replace("疑似", ""); if (keys.indexOf(k) < 0) keys.push(k); });
    V4S.extracted = { demo: true, keys: keys, major: M.student.major, rank: M.student.rank.no + "/" + M.student.rank.total + "（" + M.student.rank.scope + "）", english: M.student.english.type + " " + M.student.english.score };
    save(); render(); toast("已识别 " + list.length + " 份材料");
  };
  window.v4UseExtracted = function () {
    if (!V4S.extracted) return;
    V4S.targets.undergrad = V4S.extracted.major; save(); render(); toast("已写入本科专业");
  };
  window.v4SaveProfile = function () {
    var g = function (id) { return ($(id) || {}).value || ""; };
    V4S.targets = {
      undergrad: g("v4f-undergrad").trim().slice(0, 40) || M.student.major,
      major: g("v4f-major").trim().slice(0, 40),
      schools: g("v4f-schools").trim().slice(0, 80),
      degree: g("v4f-degree") || "学硕",
      direction: g("v4f-direction").trim().slice(0, 40),
      cross: g("v4f-cross") || "否"
    };
    save();
    toast("补充资料已保存在本机");
    setTimeout(function () { go("#/diagnosis"); }, 260);
  };

  /* ---------------- 6. 定位结果 ---------------- */
  function tiers() {
    var t = V4S.targets;
    var keys = ["值得尝试", "重点考虑", "相对稳妥"];
    var out = {}; keys.forEach(function (k) { out[k] = SCHOOLS[k].slice(); });
    if (t.degree === "专硕") {
      out["重点考虑"] = out["重点考虑"].map(function (s) { return Object.assign({}, s, { p: s.p.replace("学硕", "专硕") }); });
    }
    return out;
  }
  PAGES.diagnosis = function () {
    if (T.role !== "student") return '<div class="page tl-v2-page v4-page"><p class="v4-sub">定位建议仅对完成 BG 确认的学生开放。</p></div>';
    if (!T.profileReady()) {
      return '<div class="page tl-v2-page v4-page"><div class="v4-kicker">PROFILE DIAGNOSIS</div><h1 class="v4-h1">还没有可用的定位建议</h1>' +
        '<div class="v4-card"><p class="v4-sub" style="margin:0">定位建议需要三样信息：你的背景、就读年级、目标方向。先在首页和 AI 聊两句并确认 BG，系统才会生成与你相关的清单。</p>' +
        '<div class="v4-actions"><button class="v4-btn line" type="button" onclick="go(\'#/providers\')">先看服务者</button><button class="v4-btn" type="button" onclick="go(\'#/home\')">去和 AI 交流 ›</button></div></div>' +
        '<div class="v4-card flat"><div class="v4-head"><h3>现在可以先做什么</h3></div><div class="v4-row"><span class="grow"><b>补充申请目标</b><small>目标专业、院校、学位类型可以手动填写</small></span><button class="arrow" type="button" onclick="go(\'#/profile\')">›</button></div>' +
        '<div class="v4-row"><span class="grow"><b>浏览院校资讯</b><small>按截止紧迫度查看官方通知</small></span><button class="arrow" type="button" onclick="go(\'#/school\')">›</button></div></div></div>';
    }
    var bg = T.bg, t = V4S.targets, all = tiers();
    var tier = all[S.v4Tier] ? S.v4Tier : "值得尝试";
    var list = all[tier];
    var counts = Object.keys(all).map(function (k) { return all[k].length; });
    var extra = [];
    if (V4S.research.length) extra.push("科研 " + V4S.research.length + " 段");
    if (V4S.contests.length) extra.push("竞赛 " + V4S.contests.length + " 段");
    if (V4S.files.length) extra.push("材料 " + V4S.files.length + " 份");
    return '<div class="page tl-v2-page v4-page">' +
      '<div class="v4-kicker">PROFILE DIAGNOSIS · 本地规则</div><h1 class="v4-h1">你的定位建议</h1>' +
      '<p class="v4-sub">依据你确认的 BG' + (extra.length ? "，加上补充的 " + extra.join(" / ") : "") + '，给出三个层级的院校清单，并说明依据、差距和还需要核实的事。</p>' +
      '<div class="v4-card flat"><div class="v4-head"><h3>本次判断依据</h3><span class="v4-count">' + E(bg.grade || "年级未填") + '</span></div>' +
      '<div class="v4-kv"><span>背景</span><span>' + E(bg.goals.join(" / ") || "目标未填") + '</span></div>' +
      '<div class="v4-kv"><span>排名</span><span>' + M.student.rank.no + "/" + M.student.rank.total + "（" + M.student.rank.scope + "）· 来自你确认的 BG</span></div>" +
      '<div class="v4-kv"><span>英语</span><span>' + M.student.english.type + " " + M.student.english.score + '</span></div>' +
      '<div class="v4-kv"><span>申请目标</span><span>' + E([t.major || t.undergrad, t.degree, t.direction].filter(Boolean).join(" · ")) + (t.cross !== "否" ? " · 跨专业" + t.cross : "") + '</span></div>' +
      '<button class="v4-btn line" type="button" onclick="go(\'#/profile\')" style="margin-top:10px">补充申请目标，让建议更准确 ›</button></div>' +
      '<div class="v4-tierbar">' + ["值得尝试", "重点考虑", "相对稳妥"].map(function (k, i) {
        return '<button type="button" class="' + (tier === k ? "on" : "") + '" onclick="v4Tier(\'' + k + '\')">' + k + '<b>' + counts[i] + '</b></button>';
      }).join("") + '</div>' +
      '<p class="v4-tier-legend"><span class="v4-dot"></span>分层只表示准备难度与信息确定性的相对排序，不代表录取概率，也不构成报考承诺。</p>' +
      list.map(function (s) {
        var cls = tier === "值得尝试" ? "" : tier === "重点考虑" ? " b" : " c";
        return '<div class="v4-school"><div class="v4-school-top"><div><b>' + E(s.n) + ' · ' + E(s.c) + '</b><small>' + E(s.p) + '</small></div><span class="v4-tier-chip' + cls + '">' + tier + '</span></div>' +
          '<div class="v4-kv"><span>依据</span><span>' + E(s.why) + '</span></div>' +
          '<div class="v4-kv"><span>差距</span><span>' + E(s.gap) + '</span></div>' +
          fold("还需要核实", '<p>' + E(s.check) + '</p><p>以上整理自公开渠道，接入院校官方公告后再逐条确认。</p>') +
          '</div>';
      }).join("") +
      '<div class="v4-card"><div class="v4-head"><h3>接下来先做什么</h3><span class="v4-count">按优先级</span></div>' +
      fold("① 选校定位", "<p>先确认本校推免资格线与名额分配，再按上面三个层级各保留 2 所，形成 6 所的可投递清单。</p><p>清单确定后，材料与科研建议才有明确的目标院校作为参照。</p>") +
      fold("② 材料准备", MATERIAL_TIPS.map(function (x) { return "<p><b>" + x.t + "</b><br>" + x.d + "</p>"; }).join("")) +
      fold("③ 科研与竞赛提升", RESEARCH_TIPS.map(function (x) { return "<p><b>" + x.t + "</b><br>" + x.d + "</p>"; }).join("")) +
      '<p class="v4-note">三件事分开看：选校决定方向，材料决定能不能被看见，科研决定长期上限。不要同时推进三件。</p></div>' +
      '<div class="v4-card flat"><div class="v4-head"><h3>下一步</h3></div>' +
      '<div class="v4-row"><span class="grow"><b>找能承接的服务者</b><small>按可接单状态与匹配原因排序</small></span><button class="arrow" type="button" onclick="go(\'#/providers\')">›</button></div>' +
      '<div class="v4-row"><span class="grow"><b>查看保研关键节点</b><small>时间线按月份级呈现，不做时刻推测</small></span><button class="arrow" type="button" onclick="go(\'#/school\')">›</button></div></div>' +
      '<p class="v4-note">结果由本地规则生成，不是真实模型推理；院校信息以官方公告为准。</p></div>';
  };
  window.v4Tier = function (k) { S.v4Tier = k; render(); };

  /* ---------------- 7. 服务者列表 ---------------- */
  function mentorCardV4(p) {
    var m = metaOf(p), r = remain(p), saved = isMentorSaved(p.id);
    var rankIdx = V4S.ranks.indexOf(p.id);
    var reason = (T.recommendationReason && T.role === "student") ? T.recommendationReason(p) : "服务方向：" + (p.tags || []).slice(0, 2).join(" / ");
    return '<div class="tl-mentor-card">' +
      '<div class="tl-mentor-header"><div class="tl-avatar">' + E(p.name.slice(0, 1)) + '</div>' +
      '<div class="tl-mentor-name"><b>' + E(p.name) + '</b><small>' + E(m.idType) + ' · ' + E(m.sub) + '</small>' +
      '<div class="v4-idrow">' + availHtml(p) + '<span class="v4-badge mute">资料：本人申报</span>' + (rankIdx >= 0 ? '<span class="v4-badge">第 ' + (rankIdx + 1) + ' 意向</span>' : '') + '</div></div>' +
      '<button class="tl-heart" type="button" aria-label="收藏服务者" onclick="toggleMentorFavorite(\'' + p.id + '\')">' + (saved ? "♥" : "♡") + '</button></div>' +
      '<div class="tl-reason">✦ ' + E(reason) + '</div>' +
      '<div class="v4-tagrow">' + m.good.slice(0, 2).map(function (g) { return '<span class="v4-tag">擅长：' + E(g) + '</span>'; }).join("") + '<span class="v4-tag gold">' + priceText(p) + '</span></div>' +
      '<div class="tl-mentor-bottom"><span>' + (r > 0 ? "本周期可承接" : "暂不可预约") + '</span>' +
      '<div style="display:flex;gap:6px;align-items:center">' +
      '<button class="v4-rankbtn' + (r > 0 ? "" : " off") + '" type="button" onclick="v4Rank(\'' + p.id + '\')">' + (rankIdx >= 0 ? "移出意向" : "设为意向") + '</button>' +
      '<button class="v4-rankbtn" type="button" onclick="v4Open(\'' + p.id + '\')">完整介绍 ›</button></div></div></div>';
  }
  PAGES.providers = function () {
    if (T.role !== "student") return v3Providers();
    var ready = T.profileReady();
    var all = M.providers.slice();
    var view = S.providerView === "saved" ? "saved" : "all";
    if (view === "saved") all = all.filter(function (p) { return isMentorSaved(p.id); });
    if (S.v4Identity !== "全部") all = all.filter(function (p) { return metaOf(p).idType === S.v4Identity; });
    var q = (S.v4Search || "").trim();
    if (q) all = all.filter(function (p) { return (p.name + p.brief + (p.tags || []).join(" ")).indexOf(q) >= 0; });
    if (S.providerFilter && S.providerFilter !== "全部") all = all.filter(function (p) { return (p.tags || []).join(" ").indexOf(S.providerFilter) >= 0; });
    all.sort(function (a, b) {
      var ra = remain(a) > 0 ? 1 : 0, rb = remain(b) > 0 ? 1 : 0;
      if (ra !== rb) return rb - ra;
      var wa = T.recommendationWeight ? T.recommendationWeight(b) - T.recommendationWeight(a) : 0;
      return wa || a.name.localeCompare(b.name);
    });
    var picks = V4S.ranks.map(function (id) { return M.providers.find(function (p) { return p.id === id; }); }).filter(Boolean);
    var topFull = picks.length > 0 && remain(picks[0]) === 0;
    return '<div class="page tl-v2-page v4-page">' +
      '<div class="v4-kicker">MENTOR MATCHING</div><h1 class="v4-h1">找到更适合你的同行者</h1>' +
      '<p class="v4-sub">' + (ready ? "已按你的 BG 与诉求排出顺序，可承接的服务者排在前面。" : "下方为公开精选内容，完成定位后可查看与你匹配的服务者。") + '</p>' +
      (picks.length ? '<div class="v4-card' + (topFull ? "" : " flat") + '"><div class="v4-head"><h3>我的意向顺序</h3><span class="v4-count">最多 3 位</span></div>' +
        picks.map(function (p, i) {
          return '<div class="v4-pick' + (i === 0 ? " on" : "") + '"><span class="v4-num' + (i === 0 ? " on" : "") + '">' + (i + 1) + '</span><span class="grow"><b>' + E(p.name) + '</b><small>' + E(metaOf(p).idType) + ' · ' + (remain(p) > 0 ? "可承接" : "已满额") + ' · ' + priceText(p) + '</small></span>' +
            '<button class="v4-rankbtn" type="button" onclick="v4Rank(\'' + p.id + '\')">移出</button></div>';
        }).join("") +
        (topFull ? '<p class="v4-note">你的首选当前已满额，不会被自动预约。</p><button class="v4-btn" type="button" onclick="v4Promote()" style="margin-top:8px">联系下一位可承接的服务者 ›</button>' : '') +
        '<p class="v4-note">切换意向前需要重新确认服务范围、价格与时间；已付款订单不会自动转移到其他服务者。</p></div>' : '') +
      '<div class="tl-switch"><button type="button" class="' + (view === "all" ? "on" : "") + '" onclick="setProviderView(\'all\')">全部</button><button type="button" class="' + (view === "saved" ? "on" : "") + '" onclick="setProviderView(\'saved\')">♥ 我的收藏 ' + TL.savedMentors.length + '</button></div>' +
      '<div class="tl-search"><input id="v4-search" type="search" placeholder="搜索姓名、方向或擅长问题" value="' + E(q) + '" oninput="v4Search(this.value)" /></div>' +
      '<div class="tl-chips">' + IDENTITIES.map(function (k) { return '<button type="button" class="' + (S.v4Identity === k ? "on" : "") + '" onclick="v4Identity(\'' + k + '\')">' + (k === "全部" ? "全部身份" : k) + '</button>'; }).join("") + '</div>' +
      '<div class="tl-chips">' + ["全部", "材料诊断", "研究经历", "竞赛"].map(function (k) { return '<button type="button" class="' + (S.providerFilter === k ? "on" : "") + '" onclick="setProviderFilter(\'' + k + '\')">' + (k === "全部" ? "全部能力" : k) + '</button>'; }).join("") + '</div>' +
      '<div class="tl-small-cap">' + all.length + ' 位 · 可承接优先</div>' +
      (all.length ? all.map(mentorCardV4).join("") :
        '<div class="tl-v4-empty"><b>' + (S.v4Identity === "院校招生导师" ? "该身份类型正在合规审核" : "没有符合条件的服务者") + '</b><p>' + (S.v4Identity === "院校招生导师" ? "招生导师身份涉及院校回避与利益冲突，正式版需要单独合规审核后才能开放。当前仅保留身份分类，不提供该类服务者。" : "试试点「全部」身份，或清空搜索与筛选条件。") + '</p>' +
        '<button class="v4-btn line" type="button" onclick="v4Identity(\'全部\')">查看全部服务者</button></div>') +
      '<div class="tl-disclaimer">服务者资料由本人申报，核验状态不等于能力认证；价格为参考值，实际以方案确认页为准。</div></div>';
  };
  window.v4Identity = function (k) { S.v4Identity = k; render(); };
  window.v4Search = function (v) { S.v4Search = v; var a = $("app"); var y = a ? a.scrollTop : 0; render(); if (a) a.scrollTop = y; var el = $("v4-search"); if (el) { el.focus(); el.setSelectionRange(v.length, v.length); } };
  window.v4Open = function (id) { S.activeProvider = id; go("#/provider"); };
  window.v4Rank = function (id) {
    var i = V4S.ranks.indexOf(id);
    if (i >= 0) { V4S.ranks.splice(i, 1); save(); render(); toast("已移出意向顺序"); return; }
    if (V4S.ranks.length >= 3) { toast("最多设置 3 位意向服务者"); return; }
    V4S.ranks.push(id); save(); render(); toast("已设为第 " + V4S.ranks.length + " 意向");
  };
  window.v4Promote = function () {
    var nextP = V4S.ranks.map(function (id) { return M.providers.find(function (p) { return p.id === id; }); }).filter(function (p) { return p && remain(p) > 0; })[0];
    if (!nextP) { toast("意向前三都没有可承接名额，建议放宽方向或稍后再试"); return; }
    S.activeProvider = nextP.id;
    save(); render();
    toast("已切换为「" + nextP.name + "」· 请重新确认范围、价格与时间");
  };

  /* ---------------- 8. 服务者详情 ---------------- */
  PAGES.provider = function () {
    if (T.role !== "student") return v3Provider();
    var p = provider();
    if (!p) return '<div class="page tl-v2-page v4-page"><p class="v4-sub">没有找到该服务者。</p></div>';
    var m = metaOf(p), r = remain(p), saved = isMentorSaved(p.id), rankIdx = V4S.ranks.indexOf(p.id);
    return '<div class="page tl-v2-page v4-page">' +
      '<div class="card">' +
      '<div style="display:flex;gap:12px;align-items:flex-start"><div class="tl-avatar">' + E(p.name.slice(0, 1)) + '</div>' +
      '<div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap"><b style="font-size:16px;color:#3c2e55">' + E(p.name) + '</b><span class="v4-badge">' + E(m.idType) + '</span></div>' +
      '<small style="display:block;color:#8b7c99;font-size:10.5px;margin-top:5px">' + E(m.sub) + '</small>' +
      '<div class="v4-idrow">' + availHtml(p) + '<span class="v4-badge gold">本人申报</span></div></div></div>' +
      '<div class="v4-tagrow">' + (p.tags || []).map(function (t) { return '<span class="v4-tag">' + E(t) + '</span>'; }).join("") + '</div>' +
      '</div>' +
      '<div class="v4-steps"><div class="on"><i>1</i>浏览资料</div><div class="on"><i>2</i>选择服务</div><div><i>3</i>方案确认</div><div><i>4</i>付款交付</div></div>' +
      '<div class="v4-card"><div class="v4-head"><h3>教育背景与申请经历</h3></div>' +
      m.edu.map(function (kv) { return '<div class="v4-kv"><span>' + E(kv[0]) + '</span><span>' + E(kv[1]) + '</span></div>'; }).join("") +
      fold("核验依据（可展开）", m.verify.map(function (kv) { return "<p><b>" + E(kv[0]) + "</b><br>" + E(kv[1]) + "</p>"; }).join("") +
        "<p>核验材料经遮挡处理；展示范围与授权方式仍待产品与合规确认，正式版需服务者逐项授权后才可对外展示。</p>") +
      '</div>' +
      '<div class="v4-card"><div class="v4-head"><h3>擅长解决什么问题</h3></div>' +
      '<div class="v4-tagrow" style="margin:0 0 10px">' + m.good.map(function (g) { return '<span class="v4-tag">' + E(g) + '</span>'; }).join("") + '</div>' +
      '<div class="v4-head" style="margin:10px 0 6px"><h3 style="font-size:13px">服务优势</h3></div>' +
      m.strength.map(function (s) { return '<div class="v4-row"><span class="grow"><small style="color:#6f6179;font-size:10.5px;line-height:1.7">✦ ' + E(s) + '</small></span></div>'; }).join("") +
      '<p class="v4-note">以上为服务者自述，不代表平台对其效果的担保。</p></div>' +
      '<div class="v4-card"><div class="v4-head"><h3>真实服务案例</h3><span class="v4-count">' + m.cases.length + ' 个</span></div>' +
      m.cases.map(function (c) {
        return '<div class="v4-case"><b>' + E(c.title) + '</b><div class="meta">' + E(c.meta) + '</div><dl>' +
          '<div><dt>学生的问题</dt><dd>' + E(c.problem) + '</dd></div>' +
          '<div><dt>提供了什么帮助</dt><dd>' + E(c.help) + '</dd></div>' +
          '<div><dt>实际交付内容</dt><dd>' + E(c.delivery) + '</dd></div></dl>' +
          '<div class="diff">与你相似：' + E(c.similar) + '<br>与你不同：' + E(c.diff) + '</div></div>';
      }).join("") +
      '<p class="v4-note">案例内容经学生授权并作匿名处理，未公开录取结果。</p></div>' +
      '<div class="v4-card"><div class="v4-head"><h3>服务项目</h3><span class="v4-count">点开可购买</span></div>' +
      (r === 0 ? '<div class="v4-card flat" style="margin:0 0 8px"><p class="v4-note" style="margin:0">本周期名额已满，暂不可预约。可先收藏或查看其他可承接的服务者。</p></div>' : '') +
      (p.services || []).map(function (s, i) {
        var head = '<span class="grow"><b>' + E(s.name) + '</b><small>' + E(s.desc) + '</small></span>';
        if (r === 0) return '<div class="v4-svc off">' + head + '<span class="price mute">本周期已满</span></div>';
        return '<button class="v4-svc" type="button" onclick="v4Book(\'' + p.id + '\',' + i + ')">' + head + '<span class="price">' + (s.price > 0 ? "¥" + s.price : "以方案为准") + '</span><span class="arrow">›</span></button>';
      }).join("") +
      '<p class="v4-note">' + (r === 0 ? '该服务者本周期名额已满，项目暂不开放预约；名额释放后会重新显示可约。' : '点任意项目进入售前沟通，方案与价格可在后续页面确认；付款前会再次校验名额。') + '</p></div>' +
      '<div class="v4-card"><div class="v4-head"><h3>服务评价</h3><button type="button" onclick="v4Reviews(\'' + p.id + '\')">全部评价 ›</button></div>' +
      '<div class="v4-scoreline"><b>' + (p.rating && p.rating.count ? p.rating.score : "—") + '</b><em>' + (p.rating && p.rating.count ? p.rating.count + " 条真实评价" : "暂无真实评价 · 新入驻") + '</em></div>' +
      (m.reviews.length ? m.reviews.slice(0, 1).map(function (rv) {
        return '<div class="v4-rate"><span class="av">匿</span><span class="grow"><b>' + E(rv.name) + '</b><span class="stars">' + starsHtml(rv.stars) + '</span><p>' + E(rv.text) + '</p><small>' + E(rv.meta) + '</small></span></div>';
      }).join("") : '<p class="v4-note">还没有评价。服务完成并确认交付后，你可以在「我的评价」里写第一条。</p>') +
      '<button class="v4-btn line" type="button" onclick="v4Reviews(\'' + p.id + '\')">查看评价详情与我的评价 ›</button></div>' +
      '<div class="v4-card flat"><div class="v4-head"><h3>意向顺序</h3><span class="v4-count">最多 3 位</span></div>' +
      '<p class="v4-note" style="margin-top:0">设为意向后，首选满额时会提示你联系下一位。</p>' +
      '<button class="v4-btn' + (rankIdx >= 0 ? " line" : "") + '" type="button" onclick="v4Rank(\'' + p.id + '\')">' + (rankIdx >= 0 ? "移出意向顺序" : "设为第 " + (V4S.ranks.length + 1) + " 意向") + '</button></div>' +
      '<p class="v4-note">身份核验不等于能力认证；方案范围、价格与交付时间以确认页为准。</p></div>';
  };
  window.v4Book = function (id, i) {
    var p = M.providers.find(function (x) { return x.id === id; });
    if (!p) return;
    if (remain(p) === 0) { toast("该服务者本周期已满额，暂时无法预约"); return; }
    var s = (p.services || [])[i];
    S.activeProvider = id; S.v4Service = i;
    if (M.authCard) M.authCard.note = "已授权本次需求查看 · 仅" + p.name + " 可见 · 可随时撤回";
    toast("已选择「" + (s ? s.name : "服务") + "」");
    setTimeout(function () { go("#/presale"); }, 240);
  };
  window.v4Reviews = function (id) { S.v4ReviewProvider = id; S.v4ReviewTab = "mentor"; go("#/reviews"); };

  /* ---------------- 9. 评价页 ---------------- */
  function reviewForm() {
    var p = M.providers.find(function (x) { return x.id === S.v4ReviewProvider; }) || M.providers[0];
    var tags = ["材料结构清晰", "响应及时", "方法可执行", "交付完整", "沟通耐心"];
    return '<div class="v4-card"><div class="v4-head"><h3>评价本次服务</h3></div>' +
      '<div class="v4-kv"><span>服务者</span><span>' + E(p.name) + ' · ' + E((p.services[0] || {}).name || "服务") + '</span></div>' +
      '<div class="v4-kv"><span>订单</span><span>订单 · 已确认交付</span></div>' +
      '<div class="v4-field" style="margin-top:12px"><span>满意度 <i>1–5 分</i></span><div class="v4-starbar">' +
      [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" class="v4-star' + (n <= S.v4Stars ? " on" : "") + '" onclick="v4Stars(' + n + ')" aria-label="' + n + ' 分">★</button>'; }).join("") +
      '<em class="v4-starsay">' + S.v4Stars + ' 分</em></div></div>' +
      '<div class="v4-field"><span>标签 <i>可多选</i></span><div class="v4-choice">' +
      tags.map(function (t) { return '<button type="button" class="' + (S.v4ReviewTags.indexOf(t) >= 0 ? "on" : "") + '" onclick="v4Tag(\'' + t + '\')">' + t + '</button>'; }).join("") + '</div></div>' +
      '<label class="v4-field"><span>具体描述 <i>选填</i></span><textarea class="v4-textarea" id="v4-review-text" maxlength="300" placeholder="哪一步最有帮助？哪里还可以更好？"></textarea></label>' +
      '<div class="v4-actions"><button class="v4-btn" type="button" onclick="v4SubmitReview()">提交评价</button></div>' +
      '<p class="v4-note">评价只保存在本机，不会展示给其他用户，也不会发送给服务者。</p></div>';
  }
  PAGES.reviews = function () {
    var mine = S.v4ReviewTab === "mine";
    var p = M.providers.find(function (x) { return x.id === S.v4ReviewProvider; }) || M.providers[0];
    var m = metaOf(p);
    var list = m.reviews.length ? m.reviews : [{ name: "匿名同学", stars: 4, text: "该服务者还没有收到评价。", meta: "评价结构示例" }];
    return '<div class="page tl-v2-page v4-page">' +
      '<div class="v4-kicker">SERVICE REVIEW</div><h1 class="v4-h1">服务评价</h1>' +
      '<div class="tl-switch"><button type="button" class="' + (!mine ? "on" : "") + '" onclick="v4ReviewTab(\'mentor\')">服务者评价</button><button type="button" class="' + (mine ? "on" : "") + '" onclick="v4ReviewTab(\'mine\')">我的评价</button></div>' +
      (mine ? (V4S.myReviews.length ?
        '<div class="v4-card"><div class="v4-head"><h3>我已提交的评价</h3><span class="v4-count">' + V4S.myReviews.length + ' 条</span></div>' +
        V4S.myReviews.map(function (rv) {
          return '<div class="v4-rate"><span class="av">我</span><span class="grow"><b>' + E(rv.name) + '</b><span class="stars">' + starsHtml(rv.stars) + '</span><p>' + E(rv.text || "（未填写描述）") + '</p><small>' + E(rv.tags.join(" / ") || "无标签") + ' · ' + E(rv.at) + '</small></span></div>';
        }).join("") + '</div>' + reviewForm() :
        reviewForm() + '<p class="v4-note">「我的评价」只有在服务完成并确认交付后才会出现可评价订单。</p>') :
        '<div class="v4-card"><div class="v4-head"><h3>' + E(p.name) + '</h3><button type="button" onclick="go(\'#/provider\')">查看资料 ›</button></div>' +
        '<div class="v4-scoreline"><b>' + (p.rating && p.rating.count ? p.rating.score : "—") + '</b><em>' + (p.rating && p.rating.count ? p.rating.count + " 条真实评价" : "暂无真实评价 · 新入驻") + '</em></div>' +
        list.map(function (rv) {
          return '<div class="v4-rate"><span class="av">匿</span><span class="grow"><b>' + E(rv.name) + '</b><span class="stars">' + starsHtml(rv.stars) + '</span><p>' + E(rv.text) + '</p><small>' + E(rv.meta) + '</small></span></div>';
        }).join("") +
        '<p class="v4-note">评分与评价摘要可在此查看；点赞与回复计划在正式版后续开放。</p></div>' +
        '<div class="v4-card flat"><div class="v4-head"><h3>我的评价</h3></div><div class="v4-row"><span class="grow"><b>写一条评价</b><small>交付完成后可评价本次服务</small></span><button class="arrow" type="button" onclick="v4ReviewTab(\'mine\')">›</button></div></div>') +
      '</div>';
  };
  window.v4ReviewTab = function (t) { S.v4ReviewTab = t; render(); };
  window.v4Stars = function (n) { S.v4Stars = n; render(); };
  window.v4Tag = function (t) { var i = S.v4ReviewTags.indexOf(t); if (i >= 0) S.v4ReviewTags.splice(i, 1); else S.v4ReviewTags.push(t); render(); };
  window.v4SubmitReview = function () {
    var p = M.providers.find(function (x) { return x.id === S.v4ReviewProvider; }) || M.providers[0];
    var txt = (($("v4-review-text") || {}).value || "").trim().slice(0, 300);
    V4S.myReviews.unshift({ name: p.name, stars: S.v4Stars, text: txt, tags: S.v4ReviewTags.slice(), at: new Date().toLocaleDateString("zh-CN") });
    save(); render(); toast("评价已记录（仅本机）");
    next("评价已记录", "回到我的", "me");
  };

  /* ---------------- 10. 院校资讯（真实筛选 + 紧迫度排序 + 关键节点） ---------------- */
  pageSchoolNotices = function () {
    var cats = ["全部", "机械", "能源", "材料"];
    var cat = S.v4NoticeCat || "全部";
    var list = M.notices.filter(function (n) { return cat === "全部" || NOTICE_CAT[n.id] === cat; });
    list.sort(function (a, b) {
      var rank = function (n) { return n.status === "已结束" ? 2 : n.status === "报名中" ? 0 : 1; };
      var d = rank(a) - rank(b); if (d) return d;
      var da = a.days == null ? 999 : a.days, db = b.days == null ? 999 : b.days;
      return da - db;
    });
    var nodes = NODES.map(function (n) {
      return '<div class="v4-node ' + n.s + '"><i></i><div><b>' + E(n.m) + ' · ' + E(n.t) + '</b><small>' + E(n.d) + '</small></div></div>';
    }).join("");
    return '<div class="page tl-v2-page v4-page">' +
      '<div class="v4-kicker">ADMISSION INTELLIGENCE</div><h1 class="v4-h1">院校资讯</h1>' +
      '<p class="v4-sub">通知按截止紧迫度排序；时间按官方原文精度呈现，只写日期就显示日期，只写月份就显示「时间待公布」。</p>' +
      fold("保研关键节点时间线", nodes + '<p>月份级信息来自公开流程常识，具体日期以各院校当年公告为准。当前阶段：<b>待录取确认与补录</b>。</p>', true) +
      '<div class="tl-chips">' + cats.map(function (k) { return '<button type="button" class="' + (cat === k ? "on" : "") + '" onclick="v4NoticeCat(\'' + k + '\')">' + k + '</button>'; }).join("") + '</div>' +
      '<div class="tl-small-cap">' + list.length + ' 条通知 · 按截止紧迫度排序</div>' +
      (list.length ? list.map(function (n) {
        return '<div class="v4-school" style="cursor:pointer" onclick="S.currentNoticeId=\'' + n.id + '\';go(\'#/noticeDetail\')">' +
          '<div class="v4-school-top"><div><b>' + E(n.title) + '</b><small>' + E(n.month) + (n.day !== "—" ? " " + E(n.day) + " 日" : "") + ' · ' + E(n.precision) + '</small></div>' +
          '<span class="badge ' + n.tone + '">' + E(n.status) + '</span></div>' +
          '<div class="v4-kv"><span>' + (n.days != null ? "剩余" : "时间") + '</span><span>' + (n.days != null ? n.days + " 天（按官方日期计算）" : E(n.note || "时间待公布")) + '</span></div>' +
          '<div class="v4-kv"><span>摘要</span><span>' + E(n.detail) + '</span></div>' +
          '<div class="tl-mentor-bottom"><span>' + E(n.source) + '</span><button class="v4-rankbtn" type="button" onclick="event.stopPropagation();S.currentNoticeId=\'' + n.id + '\';go(\'#/noticeDetail\')">查看详情 ›</button></div></div>';
      }).join("") : '<div class="tl-v4-empty"><b>这个分类还没有通知</b><p>切回「全部」可以看到全部通知。</p></div>') +
      '<p class="v4-note">整理自公开渠道 · 请核对官方院校通知与日期。平台不对截止时刻做推测。</p></div>';
  };
  window.v4NoticeCat = function (k) { S.v4NoticeCat = k; render(); };

  /* ---------------- 11. 我的：补充入口 ---------------- */
  PAGES.me = function () {
    if (T.role !== "student") return v3Me();
    var html = v3Me();
    var marker = '<div class="tl-v2-footnote">';
    var i = html.lastIndexOf(marker);
    if (i < 0) return html;
    var extra = '<section class="tl-v3-card"><h3>资料与档案</h3>' +
      '<button class="tl-v2-link-row" onclick="go(\'#/profile\')">补充资料与申请目标 <span>' + ([V4S.research.length ? "科研 " + V4S.research.length : "", V4S.contests.length ? "竞赛 " + V4S.contests.length : "", V4S.files.length ? "材料 " + V4S.files.length : ""].filter(Boolean).join(" / ") || "未填写") + ' ›</span></button>' +
      '<button class="tl-v2-link-row" onclick="go(\'#/diagnosis\')">定位建议 <span>分层院校清单 ›</span></button>' +
      (V4S.ranks.length ? '<button class="tl-v2-link-row" onclick="go(\'#/providers\')">我的意向顺序 <span>' + V4S.ranks.length + ' 位 ›</span></button>' : '') +
      '</section>' +
      '<section class="tl-v3-card"><h3>评价与反馈</h3>' +
      '<button class="tl-v2-link-row" onclick="S.v4ReviewTab=\'mine\';go(\'#/reviews\')">我的评价 <span>' + (V4S.myReviews.length ? V4S.myReviews.length + " 条" : "去评价") + ' ›</span></button>' +
      '<button class="tl-v2-link-row" onclick="go(\'#/feedback\')">意见与问题反馈 <span>故障 / 建议 / 售后 ›</span></button>' +
      '<button class="tl-v2-link-row" onclick="go(\'#/about\')">关于同路 <span>能提供什么 · 边界 ›</span></button>' +
      '<button class="tl-v2-link-row" onclick="go(\'#/privacy\')">隐私政策 <span>本地存储与授权范围 ›</span></button>' +
      '</section>';
    return html.slice(0, i) + extra + html.slice(i);
  };

  /* ---------------- 12. 关于 / 隐私 / 反馈 ---------------- */
  PAGES.about = function () {
    return '<div class="page tl-v2-page v4-page">' +
      '<div class="v4-kicker">ABOUT TONGLU</div><h1 class="v4-h1">同路能为你提供什么</h1>' +
      '<p class="v4-sub">把保研里最耗时间的三件事做得更清楚：定位、材料、找人。</p>' +
      '<div class="v4-card"><div class="v4-head"><h3>四件具体的事</h3></div>' +
      [["定位参考", "按你的 BG、排名、英语与目标，给出三个层级的院校清单，并写清依据、差距与待核实事项。"],
      ["材料诊断", "把个人陈述与简历拆到段落级别，告诉你先改哪一段、为什么。"],
      ["服务者信息", "展示服务者的身份类型、教育背景、申请经历、擅长问题与可承接名额，信息带核验范围说明。"],
      ["进度记录", "投递记录本、个人截止日、行动时间线集中在「我的」，不用在几个表格之间来回找。"]].map(function (x) {
        return '<div class="v4-row"><span class="grow"><b>' + E(x[0]) + '</b><small style="color:#7c6d8b;font-size:10.5px;line-height:1.75">' + E(x[1]) + '</small></span></div>';
      }).join("") + '</div>' +
      '<div class="v4-card"><div class="v4-head"><h3>我们怎么保证信息可信</h3></div>' +
      [["名额实时校验", "列表只显示有余量的服务者；付款前会再校验一次，满额时不会生成可付款订单。"],
      ["核验依据可查", "服务者的学历、申请经历可展开查看核验范围与遮挡方式。"],
      ["时间按原文精度", "官方只给日期就显示日期，只给月份就显示「时间待公布」，不推测具体时刻。"],
      ["方案变更留痕", "方案版本调整后，此前的确认自动失效，需要重新确认。"]].map(function (x) {
        return '<div class="v4-row"><span class="grow"><b>' + E(x[0]) + '</b><small style="color:#7c6d8b;font-size:10.5px;line-height:1.75">' + E(x[1]) + '</small></span></div>';
      }).join("") + '</div>' +
      '<div class="v4-card flat"><div class="v4-head"><h3>我们能帮到哪里</h3></div>' +
      '<p class="v4-sub" style="margin:0 0 10px">定位、材料、对接这三件事，同路帮你做清楚：该核实的事项一并列出，能承接的服务者按余量排好。报考决定和最终录取由你与院校共同完成，平台负责把信息整理到位。</p>' +
      '<button class="tl-v2-link-row" onclick="go(\'#/privacy\')">查看隐私政策 <span>数据怎么存、谁能看 ›</span></button>' +
      '<button class="tl-v2-link-row" onclick="go(\'#/feedback\')">发现问题或有建议 <span>告诉我们 ›</span></button></div>' +
      '<p class="v4-note">账号、支付、审核都在本机模拟，不产生真实订单与真实扣款。</p></div>';
  };
  PAGES.privacy = function () {
    return '<div class="page tl-v2-page v4-page">' +
      '<div class="v4-kicker">PRIVACY</div><h1 class="v4-h1">隐私政策摘要</h1>' +
      '<p class="v4-sub">当前没有服务器，所有内容都保存在你自己的浏览器里。下面是正式版会遵守的规则。</p>' +
      '<div class="v4-card">' +
      fold("我们收集哪些信息", "<p><b>你主动填写：</b>BG 描述、年级、目标、申请目标、科研与竞赛经历。</p><p><b>你主动上传：</b>简历、个人陈述、成绩单等材料（PDF/Word 现在只读取文件名与大小；TXT/MD 可在本地读取正文并参与字段提取）。</p><p><b>使用过程：</b>浏览、收藏、投递记录、意向顺序。</p>", true) +
      fold("存放在哪里、保存多久", "<p>现在保存在浏览器 localStorage，你可以随时清理浏览器数据删除；不上传到任何服务器。</p><p>正式版计划：账号数据加密存储，材料原文单独加密，具体删除周期和备份处理规则应在上线前明确并公示。</p>") +
      fold("谁会看到你的材料", "<p>只有你在售前沟通里明确授权的服务者能看到该次需求相关材料，授权可随时撤回。</p><p>平台审核人员仅查看与核验相关的必要字段，不查看完整材料正文。</p>") +
      fold("不会用于什么", "<p>不用于训练模型；不向第三方出售或共享；不基于材料内容推断你未填写的结论；不在未经授权时向服务者展示你的联系方式。</p>") +
      fold("你的权利", "<p>可以查看、更正、导出与删除你的资料；可以撤回材料授权；可以注销账号。</p><p>现在清空浏览器数据即可删除全部本地记录。</p>") +
      '</div>' +
      '<div class="v4-card flat"><p class="v4-note" style="margin:0">隐私政策需由法务确认后发布，运营主体信息（D07）待确定。当前文本为信息结构草案。</p></div></div>';
  };
  PAGES.feedback = function () {
    var types = ["功能故障", "体验建议", "订单售后"];
    var pages = [["home", "首页"], ["diagnosis", "定位建议"], ["providers", "服务者列表"], ["provider", "服务者详情"], ["profile", "补充资料"], ["school", "院校资讯"], ["reviews", "服务评价"], ["me", "我的"]];
    return '<div class="page tl-v2-page v4-page">' +
      '<div class="v4-kicker">FEEDBACK</div><h1 class="v4-h1">意见与问题反馈</h1>' +
      '<p class="v4-sub">描述越具体越好：在哪个页面、点了什么、期望是什么。</p>' +
      '<div class="v4-card">' +
      '<div class="v4-field"><span>问题类型</span><div class="v4-choice">' + types.map(function (t) { return '<button type="button" class="' + (S.v4FeedbackType === t ? "on" : "") + '" onclick="v4FbType(\'' + t + '\')">' + t + '</button>'; }).join("") + '</div></div>' +
      '<label class="v4-field"><span>页面</span><select class="v4-select" id="v4fb-page">' + pages.map(function (p) { return '<option value="' + p[0] + '">' + p[1] + '</option>'; }).join("") + '</select></label>' +
      '<label class="v4-field"><span>操作步骤</span><textarea class="v4-textarea" id="v4fb-steps" maxlength="300" placeholder="如：进入服务者列表 → 点筛选「科研辅导老师」→ 列表变空"></textarea></label>' +
      '<label class="v4-field"><span>问题描述 <i>必填</i></span><textarea class="v4-textarea" id="v4fb-desc" maxlength="500" placeholder="期望看到什么？实际发生了什么？"></textarea></label>' +
      '<div class="v4-field"><span>截图 <i>选填</i></span><div class="v4-shotrow"><span>▤</span><span>▤</span><span>＋</span></div><p class="v4-note">当前还不支持截图上传，接入后支持最多 3 张。</p></div>' +
      '<label class="v4-field"><span>联系方式 <i>选填</i></span><input class="v4-input" id="v4fb-contact" placeholder="便于我们回访（不会对外公开）" /></label>' +
      '<div class="v4-actions"><button class="v4-btn" type="button" onclick="v4SubmitFeedback()">提交反馈</button></div>' +
      '<p class="v4-note">反馈只记录在本次会话中，不会对外发送。订单售后类问题请同时提供服务订单编号。</p></div></div>';
  };
  window.v4FbType = function (t) { S.v4FeedbackType = t; render(); };
  window.v4SubmitFeedback = function () {
    var d = (($("v4fb-desc") || {}).value || "").trim();
    if (!d) { toast("请先填写问题描述"); return; }
    S.v4FeedbackSent = true;
    toast("反馈已记录（仅本机）");
    setTimeout(function () { go("#/me"); }, 300);
  };

  /* ---------------- 13. 动作栏 / 返回 / 导航注册 ---------------- */
  var v3Actionbar = actionbar;
  actionbar = function (name) {
    if (name === "profile") return '<button class="btn line" onclick="go(\'#/me\')">稍后补充</button><button class="btn primary wide" onclick="v4SaveProfile()">保存并查看建议 ›</button>';
    if (name === "reviews") return '<button class="btn line" onclick="go(\'#/me\')">回到我的</button><button class="btn primary wide" onclick="go(\'#/providers\')">去看看服务者 ›</button>';
    if (name === "delivery") return '<button class="btn line" onclick="go(\'#/me\')">回到我的</button><button class="btn primary wide" onclick="S.v4ReviewTab=\'mine\';go(\'#/reviews\')">评价本次服务 ›</button>';
    if (name === "about" || name === "privacy" || name === "feedback") return '';
    return v3Actionbar(name);
  };
  var v3Back = back;
  back = function () {
    var key = (location.hash.replace(/^#\/?/, "") || "").split("/")[0];
    var map = { reviews: "me", about: "me", feedback: "me", privacy: "about", profile: "me" };
    if (map[key]) { go("#/" + map[key]); return; }
    v3Back();
  };
  NAV.reviews = { title: "服务评价" };
  NAV.about = { title: "关于同路" };
  NAV.privacy = { title: "隐私政策" };
  NAV.feedback = { title: "意见与反馈" };
  NAV.profile = { title: "补充资料" };
  [["A1", "reviews", "服务评价与我的评价"], ["A2", "about", "关于同路 · 能提供什么"], ["A3", "privacy", "隐私政策摘要"], ["A4", "feedback", "意见与问题反馈"]].forEach(function (s) {
    if (!SCREENS.some(function (x) { return x.key === s[1]; })) SCREENS.push({ no: s[0], key: s[1], title: s[2], prd: "V4" });
  });

  /* 供智能建档层读取规范表单数据；所有改动仍须用户确认。 */
  window.__TLV4 = { state: V4S, persist: save };

  /* ---------------- 14. 渲染后修正：底部标签高亮 ---------------- */
  var v3Render = render;
  window.removeEventListener("hashchange", v3Render);
  render = function () {
    v3Render();
    var key = (location.hash.replace(/^#\/?/, "") || "").split("/")[0];
    if (["reviews", "about", "privacy", "feedback", "profile"].indexOf(key) >= 0) {
      var tabs = [].slice.call(document.querySelectorAll("#tabbar .tab"));
      tabs.forEach(function (b) { b.classList.remove("active"); });
      var me = tabs.filter(function (b) { return b.textContent.indexOf("我的") >= 0; })[0];
      if (me) me.classList.add("active");
    }
  };
  window.addEventListener("hashchange", function () { render(); });
})();
