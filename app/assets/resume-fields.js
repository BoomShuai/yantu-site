/* 简历正文 -> 待核对字段。仅提取文本中出现的内容，不推断成绩、年级或申请意愿。 */
(function(root){
  'use strict';

  function collapseSpacedCJK(text){
    return String(text||'').replace(
      /(?<![㐀-鿿])[㐀-鿿](?: [㐀-鿿]){1,9}(?![㐀-鿿])/g,
      m=>m.replace(/ /g,'')
    );
  }

  function normalize(text){
    const cleaned=String(text||'')
      .replace(/﻿/g,'')
      .normalize('NFKC')
      .replace(/[​-‍­]/g,'')
      .replace(/[-]/g,' ')
      .replace(/\r\n?/g,'\n')
      .replace(/\t+/g,'  ')
      .replace(/ {3,}/g,'  ')
      .replace(/^[ \t]*[\u009f•▪●◦■◆◇★☆➢➤►·]+\s*/gm,'')
      .replace(/ *\n */g,'\n');
    return collapseSpacedCJK(cleaned);
  }

  const heads={
    education:['教育背景','教育经历','学习经历','教育信息','学业背景','学术背景','学历背景','本科背景','Education','Educational Background'],
    research:['科研与项目经历','科研/项目经历','科研经历','研究经历','科研项目','研究项目','项目经历','项目经验','学术经历','学术成果','科研成果','论文与成果','发表论文','论文发表','科研论文','课题研究','课题经历','专利与论文','科研情况','Research Experience','Research','Projects','Project Experience','Publications'],
    contest:['竞赛与获奖','荣誉与奖项','获奖与荣誉','获奖经历','获奖情况','荣誉奖项','荣誉奖励','竞赛经历','竞赛获奖','学科竞赛','竞赛成果','所获奖励','奖励荣誉','奖励情况','所获荣誉','奖项荣誉','获奖记录','竞赛情况','Awards','Honors','Honours','Competitions'],
    other:['个人信息','基本信息','专业技能','技能证书','技能与证书','外语水平','英语水平','语言能力','主修课程','核心课程','自我评价','个人优势','个人总结','实习与工作经历','实习经历','实践经历','社会实践','工作经历','校园与实践经历','校园经历','学生工作','个人简介','申请意向','求学意向','申请目标','目标与诉求','联系方式','Skills','Work Experience','Personal Information','Objective']
  };

  const labels=['本科院校','本科学校','毕业院校','就读院校','毕业学校','就读学校','所在院校','所在学校','本科专业','所学专业','主修专业','专业方向','当前年级','在读年级','年级','专业排名','综合排名','年级排名','成绩排名','绩点排名','排名','绩点','GPA','加权成绩','平均成绩','加权平均分','均分','目标院校','意向院校','学校偏好','申请院校','目标专业','申请专业','意向专业','研究方向','意向方向','姓名','称呼','性别','年龄','出生年月','出生日期','政治面貌','民族','籍贯','电话','手机','手机号','联系电话','邮箱','电子邮箱','微信','QQ','目标与诉求','申请意向','申请目标','求学意向','升学去向','学位类型','跨专业意向','学历','学位','外语水平','英语水平','四六级','学校','院校','学院','院系','专业','Name','Major','School','University','Email','Phone'];

  const ALL_HEADINGS=Object.values(heads).flat();
  const ALL_HEADING_SET=new Set(ALL_HEADINGS.map(s=>s.toLowerCase()));
  const ALL_LABEL_SET=new Set(labels.map(s=>s.toLowerCase()));
  const NAME_STOP=new Set([...ALL_HEADINGS,...labels,'个人简历','简历','求职简历','保研简历','推免简历','本科','学士','硕士','博士','在读','男','女','中共党员','共青团员','群众','汉族','联系方式','基本信息','个人信息']);

  const SUB_COLLEGE_RX=/^(?:计算机|软件|信息|电子|通信|自动化|人工智能|智能|数据|网络|电气|机械|材料|化学|物理|数学|统计|经济|金融|管理|商|法|文|理|工|医|艺术|外国语|新闻|建筑|土木|环境|能源|生物|生命|航空|航天|物理与|信息与|电子与|计算机与|经济与|数学与|软件与|人工智能与|智能计算)[㐀-鿿]{0,12}?(?:学院|学部)$/;

  function escRx(s){return String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}

  function cleanSchool(s){
    return String(s||'')
      .replace(/^(?:教育背景|教育经历|本科院校|本科学校|毕业院校|就读院校|毕业学校|就读学校|所在院校|学校|院校|我在|我是|我来自|本科就读于|就读于|毕业于|目前就读于|本科|全日制本科)\s*[:：]?\s*/,'')
      .replace(/^\d{4}[.年/-]\d{1,2}(?:\s*[-–—~至到]\s*(?:\d{4}[.年/-]\d{1,2}|至今|现在))?\s*/,'')
      .replace(/[\s,，;；|｜]+$/,'')
      .trim();
  }

  function schoolMatch(s){
    const cleaned=String(s||'').replace(/\d{4}[.年/-]\d{1,2}(?:月)?/g,' ');
    // 优先匹配“大学”，避免把“XX大学计算机学院”误判成“计算机学院”
    const uni=cleaned.match(/[㐀-鿿]{2,22}?大学(?:\([^)]+\))?/);
    if(uni)return cleanSchool(uni[0]);
    const col=cleaned.match(/[㐀-鿿]{2,22}?学院(?:\([^)]+\))?/);
    if(col){
      const candidate=cleanSchool(col[0]);
      if(candidate&&!SUB_COLLEGE_RX.test(candidate))return candidate;
    }
    return '';
  }

  function cleanMajorValue(raw, school){
    let v=String(raw||'');
    if(school&&v.includes(school))v=v.split(school).slice(1).join(' ');
    v=v
      .replace(/\d{4}[.年/-]\d{1,2}(?:月)?\s*(?:[-–—~至到]\s*(?:\d{4}[.年/-]\d{1,2}(?:月)?|至今|现在))?/g,' ')
      .replace(/\b20\d{2}\s*[-–—~至到]\s*(?:20\d{2}|至今|现在)\b/g,' ')
      .replace(/\b20\d{2}\b/g,' ')
      .replace(/^.*?(?:学院|学部)\s*/,'')
      // 在排名、绩点、年级、课程等后续字段前截断
      .split(/(?:专业排名|综合排名|年级排名|成绩排名|绩点排名|排名|绩点|\bGPA\b|加权成绩|平均成绩|加权平均分|均分|平均分|前\s*\d+(?:\.\d+)?\s*%|Top\s*\d+|大\s*[一二三四五12345]|本科\s*[一二三四五12345]\s*年级|主修课程|核心课程|推免|保研|荣誉|奖项|电话|手机|邮箱|Email|Phone)/i)[0];
    v=v
      .replace(/(?:全日制)?本科|工学学士|理学学士|文学学士|管理学学士|经济学学士|法学学士|学士|硕士|在读|至今|985|211|双一流/g,' ')
      .replace(/[|｜·()（）【】[\]—–-]/g,' ')
      .replace(/\s{2,}/g,'  ')
      .trim();
    if(!v)return '';
    // 多列残留时只取第一列
    v=v.split(/ {2,}|[，,;；/]/)[0].trim();
    // 去掉末尾的“专业”二字（如“软件工程专业” -> “软件工程”）
    if(/[㐀-鿿]{2,}专业$/.test(v))v=v.replace(/专业$/,'');
    if(v.length<2||/^(?:本科|学士|在读|全日制|统招|大[一二三四五])$/.test(v))return '';
    return v.slice(0,80).trim();
  }

  function parseStudent(raw){
    const text=normalize(raw);
    const lines=text.split('\n').map(s=>s.trim()).filter(Boolean);
    const sections={education:[],research:[],contest:[]};
    let current='';

    for(const line of lines){
      let found=false;
      const strippedLine=line.replace(/^[【\[（(]\s*/,'').replace(/\s*[】\]）)]$/,'');
      for(const [kind,names] of Object.entries(heads)){
        const heading=names.find(name=>{
          const rx=new RegExp('^(?:[一二三四五六七八九十0-9.、)）\\s【\\[]+)?'+escRx(name)+'(?:\\s*[】\\]]?\\s*[:：|｜—–-]\\s*|\\s*[】\\]]?\\s*$)','i');
          return rx.test(line)||rx.test(strippedLine);
        });
        if(heading){
          current=kind;
          const idx=line.toLowerCase().indexOf(heading.toLowerCase());
          const rest=idx>=0?line.slice(idx+heading.length).replace(/^\s*[】\]）)]?\s*[:：|｜—–-]?\s*/,''):'';
          if(rest&&sections[kind])sections[kind].push(rest);
          found=true;
          break;
        }
      }
      if(!found&&/^(?:目标院校|意向院校|学校偏好|目标专业|研究方向|姓名|电话|手机|邮箱)\s*[:：]/.test(line))current='';
      if(!found&&sections[current])sections[current].push(line);
    }

    const labelAlt=labels.map(escRx).join('|');
    const nextLabelColonRx=new RegExp('\\s+(?:'+labelAlt+')\\s*[:：]','i');
    const nextLabelGapRx=new RegExp(' {2,}(?:'+labelAlt+')(?:\\s*[:：]|\\s+)','i');

    function trimFieldValue(val){
      let v=String(val||'').trim();
      const m1=nextLabelColonRx.exec(v);
      if(m1)v=v.slice(0,m1.index);
      const m2=nextLabelGapRx.exec(v);
      if(m2)v=v.slice(0,m2.index);
      return v.replace(/^[:：\s]+|[\s;；|｜]+$/g,'').slice(0,150).trim();
    }

    function field(names){
      // 1. 优先匹配显式冒号：标签：值
      for(const name of names){
        const rx=new RegExp('(?:^|[\\n；;|｜]| {2,})\\s*'+escRx(name)+'\\s*[:：]\\s*([^\\n；;|｜]+)','i');
        const hit=text.match(rx);
        if(hit){
          const v=trimFieldValue(hit[1]);
          if(v&&!ALL_LABEL_SET.has(v.toLowerCase()))return v;
        }
      }
      // 2. 匹配空格/双空格分隔（如「本科院校  华中科技大学」「姓名 张明」）
      for(const name of names){
        const rx=new RegExp('(?:^|[\\n；;|｜]| {2,})'+escRx(name)+'(?: {1,})([^\\n；;|｜]+)','i');
        const hit=text.match(rx);
        if(hit){
          const v=trimFieldValue(hit[1]);
          if(v&&!ALL_LABEL_SET.has(v.toLowerCase())&&!ALL_HEADING_SET.has(v.toLowerCase()))return v;
        }
      }
      // 3. 匹配换行表格（上一行只有标签，下一行是值）
      for(const name of names){
        const exactRx=new RegExp('^'+escRx(name)+'\\s*[:：]?$','i');
        for(let i=0;i<lines.length-1;i++){
          if(!exactRx.test(lines[i]))continue;
          const next=lines[i+1].trim();
          if(!next||next.length>80)continue;
          const nextKey=next.replace(/[:：\s]/g,'').toLowerCase();
          if(ALL_LABEL_SET.has(nextKey)||ALL_HEADING_SET.has(nextKey))continue;
          return trimFieldValue(next);
        }
      }
      return '';
    }

    const edu=sections.education.join('\n');

    // 1. 本科院校
    let school=cleanSchool(field(['本科院校','本科学校','毕业院校','就读院校','毕业学校','就读学校','所在院校','所在学校','学校','院校']));
    if(school&&/(?:目标|意向|拟录取|保研到)/.test(school))school='';
    if(!school&&edu)school=schoolMatch(edu);
    if(!school)school=cleanSchool(text.match(/(?:我在|我是|我来自|本科就读于|就读于|毕业于|目前就读于)\s*([㐀-鿿]{2,25}?(?:大学|学院))/)?.[1]||'');
    if(!school)school=lines.slice(0,12).filter(l=>!/(?:目标|希望|意向|偏好|申请|想去|拟录取|保研到)/.test(l)).map(schoolMatch).find(Boolean)||'';
    if(!school){
      const enScope=edu||lines.slice(0,12).filter(l=>!/target|apply|goal/i.test(l)).join('\n');
      school=enScope.match(/(?:[A-Z][A-Za-z&'-]* +){0,4}(?:University|College|Institute)(?: of [A-Z][A-Za-z ]+)?/)?.[0]?.trim()||'';
    }

    // 2. 本科专业
    let major=field(['本科专业','所学专业','主修专业','专业方向','专业','Major']);
    if(major)major=cleanMajorValue(major, school)||major.replace(/^.*?(?:学院|学部)\s*/,'').trim();
    if(!major&&sections.education.length){
      const eduIdx=sections.education.findIndex(l=>school&&l.includes(school));
      if(eduIdx>=0){
        const row=sections.education[eduIdx];
        major=cleanMajorValue(row, school);
        // 有些简历第一行写「华中科技大学  2023.09-2027.06」，第二行写「计算机科学与技术 本科」
        if(!major&&sections.education[eduIdx+1]){
          const nextRow=sections.education[eduIdx+1];
          if(!/^(?:主修课程|核心课程|成绩|GPA|绩点|排名|荣誉|奖励)/i.test(nextRow)){
            major=cleanMajorValue(nextRow, school);
          }
        }
      }
      if(!major){
        const rowWithDegree=sections.education.find(l=>/本科|学士/.test(l))||'';
        if(rowWithDegree)major=cleanMajorValue(rowWithDegree, school);
      }
    }
    if(!major){
      const inlineMajor=text.match(/(?:大学|学院|学部)\s*([㐀-鿿]{2,18}?)(?:专业|系)/)?.[1]||'';
      if(inlineMajor)major=cleanMajorValue(inlineMajor, school)||inlineMajor;
    }
    major=major.replace(/^.*?(?:学院|学部)\s*/,'').trim();

    // 3. 姓名
    let name=field(['姓名','称呼','Name']);
    if(name){
      name=name.split(/\s*(?:[|｜/·]|性别|年龄|电话|手机|邮箱|男|女)\s*/)[0].trim();
      if(NAME_STOP.has(name))name='';
    }
    if(!name){
      for(const l of lines.slice(0,6)){
        if(/^[㐀-鿿]{2,4}$/.test(l)&&!NAME_STOP.has(l)){name=l;break;}
        // 兼容「张明 | 男 | 138...」「张明  个人简历」「个人简历 - 张明」
        const headName=l.match(/^([㐀-鿿]{2,4})(?:\s*[|｜/·—–-]\s*|\s{2,}|\s+(?:男|女|个人简历|保研简历|求职简历|1\d{10}|[\w.-]+@))/);
        if(headName&&!NAME_STOP.has(headName[1])){name=headName[1];break;}
        const tailName=l.match(/^(?:个人简历|保研简历|求职简历|简历)\s*[:：|｜/·—–-]\s*([㐀-鿿]{2,4})$/);
        if(tailName&&!NAME_STOP.has(tailName[1])){name=tailName[1];break;}
      }
    }

    // 4. 当前年级（仅提取文本明确写出的年级，不根据入学年份推断）
    const gradeRaw=field(['当前年级','在读年级','年级'])
      ||text.match(/(?:本科|大)\s*([一二三四五12345])(?:年级|上|下|在读)?/)?.[0]
      ||text.match(/\b(Freshman|Sophomore|Junior|Senior)\b/i)?.[0]
      ||'';
    const gradeMap={一:'大一',二:'大二',三:'大三',四:'大四',五:'大五',1:'大一',2:'大二',3:'大三',4:'大四',5:'大五',freshman:'大一',sophomore:'大二',junior:'大三',senior:'大四'};
    const grade=gradeMap[gradeRaw.toLowerCase()]||gradeMap[gradeRaw.match(/[一二三四五12345]/)?.[0]]||'';

    // 5. 成绩与排名
    const rankHit=text.match(/((?:专业|综合|年级|成绩|绩点|综测)?排名|rank(?:ing|ed)?)\s*[:：]?\s*\(?\s*((?:前|第|Top\s*)?\s*\d+(?:\.\d+)?\s*(?:\/\s*\d+|%|名)?)/i)
      ||text.match(/(专业|年级|综合)?(前\s*\d+(?:\.\d+)?\s*(?:%|名)|Top\s*\d+(?:\.\d+)?\s*%)/i);
    let rankVal='';
    let rankLabel='排名';
    if(rankHit){
      if(/排名|rank/i.test(rankHit[1]||'')){
        rankLabel=rankHit[1];
        rankVal=(rankHit[2]||'').replace(/\s+/g,' ').trim();
      } else {
        rankLabel=(rankHit[1]||'')+'排名';
        rankVal=(rankHit[2]||'').replace(/\s+/g,' ').trim();
      }
    }
    let rank=rankVal||field(['专业排名','综合排名','年级排名','成绩排名','排名'])||'';
    const gpa=text.match(/(?:\bGPA\b|平均学分绩点|绩点)\s*[:：]?\s*\(?\s*(\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)?)/i)?.[1]||'';
    const average=text.match(/(?:加权成绩|平均成绩|加权平均分|平均学分绩|均分)\s*[:：]?\s*\(?\s*(\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)?)/)?.[1]||'';
    if(gpa||average){
      rank=[rank?(rankLabel+' '+rank):'',gpa?'GPA '+gpa:'',average?'加权成绩 '+average:''].filter(Boolean).join(' · ');
    }

    // 6. 科研与获奖
    const directResearch=field(['科研经历','研究经历','科研项目','项目经历']);
    const directContest=field(['获奖经历','获奖情况','竞赛经历','荣誉奖项','荣誉奖励','所获荣誉']);
    const researchText=(sections.research.join('\n')||directResearch).trim();
    const contestParts=[];
    if(sections.contest.length)contestParts.push(sections.contest.join('\n'));
    if(directContest&&!contestParts.join('\n').includes(directContest))contestParts.unshift(directContest);
    const contestText=contestParts.join('\n').trim();

    // 7. 目标与诉求
    const goalsText=field(['目标与诉求','申请意向','申请目标','求学意向','诉求'])||lines.filter(l=>/希望|打算|计划|想要|想保研|目标是/.test(l)).join('；');
    const goals=['保研','科研','竞赛','学业'].filter((goal,i)=>[/(?:保研|推免|夏令营|预推免|升学)/,/(?:科研|论文|课题)/,/(?:竞赛|比赛|建模)/,/(?:学业|英语|绩点|课程)/][i].test(goalsText)).join('、');

    const targetSchool=field(['目标院校','意向院校','学校偏好','申请院校'])
      ||text.match(/(?:希望去|想去|保研到|目标院校为)\s*([㐀-鿿]{2,25}?(?:大学|学院))/)?.[1]
      ||'';

    return {
      name,
      school,
      major:major.slice(0,150),
      grade,
      rank,
      research:researchText.slice(0,2000),
      contest:contestText.slice(0,2000),
      goals,
      targetSchool,
      targetMajor:field(['目标专业','申请专业','意向专业']),
      direction:field(['研究方向','意向方向'])
    };
  }

  root.TongluResumeFields={parseStudent,normalize,collapseSpacedCJK};
  if(typeof module!=='undefined')module.exports=root.TongluResumeFields;
})(typeof window==='undefined'?globalThis:window);
