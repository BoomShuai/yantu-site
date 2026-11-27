(function(){
  'use strict';
  const preview=window.TongluPreview;if(!preview)return;
  const bar=document.createElement('aside');bar.id='tl-preview-bar';bar.setAttribute('aria-label','数据演示工具');
  const exit=new URL(location.href);exit.searchParams.delete('preview');exit.searchParams.delete('role');exit.hash='#/choose';
  if(!preview.enabled){bar.innerHTML='<b>演示数据暂时无法载入</b><span>请检查浏览器存储设置后重新打开。</span>';const a=document.createElement('a');a.href=exit.href;a.textContent='返回应用';bar.append(a);document.querySelector('.screen').prepend(bar);return;}
  bar.innerHTML=`<div class="tl-preview-heading"><b>数据演示</b><small>虚构人物、会话与交易</small><a href="${exit.href}">退出预览</a></div><nav aria-label="演示身份"><button type="button" data-preview-role="student">学生端</button><button type="button" data-preview-role="mentor">服务者端</button><button type="button" data-preview-menu aria-expanded="false">板块导航</button><button type="button" data-preview-reset>重置</button></nav><div class="tl-preview-menu" hidden><p>资讯保留公开来源；人物、价格、收入与申请进度均为演示。可自由操作，不影响你已填写的内容。</p><div data-preview-links></div></div>`;
  document.querySelector('#navbar').before(bar);
  function update(){
    const mentor=window.__TL.role==='mentor';bar.querySelectorAll('[data-preview-role]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.previewRole===(mentor?'mentor':'student'))));
    const links=mentor?[['同路集市','mentorMarket'],['学生需求','mentorDemands'],['消息中心','messages'],['个人中心','mentorMe'],['服务者信息','mentorProfile'],['服务工作台','workbench'],['同行收藏','mentorPeers'],['订单管理','mentorOrders'],['培训中心','experience']]:[['同路集市','providers'],['消息中心','messages'],['个人中心','me'],['个人资料','profile/basic'],['我的需求','studentDemandList'],['订单管理','studentOrders'],['院校资讯','school/notices'],['投递记录','school/records'],['院校收藏','school/saved'],['经验指南','experience'],['首页','home']];
    const box=bar.querySelector('[data-preview-links]');box.replaceChildren(...links.map(([label,route])=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',()=>{go('#/'+route);close();});return b;}));
  }
  function close(){bar.querySelector('.tl-preview-menu').hidden=true;bar.querySelector('[data-preview-menu]').setAttribute('aria-expanded','false');}
  bar.querySelectorAll('[data-preview-role]').forEach(b=>b.addEventListener('click',()=>{selectTongluRole(b.dataset.previewRole);go(b.dataset.previewRole==='mentor'?'#/mentorMarket':'#/providers');update();close();}));
  bar.querySelector('[data-preview-menu]').addEventListener('click',()=>{const panel=bar.querySelector('.tl-preview-menu');panel.hidden=!panel.hidden;bar.querySelector('[data-preview-menu]').setAttribute('aria-expanded',String(!panel.hidden));});
  bar.querySelector('[data-preview-reset]').addEventListener('click',preview.reset);
  window.addEventListener('hashchange',update);update();
})();
