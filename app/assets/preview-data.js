/* 当前展示站默认带样例数据；empty=1 保留空白流程验证。样例与原有资料分开保存。 */
(function(){
  'use strict';
  const params=new URLSearchParams(location.search);
  if(params.get('empty')==='1'||params.get('preview')==='0')return;
  if(window.TongluPreview)return;
  const prefix='tonglu-sample-v2:',local=window.localStorage,session=window.sessionStorage;
  const descriptors={local:Object.getOwnPropertyDescriptor(window,'localStorage'),session:Object.getOwnPropertyDescriptor(window,'sessionStorage')};
  function scoped(native){
    const keys=()=>Array.from({length:native.length},(_,i)=>native.key(i)).filter(k=>k?.startsWith(prefix));
    return Object.freeze({get length(){return keys().length;},key:i=>keys()[i]?.slice(prefix.length)??null,
      getItem:key=>native.getItem(prefix+String(key)),setItem:(key,value)=>native.setItem(prefix+String(key),String(value)),
      removeItem:key=>native.removeItem(prefix+String(key)),clear:()=>keys().forEach(key=>native.removeItem(key))});
  }
  try{
    Object.defineProperty(window,'localStorage',{configurable:true,get:()=>sandboxLocal});
    Object.defineProperty(window,'sessionStorage',{configurable:true,get:()=>sandboxSession});
  }catch(error){
    Object.defineProperty(window,'localStorage',descriptors.local);Object.defineProperty(window,'sessionStorage',descriptors.session);
    window.TongluPreview={enabled:false,error:true};return;
  }
  const sandboxLocal=scoped(local),sandboxSession=scoped(session);
  // 将其他演示标签页的变更转回应用使用的键名；正式资料变化不进入演示页面。
  window.addEventListener('storage',event=>{
    if(event.storageArea!==local&&event.storageArea!==session)return;
    event.stopImmediatePropagation();
    if(event.key?.startsWith(prefix))window.dispatchEvent(new StorageEvent('storage',{key:event.key.slice(prefix.length),oldValue:event.oldValue,newValue:event.newValue}));
  },true);
  const day=(offset=0)=>{const d=new Date();d.setDate(d.getDate()+offset);return d.toLocaleDateString('sv-SE');};
  const at=(days=0,hour=10,minute=0)=>new Date(day(days)+`T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:00`).toISOString();
  const put=(key,value)=>sandboxLocal.setItem(key,JSON.stringify(value));
  function seed(){
    const people=[
      ['lin','林予安','计算机科学与技术','计算机类','项目经历表达与简历结构'],
      ['zhou','周知夏','金融学','经管类','申请规划与面试复盘'],
      ['chen','陈景行','机械工程','工科/机械','工程项目与科研竞赛梳理'],
      ['xu','许安然','应用统计','数理统计','建模经历与研究计划'],
      ['shen','沈屿川','新闻传播学','人文社科','个人陈述与跨方向申请'],
      ['tang','唐沐晴','外国语言文学','通用学科','英语表达与面试练习']
    ].map(([id,name,major,discipline,focus])=>({id:'preview-mentor-'+id,name,major,discipline,focus}));
    const primary=people[0];
    const accounts=people.map(p=>({mentorId:p.id,account:p.id,authType:'profile',profile:{name:p.name,sample:true,school:'江城大学',major:p.major,destination:p.major+'方向研究生',services:p.focus,capabilities:['简历润色','面试模拟','保研规划辅导'],bio:'围绕项目经历、申请材料和面试表达提供具体建议，帮助学生建立可执行的准备计划。',educationProof:{name:'学历材料.txt',size:0},certFiles:[],registered:true}}));
    const categories=[['resume','简历润色'],['interview','面试模拟'],['guidance','保研规划辅导'],['research_ext','科研竞赛规划（保研延伸）']];
    const specs=[
      [0,0,'计算机简历结构与项目贡献梳理','围绕一页简历逐段批注，梳理课程项目、个人分工与可核验成果，交付修改建议清单。',199,3],
      [0,1,'计算机项目问答模拟与复盘','45 分钟线上模拟，围绕简历项目追问方法、贡献与局限，附逐题复盘记录。',159,2],
      [1,2,'商科申请方向与材料清单梳理','结合个人背景与公开项目要求，整理目标方向对照表及准备清单，包含一次沟通。',299,2],
      [1,1,'金融商科面试模拟与经历表达','围绕实习、课程研究和案例分析练习表达，交付问题清单和后续练习建议。',169,4],
      [2,0,'机械工程项目经历表达反馈','梳理设计任务、工程约束、个人贡献和验证结果，提供简历批注与结构建议。',189,3],
      [2,3,'工程科研与竞赛复盘计划','基于已有项目和比赛资料梳理技术路线与复盘问题，交付四周行动计划，不代做项目。',259,2],
      [3,3,'统计建模经历与研究兴趣梳理','结合现有模型、代码和实验记录，整理问题、方法与验证过程，形成经历表达清单。',229,3],
      [3,2,'数理统计申请准备清单','对照公开招生要求整理课程基础、英语、研究经历与材料优先级，交付可编辑清单。',249,1],
      [4,0,'人文社科个人陈述结构反馈','围绕真实阅读、课程和实践经历梳理申请动机，交付结构批注与修改提纲。',179,3],
      [4,2,'跨方向申请背景与课程梳理','核对目标项目公开要求，整理已有课程和实践的关联，标明需要自行补充的准备内容。',279,2],
      [5,1,'英语面试模拟与表达复盘','30 分钟线上问答，练习自我介绍与项目讲述，提供常见表达问题及练习清单。',129,4],
      [0,3,'科研阅读与项目复盘安排','基于现有研究兴趣整理阅读路线、笔记模板与每周复盘安排，仅提供方法反馈。',239,2]
    ];
    const skus=specs.map(([p,c,title,subtitle,price,capacityLeft],i)=>({id:'preview-sku-'+(i+1),providerId:people[p].id,providerName:people[p].name,sample:true,providerType:'经验分享者',providerBrief:people[p].major+' · '+people[p].focus,title,subtitle,category:categories[c][0],categoryLabel:categories[c][1],discipline:people[p].discipline,tags:[categories[c][1],people[p].discipline],price,capacityLeft,status:i===11?'off_shelf':'on_shelf',deliveryCycle:c===1?'预约后完成，次日提供复盘':'沟通后 3 日内',serviceMode:c===1?'线上模拟 + 复盘清单':'线上沟通 + 文档批注',complianceNote:'围绕真实经历提供申请准备与规划支持，不承诺竞赛或录取结果。',salesCount:0,createdAt:at(-7),updatedAt:at(-i%3)}));
    const briefs=[
      ['简历润色','两段课程项目不知道怎样体现个人贡献，希望得到一页简历结构和项目表达的具体反馈。','open'],
      ['面试模拟','想练习五分钟项目介绍及方法追问，希望模拟后得到表达逻辑和薄弱点的复盘建议。','open'],
      ['科研竞赛规划（保研延伸）','已经完成一个图像分类课程项目，希望梳理实验记录、基线对比与后续论文阅读计划。','open'],
      ['保研规划辅导','正在准备下一轮申请，想对照目标院校公开要求整理材料清单和每周行动安排。','open'],
      ['简历润色','需要将大创项目和课程设计整理成真实可核对的简历条目，已约定交付逐段批注和修改清单。','accepted'],
      ['面试模拟','准备计算机方向项目问答，希望围绕实验设计、个人分工和失败尝试进行一次模拟复盘。','accepted'],
      ['简历润色','已完成项目经历初稿，约定对教育背景、项目条目与个人贡献的表达进行一轮结构反馈。','completed'],
      ['面试模拟','希望练习英文自我介绍和课程项目说明，围绕表达清晰度与常见追问提供复盘清单。','completed']
    ];
    const demands=briefs.map(([category,description,status],i)=>({id:'preview-demand-'+(i+1),school:'江城理工大学',major:'计算机科学与技术',grade:'大三',rank:'12 / 126',discipline:'计算机类',targetSchool:'南京、杭州方向高校',targetMajor:'计算机技术',categories:[category],description,expectedTime:day(i<4?3:-3),status:'published',acceptStatus:status,acceptedBy:i<4?null:{mentorId:i===7?people[5].id:primary.id,mentorName:i===7?people[5].name:primary.name,acceptedAt:at(-4)},createdAt:at(i<4?-4+i:-10+i-4),updatedAt:at(i<4?0:-1,9+i,10)}));
    const orders=demands.slice(4).map((d,i)=>({id:'preview-order-'+(i+1),mentorId:d.acceptedBy.mentorId,sourceType:'demand',sourceId:d.id,title:d.description,sample:true,studentLabel:'小林',discipline:d.discipline,categoryLabel:d.categories.join('、'),price:[null,159,199,129][i],status:i<2?'in_progress':'completed',paymentStatus:i<2?'unpaid':'settled',createdAt:at(-4),updatedAt:at(-1,11+i),note:i<2?'服务范围与费用待双方确认；未付款。':'已完成材料反馈与复盘，服务记录已归档。'}));
    const conversations=[0,2,6,10].map((skuIndex,i)=>{
      const item=skus[skuIndex];
      const pairs=[
        ['我整理了大创和课程项目，想先确认简历结构。','可以先发去除联系方式的内容，我会从项目目标、个人分工和成果依据三个方面反馈。','好的，我希望周末前拿到修改建议清单。','已记下，沟通时会先一起确认交付范围。'],
        ['跨方向申请时应该先准备哪些材料？','建议先核对目标项目是否接收跨方向，再整理成绩、课程、研究与实践的证明。','明白了，我先把已有材料分类整理。'],
        ['建模比赛结束后，复盘应该保留哪些内容？','建议保留问题假设、你负责的部分、验证结果与局限性，避免只写奖项名称。','我已经有实验记录，想重点梳理个人贡献。','可以，沟通时我们按真实记录逐项核对。'],
        ['英文项目介绍比较容易卡顿，可以先练结构吗？','可以先练问题、方法、结果三部分，再围绕你的真实项目做追问。','我先准备一版两分钟介绍。']
      ];
      return {id:'preview-chat-'+(i+1),providerId:item.providerId,sample:true,studentName:'小林',skuId:item.id,skuSnapshot:item,entries:pairs[i].map((text,j)=>({who:j%2?'mentor':'me',text,at:at(i?-i:0,9+i,j*5)})),updatedAt:at(i?-i:0,9+i,25)};
    });
    const profile={sample:true,name:'小林',school:'江城理工大学',major:'计算机科学与技术',grade:'大三',goals:['保研','科研','竞赛'],confirmed:true,rank:'12 / 126',research:'图像分类课程项目：负责数据划分、基线复现和实验记录；大创项目中负责模型对比与结果分析。',contest:'数学建模校级比赛，负责数据清洗与结果可视化。',targetSchool:'南京、杭州方向高校',targetMajor:'计算机技术',direction:'机器学习与计算机视觉',degree:'专硕',cross:'否',updatedAt:at(-1)};
    profile.raw='姓名：小林\n本科院校：江城理工大学\n本科专业：计算机科学与技术\n当前年级：大三\n成绩排名：12/126\n科研经历：'+profile.research+'\n获奖经历：'+profile.contest+'\n目标：保研、科研、竞赛';
    put('tonglu-mentor-accounts-v1',accounts);put('tonglu-mentor-auth-v1',{loggedIn:true,mentorId:primary.id,account:primary.id,registered:true,mode:'local_profile',loginAt:at()});put('tonglu-mentor-profile-identity-v1',primary.id);
    put('tonglu-sync-market-skus-v1',skus);put('tonglu-student-demands-v1',demands);put('tonglu-mentor-orders-v1',orders);put('tonglu-v4-local-consultations',conversations);
    put('tonglu-v3-student-bg',profile);put('tonglu-v3-plan-tasks',{bc1:true,research1:true,contest1:true});
    put('tonglu-v5-intake-draft',{student:{text:profile.raw,files:[],fields:{...profile,goals:profile.goals.join('、')},edited:[],preview:false,confirmed:true,source:'个人资料'},mentor:{files:[]}});
    put('tonglu-v4-supplement',{targets:{undergrad:profile.major,major:profile.targetMajor,schools:profile.targetSchool,degree:'专硕',direction:profile.direction,cross:'否'},research:[{id:'preview-research',title:'图像分类课程项目',role:'数据处理与基线复现',result:'完成实验记录与对比报告'}],contests:[{id:'preview-contest',title:'校级数学建模',role:'数据处理与可视化',result:'完成建模报告'}],files:[],ranks:[],myReviews:[]});
    put('tonglu-purple-gold-v1',{savedMentors:[people[0].id,people[1].id,people[3].id],savedSchools:['hit-2027-tuimian-xitong-tixing','sjtu-2027-yigong-jiaocha-boshi-jianzhang','tongji-2027-tuimian-xitong-liucheng-tishi'],customSchools:[],applications:[['南湖大学','准备中'],['海川大学','已投递'],['明州大学','审核中']].map(([school,status],i)=>({id:'preview-application-'+i,school,program:'计算机技术',date:day(-7+i),status,deadline:''}))});
    put('tonglu-mentor-workbench-v1',{[primary.id]:{accepting:true,slots:[['09:00','10:00','简历反馈沟通'],['14:00','15:00','项目问答模拟'],['19:00','20:00','材料复盘']].map(([start,end,note],i)=>({id:'preview-slot-'+i,date:day(i+1),start,end,note}))}});
    put('tonglu-mentor-peer-favorites-v1',{legacyImported:true,[primary.id]:[people[1].id,people[3].id]});
    put('tonglu-message-center-v1',{student:{chats:{'preview-chat-1':2,'preview-chat-2':3,'preview-chat-3':2},notices:{}},['mentor:'+primary.id]:{chats:{'preview-chat-1':1},notices:{}}});
    sandboxLocal.setItem('preview-ready','1');
  }
  function reset(){sandboxLocal.clear();sandboxSession.clear();location.reload();}
  try{if(!sandboxLocal.getItem('preview-ready'))seed();window.TongluPreview={enabled:true,reset};}
  catch(error){sandboxLocal.clear();window.TongluPreview={enabled:false,error:true};}
})();
