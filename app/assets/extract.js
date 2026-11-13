/* 同路 · 本地文件文字提取
 * 目标：用户上传简历后，先在浏览器本地把正文读出来，再交给规则提取字段。
 * 解析在本机完成，运行组件从本站按需加载；简历内容不上传服务器。
 * 支持：TXT / MD / DOCX（zip + word/document.xml）/ PDF（文本型，含 ToUnicode CMap）。
 * PDF 使用 PDF.js；文字稀少或乱码时逐页渲染并使用本地中英文 OCR。
 */
(function () {
  'use strict';

  const utf8 = new TextDecoder('utf-8');

  async function pipe(u8, format) {
    const ds = new DecompressionStream(format);
    const stream = new Blob([u8]).stream().pipeThrough(ds);
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  async function inflateRaw(u8) { return pipe(u8, 'deflate-raw'); }

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

  /* ---------- PDF.js + 扫描件本地 OCR ---------- */
  const assetBase = new URL('.', document.currentScript.src);
  const asset = path => new URL(path, assetBase).href;
  let pdfEngine;
  function loadPDF() {
    if (!pdfEngine) pdfEngine = import(asset('vendor/pdfjs/pdf.min.mjs')).then(lib => {
      lib.GlobalWorkerOptions.workerSrc = asset('vendor/pdfjs/pdf.worker.min.mjs');
      return lib;
    }).catch(err => { pdfEngine = null; throw new Error('PDF 组件加载失败，请检查网络后重试'); });
    return pdfEngine;
  }
  let ocrScript;
  function loadOCR() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    if (!ocrScript) ocrScript = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = asset('vendor/ocr/tesseract.min.js');
      script.onload = () => resolve(window.Tesseract);
      script.onerror = () => { script.remove(); ocrScript = null; reject(new Error('图片识别组件加载失败，请重试')); };
      document.head.appendChild(script);
    });
    return ocrScript;
  }
  function cleanText(text) {
    return String(text || '').normalize('NFKC').replace(/\u0000/g, '')
      .replace(/[\u200b-\u200d\ufeff]/g, '')
      .replace(/([\u3400-\u9fff]) +(?=[\u3400-\u9fff])/g, '$1')
      .replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  function textRows(items) {
    const rows = [];
    for (const it of items.filter(x => x.str && x.str.trim()).sort((a,b) => b.transform[5]-a.transform[5] || a.transform[4]-b.transform[4])) {
      const y=it.transform[5], h=Math.max(1, Math.abs(it.height || it.transform[3]));
      let row=rows.find(r => Math.abs(r.y-y)<Math.max(2, Math.min(r.h,h)*0.35));
      if(!row){row={y,h,items:[]};rows.push(row);}row.items.push(it);
    }
    return rows.sort((a,b)=>b.y-a.y).map(row=>({...row,items:row.items.sort((a,b)=>a.transform[4]-b.transform[4])}));
  }
  function joinItems(items) {
    let line='', end=0;
    for(const it of items){
      const gap=it.transform[4]-end;
      if(line&&gap>Math.max(1,(it.height||10)*0.16))line+=' ';
      line+=it.str;end=it.transform[4]+it.width;
    }
    return cleanText(line);
  }
  function layoutText(items, width) {
    const rows=textRows(items), gutters=[];
    for(const row of rows) for(let i=1;i<row.items.length;i++){
      const left=row.items[i-1], right=row.items[i], end=left.transform[4]+left.width;
      if(right.transform[4]-end>width*0.12&&end>width*0.18&&right.transform[4]<width*0.85)gutters.push({left:end,right:right.transform[4],y:row.y});
    }
    let split=0, support=0;
    for(let x=width*.28;x<width*.72;x+=8){const n=gutters.filter(g=>g.left<x&&g.right>x).length;if(n>support){support=n;split=x;}}
    if(support>=3){
      const crossing=items.filter(it=>it.transform[4]<split&&it.transform[4]+it.width>split+8);
      const firstColumnY=Math.max(...gutters.filter(g=>g.left<split&&g.right>split).map(g=>g.y));
      if(crossing.filter(it=>it.transform[5]<firstColumnY-5).length<=1){
        const top=rows.filter(r=>r.y>firstColumnY+3).map(r=>joinItems(r.items));
        const body=rows.filter(r=>r.y<=firstColumnY+3);
        return cleanText([...top,...body.map(r=>joinItems(r.items.filter(it=>it.transform[4]<split))),...body.map(r=>joinItems(r.items.filter(it=>it.transform[4]>=split)))].filter(Boolean).join('\n'));
      }
    }
    return cleanText(rows.map(r=>joinItems(r.items)).join('\n'));
  }
  async function pdfText(buf, options={}) {
    const report = info => options.onProgress?.(info);
    const lib = await loadPDF();
    const task = lib.getDocument({data:new Uint8Array(buf),cMapUrl:asset('vendor/pdfjs/cmaps/'),cMapPacked:true,
      standardFontDataUrl:asset('vendor/pdfjs/standard_fonts/'),wasmUrl:asset('vendor/pdfjs/wasm/'),
      isEvalSupported:false,enableXfa:false,verbosity:0});
    let pdf, worker, ocrPages=0, ocrPage=0;
    const pages=[], methods=[];
    try {
      pdf=await task.promise;
      if(pdf.numPages>20)throw new Error('简历超过 20 页，请保留简历正文后重新上传');
      for(let n=1;n<=pdf.numPages;n++){
        report({message:'正在读取 PDF 第 '+n+' / '+pdf.numPages+' 页',progress:(n-1)/pdf.numPages});
        const page=await pdf.getPage(n);
        let text='';
        try {const content=await page.getTextContent();text=layoutText(content.items,page.getViewport({scale:1}).width);}catch(_){}
        let method='text';
        const resumeHints=/大学|学院|教育|经历|项目|专业|姓名|科研|竞赛|奖|简历|education|experience|university|college|research|skills|resume|curriculum/i;
        if(text.replace(/\s/g,'').length<80||quality(text)<.7||!resumeHints.test(text)){
          ocrPage=n;
          if(!worker){
            report({message:'正在准备中文图片识别，首次加载稍慢',progress:(n-1)/pdf.numPages});
            const OCR=await loadOCR();
            worker=await OCR.createWorker('chi_sim+eng',1,{workerPath:asset('vendor/ocr/worker.min.js'),corePath:asset('vendor/ocr/core/'),
              langPath:asset('vendor/ocr/lang/'),workerBlobURL:false,logger:m=>{if(m.status==='recognizing text')report({message:'正在识别扫描页 '+ocrPage+' / '+pdf.numPages+' · '+Math.round(m.progress*100)+'%',progress:(ocrPage-1+m.progress)/pdf.numPages});}});
            await worker.setParameters({preserve_interword_spaces:'1',user_defined_dpi:'150'});
          }
          const original=page.getViewport({scale:1});
          const scale=Math.min(2.5,1800/original.width,Math.sqrt(5000000/(original.width*original.height)));
          const viewport=page.getViewport({scale});
          const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
          try {
            await page.render({canvasContext:canvas.getContext('2d'),viewport,background:'rgb(255,255,255)'}).promise;
            const result=await worker.recognize(canvas);
            const recognized=cleanText(result.data.text);
            if(recognized.replace(/\s/g,'').length>=12&&quality(recognized)>.7&&(quality(text)<.7||!resumeHints.test(text)||recognized.replace(/\s/g,'').length>text.replace(/\s/g,'').length)){text=recognized;method='ocr';ocrPages++;}
          } finally {canvas.width=canvas.height=0;}
        }
        if(text.replace(/\s/g,'').length<12)throw new Error('第 '+n+' 页没有识别出足够文字，请上传更清晰的 PDF');
        pages.push(text);methods.push(method);page.cleanup();
      }
      report({message:'PDF 识别完成',progress:1});
      return {text:pages.join('\n\n'),pages:pdf.numPages,ocrPages,methods};
    } catch(err) {
      if(err.name==='PasswordException')throw new Error('这份 PDF 有密码保护，请解锁后重新上传');
      if(err.name==='InvalidPDFException')throw new Error('PDF 文件损坏或格式不完整，请重新导出');
      throw err;
    } finally {
      if(worker)await worker.terminate().catch(()=>{});
      await task.destroy().catch(()=>{});
    }
  }

  function quality(text) {
    const t = String(text || '').replace(/\s/g, '');
    if (t.length < 12) return 0;
    return (t.match(/[\u4e00-\u9fa5A-Za-z0-9，。、：；（）\-–—·]/g) || []).length / t.length;
  }

  async function fromFile(file, options={}) {
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
      const result = await pdfText(await file.arrayBuffer(), options);
      if(quality(result.text)<.55)throw new Error('PDF 文字质量较低，请上传清晰版本或核对后粘贴正文');
      if(result.text.length>50000)throw new Error('简历文字超过 5 万字，请精简后上传');
      return {...result,kind:result.ocrPages?'PDF · 图片文字识别':'PDF',note:result.ocrPages?'扫描页识别结果请逐项核对':''};
    }
    if (ext === 'doc') throw new Error('旧版 .doc 不支持读取，请另存为 .docx 或 PDF');
    throw new Error('目前支持 PDF / Word(.docx) / TXT / MD');
  }

  window.TongluExtract = { fromFile, version: 'v2-pdfjs-ocr', supports: ['pdf', 'docx', 'txt', 'md'] };
})();
