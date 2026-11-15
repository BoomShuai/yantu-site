/* Render authorized, sanitized original bodies from the same static site. */
(function(){
  'use strict';
  const cache=new Map();
  const E=value=>escapeTL(String(value||''));
  const urlSafe=value=>/^https?:\/\//.test(value)||/^assets\/articles\/media\/[a-zA-Z0-9_.-]+$/.test(value);
  async function mount(id,sourceUrl){
    const target=document.querySelector('[data-notice-body="'+CSS.escape(id)+'"]');
    if(!target)return;
    const meta=window.TL_NEWS_ARTICLES?.items?.[id];
    try{
      if(!['full','media-pending'].includes(meta?.status)||!/^assets\/articles\/[a-zA-Z0-9_-]+\.json$/.test(meta.file))throw new Error('Unavailable article');
      if(!cache.has(id))cache.set(id,fetch(meta.file).then(response=>{if(!response.ok)throw new Error('Article fetch failed');return response.json();}).catch(error=>{cache.delete(id);throw error;}));
      const article=await cache.get(id);
      if(article.id!==id||article.sourceUrl!==sourceUrl||article.textSha256!==meta.textSha256||typeof article.html!=='string')throw new Error('Article provenance mismatch');
      if(!target.isConnected)return;
      const attachments=(article.attachments||[]).filter(a=>urlSafe(a.url)).map(a=>'<a href="'+E(a.url)+'" target="_blank" rel="noopener noreferrer">'+E(a.name)+' ↗</a>').join('');
      const pdfs=(article.pdfs||[]).filter(p=>urlSafe(p.file)).map(p=>'<a href="'+E(p.file)+'" target="_blank" rel="noopener noreferrer">查看 PDF 原件 · '+p.pages.length+' 页 ↗</a>').join('');
      const pending=article.unavailableMedia?.length?'<p class="v10-reader-note">部分原站图片或文件暂时无法读取，可通过下方官网链接核对完整内容。</p>':'';
      target.innerHTML='<article class="v10-article">'+article.html+'</article>'+((attachments||pdfs)?'<section class="v10-attachments" aria-label="原通知附件"><h3>原通知附件</h3>'+pdfs+attachments+'</section>':'')+pending;
      target.dataset.loaded='true';
    }catch(error){
      if(target.isConnected)target.innerHTML='<div class="v10-reader-unavailable"><h3>原文暂时读取失败</h3><p>请使用下方官网链接查看完整通知与附件。</p></div>';
    }finally{if(target.isConnected)target.setAttribute('aria-busy','false');}
  }
  window.tlOriginalNotice=function(n){
    const meta=window.TL_NEWS_ARTICLES?.items?.[n.id];
    if(!['full','media-pending'].includes(meta?.status)||meta.sourceUrl!==n.url)return '';
    queueMicrotask(()=>mount(n.id,n.url));
    return '<section class="v10-original-reader v10-local-original" aria-label="高校官方原文"><div class="v10-reader-heading"><h2>通知原文</h2><span>原文转载</span></div><div data-notice-body="'+E(n.id)+'" aria-busy="true"><div class="v10-loading" role="status">正在读取通知原文…</div></div></section>';
  };
})();
