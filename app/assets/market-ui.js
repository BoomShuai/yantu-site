/* 同路集市：学生浏览与服务者管理读取同一个商品对象。 */
(function () {
  'use strict';
  const store=window.TongluMarket, E=value=>escapeTL(String(value??''));
  const filter={category:'all',discipline:'全部',q:''};
  let peerView="saved";
  window.tlPublicationTabs=active=>`<nav class="tl-publication-tabs" aria-label="发布内容"><button class="${active==='market'?'active':''}" aria-current="${active==='market'?'page':'false'}" onclick="go('#/mentorMarket')">同路集市</button><button class="${active==='demands'?'active':''}" aria-current="${active==='demands'?'page':'false'}" onclick="go('#/mentorDemands')">学生需求</button></nav>`;
  const pathId=()=>decodeURIComponent(location.hash.split('/')[2]||'');
  const money=value=>'¥'+Number(value).toFixed(2).replace(/\.00$/,'');
  const empty=(text,action='',handler='')=>`<div class="v9-empty"><b>${E(text)}</b>${action?`<p><button type="button" onclick="${handler}">${E(action)}</button></p>`:''}</div>`;
  const page=(title,desc,body)=>`<div class="page v9-page tl-market-page"><h1>${E(title)}</h1><p class="v9-market-lead">${E(desc)}</p>${body}</div>`;
  function buttons(key,values){
    return `<div class="v9-multiselect" role="group" aria-label="${key==='category'?'服务分类':'学科分类'}">${values.map(v=>`<button type="button" aria-pressed="${filter[key]===v.id}" class="${filter[key]===v.id?'active':''}" onclick="tlMarketFilter('${key}','${v.id}')">${E(v.label)}</button>`).join('')}</div>`;
  }
  function card(item,owner){
    return `<article class="v9-provider tl-sku-card" data-sku-id="${E(item.id)}">
      <div class="tl-sku-meta"><span>${E(item.categoryLabel)}</span><small>${E(item.discipline)}${item.example?' · 体验服务':''}</small></div>
      <h2>${E(item.title)}</h2><p>${E(item.subtitle)}</p>
      <div class="tl-sku-delivery">${E(item.deliveryCycle)} · ${E(item.serviceMode)}</div>
      <div class="tl-sku-provider">${E(item.providerName)} · ${E(item.providerType)}</div>
      <div class="tl-sku-footer"><b>${money(item.price)}</b><small>${owner?(item.status==='on_shelf'?'已上架':'已下架'):!store.providerAccepting(item.providerId)?'暂停接单':item.capacityLeft>0?'剩余 '+item.capacityLeft+' 个名额':'暂满'}</small></div>
      <div class="v9-provider-actions">${owner?`<button onclick="go('#/mentorSku/${E(item.id)}')">编辑商品</button><button onclick="go('#/sku/${E(item.id)}')">查看学生端展示</button><button class="v9-primary" onclick="tlToggleSku('${E(item.id)}')">${item.status==='on_shelf'?'下架':'上架'}</button>`:`<button class="v9-primary" onclick="go('#/sku/${E(item.id)}')">查看服务详情 ›</button>`}</div>
    </article>`;
  }
  function student(){
    if(window.__TL?.role!=='student')return page('同路集市','请选择学生身份浏览服务商品。',`<button class="v9-primary" onclick="go('#/choose')">选择身份</button>`);
    const q=filter.q.trim().toLowerCase(),saved=S.providerView==='saved';
    const items=store.skus().filter(x=>!x.example&&x.status==='on_shelf'&&(!saved||isMentorSaved(x.providerId))&&(filter.category==='all'||x.category===filter.category)&&(filter.discipline==='全部'||x.discipline===filter.discipline)&&(!q||[x.title,x.subtitle,x.providerName,x.discipline,x.providerBrief].join(' ').toLowerCase().includes(q)));
    return page('同路集市','先选具体服务，再了解服务者与交付安排。',`
      <div class="v9-multiselect" aria-label="商品展示范围"><button class="${saved?'':'active'}" onclick="setProviderView('all')">全部商品</button><button class="${saved?'active':''}" onclick="setProviderView('saved')">已收藏服务者的商品</button></div>
      <form class="v9-search" onsubmit="tlMarketSearch(event)"><input name="q" aria-label="搜索商品" placeholder="搜索服务、学科或服务者" value="${E(filter.q)}"><button type="submit">搜索</button></form>
      <section class="tl-market-filters"><b>服务分类</b>${buttons('category',[{id:'all',label:'全部服务'},...store.categories.map(c=>({id:c.id,label:c.label}))])}
      <b>学科分类</b>${buttons('discipline',[{id:'全部',label:'全部'},...store.disciplines.map(x=>({id:x,label:x}))])}</section>
      <div class="v9-results"><span>共 ${items.length} 件服务商品</span><button onclick="tlMarketReset()">重置筛选</button></div>
      ${items.map(x=>card(x,false)).join('')||empty('还没有找到合适的服务，试试切换分类或清空关键词','查看全部服务','tlMarketReset()')}
      <section class="v9-demand-cta"><div><b>没有找到合适的服务？</b><p>发布你的背景与需求，等待合适的服务者承接。</p></div><button class="v9-primary" onclick="openStudentDemand()">发布需求</button></section>
      <p class="v9-market-footnote">${E(store.complianceNote)}</p>`);
  }
  PAGES.providers=function(){return window.__TL?.role==='mentor'?PAGES.mentorMarket():student();};
  PAGES.sku=function(){
    const mentor=window.__TL?.role==='mentor',ownId=mentor?store.requireMentor(true).mentorId:'';
    const item=store.skus().find(x=>!x.example&&x.id===pathId()&&(x.status==='on_shelf'||mentor&&x.providerId===ownId));
    const back=mentor?'mentorMarket':'providers';
    if(!item)return page('服务详情','该商品已下架或不存在。',`<button class="v9-primary" onclick="go('#/${back}')">返回同路集市</button>`);
    const own=mentor&&item.providerId===ownId,saved=mentor?store.peerFavorites().includes(item.providerId):isMentorSaved(item.providerId);
    const available=item.capacityLeft>0&&store.providerAccepting(item.providerId);
    const favorite=own?'':`<button class="v9-fav-btn" aria-pressed="${saved}" onclick="${mentor?'tlTogglePeerFavorite':'toggleMentorFavorite'}('${E(item.providerId)}')">${saved?'♥ 已收藏':'♡ 收藏'+(mentor?'同行':'服务者')}</button>`;
    return page('服务详情',item.categoryLabel,`${card(item,false).replace(/<div class="v9-provider-actions">[\s\S]*?<\/div>/,'')}
      <section class="v9-provider"><h2>服务者信息</h2><b>${E(item.providerName)}</b><p>${E(item.providerBrief)}</p><small>服务者自填资料，认证状态以实际审核结果为准。</small>${favorite}</section>
      <p class="v9-market-footnote">${E(item.complianceNote)}</p>${mentor?`<button class="v9-primary tl-market-wide" onclick="go('#/${own?'mentorMarket':'mentorPeers'}')">${own?'返回我的服务':'返回同行收藏'}</button>`:`<button type="button" class="v9-primary tl-market-wide" ${available?'':'disabled'} onclick="tlConsultSku('${E(item.id)}')">${available?'咨询此服务':store.providerAccepting(item.providerId)?'当前名额已满':'服务者已暂停接单'}</button>`}`);
  };
  PAGES.mentorMarket=function(){
    const a=store.requireMentor(true),items=store.skus().filter(x=>!x.example&&x.providerId===a.mentorId);
    return page('同路集市','发布你能提供的具体服务；服务内容、价格与名额会同步展示给学生。',`${tlPublicationTabs('market')}<button class="v9-primary tl-market-wide" onclick="go('#/mentorSku')">＋ 发布服务商品</button>${!store.workbench().accepting?'<p class="tl-work-status">当前已暂停接单，学生仍可浏览服务。<button onclick="go(\'#/workbench\')">前往恢复接单 ›</button></p>':''}${items.map(x=>card(x,true)).join('')||empty('还没有发布服务，点击上方按钮，介绍你能提供的帮助')}`);
  };
  window.tlPeerFavoritesPage=function(){
    const a=store.requireMentor(true),saved=store.peerFavorites();
    const groups=new Map();
    store.skus().filter(x=>!x.example&&x.providerId!==a.mentorId&&(x.status==='on_shelf'||saved.includes(x.providerId))).forEach(x=>{if(!groups.has(x.providerId))groups.set(x.providerId,[]);groups.get(x.providerId).push(x);});
    // 保留旧收藏；没有在售服务的同行仍可查看收藏状态并取消。
    saved.forEach(id=>{if(!groups.has(id))groups.set(id,[]);});
    const rows=[...groups].filter(([id])=>peerView==='all'||saved.includes(id));
    return page('同行收藏','收藏感兴趣的同行，查看他们在同路集市发布的服务。',`<div class="v9-multiselect" aria-label="同行展示范围"><button class="${peerView==='saved'?'active':''}" onclick="tlPeerView('saved')">我的收藏 · ${saved.length}</button><button class="${peerView==='all'?'active':''}" onclick="tlPeerView('all')">发现同行</button></div>${rows.map(([id,items])=>{const legacy=M.providers.find(x=>x.id===id),first=items[0],onShelf=items.filter(x=>x.status==='on_shelf');return `<article class="v9-provider tl-peer-card" data-peer-id="${E(id)}"><div class="tl-sku-meta"><h2>${E(first?.providerName||legacy?.name||'已收藏的同行')}</h2><button class="v9-fav-btn" aria-pressed="${saved.includes(id)}" onclick="tlTogglePeerFavorite('${E(id)}')">${saved.includes(id)?'取消收藏':'收藏同行'}</button></div><p>${E(first?.providerBrief||legacy?.brief||'暂无在售服务')}</p>${onShelf.map(item=>`<button class="tl-peer-service" data-sku-id="${E(item.id)}" onclick="go('#/sku/${E(item.id)}')"><span><b>${E(item.title)}</b><small>${E(item.categoryLabel)} · ${E(item.discipline)}</small></span><strong>${money(item.price)} ›</strong></button>`).join('')||'<small>这位同行暂未上架服务，你可以保留收藏，稍后再来查看。</small>'}</article>`;}).join('')||(peerView==='saved'?empty('还没有收藏同行','发现同行',"tlPeerView('all')"):empty('暂时没有其他同行上架服务，可以稍后再来查看'))}`);
  };
  window.tlPeerView=function(value){peerView=value==='all'?'all':'saved';render();};
  window.tlTogglePeerFavorite=function(providerId){try{const saved=store.togglePeerFavorite(providerId);render();toast(saved?'已收藏同行':'已取消收藏');}catch(error){toast(error.message);}};
  PAGES.mentorSku=function(){
    const a=store.requireMentor(true),skuId=pathId(),item=store.skus().find(x=>x.id===skuId&&x.providerId===a.mentorId);
    if(skuId&&!item)return page('暂时找不到这项服务','这项服务暂时无法编辑，请返回你的服务列表重新选择。',`<button class="v9-primary" onclick="go('#/mentorMarket')">返回我的服务</button>`);
    const field=(key,title,type='text',value='')=>`<label><span>${title}</span><input name="${key}" type="${type}" required value="${E(item?.[key]??value)}" ${type==='number'?(key==='price'?'min="0" max="100000" step="0.01"':'min="0" max="99" step="1"'):'maxlength="'+(key==='title'?60:80)+'"'}></label>`;
    return page(item?'编辑服务商品':'发布服务商品','请描述真实的申请规划、经历梳理与反馈服务。',`<form class="tl-demand-form" onsubmit="tlSaveSku(event)"><input name="id" type="hidden" value="${E(item?.id||'')}">
      <div class="tl-demand-field-grid">${field('title','商品标题')}
      <label><span>服务分类</span><select name="category">${store.categories.map(c=>`<option value="${c.id}" ${c.id===item?.category?'selected':''}>${E(c.label)}</option>`).join('')}</select></label>
      <label><span>学科分类</span><select name="discipline">${store.disciplines.map(x=>`<option ${x===(item?.discipline||'通用学科')?'selected':''}>${E(x)}</option>`).join('')}</select></label>
      ${field('price','服务价格（元）','number')}${field('capacityLeft','可承接名额','number',1)}${field('deliveryCycle','交付周期','text','沟通后 3 日内')}${field('serviceMode','服务方式','text','线上沟通 + 文档反馈')}
      <label><span>商品状态</span><select name="status"><option value="on_shelf" ${item?.status==='on_shelf'?'selected':''}>上架</option><option value="off_shelf" ${item?.status==='off_shelf'||!item?'selected':''}>暂不上架</option></select></label></div>
      <label class="tl-demand-textarea-wrap"><span>服务范围与交付说明</span><textarea name="subtitle" rows="5" minlength="8" maxlength="500" required>${E(item?.subtitle||'')}</textarea></label>
      <p class="v9-market-footnote">${E(store.complianceNote)}</p><button class="v9-primary tl-market-wide" type="submit">保存商品</button></form>`);
  };
  window.tlMarketFilter=function(key,value){if(key in filter){filter[key]=value;render();}};
  window.tlMarketSearch=function(event){event.preventDefault();filter.q=event.target.elements.q.value;render();};
  window.tlMarketReset=function(){Object.assign(filter,{category:'all',discipline:'全部',q:''});S.providerView='all';render();};
  window.tlSaveSku=function(event){event.preventDefault();try{store.upsertSku(Object.fromEntries(new FormData(event.target)));go('#/mentorMarket');toast('商品已保存');}catch(error){toast(error.message);}};
  window.tlToggleSku=function(skuId){try{const item=store.skus().find(x=>x.id===skuId);store.upsertSku({...item,status:item.status==='on_shelf'?'off_shelf':'on_shelf'});render();}catch(error){toast(error.message);}};
  window.tlConsultSku=function(skuId){
    if(window.__TL?.role!=='student')return;
    const item=store.skus().find(x=>x.id===skuId&&x.status==='on_shelf'&&x.capacityLeft>0&&store.providerAccepting(x.providerId));
    if(!item){toast('服务暂不可咨询，请查看是否暂停接单、下架或名额已满');render();return;}
    // 复用现有本机会话，固定商品快照，避免把咨询误标为已付款订单。
    let p=M.providers.find(x=>x.id===item.providerId);
    if(!p){p={id:item.providerId,name:item.providerName,brief:item.providerBrief,tags:[],services:[],capacity:{u:0,l:0,h:0}};M.providers.push(p);}
    p.services=[{name:item.title,desc:item.subtitle,price:item.price}];p.capacity={u:item.capacityLeft,l:0,h:0};
    window.startTongluConsult(item.providerId);
    const chat=window.__TL.consults().find(c=>c.providerId===item.providerId);
    if(chat){chat.skuId=item.id;chat.skuSnapshot={...item};try{localStorage.setItem('tonglu-v4-local-consultations',JSON.stringify(window.__TL.consults()));}catch(_){toast('本机咨询保存失败');}}
  };
  const originalStartConsult=window.startTongluConsult;
  window.startTongluConsult=function(providerId){
    if(!store.providerAccepting(providerId)){toast('这位服务者已暂停接单，你可以先收藏，稍后再来咨询');return;}
    return originalStartConsult(providerId);
  };
  NAV.sku={title:'服务详情'};NAV.mentorMarket={title:'同路集市'};NAV.mentorSku={title:'服务商品'};
  // 刷新后恢复自建商品的服务者，保证既有本机会话能找到对应信息。
  try{store.skus().forEach(item=>{if(!M.providers.some(p=>p.id===item.providerId))M.providers.push({id:item.providerId,name:item.providerName,brief:item.providerBrief,tags:[],services:[{name:item.title,desc:item.subtitle,price:item.price}],capacity:{u:item.capacityLeft,l:0,h:0}});});}catch(error){toast(error.message);}
})();
