/* 资讯筛选、服务者多选与授权榜单关联。与页面渲染分离。 */
(function(root){
  'use strict';
  const MAJORS={
    '计算机':/计算机|软件|人工智能|网络空间|密码|数据科学/,
    '电子信息':/电子|通信|信息工程|电气|自动化|控制/,
    '机械':/机械|车辆|航空|航天|机器人/,
    '材料':/材料|化学|化工/,'能源':/能源|动力|热能/,
    '经管':/经济|管理|金融|会计|资产评估|商学/,'法学':/法学|法律/,
    '农学':/农业|农学|生物|园艺/,'医学':/医学|临床|口腔|药学/
  };
  const CAPABILITIES={
    '材料诊断':/材料|简历|文书|个人陈述/,'研究经历':/研究经历|项目梳理/,
    '竞赛':/竞赛|比赛|建模/,'科研':/科研|研究|课题|论文/,'面试模拟':/面试|模拟面试/
  };
  function recentYears(now=new Date()){
    const year=Number(new Intl.DateTimeFormat('en',{timeZone:'Asia/Shanghai',year:'numeric'}).format(now));
    return Array.from({length:5},(_,i)=>String(year-i));
  }
  const textOf=n=>[n.school,n.college,n.title,n.summary,n.detail].filter(Boolean).join(' ');
  function newsMatches(n,f,school){
    const text=textOf(n),year=String(n.publishedAt||'').match(/^\d{4}/)?.[0]||'';
    if(f.major&&f.major!=='全部'&&!MAJORS[f.major]?.test(text))return false;
    if(f.type&&f.type!=='全部'&&school?.type!==f.type)return false;
    if(f.city&&f.city!=='全部'&&school?.city!==f.city)return false;
    if(f.year&&f.year!=='全部'&&year!==f.year)return false;
    return !f.q||text.toLowerCase().includes(f.q.trim().toLowerCase());
  }
  function providerMatches(p,f,meta={}){
    const identity=meta.idType||p.identity||'申请经验前辈';
    if(f.identities?.length&&!f.identities.includes(identity))return false;
    const skills=[...(p.tags||[]),...(p.services||[]).map(s=>s.name)].join(' ');
    if(f.capabilities?.length&&!f.capabilities.some(c=>CAPABILITIES[c]?.test(skills)))return false;
    return !f.q||[p.name,p.brief,skills].join(' ').toLowerCase().includes(f.q.trim().toLowerCase());
  }
  function partitionAdmissions(records,links,providers,programId,year){
    const rows=records.filter(r=>r.programId===programId&&String(r.year)===String(year));
    const pins=[],ids=new Set();
    for(const link of links){
      if(link.authorized!==true||link.programId!==programId||String(link.year)!==String(year))continue;
      const record=rows.find(r=>r.id===link.recordId),provider=providers.find(p=>p.id===link.providerId);
      if(!record||!provider||ids.has(record.id))continue;
      ids.add(record.id);pins.push({record,provider});
    }
    return {pins,others:rows.filter(r=>!ids.has(r.id))};
  }
  const api={MAJORS,CAPABILITIES,recentYears,newsMatches,providerMatches,partitionAdmissions};
  root.TongluV9Core=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
