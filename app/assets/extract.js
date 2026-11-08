/* 同路 · 本地文件文字提取
 * 目标：用户上传简历后，先在浏览器本地把正文读出来，再交给规则提取字段。
 * 不联网、不上传服务器、不调用后端。
 * 支持：TXT / MD / DOCX（zip + word/document.xml）/ PDF（文本型，含 ToUnicode CMap）。
 * 不支持：扫描件 PDF（图片）、.doc 旧格式、加密 PDF。失败时明确告知用户改用粘贴。
 */
(function () {
  'use strict';

  const utf8 = new TextDecoder('utf-8');
  const decoder = new TextDecoder('latin1');
  const latin = (u8) => decoder.decode(u8);

  async function pipe(u8, format) {
    const ds = new DecompressionStream(format);
    const stream = new Blob([u8]).stream().pipeThrough(ds);
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  async function inflateRaw(u8) { return pipe(u8, 'deflate-raw'); }
  async function inflateZlib(u8) {
    try { return await pipe(u8, 'deflate'); }
    catch (e) { return inflateRaw(u8); }
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
    for (let i = 0; i < count; i++) {
      if (off + 46 > u8.length || dv.getUint32(off, true) !== 0x02014b50) break;
      const method = dv.getUint16(off + 10, true);
      const csize = dv.getUint32(off + 20, true);
      const nameLen = dv.getUint16(off + 28, true);
      const extraLen = dv.getUint16(off + 30, true);
      const commentLen = dv.getUint16(off + 32, true);
      const lho = dv.getUint32(off + 42, true);
      index[utf8.decode(u8.subarray(off + 46, off + 46 + nameLen))] = { method, csize, lho };
      off += 46 + nameLen + extraLen + commentLen;
    }
    async function read(name) {
      const f = index[name];
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
    return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'").replace(/&#(\d+);/g, (m, d) => String.fromCharCode(+d))
      .replace(/&#x([0-9a-f]+);/gi, (m, d) => String.fromCharCode(parseInt(d, 16)))
      .replace(/&amp;/g, '&');
  }

  async function docxText(buf) {
    const z = await unzip(buf);
    const parts = [z.read('word/document.xml')];
    // 有些简历把内容放在页眉/文本框里
    for (const n of z.names) {
      if (/^word\/(header\d*|footer\d*|footnotes|endnotes)\.xml$/.test(n)) parts.push(z.read(n));
    }
    const buffers = (await Promise.all(parts)).filter(Boolean);
    if (!buffers.length) throw new Error('这个 Word 文件里没有可读取的正文');
    const lines = [];
    for (const b of buffers) {
      const xml = utf8.decode(b);
      const paras = xml.split(/<w:p[ >]/).slice(1);
      for (const p of paras) {
        const chunks = [];
        p.replace(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\b[^>]*\/?>|<w:br\b[^>]*\/?>|<w:cr\b[^>]*\/?>/g, (m, t) => {
          if (t != null) chunks.push(decodeEntities(t));
          else if (/w:tab/.test(m)) chunks.push(' ');
          else chunks.push('\n');
          return '';
        });
        const line = chunks.join('').replace(/\n+/g, '\n').trim();
        if (line) lines.push(line);
      }
    }
    return lines.join('\n');
  }

  /* ---------- PDF ---------- */
  function parseCMap(txt) {
    const map = new Map();
    const toStr = arr => {
      let s = '';
      for (let i = 0; i < arr.length; i += 2) s += String.fromCharCode((arr[i] << 8) | (arr[i + 1] || 0));
      return s;
    };
    const hexArr = h => h.trim().split(/\s+/).map(x => parseInt(x, 16));
    const set = (k, v) => { const u = k.toUpperCase(); if (!map.has(u)) map.set(u, v); };
    txt.replace(/beginbfchar([\s\S]*?)endbfchar/g, (m, body) => {
      body.replace(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g, (mm, src, dst) => {
        set(src.padStart(src.length % 4 ? src.length : src.length, '0'), toStr(hexArr(dst)));
        return '';
      });
      return '';
    });
    txt.replace(/beginbfrange([\s\S]*?)endbfrange/g, (m, body) => {
      body.replace(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g, (mm, a, b, c) => {
        const lo = parseInt(a, 16), hi = parseInt(b, 16), w = a.length, base = hexArr(c);
        for (let k = lo; k <= hi && k - lo < 65536; k++) {
          const d = base.slice();
          d[d.length - 1] = d[d.length - 1] + (k - lo);
          set(k.toString(16).toUpperCase().padStart(w, '0'), toStr(d));
        }
        return '';
      });
      body.replace(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*\[([\s\S]*?)\]/g, (mm, a, b, c) => {
        const lo = parseInt(a, 16), w = a.length;
        const items = (c.match(/<([0-9A-Fa-f]+)>/g) || []).map(x => x.slice(1, -1));
        items.forEach((dst, i) => set((lo + i).toString(16).toUpperCase().padStart(w, '0'), toStr(hexArr(dst))));
        return '';
      });
      return '';
    });
    return map;
  }

  function tokenize(s) {
    const out = [], n = s.length;
    let i = 0;
    while (i < n) {
      const c = s[i];
      if (c === '%') { while (i < n && s[i] !== '\n') i++; continue; }
      if (c === '(') {
        let depth = 1, buf = ''; i++;
        while (i < n && depth > 0) {
          const ch = s[i];
          if (ch === '\\') {
            const nx = s[i + 1]; i += 2;
            const esc = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '(': '(', ')': ')', '\\': '\\' };
            if (esc[nx] != null) buf += esc[nx];
            else if (nx >= '0' && nx <= '7') {
              let oct = nx, k = 0;
              while (k < 2 && i < n && s[i] >= '0' && s[i] <= '7') { oct += s[i]; i++; k++; }
              buf += String.fromCharCode(parseInt(oct, 8));
            } else if (nx !== '\n') buf += nx;
            continue;
          }
          if (ch === '(') { depth++; buf += ch; i++; continue; }
          if (ch === ')') { depth--; i++; if (!depth) break; buf += ch; continue; }
          buf += ch; i++;
        }
        out.push({ t: 'str', v: buf });
        continue;
      }
      if (c === '<' && s[i + 1] !== '<') {
        const j = s.indexOf('>', i);
        if (j < 0) { i++; continue; }
        out.push({ t: 'hex', v: s.slice(i + 1, j).replace(/\s+/g, '') });
        i = j + 1; continue;
      }
      if (c === '<' && s[i + 1] === '<') { i += 2; continue; }
      if (c === '>' && s[i + 1] === '>') { i += 2; continue; }
      if (c === '[' || c === ']') { out.push({ t: c }); i++; continue; }
      if (c === '/' || /[A-Za-z'"*]/.test(c)) {
        let j = i;
        while (j < n && !/[\s()<>\[\]{}\/%]/.test(s[j])) j++;
        if (j === i) j++;
        out.push({ t: 'op', v: s.slice(i, j) });
        i = j; continue;
      }
      i++;
    }
    return out;
  }

  function hexToText(hex, cmap) {
    if (cmap && cmap.size) {
      let w = 4;
      const widths = new Set();
      cmap.forEach((v, k) => widths.add(k.length));
      if (widths.size) w = [...widths].sort((a, b) => b - a)[0];
      let out = '';
      for (let i = 0; i + w <= hex.length; i += w) out += (cmap.get(hex.slice(i, i + w).toUpperCase()) || '');
      return out;
    }
    let out = '';
    for (let i = 0; i + 4 <= hex.length; i += 4) {
      const cp = parseInt(hex.slice(i, i + 4), 16);
      out += cp ? String.fromCharCode(cp) : '';
    }
    return out;
  }
  function bytesToText(str, cmap) {
    // 括号字符串在 CID 字体里也是 2 字节编码
    if (cmap && cmap.size) {
      let hex = '';
      for (let i = 0; i < str.length; i++) hex += str.charCodeAt(i).toString(16).padStart(2, '0');
      return hexToText(hex, cmap);
    }
    return str;
  }

  function contentText(txt, cmap) {
    const tk = tokenize(txt);
    let out = '';
    let depth = 0, group = [];
    for (let i = 0; i < tk.length; i++) {
      const t = tk[i];
      if (t.t === '[') { depth++; group = []; continue; }
      if (t.t === ']') { depth = Math.max(0, depth - 1); continue; }
      if (t.t === 'str' || t.t === 'hex') {
        const next = tk[i + 1];
        const isShow = next && next.t === 'op' && /^(Tj|TJ|'|")$/.test(next.v);
        const val = t.t === 'str' ? bytesToText(t.v, cmap) : hexToText(t.v, cmap);
        if (depth) group.push(val);
        else if (isShow) out += val;
        else {
          // 有些生成器省略算子
          out += val;
        }
        continue;
      }
      if (t.t === 'op') {
        if (/^(Td|TD|T\*|ET|BT)$/.test(t.v)) out += '\n';
        else if (t.v === 'TJ' && depth === 0) { out += group.join(''); group = []; }
      }
    }
    return out;
  }

  async function pdfText(buf) {
    const u8 = new Uint8Array(buf);
    if (u8.length > 20 * 1024 * 1024) throw new Error('文件超过 20 MB，请压缩后再试');
    const s = latin(u8);
    const objs = [];
    const re = /(\d+)\s+(\d+)\s+obj\b/g;
    let m;
    while ((m = re.exec(s))) {
      const start = m.index + m[0].length;
      const end = s.indexOf('endobj', start);
      objs.push({ start, end: end < 0 ? s.length : end });
    }
    if (!objs.length) throw new Error('这个 PDF 的结构无法解析');
    const streams = [];
    for (const o of objs) {
      const head = s.slice(o.start, Math.min(o.end, o.start + 4000));
      const si = head.indexOf('stream');
      if (si < 0) continue;
      let ds = o.start + si + 6;
      if (s[ds] === '\r') ds++;
      if (s[ds] === '\n') ds++;
      const de = Math.min(o.end, s.indexOf('endstream', ds));
      if (de <= ds) continue;
      const dict = head.slice(0, si);
      let data = u8.subarray(ds, de);
      const filters = (dict.match(/\/Filter\s*\[([^\]]*)\]|\/Filter\s*\/\w+/) || [''])[0];
      if (/FlateDecode/.test(filters || dict)) {
        try { data = await inflateZlib(data); } catch (e) { continue; }
      } else if (filters && !/FlateDecode/.test(filters)) {
        continue;
      }
      streams.push({ dict, text: latin(data) });
    }
    if (!streams.length) throw new Error('这个 PDF 的正文是压缩流，无法读取');
    const cmap = new Map();
    for (const st of streams) {
      if (!/beginbfchar|beginbfrange/.test(st.text)) continue;
      parseCMap(st.text).forEach((v, k) => { if (!cmap.has(k)) cmap.set(k, v); });
    }
    let out = '';
    for (const st of streams) {
      if (/beginbfchar|beginbfrange/.test(st.text)) continue;
      if (!/(Tj|TJ)[\s\]>]/.test(st.text) && !/Tj\b|TJ\b/.test(st.text)) continue;
      out += contentText(st.text, cmap) + '\n';
    }
    return out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  function quality(text) {
    const t = String(text || '').replace(/\s/g, '');
    if (t.length < 12) return 0;
    return (t.match(/[\u4e00-\u9fa5A-Za-z0-9，。、：；（）\-–—·]/g) || []).length / t.length;
  }

  async function fromFile(file) {
    const name = String(file.name || '');
    const size = file.size || 0;
    if (!size) throw new Error('这个文件是空的');
    if (size > 8 * 1024 * 1024) throw new Error('请使用不超过 8 MB 的文件');
    const ext = (name.match(/\.([a-z0-9]+)$/i) || [])[1] ? (name.match(/\.([a-z0-9]+)$/i))[1].toLowerCase() : '';
    if (ext === 'txt' || ext === 'md') {
      const text = await file.text();
      return { text: text.slice(0, 12000), kind: ext.toUpperCase(), note: '' };
    }
    if (ext === 'docx') {
      const text = await docxText(await file.arrayBuffer());
      if (!text || quality(text) < 0.5) throw new Error('Word 正文读出来内容过少，建议粘贴文字');
      return { text: text.slice(0, 12000), kind: 'Word', note: '' };
    }
    if (ext === 'pdf') {
      const text = await pdfText(await file.arrayBuffer());
      if (!text || text.replace(/\s/g, '').length < 12) {
        throw new Error('这份 PDF 可能是扫描件或图片版，读不到文字，建议粘贴或换 Word');
      }
      if (quality(text) < 0.55) {
        throw new Error('这份 PDF 用了非标准字体编码，读出来的文字会错乱，建议粘贴文字');
      }
      return { text: text.slice(0, 12000), kind: 'PDF', note: '' };
    }
    if (ext === 'doc') throw new Error('旧版 .doc 不支持读取，请另存为 .docx 或 PDF');
    throw new Error('目前支持 PDF / Word(.docx) / TXT / MD');
  }

  window.TongluExtract = { fromFile, version: 'v1', supports: ['pdf', 'docx', 'txt', 'md'] };
})();
