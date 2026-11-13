/* 简历正文 -> 待核对字段。仅提取文本中出现的内容，不推断成绩、年级或申请意愿。 */
(function(root){
  'use strict';
  const normalize=text=>String(text||'').normalize('NFKC').replace(/([\u3400-\u9fff]) +(?=[\u3400-\u9fff])/g,'$1').replace(/[ \t]+/g,' ').replace(/\r/g,'').replace(/^[ \t]*[\u009f•▪●◦]+\s*/gm,'');
  const heads={
    education:['教育背景','教育经历','学习经历','教育信息','Education','Educational Background'],
    research:['科研经历','研究经历','科研项目','研究项目','项目经历','项目经验','学术成果','科研成果','Research Experience','Research','Projects','Project Experience','Publications'],
    contest:['获奖经历','获奖情况','荣誉奖项','荣誉奖励','竞赛经历','竞赛获奖','所获奖励','奖励荣誉','奖励情况','Awards','Honors','Honours','Competitions'],
    other:['个人信息','基本信息','专业技能','技能证书','自我评价','实习经历','实践经历','社会实践','工作经历','校园经历','个人简介','申请意向','求学意向','申请目标','目标与诉求','联系方式','Skills','Work Experience','Personal Information','Objective']
  };
  const labels=['本科院校','本科学校','毕业院校','就读院校','本科专业','所学专业','当前年级','年级','专业排名','年级排名','排名','绩点','GPA','目标院校','意向院校','学校偏好','目标专业','申请专业','研究方向','姓名','称呼','性别','年龄','电话','手机','邮箱','目标与诉求','申请意向','学位类型','跨专业意向'];
  function parseStudent(raw){
    const text=normalize(raw), lines=text.split('\n').map(s=>s.trim()).filter(Boolean);
    const sections={education:[],research:[],contest:[]};let current='';
    for(const line of lines){
      let found=false;
      for(const [kind,names] of Object.entries(heads)){
        const heading=names.find(name=>new RegExp(String.raw`^(?:[一二三四五六七八九十0-9.、)）\s]+)?${name}(?:\s*[:：|｜—-]\s*|$)`,'i').test(line));
        if(heading){current=kind;const rest=line.slice(line.toLowerCase().indexOf(heading.toLowerCase())+heading.length).replace(/^\s*[:：|｜—-]\s*/,'');if(rest&&sections[kind])sections[kind].push(rest);found=true;break;}
      }
      if(!found&&/^(?:目标院校|意向院校|学校偏好|目标专业|研究方向|姓名|电话|邮箱)\s*[:：]/.test(line))current='';
      if(!found&&sections[current])sections[current].push(line);
    }
    function field(names){
      for(const name of names){
        const rx=new RegExp('(?:^|[\\n；;|｜])\\s*'+name+'\\s*[:：]\\s*([^\\n；;|｜]+)','i');
        const hit=text.match(rx);if(!hit)continue;
        let value=hit[1].trim();
        const next=new RegExp('\\s+(?:'+labels.join('|')+')\\s*[:：]','i').exec(value);
        if(next)value=value.slice(0,next.index);
        return value.slice(0,150).trim();
      }
      return '';
    }
    const schoolMatch=s=>s.match(/[\u3400-\u9fffA-Za-z·]{2,28}?(?:大学|学院)(?:\([^)]+\))?/)?.[0]||'';
    const edu=sections.education.join('\n');
    let school=field(['本科院校','本科学校','毕业院校','就读院校','学校','院校']);
    if(!school&&edu)school=schoolMatch(edu.replace(/\d{4}[.年/-]\d{1,2}(?:月)?/g,''));
    if(!school)school=text.match(/(?:我在|我是|我来自|本科就读于|就读于|毕业于)\s*([\u3400-\u9fff]{2,25}?(?:大学|学院))/)?.[1]||'';
    if(!school)school=lines.slice(0,10).filter(l=>!/(?:目标|希望|意向|偏好|申请|想去)/.test(l)).map(schoolMatch).find(Boolean)||'';
    if(!school)school=(edu||lines.slice(0,10).filter(l=>!/target|apply|goal/i.test(l)).join('\n')).match(/(?:[A-Z][A-Za-z&'-]* +){0,4}(?:University|College|Institute)(?: of [A-Z][A-Za-z ]+)?/)?.[0]?.trim()||'';
    let major=field(['本科专业','所学专业','专业','Major']);
    if(!major&&edu){
      const row=sections.education.find(l=>school&&l.includes(school)&&l.includes('本科'))||'';
      const suffix=row.split(school)[1]||'';
      major=suffix.replace(/\d{4}[.年/-]\d{1,2}/g,'').replace(/\b\d{4}\b/g,'').replace(/本科|学士|在读|至今/g,'').replace(/[|｜·()（）—–-]/g,' ').trim().split(/\s{2,}/)[0]||'';
    }
    if(!major)major=text.match(/(?:大学|学院)\s*([\u3400-\u9fff]{2,18}?)(?:专业|系)/)?.[1]||'';
    // PDF 常把「大学 + 学院 + 专业」连成一行，只保留学院名称之后的专业。
    major=major.replace(/^.*(?:学院|学部)\s*/,'').trim();
    let name=field(['姓名','称呼','Name']);
    if(!name)name=lines.slice(0,5).find(l=>/^[\u3400-\u9fff]{2,4}$/.test(l)&&![...Object.values(heads).flat(),...labels,'个人简历','简历','求职简历','本科','学士','在读'].includes(l))||'';
    const gradeRaw=field(['当前年级','年级'])||text.match(/(?:本科|大)\s*([一二三四五12345])(?:年级)?/)?.[0]||text.match(/\b(Freshman|Sophomore|Junior|Senior)\b/i)?.[0]||'';
    const gradeMap={一:'大一',二:'大二',三:'大三',四:'大四',五:'大五',1:'大一',2:'大二',3:'大三',4:'大四',5:'大五',freshman:'大一',sophomore:'大二',junior:'大三',senior:'大四'};
    const grade=gradeMap[gradeRaw.toLowerCase()]||gradeMap[gradeRaw.match(/[一二三四五12345]/)?.[0]]||'';
    const rankHit=text.match(/((?:专业|综合|年级|成绩)?排名|rank(?:ing|ed)?)\s*[:：]?\s*\(?\s*((?:前|第)?\s*\d+(?:\.\d+)?\s*(?:\/\s*\d+|%|名))/i);
    let rank=rankHit?.[2]||field(['专业排名','综合排名','年级排名','排名'])||'';
    const gpa=text.match(/(?:\bGPA\b|绩点)\s*[:：]?\s*\(?\s*(\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)?)/i)?.[1]||'';
    const average=text.match(/(?:加权成绩|平均成绩|均分)\s*[:：]?\s*\(?\s*(\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)?)/)?.[1]||'';
    if(gpa||average)rank=[rank?(rankHit?.[1]||'排名')+' '+rank:'',gpa?'GPA '+gpa:'',average?'加权成绩 '+average:''].filter(Boolean).join(' · ');
    const directResearch=field(['科研经历','研究经历','科研项目','项目经历']);
    const directContest=field(['获奖经历','获奖情况','竞赛经历','荣誉奖项']);
    const goalsText=field(['目标与诉求','申请意向','申请目标','诉求'])||lines.filter(l=>/希望|打算|计划|想要|想保研|目标是/.test(l)).join('；');
    const goals=['保研','科研','竞赛','学业'].filter((goal,i)=>[/(?:保研|推免|夏令营|升学)/,/(?:科研|论文|课题)/,/(?:竞赛|比赛|建模)/,/(?:学业|英语|绩点|课程)/][i].test(goalsText)).join('、');
    return {name,school,major:major.slice(0,150),grade,rank,
      research:(sections.research.join('\n')||directResearch).slice(0,2000),
      contest:(sections.contest.join('\n')||directContest).slice(0,2000),goals,
      targetSchool:field(['目标院校','意向院校','学校偏好','申请院校'])||text.match(/(?:希望去|想去|保研到)\s*([\u3400-\u9fff]{2,25}?(?:大学|学院))/)?.[1]||'',
      targetMajor:field(['目标专业','申请专业','意向专业']),direction:field(['研究方向','意向方向'])};
  }
  root.TongluResumeFields={parseStudent,normalize};
  if(typeof module!=='undefined')module.exports=root.TongluResumeFields;
})(typeof window==='undefined'?globalThis:window);
