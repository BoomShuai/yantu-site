/* 双端注册共用展示组件；字段、解析和校验继续由各自流程处理。 */
(function(){
  'use strict';
  const E=value=>escapeTL(String(value??''));
  const accept='.pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown';
  window.TongluRegistration={
    stepper(steps,index,handler){return `<nav class="tl-reg-stepper" aria-label="资料填写步骤">${steps.map((step,i)=>`<button type="button" class="tl-reg-step ${i===index?'active':i<index?'done':''}" ${i===index?'aria-current="step"':''} onclick="${handler}(${i})"><span>${i<index?'✓':'0'+(i+1)}</span><small>${E(step.title)}</small></button>`).join('')}</nav>`;},
    heading(title,index,intro=''){return `<div class="tl-reg-heading"><h1 tabindex="-1">${E(title)}</h1><span>0${index+1} / 04</span></div>${intro?`<p class="tl-reg-intro">${E(intro)}</p>`:''}`;},
    resumeBar(role,ready,text=''){return `<button type="button" class="tl-reg-resume-bar" onclick="go('#/${role==='student'?'profile':'mentorAuth'}')"><span>${ready?'✓ 已从简历识别信息':'有现成简历？上传后可自动填充'}</span><em>上传个人简历 ›</em></button>${ready&&text?`<details class="tl-reg-source"><summary>查看识别原文</summary><pre>${E(text)}</pre></details>`:''}`;},
    uploadPage(role,state,busy){
      const mentor=role==='mentor',files=state.files||[],manual=mentor?"tlStartMentorRegistration()":"go('#/profile/basic')";
      return `<div class="page tl-registration tl-reg-upload" id="${mentor?'tl-mentor-intake':'v5-intake'}"><header class="tl-reg-upload-heading"><h1 tabindex="-1">个人简历</h1><p class="tl-reg-intro">选择简历后自动整理个人情况，识别结果可逐项核对。</p></header><div class="tl-reg-upload-content"><label class="tl-reg-upload-box ${busy?'is-busy':''}"><span class="tl-reg-upload-icon" aria-hidden="true">${busy?'◌':'↑'}</span><b>${busy?'正在识别个人简历…':'上传个人简历'}</b><small>PDF / DOCX / TXT / MD · 最大 8 MB<br>聊天文件可先保存到设备后选择。</small><span class="tl-reg-upload-action">${busy?'请稍候':'选择简历'}</span><input type="file" aria-label="${mentor?'上传服务者个人简历':'上传个人简历'}" title="上传个人简历" accept="${accept}" ${busy?'disabled':''} onclick="tlPickRegistrationResume(event,'${role}')" onchange="tlChooseRegistrationResume('${role}',event)"></label>${busy?'<p class="tl-reg-intro" role="status">正在识别简历，请稍候…</p>':''}${files.map((file,i)=>`<div class="tl-reg-uploaded"><div><b>${E(file.name)}</b><small id="v5-file-status-${role}-${i}">${E(file.status)}</small></div><button type="button" ${busy?'disabled':''} onclick="v5RemoveFile('${role}',${i})">移除</button></div>`).join('')}<button class="tl-reg-manual" type="button" onclick="${manual}">${files.length?'查看或填写个人情况':'没有简历？试试填写个人情况'}</button></div></div>`;
    }
  };
  window.tlStartMentorRegistration=function(){window.tlV8ResetMentorStep?.();go('#/mentorProfile');};
  window.tlChooseRegistrationResume=async function(role,event){
    if(!['student','mentor'].includes(role))return;
    const before=new Set(window.__TLV5.getState()[role].files);
    await window.v5ChooseFiles(role,event);
    if(role==='mentor'&&window.__TLV5.getState().mentor.files.some(file=>file.ok&&!before.has(file)))window.tlStartMentorRegistration();
  };
  window.tlPickRegistrationResume=async function(event,role){
    const importer=window.TongluAdapters?.fileImport;
    if(!importer?.canUseChat())return;
    event.preventDefault();if(window.__TLV5.isUploading(role))return;
    try{const files=await importer.chooseResume();if(files.length)await window.tlChooseRegistrationResume(role,{target:{files,value:''}});}
    catch(error){if(!/cancel/i.test(error.errMsg||error.message||''))toast(error.message||'文件导入未完成，请重新选择或手动填写');}
  };
})();
