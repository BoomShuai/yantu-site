/* 仅增强展示、错误说明和小屏适配；所有路由、数据及业务动作沿用原实现。 */
(function () {
  'use strict';
  function errorMessage(error, fallback='暂时无法完成操作，请稍后重试。') {
    const text=String(typeof error==='string'?error:error?.message||error?.errMsg||'').trim();
    if(/QuotaExceededError|^quota$|(?:^|\s)storage(?:\s|$)|存储不可用|本地保存失败|本地存储失败/i.test(text))return '暂时无法保存，请检查设备存储空间后重试。';
    if(/本机.*格式异常/.test(text))return '暂时无法读取已保存的记录，请刷新重试。清理设备数据前，请先保留需要的资料。';
    if(/privacy.*(reject|authoriz)|permission.*denied/i.test(text))return '尚未获得文件访问授权，你可以重新选择文件或手动填写资料。';
    if(/failed to fetch|networkerror|network request|load failed|接口异常|系统错误\s*500/i.test(text))return '暂时无法连接，请检查网络后重试。';
    if(/localhost|HTTPS|crypto|TypeError|ReferenceError|SyntaxError|not_connected|TODO|https?:\/\//i.test(text))return fallback;
    return /[\u3400-\u9fff]/.test(text)?text:fallback;
  }
  window.TongluUI={errorMessage};
  const originalToast=toast;
  toast=function(message){return originalToast(errorMessage(message));};
  const notices={
    presale:'沟通记录仅保存在此设备，暂未发送。',
    proposal:'方案确认当前仅记录在此设备。',
    checkout:'当前为流程体验，不会实际扣款。',
    delivery:'交付内容为流程参考，请以实际服务约定为准。'
  };
  function polish() {
    const route=(location.hash.replace(/^#\/?/,'')||'choose').split('/')[0];
    document.body.dataset.uiRoute=route;
    const app=document.getElementById('app');
    if(!app)return;
    const mentorLayout=window.__TL?.role==='mentor'&&['messages','experience','mentorProfile','mentorAuth'].includes(route);
    if(mentorLayout)app.firstElementChild?.classList.add('tl-mentor-legacy-page');
    const notice=notices[route];
    if(notice&&!app.querySelector('[data-ui-footnote]')){
      const node=document.createElement('p');node.className='tl-ui-footnote';node.dataset.uiFootnote='';node.textContent=notice;
      (app.firstElementChild||app).appendChild(node);
    }
    app.querySelectorAll('.v4-kicker,.v5-eyebrow,.tl-demand-eyebrow,.tl-v2-kicker,.tl-my-feature-head small').forEach(node=>{
      if(node.closest('.tl-mentor-legacy-page'))return;
      if(!/[\u3400-\u9fff]/.test(node.textContent))node.remove();
    });
    const navTitle=document.querySelector('#navbar .nav-title')?.textContent.trim();
    const tabbar=document.getElementById('tabbar');
    const studentTab={profile:'me',diagnosis:'me',experience:'me',dataCenter:'me',about:'me',privacy:'me',feedback:'me',reviews:'providers',quota:'me',nocandidate:'providers',studentDemand:'home',studentDemandList:'home'};
    if(window.__TL?.role==='student'&&studentTab[route]){
      tabbar?.querySelectorAll('.tab').forEach(node=>node.classList.toggle('active',node.getAttribute('onclick')?.match(/#\/([^'"\s)]+)/)?.[1]===studentTab[route]));
    }
    tabbar?.querySelectorAll('.tab').forEach(node=>{
      node.setAttribute('aria-current',node.classList.contains('active')?'page':'false');
      node.setAttribute('aria-label',node.querySelector('span')?.textContent.trim()||node.textContent.trim());
    });
    app.querySelectorAll('.page > h1,.page > .v9-heading > h1').forEach(node=>{
      if(node.closest('.tl-mentor-legacy-page'))return;
      if(node.textContent.trim()===navTitle)node.classList.add('tl-ui-visually-hidden');
    });
    const t=document.getElementById('toast');
    if(t){t.setAttribute('role','status');t.setAttribute('aria-live','polite');}
    app.querySelectorAll('input,textarea,select').forEach(node=>{
      if(!node.getAttribute('aria-label')&&!node.labels?.length){
        const label=node.closest('label')?.querySelector('span')?.textContent||node.placeholder;
        if(label)node.setAttribute('aria-label',label);
      }
    });
  }
  const originalRender=render;
  render=function(){originalRender();polish();};
  function viewport(){
    const height=window.visualViewport?.height||window.innerHeight;
    document.documentElement.style.setProperty('--ui-viewport-height',Math.round(height)+'px');
  }
  window.visualViewport?.addEventListener('resize',viewport);
  window.addEventListener('resize',viewport);
  // 沿用字段现有约束，仅将浏览器的校验提示改为统一中文。
  document.addEventListener('invalid',event=>{
    const node=event.target;
    if(typeof node.setCustomValidity!=='function')return;
    const label=node.closest('label')?.querySelector('span')?.textContent||node.labels?.[0]?.textContent||node.getAttribute('aria-label')||'这项信息';
    const name=label.trim().replace(/\s+/g,' ').slice(0,32);
    let message='请检查'+name+'的填写格式。';
    if(node.validity.valueMissing)message='请填写'+name+'。';
    else if(node.validity.tooShort)message=name+'至少需要'+node.minLength+(node.type==='password'||node.name==='account'?'位。':'个字。');
    else if(node.validity.rangeUnderflow||node.validity.rangeOverflow)message='请填写'+node.min+'至'+node.max+'之间的'+name+'。';
    node.setCustomValidity(message);node.setAttribute('aria-invalid','true');
  },true);
  function clearValidation(event){const node=event.target;if(typeof node.setCustomValidity==='function'){node.setCustomValidity('');node.removeAttribute('aria-invalid');}}
  document.addEventListener('input',clearValidation);
  document.addEventListener('change',clearValidation);
  viewport();polish();
})();
