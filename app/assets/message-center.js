/* 两端共用消息列表：系统通知置顶、好友会话在下，订单由个人页进入。 */
(function(){
  'use strict';
  const T=window.__TL,store=window.TongluMarket,E=value=>escapeTL(String(value??''));
  const mentor=()=>T.role==='mentor';
  const actor=()=>mentor()?'mentor:'+store.requireMentor(true).mentorId:'student';
  const key=()=>location.hash.replace(/^#\/?/,'').split('/')[0];
  const routeGroup=()=>location.hash.split('/')[2]||'platform';
  const visibleChats=()=>T.consults().filter(chat=>chat&&(!mentor()||chat.providerId===store.requireMentor(true).mentorId));
  const incoming=entry=>entry.who!=='system'&&(mentor()?entry.who!=='mentor':entry.who==='mentor'||entry.from==='mentor');
  const stamp=value=>Number.isFinite(Date.parse(value))?Date.parse(value):0;
  const time=value=>{if(!stamp(value))return '';const d=new Date(value),today=new Date();return d.toDateString()===today.toDateString()?d.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}):`${d.getMonth()+1}-${d.getDate()}`;};
  function saved(){try{const value=JSON.parse(localStorage.getItem(store.KEYS.messages)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}catch(_){return {};}}
  function state(){const value=saved()[actor()]||{};return {chats:value.chats||{},notices:value.notices||{}};}
  function persist(value){try{const all=saved();all[actor()]=value;localStorage.setItem(store.KEYS.messages,JSON.stringify(all));}catch(_){toast('已读状态暂时无法保存，请检查设备存储空间后重试');}}
  function readChat(id){const chat=visibleChats().find(chat=>chat.id===id);if(!chat)return;const data=state(),count=(chat.entries||[]).length;if(data.chats[id]===count)return;data.chats[id]=count;persist(data);}
  function unread(chat){const count=Number(state().chats[chat.id])||0;return (chat.entries||[]).slice(count).filter(incoming).length;}
  function friendName(chat){return mentor()?(chat.studentName||'学生咨询'):(M.providers.find(p=>p.id===chat.providerId)?.name||chat.skuSnapshot?.providerName||'服务者');}
  const lastMessage=chat=>(chat.entries||[]).filter(entry=>entry.who!=='system').slice(-1)[0];
  const badge=count=>count?`<span class="tl-message-unread" aria-label="${count} 条未读">${count>99?'99+':count}</span>`:'';
  const icons={bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',service:'<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 2v4M16 2v4M8 11h8M8 15h5"/>'};
  const icon=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
  function notices(group){
    if(group==='platform')return [
      {id:'privacy-v1',title:'资料与隐私提醒',body:'简历在当前设备解析。请勿在公开需求中填写联系方式、证件号或住址；分享材料前请先移除其他人的个人信息。'},
      {id:'messages-v1',title:'消息保存说明',body:'当前会话和服务记录保存在此设备，暂不支持跨设备发送和同步。更换设备或清理浏览器前，请先在资料管理中导出需要保留的记录。'}
    ];
    return (mentor()?store.orders():store.studentOrders()).filter(order=>['in_progress','completed'].includes(order.status)).map(order=>({
      id:`${order.id}:${order.status}:${order.updatedAt||order.createdAt}`,
      title:order.status==='completed'?'服务已标记完成':mentor()?'已承接学生需求':'你的需求已被承接',
      body:order.title,at:order.updatedAt||order.createdAt,
      note:mentor()?'请根据实际约定处理服务与交付。':`${order.providerName||'服务者'} · ${order.status==='completed'?'可到个人订单查看记录':'可到个人订单查看服务进度'}`,
      action:mentor()?'mentorOrders':'studentOrders'
    })).sort((a,b)=>stamp(b.at)-stamp(a.at));
  }
  function readNotices(group){if(group!=='service')return;const data=state(),list=notices(group);if(list.every(item=>data.notices[item.id]))return;list.forEach(item=>data.notices[item.id]=true);persist(data);}
  function pinnedRow(group,title,description,type){
    const list=notices(group),latest=group==='service'?list[0]:null;
    const count=group==='service'?list.filter(item=>!state().notices[item.id]).length:0;
    return `<button type="button" class="tl-message-row tl-message-system" data-notice-group="${group}" onclick="tlOpenMessageNotice('${group}')"><span class="tl-message-avatar tl-message-system-icon">${icon(type)}</span><span class="tl-message-main"><b>${title}</b><small>${E(latest?latest.title:description)}</small></span><span class="tl-message-tail">${latest?`<time>${E(time(latest.at))}</time>`:''}${badge(count)}<span class="tl-message-chevron" aria-hidden="true">›</span></span></button>`;
  }
  function messagesPage(){
    const list=visibleChats().slice().sort((a,b)=>stamp(lastMessage(b)?.at||b.updatedAt)-stamp(lastMessage(a)?.at||a.updatedAt));
    return `<div class="page v8-message-page tl-inbox-page"><h1>消息中心</h1><section class="tl-message-pinned" aria-label="系统消息">${pinnedRow('platform','系统消息','平台通知与资料保护提醒','bell')}${pinnedRow('service','服务通知','需求承接与服务进度会显示在这里','service')}</section><section class="tl-message-friends" aria-labelledby="tl-friends-title"><h2 id="tl-friends-title">好友消息</h2><div class="tl-message-friend-list">${list.map(chat=>{
      const name=friendName(chat),last=lastMessage(chat),preview=last?(incoming(last)?last.text:'我：'+last.text):'已建立会话，点击开始沟通';
      return `<button type="button" class="tl-message-row v8-thread" data-conversation-id="${E(chat.id)}" onclick="openTongluConversation('${E(chat.id)}')"><span class="tl-message-avatar">${E(name.slice(0,1))}</span><span class="tl-message-main"><b>${E(name)}</b><small>${E(preview)}</small></span><span class="tl-message-tail"><time>${E(time(last?.at||chat.updatedAt))}</time>${badge(unread(chat))}</span></button>`;
    }).join('')||`<div class="tl-message-empty"><b>还没有好友消息</b><p>${mentor()?'学生向你发起咨询后，会话会显示在这里。':'选择感兴趣的服务并发起咨询，会话会显示在这里。'}</p><button type="button" onclick="go('#/${mentor()?'mentorDemands':'providers'}')">${mentor()?'查看学生需求':'逛同路集市'} ›</button></div>`}</div></section></div>`;
  }
  window.TongluMessages={page:messagesPage,readChat,unread,notices};
  window.tlOpenMessageNotice=function(group){if(!['platform','service'].includes(group))return;readNotices(group);go('#/messageNotice/'+group);};
  PAGES.messageNotice=function(){
    const group=routeGroup();if(!['platform','service'].includes(group))return '<div class="page"><p>没有找到这类通知。</p><button onclick="go(\'#/messages\')">返回消息中心</button></div>';
    const list=notices(group);readNotices(group);
    return `<div class="page tl-notice-page"><h1>${group==='platform'?'系统消息':'服务通知'}</h1>${list.map(item=>`<article class="tl-message-notice"><div><h2>${E(item.title)}</h2>${item.at?`<time>${E(time(item.at))}</time>`:''}</div><p>${E(item.body)}</p>${item.note?`<small>${E(item.note)}</small>`:''}${item.action?`<button type="button" onclick="go('#/${item.action}')">查看个人订单 ›</button>`:''}</article>`).join('')||'<div class="tl-message-empty"><b>还没有服务通知</b><p>需求被承接或服务进度更新后，会在这里查看。</p></div>'}<button type="button" class="tl-message-back" onclick="go('#/messages')">返回消息中心</button></div>`;
  };
  PAGES.studentOrders=function(){
    const items=store.studentOrders().slice().sort((a,b)=>stamp(b.updatedAt||b.createdAt)-stamp(a.updatedAt||a.createdAt));
    return `<div class="page v9-page tl-student-orders"><h1>订单管理</h1><p class="v9-market-lead">查看已承接需求的服务进度与记录。</p>${items.map(item=>`<article class="v9-provider" data-student-order-id="${E(item.id)}"><div class="tl-student-order-heading"><small>${E(item.providerName)}</small><span>${item.status==='completed'?'已完成':'服务中'}</span></div><h2>${E(item.title)}</h2><p>${E(item.categoryLabel)}</p><b>${item.price==null?'费用待确认':'¥'+E(item.price)}</b><p class="v9-market-footnote">${E(item.note)}</p><button type="button" class="v9-fav-btn" onclick="viewStudentDemand('${E(item.sourceId)}')">查看原需求 ›</button></article>`).join('')||'<div class="v9-empty"><b>还没有服务记录</b><p>发布需求并被服务者承接后，会在这里查看服务进度。</p><button onclick="go(\'#/studentDemandList\')">查看我的需求</button></div>'}</div>`;
  };
  NAV.messageNotice={title:'消息通知'};NAV.studentOrders={title:'订单管理'};
  const previousBack=back;
  back=function(){if(key()==='messageNotice')return go('#/messages');if(key()==='studentOrders')return go('#/me');return previousBack();};
  if(T.role&&['messages','messageNotice','studentOrders'].includes(key()))render();
})();
