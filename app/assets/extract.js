/* 同路 · 本地文件文字提取
 * 目标：用户上传简历后，先在浏览器本地把正文读出来，再交给规则提取字段。
 * 解析在本机完成，运行组件从本站按需加载；简历内容不上传服务器。
 * 支持：TXT / MD / DOCX（zip + 表格/段落/文本框 XML 结构化解析）/ PDF（PDF.js + 容错主线程降级 + 扫描页本地 OCR）。
 */
(function (root) {
  'use strict';

  /* 兼容 Safari < 17.4 / Chrome < 119 / 旧版移动端 WebView：PDF.js 6.x 依赖 Promise.withResolvers */
  if (typeof Promise !== 'undefined' && typeof Promise.withResolvers !== 'function') {
    Promise.withResolvers = function () {
      let resolve, reject;
      const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
      return { promise, resolve, reject };
    };
  }

  const utf8 = new TextDecoder('utf-8');

  async function pipe(u8, format) {
    const ds = new DecompressionStream(format);
    const stream = new Blob([u8]).stream().pipeThrough(ds);
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  async function inflateRaw(u8) { return pipe(u8, 'deflate-raw'); }

  /* ---------- 文本清洗与质量评估 ---------- */
  /* 只合并 OCR 或排版拉宽造成的“单字间隔”（如「教 育 背 景」「姓 名」「大 三」），
     不合并多字词之间的空格（如「华中科技大学 计算机科学与技术 本科」「姓名 张明」）。 */
  function collapseSpacedCJK(text) {
    return String(text || '').replace(
      /(?<![㐀-鿿])[㐀-鿿](?: [㐀-鿿]){1,9}(?![㐀-鿿])/g,
      m => m.replace(/ /g, '')
    );
  }

  function cleanText(text) {
    const raw = String(text || '')
      .replace(/﻿/g, '')
      .normalize('NFKC')
      .replace(/\u0000/g, '')
      .replace(/[​-‍­]/g, '')
      .replace(/[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g, ' ')
      .replace(/[-]/g, ' ')
      .replace(/\r\n?/g, '\n')
      .replace(/\t+/g, '  ')
      .replace(/ {3,}/g, '  ')
      .replace(/ *\n */g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    return collapseSpacedCJK(raw);
  }

  function quality(text) {
    const t = String(text || '').replace(/\s/g, '');
    if (t.length < 12) return 0;
    const replacementCount = (t.match(/�/g) || []).length;
    if (replacementCount / t.length > 0.12) return 0.2;
    const valid = (t.match(/[一-鿿㐀-䶿A-Za-z0-9，。、：；（）《》【】“”‘’？！·\-–—,:;./()%+@_|[\]"'~&#=!?★☆•▪●◦◆◇]/g) || []).length;
    return Math.max(0, (valid - replacementCount * 2) / t.length);
  }

  /* ---------- ZIP（DOCX 本质） ---------- */
  async function unzip(buf) {
    const u8 = new Uint8Array(buf), dv = new DataView(buf);
    let eocd = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 66000); i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('这个文件不是有效的 Word(.docx) 或已损坏');
    const count = dv.getUint16(eocd + 10, true);
    let off = dv.getUint32(eocd + 16, true);
    const index = {};
    const lowerMap = {};
    for (let i = 0; i < count; i++) {
      if (off + 46 > u8.length || dv.getUint32(off, true) !== 0x02014b50) break;
      const method = dv.getUint16(off + 10, true);
      const csize = dv.getUint32(off + 20, true);
      const nameLen = dv.getUint16(off + 28, true);
      const extraLen = dv.getUint16(off + 30, true);
      const commentLen = dv.getUint16(off + 32, true);
      const lho = dv.getUint32(off + 42, true);
      const rawName = utf8.decode(u8.subarray(off + 46, off + 46 + nameLen))
        .replace(/\\/g, '/').replace(/^\.\//, '');
      index[rawName] = { method, csize, lho };
      lowerMap[rawName.toLowerCase()] = rawName;
      off += 46 + nameLen + extraLen + commentLen;
    }
    async function read(name) {
      const key = index[name] ? name : lowerMap[String(name).toLowerCase()];
      const f = key ? index[key] : null;
      if (!f) return null;
      const nl = dv.getUint16(f.lho + 26, true);
      const el = dv.getUint16(f.lho + 28, true);
      const start = f.lho + 30 + nl + el;
      const data = u8.subarray(start, start + f.csize);
      if (f.method === 0) return data;
      if (f.method === 8) return inflateRaw(data);
      return null;
    }
    return { names: Object.keys(index), read };
  }

  function decodeEntities(s) {
    return String(s || '')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'").replace(/&#(\d+);/g, (m, d) => String.fromCharCode(+d))
      .replace(/&#x([0-9a-f]+);/gi, (m, d) => String.fromCharCode(parseInt(d, 16)))
      .replace(/&amp;/g, '&');
  }

  /* 常见简历表格字段名与板块标题：用于将 Word 表格单元格准确还原为「字段：值」或「标题 + 正文」 */
  const TABLE_SECTION_RX = /^(?:教育背景|教育经历|学习经历|教育信息|学业背景|学术背景|学历背景|本科背景|科研经历|研究经历|科研项目|研究项目|科研与项目经历|科研\/项目经历|项目经历|项目经验|学术成果|科研成果|论文发表|论文与成果|科研情况|获奖经历|获奖情况|荣誉奖项|荣誉奖励|竞赛经历|竞赛获奖|竞赛与获奖|荣誉与奖项|获奖与荣誉|学科竞赛|所获奖励|奖励荣誉|奖励情况|所获荣誉|奖项荣誉|基本信息|个人信息|个人简介|个人优势|自我评价|自我介绍|专业技能|技能证书|技能与证书|外语水平|英语水平|语言能力|实习经历|实践经历|实习与工作经历|社会实践|工作经历|校园经历|校园与实践经历|学生工作|主修课程|核心课程|申请意向|求学意向|申请目标|目标与诉求|联系方式|Education|Research Experience|Research|Projects|Awards|Honors|Skills|Work Experience)$/i;
  const TABLE_LABEL_RX = /^(?:姓名|称呼|性别|年龄|出生年月|出生日期|政治面貌|民族|籍贯|生源地|户籍|电话|手机|手机号|联系电话|邮箱|电子邮箱|微信|QQ|本科院校|本科学校|毕业院校|就读院校|毕业学校|就读学校|学校|院校|所在院校|所在学校|学院|所在学院|院系|本科专业|所学专业|主修专业|专业|专业方向|当前年级|年级|学历|学位|学位类型|学制|入学年份|毕业时间|就读时间|专业排名|年级排名|综合排名|成绩排名|排名|绩点|GPA|加权成绩|平均成绩|加权平均分|均分|外语水平|英语水平|英语成绩|四六级|目标院校|意向院校|学校偏好|申请院校|目标专业|申请专业|意向专业|研究方向|意向方向|目标与诉求|申请意向|申请目标|求学意向|升学去向|跨专业意向|个人特长|特长|擅长方向|辅导方向|服务方向|Name|Major|School|University|GPA|Rank|Email|Phone)$/i;

  function normCellLabel(s) {
    return collapseSpacedCJK(String(s || '').replace(/[:：\s]/g, ''));
  }

  function formatTableRow(cells) {
    const cleaned = cells.map(c => cleanText(c)).filter(Boolean);
    if (!cleaned.length) return [];
    if (cleaned.length === 1) return [cleaned[0]];

    // 情况 1：2 列「板块名 | 多行正文」表格（常见于中文表格式保研简历）
    if (cleaned.length === 2) {
      const k0 = normCellLabel(cleaned[0]);
      if (TABLE_SECTION_RX.test(k0)) {
        return [k0, cleaned[1]];
      }
      if (TABLE_LABEL_RX.test(k0) && !cleaned[0].includes('\n')) {
        return [k0 + '：' + cleaned[1].replace(/\n+/g, '；')];
      }
    }

    // 情况 2：偶数格「字段 | 值 | 字段 | 值」（如 姓名 | 张三 | 本科院校 | 华中科技大学）
    if (cleaned.length >= 2 && cleaned.length % 2 === 0) {
      let labelPairs = 0;
      const pairs = [];
      for (let i = 0; i < cleaned.length; i += 2) {
        const k = normCellLabel(cleaned[i]);
        const v = cleaned[i + 1];
        if (TABLE_LABEL_RX.test(k) && !cleaned[i].includes('\n') && !TABLE_LABEL_RX.test(normCellLabel(v))) {
          labelPairs++;
          pairs.push(k + '：' + v.replace(/\n+/g, '；'));
        } else {
          pairs.push(cleaned[i] + ' | ' + v);
        }
      }
      if (labelPairs >= cleaned.length / 2) {
        return [pairs.join(' | ')];
      }
    }

    // 情况 3：通用多列表格（如 2023.09-2027.06 | 华中科技大学 | 计算机科学与技术 | 本科）
    return [cleaned.map(c => c.replace(/\n+/g, '；')).join(' | ')];
  }

  function extractParaFromXmlFragment(frag) {
    const chunks = [];
    frag.replace(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\b[^>]*\/?>|<w:br\b[^>]*\/?>|<w:cr\b[^>]*\/?>/g, (m, t) => {
      if (t != null) chunks.push(decodeEntities(t));
      else if (/w:tab/.test(m)) chunks.push('  ');
      else chunks.push('\n');
      return '';
    });
    return cleanText(chunks.join(''));
  }

  function docxXmlToText(xml) {
    // 1. 移除 mc:Fallback（防止 Word/WPS 文本框内容重复读取）、已删除修订 w:del、域代码 w:instrText
    const stripped = String(xml || '')
      .replace(/^﻿/, '')
      .replace(/<mc:Fallback\b[\s\S]*?<\/mc:Fallback>/g, '')
      .replace(/<w:del\b[\s\S]*?<\/w:del>/g, '')
      .replace(/<w:instrText\b[\s\S]*?<\/w:instrText>/g, '');

    // 2. 优先使用浏览器 DOMParser 精确遍历文档树（保留表格行/单元格、段落与文本框顺序）
    if (typeof DOMParser !== 'undefined') {
      try {
        const doc = new DOMParser().parseFromString(stripped, 'application/xml');
        if (!doc.getElementsByTagName('parsererror').length) {
          const out = [];
          const seenTxbx = new Set();

          function paraText(pEl) {
            const chunks = [];
            const extraLines = [];
            function walkInline(node) {
              if (!node || node.nodeType !== 1) return;
              const name = node.localName || node.nodeName.replace(/^[^:]+:/, '');
              if (name === 'Fallback' || name === 'del' || name === 'instrText' || name === 'pPr' || name === 'rPr') return;
              if (name === 'txbxContent') {
                if (seenTxbx.has(node)) return;
                seenTxbx.add(node);
                walkBlock(node, extraLines);
                return;
              }
              if (name === 't') { chunks.push(node.textContent || ''); return; }
              if (name === 'tab') { chunks.push('  '); return; }
              if (name === 'br' || name === 'cr') { chunks.push('\n'); return; }
              for (let c = node.firstChild; c; c = c.nextSibling) walkInline(c);
            }
            for (let c = pEl.firstChild; c; c = c.nextSibling) walkInline(c);
            const main = cleanText(chunks.join(''));
            return { main, extraLines };
          }

          function cellText(tcEl) {
            const parts = [];
            walkBlock(tcEl, parts);
            return parts.join('\n').trim();
          }

          function walkTable(tblEl, target) {
            for (let c = tblEl.firstChild; c; c = c.nextSibling) {
              if (c.nodeType !== 1) continue;
              const name = c.localName || c.nodeName.replace(/^[^:]+:/, '');
              if (name !== 'tr') continue;
              const cells = [];
              for (let tc = c.firstChild; tc; tc = tc.nextSibling) {
                if (tc.nodeType !== 1) continue;
                const tcName = tc.localName || tc.nodeName.replace(/^[^:]+:/, '');
                if (tcName !== 'tc') continue;
                const txt = cellText(tc);
                cells.push(txt);
              }
              const formatted = formatTableRow(cells);
              for (const line of formatted) if (line) target.push(line);
            }
          }

          function walkBlock(container, target) {
            for (let c = container.firstChild; c; c = c.nextSibling) {
              if (c.nodeType !== 1) continue;
              const name = c.localName || c.nodeName.replace(/^[^:]+:/, '');
              if (name === 'Fallback' || name === 'del' || name === 'sectPr' || name === 'tblPr' || name === 'tblGrid' || name === 'tcPr') continue;
              if (name === 'tbl') {
                walkTable(c, target);
              } else if (name === 'p') {
                const { main, extraLines } = paraText(c);
                if (main) target.push(main);
                for (const l of extraLines) if (l) target.push(l);
              } else if (name === 'sdt' || name === 'sdtContent' || name === 'body' || name === 'txbxContent' || name === 'Choice' || name === 'AlternateContent' || name === 'customXml') {
                walkBlock(c, target);
              }
            }
          }

          const body = doc.getElementsByTagNameNS('*', 'body')[0] || doc.documentElement;
          walkBlock(body, out);
          if (out.length) return out.join('\n');
        }
      } catch (_) {}
    }

    // 3. 纯文本/Node 回退：结构化解析顶层 <w:tbl>（保留行列）与 <w:p>
    const out = [];
    const tokens = stripped.split(/(<w:tbl\b[\s\S]*?<\/w:tbl>)/g);
    for (const seg of tokens) {
      if (!seg) continue;
      if (/^<w:tbl\b/.test(seg)) {
        const rows = seg.match(/<w:tr\b[\s\S]*?<\/w:tr>/g) || [];
        for (const row of rows) {
          const tcs = row.match(/<w:tc\b[\s\S]*?<\/w:tc>/g) || [];
          const cells = tcs.map(tc => {
            const ps = tc.split(/<w:p(?:\s[^>]*)?>/).slice(1);
            return ps.map(extractParaFromXmlFragment).filter(Boolean).join('\n');
          });
          for (const line of formatTableRow(cells)) if (line) out.push(line);
        }
      } else {
        const ps = seg.split(/<w:p(?:\s[^>]*)?>/).slice(1);
        for (const p of ps) {
          const line = extractParaFromXmlFragment(p);
          if (line) out.push(line);
        }
      }
    }
    return out.join('\n');
  }

  async function docxText(buf) {
    const z = await unzip(buf);
    const mainBuf = await z.read('word/document.xml');
    const extraNames = z.names.filter(n => /^word\/(header\d*|footer\d*|footnotes|endnotes)\.xml$/i.test(n));
    const extraBufs = (await Promise.all(extraNames.map(n => z.read(n)))).filter(Boolean);
    if (!mainBuf && !extraBufs.length) throw new Error('这个 Word 文件里没有可读取的正文');
    const mainText = mainBuf ? docxXmlToText(utf8.decode(mainBuf)) : '';
    const seen = new Set(mainText.split('\n').map(s => s.trim()).filter(Boolean));
    const extraLines = [];
    for (const b of extraBufs) {
      const txt = docxXmlToText(utf8.decode(b));
      for (const line of txt.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || seen.has(trimmed)) continue;
        // 跳过纯页码页脚（如 "1 / 2"、"第 1 页"）
        if (/^(?:第\s*\d+\s*页(?:\s*共\s*\d+\s*页)?|\d+\s*[/／-]\s*\d+|\d+)$/.test(trimmed)) continue;
        seen.add(trimmed);
        extraLines.push(trimmed);
      }
    }
    const merged = [mainText, ...extraLines].filter(Boolean).join('\n');
    return cleanText(merged);
  }

  /* ---------- PDF.js + 容错主线程降级 + 扫描件本地 OCR ---------- */
  const currentSrc = (typeof document !== 'undefined' && document.currentScript && document.currentScript.src) ? document.currentScript.src : '';
  const assetBase = currentSrc ? new URL('.', currentSrc) : null;
  const asset = path => assetBase ? new URL(path, assetBase).href : path;
  let pdfEngine;
  let fakeWorkerLoaded = false;

  function loadPDF() {
    if (!pdfEngine) pdfEngine = import(asset('vendor/pdfjs/pdf.min.mjs')).then(lib => {
      if (lib && lib.GlobalWorkerOptions) {
        lib.GlobalWorkerOptions.workerSrc = asset('vendor/pdfjs/pdf.worker.min.mjs');
      }
      return lib;
    }).catch(() => {
      pdfEngine = null;
      throw new Error('暂时无法读取 PDF，请检查网络后重试或手动填写资料');
    });
    return pdfEngine;
  }

  async function ensureFakeWorker(lib) {
    if (!fakeWorkerLoaded) {
      try {
        const mod = await import(asset('vendor/pdfjs/pdf.worker.min.mjs'));
        if (mod && mod.WorkerMessageHandler) {
          globalThis.pdfjsWorker = mod;
          fakeWorkerLoaded = true;
        }
      } catch (_) {}
    }
    if (lib && lib.GlobalWorkerOptions) {
      lib.GlobalWorkerOptions.workerSrc = '';
    }
  }

  let ocrScript;
  function loadOCR() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    if (!ocrScript) ocrScript = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = asset('vendor/ocr/tesseract.min.js');
      script.onload = () => resolve(window.Tesseract);
      script.onerror = () => { script.remove(); ocrScript = null; reject(new Error('图片识别组件加载失败')); };
      document.head.appendChild(script);
    });
    return ocrScript;
  }

  function withTimeout(promise, ms, label) {
    let timer;
    return Promise.race([
      promise.finally(() => clearTimeout(timer)),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label || '识别超时')), ms); })
    ]);
  }

  function textRows(items) {
    const rows = [];
    const valid = items.filter(x => x && typeof x.str === 'string' && x.str.trim());
    valid.sort((a, b) => (b.transform[5] - a.transform[5]) || (a.transform[4] - b.transform[4]));
    for (const it of valid) {
      const y = it.transform[5];
      const h = Math.max(1, Math.abs(it.height || it.transform[3] || it.transform[0] || 10));
      let row = rows.find(r => Math.abs(r.y - y) < Math.max(2.5, Math.min(r.h, h) * 0.45));
      if (!row) { row = { y, h, items: [] }; rows.push(row); }
      row.items.push(it);
    }
    return rows.sort((a, b) => b.y - a.y).map(row => ({
      ...row,
      items: row.items.sort((a, b) => a.transform[4] - b.transform[4])
    }));
  }

  function joinItems(items) {
    let line = '', end = 0;
    for (const it of items) {
      const x = it.transform[4];
      const h = Math.max(8, Math.abs(it.height || it.transform[3] || 10));
      const gap = x - end;
      if (line) {
        if (gap > Math.max(14, h * 1.6)) line += '  ';
        else if (gap > Math.max(1.2, h * 0.16)) line += ' ';
      }
      line += it.str;
      end = x + Math.max(0, it.width || 0);
    }
    return cleanText(line);
  }

  function layoutText(items, width) {
    const rows = textRows(items);
    if (!rows.length) return '';
    const gutters = [];
    for (const row of rows) {
      for (let i = 1; i < row.items.length; i++) {
        const left = row.items[i - 1], right = row.items[i];
        const end = left.transform[4] + (left.width || 0);
        if (right.transform[4] - end > width * 0.12 && end > width * 0.18 && right.transform[4] < width * 0.85) {
          gutters.push({ left: end, right: right.transform[4], y: row.y });
        }
      }
    }
    let split = 0, support = 0;
    for (let x = width * 0.28; x < width * 0.72; x += 8) {
      const n = gutters.filter(g => g.left < x && g.right > x).length;
      if (n > support) { support = n; split = x; }
    }
    if (support >= 4) {
      const crossing = items.filter(it => it && it.str && it.str.trim() && it.transform[4] < split && it.transform[4] + (it.width || 0) > split + 8);
      const firstColumnY = Math.max(...gutters.filter(g => g.left < split && g.right > split).map(g => g.y));
      if (crossing.filter(it => it.transform[5] < firstColumnY - 5).length <= 1) {
        const body = rows.filter(r => r.y <= firstColumnY + 3);
        const leftLines = body.map(r => joinItems(r.items.filter(it => it.transform[4] < split))).filter(Boolean);
        // 避免把「字段 | 值」两列表格误拆成上下两段
        const shortLabelCount = leftLines.filter(l => l.replace(/\s/g, '').length <= 6 && TABLE_LABEL_RX.test(normCellLabel(l))).length;
        const looksLikeKeyValueTable = leftLines.length > 0 && (shortLabelCount / leftLines.length >= 0.4);
        if (!looksLikeKeyValueTable) {
          const top = rows.filter(r => r.y > firstColumnY + 3).map(r => joinItems(r.items));
          const rightLines = body.map(r => joinItems(r.items.filter(it => it.transform[4] >= split))).filter(Boolean);
          return cleanText([...top, ...leftLines, ...rightLines].filter(Boolean).join('\n'));
        }
      }
    }
    return cleanText(rows.map(r => joinItems(r.items)).join('\n'));
  }

  async function openPdfDoc(lib, buf) {
    const docOpts = () => ({
      data: new Uint8Array(buf.slice(0)),
      cMapUrl: asset('vendor/pdfjs/cmaps/'),
      cMapPacked: true,
      standardFontDataUrl: asset('vendor/pdfjs/standard_fonts/'),
      wasmUrl: asset('vendor/pdfjs/wasm/'),
      isEvalSupported: false,
      enableXfa: false,
      verbosity: 0
    });
    let task = lib.getDocument(docOpts());
    try {
      const pdf = await task.promise;
      return { pdf, task };
    } catch (err) {
      if (err && (err.name === 'PasswordException' || err.name === 'InvalidPDFException')) {
        await task.destroy().catch(() => {});
        throw err;
      }
      // Web Worker 无法启动（部分移动端 WebView / file:// / 严格安全策略）时，降级到主线程假 Worker 重试
      await task.destroy().catch(() => {});
      await ensureFakeWorker(lib);
      task = lib.getDocument(docOpts());
      const pdf = await task.promise;
      return { pdf, task };
    }
  }

  async function pdfText(buf, options = {}) {
    const report = info => options.onProgress?.(info);
    report({ message: '正在准备读取 PDF…', progress: 0.05 });
    const lib = await loadPDF();
    let pdf, task, worker, ocrPages = 0, ocrPage = 0, ocrFailed = false;
    const pages = [], methods = [];
    try {
      const opened = await openPdfDoc(lib, buf);
      pdf = opened.pdf;
      task = opened.task;
      if (pdf.numPages > 20) throw new Error('简历超过 20 页，请保留简历正文后重新上传');
      const resumeHints = /大学|学院|教育|经历|项目|专业|姓名|科研|竞赛|奖|简历|绩点|GPA|排名|本科|硕|博|education|experience|university|college|research|skills|resume|curriculum/i;

      for (let n = 1; n <= pdf.numPages; n++) {
        report({ message: '正在读取 PDF 第 ' + n + ' / ' + pdf.numPages + ' 页', progress: (n - 1) / pdf.numPages });
        const page = await pdf.getPage(n);
        let text = '';
        try {
          const content = await page.getTextContent();
          text = layoutText(content.items, page.getViewport({ scale: 1 }).width);
        } catch (_) {}
        let method = 'text';
        const compactLen = text.replace(/\s/g, '').length;
        const textQuality = quality(text);
        const needOCR = compactLen < 30 || textQuality < 0.65 || (n === 1 && compactLen < 70 && !resumeHints.test(text));

        if (needOCR && !ocrFailed) {
          ocrPage = n;
          try {
            if (!worker) {
              report({ message: '检测到扫描/图片页，正在准备文字识别（首次稍慢）', progress: (n - 1) / pdf.numPages });
              const OCR = await withTimeout(loadOCR(), 20000, '图片识别组件加载超时');
              worker = await withTimeout(OCR.createWorker('chi_sim+eng', 1, {
                workerPath: asset('vendor/ocr/worker.min.js'),
                corePath: asset('vendor/ocr/core/'),
                langPath: asset('vendor/ocr/lang/'),
                workerBlobURL: false,
                logger: m => {
                  if (m.status === 'recognizing text') {
                    report({
                      message: '正在识别扫描页 ' + ocrPage + ' / ' + pdf.numPages + ' · ' + Math.round(m.progress * 100) + '%',
                      progress: (ocrPage - 1 + m.progress) / pdf.numPages
                    });
                  }
                }
              }), 45000, '识别准备时间较长，请检查网络后重试或手动填写资料');
              await worker.setParameters({ preserve_interword_spaces: '1', user_defined_dpi: '150' });
            }
            const original = page.getViewport({ scale: 1 });
            const scale = Math.min(2.5, 1800 / original.width, Math.sqrt(5000000 / (original.width * original.height)));
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement('canvas');
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            try {
              await page.render({ canvasContext: canvas.getContext('2d'), viewport, background: 'rgb(255,255,255)' }).promise;
              const result = await worker.recognize(canvas);
              const recognized = cleanText(result.data.text);
              const recLen = recognized.replace(/\s/g, '').length;
              const recQuality = quality(recognized);
              if (recLen >= 12 && recQuality >= 0.55 && (textQuality < 0.65 || compactLen < 30 || recLen > compactLen * 1.25)) {
                text = recognized;
                method = 'ocr';
                ocrPages++;
              }
            } finally {
              canvas.width = canvas.height = 0;
            }
          } catch (_) {
            // OCR 失败时保留已提取的文本层，不中断整个 PDF 读取
            ocrFailed = true;
          }
        }
        if (text.replace(/\s/g, '').length >= 8) {
          pages.push(text);
          methods.push(method);
        }
        page.cleanup();
      }

      const fullText = pages.join('\n\n').trim();
      if (fullText.replace(/\s/g, '').length < 12) {
        if (ocrFailed) throw new Error('这份 PDF 可能是纯图片扫描件，文字识别暂未加载成功，请检查网络后重试或直接填写个人情况');
        throw new Error('没有从这份 PDF 识别出足够文字，请上传更清晰的 PDF 或直接填写个人情况');
      }
      report({ message: 'PDF 识别完成', progress: 1 });
      return { text: fullText, pages: pdf.numPages, ocrPages, methods };
    } catch (err) {
      if (err && err.name === 'PasswordException') throw new Error('这份 PDF 有密码保护，请解锁后重新上传');
      if (err && err.name === 'InvalidPDFException') throw new Error('PDF 文件损坏或格式不完整，请重新导出后再试');
      throw err;
    } finally {
      if (worker) await worker.terminate().catch(() => {});
      if (task) await task.destroy().catch(() => {});
    }
  }

  function detectKind(file, buf) {
    const name = String(file.name || '').trim();
    const ext = (name.match(/\.([a-z0-9]+)$/i) || [])[1]?.toLowerCase() || '';
    const mime = String(file.type || '').toLowerCase();
    const head = new Uint8Array(buf, 0, Math.min(8, buf.byteLength));
    // %PDF-
    if (head.length >= 4 && head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46) return 'pdf';
    // PK\x03\x04 (ZIP -> DOCX)
    if (head.length >= 4 && head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04) {
      if (ext === 'docx' || mime.includes('wordprocessingml') || !ext) return 'docx';
    }
    // OLE2 old .doc (D0 CF 11 E0)
    if (head.length >= 4 && head[0] === 0xd0 && head[1] === 0xcf && head[2] === 0x11 && head[3] === 0xe0) return 'doc';
    if (ext === 'pdf' || mime === 'application/pdf') return 'pdf';
    if (ext === 'docx' || mime.includes('wordprocessingml')) return 'docx';
    if (ext === 'doc' || mime === 'application/msword') return 'doc';
    if (ext === 'txt' || ext === 'md' || mime === 'text/plain' || mime === 'text/markdown') return ext || 'txt';
    return ext;
  }

  async function fromFile(file, options = {}) {
    const size = file.size || 0;
    if (!size) throw new Error('这个文件是空的');
    if (size > 8 * 1024 * 1024) throw new Error('请使用不超过 8 MB 的文件');
    const buf = await file.arrayBuffer();
    const kind = detectKind(file, buf);

    if (kind === 'txt' || kind === 'md') {
      const text = cleanText(utf8.decode(buf));
      return { text: text.slice(0, 30000), kind: kind.toUpperCase(), note: '' };
    }
    if (kind === 'docx') {
      const text = await docxText(buf);
      if (!text || quality(text) < 0.4) throw new Error('Word 正文读出来内容过少，请确认文档非纯图片或尝试另存为 PDF');
      return { text: text.slice(0, 30000), kind: 'Word', note: '' };
    }
    if (kind === 'pdf') {
      const result = await pdfText(buf, options);
      if (quality(result.text) < 0.45) throw new Error('PDF 文字质量较低，请上传清晰版本或直接填写个人情况');
      if (result.text.length > 50000) throw new Error('简历文字超过 5 万字，请精简后上传');
      return { ...result, kind: result.ocrPages ? 'PDF · 图片文字识别' : 'PDF', note: result.ocrPages ? '扫描页识别结果请逐项核对' : '' };
    }
    if (kind === 'doc') throw new Error('旧版 .doc 不支持读取，请另存为 .docx 或 PDF');
    throw new Error('目前支持 PDF / Word(.docx) / TXT / MD');
  }

  const api = { fromFile, docxXmlToText, cleanText, quality, collapseSpacedCJK, version: 'v3-pdf-docx-accurate', supports: ['pdf', 'docx', 'txt', 'md'] };
  root.TongluExtract = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
