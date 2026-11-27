/* 双端服务数据契约。当前存储限定于同源浏览器；生产环境由鉴权后端实现同一接口。 */
(function () {
  'use strict';
  const KEYS = { skus: 'tonglu-sync-market-skus-v1', demands: 'tonglu-student-demands-v1', orders: 'tonglu-mentor-orders-v1', auth: 'tonglu-mentor-auth-v1', accounts: 'tonglu-mentor-accounts-v1', registrationDraft: 'tonglu-mentor-registration-draft-v1', profileIdentity: 'tonglu-mentor-profile-identity-v1', workbench: 'tonglu-mentor-workbench-v1', peerFavorites: 'tonglu-mentor-peer-favorites-v1', messages: 'tonglu-message-center-v1' };
  const categories = [
    { id: 'resume', label: '简历润色' }, { id: 'interview', label: '面试模拟' },
    { id: 'guidance', label: '保研规划辅导' }, { id: 'research_ext', label: '科研竞赛规划（保研延伸）' }
  ];
  const disciplines = ['经管类', '计算机类', '工科/机械', '数理统计', '人文社科', '通用学科'];
  const complianceNote = '围绕真实经历提供保研申请准备与规划支持，不承诺竞赛或录取结果。';
  const now = () => new Date().toISOString();
  const id = prefix => prefix + '-' + crypto.randomUUID();
  function read(key, fallback) {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    try { return JSON.parse(raw); } catch (_) { throw new Error('暂时无法读取已保存的记录，请刷新重试；清理前请先保留需要的资料'); }
  }
  function list(key) { const value = read(key, []); if (!Array.isArray(value)) throw new Error('暂时无法读取列表，请刷新后重试'); return value; }
  function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  // 同步写入接单状态与订单，失败回滚，避免出现界面已接单却没有订单。
  function commitDemands(demands, orders) {
    const beforeOrders = localStorage.getItem(KEYS.orders);
    write(KEYS.orders, orders);
    try { write(KEYS.demands, demands); } catch (error) {
      if (beforeOrders === null) localStorage.removeItem(KEYS.orders); else localStorage.setItem(KEYS.orders, beforeOrders);
      throw error;
    }
  }
  function auth() { const a = read(KEYS.auth, null); return a && a.loggedIn === true && a.mentorId && list(KEYS.accounts).some(x => x.mentorId === a.mentorId && x.account === a.account) ? a : null; }
  function requireMentor(ready) {
    const a = auth();
    if (!a) throw new Error('请先完成服务者注册');
    if (ready && !profile().registered) throw new Error('请先完善服务者信息');
    return a;
  }
  function profile() { const a = auth(); return a ? list(KEYS.accounts).find(x => x.mentorId === a.mentorId)?.profile || {} : {}; }
  function saveProfile(value) {
    const a = requireMentor(false), accounts = list(KEYS.accounts), row = accounts.find(x => x.mentorId === a.mentorId);
    row.profile = value; write(KEYS.accounts, accounts);
    write(KEYS.auth, { ...a, registered: !!value.registered });
  }
  function registrationProfile() {
    const mentorId=read(KEYS.profileIdentity,null);
    return list(KEYS.accounts).find(x=>x.mentorId===mentorId)?.profile||null;
  }
  // 原有四步资料注册：草稿不授予业务访问，完成资料提交后才建立本设备服务者会话。
  function registerProfile(value) {
    if(!String(value.name||'').trim()||!String(value.school||'').trim()||!String(value.major||'').trim()||!value.educationProof?.name||!(value.capabilities?.length||String(value.services||'').trim()))throw new Error('请先完成服务者资料并上传学历证明');
    const accounts=list(KEYS.accounts),mentorId=read(KEYS.profileIdentity,null);
    let row=accounts.find(x=>x.mentorId===mentorId);
    if(!row){const nextId=id('mentor');row={account:nextId,mentorId:nextId,authType:'profile',profile:{}};accounts.push(row);}
    row.profile={...value,registered:true};
    const session={loggedIn:true,account:row.account,mentorId:row.mentorId,registered:true,loginAt:now(),mode:'local_profile'};
    // 留下草稿以便存储失败时重试；提交成功后再清理。
    write(KEYS.accounts,accounts);write(KEYS.profileIdentity,row.mentorId);write(KEYS.auth,session);
    localStorage.removeItem(KEYS.registrationDraft);
    return session;
  }
  function signOut() {
    const a=auth();if(a)write(KEYS.profileIdentity,a.mentorId);
    localStorage.removeItem(KEYS.auth);
  }
  async function digest(password, salt) {
    if (!crypto.subtle) throw new Error('当前访问方式无法安全登录，请从正式网站入口重新打开');
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100000, hash: 'SHA-256' }, key, 256);
    return Array.from(new Uint8Array(bits), x => x.toString(16).padStart(2, '0')).join('');
  }
  async function signIn(account, password, register) {
    account = String(account || '').trim(); password = String(password || '');
    if (!/^[a-zA-Z0-9_@.+-]{3,80}$/.test(account) || password.length < 8 || password.length > 128) throw new Error('账号需为 3—80 位字母、数字或邮箱，密码需为 8—128 位');
    let accounts = list(KEYS.accounts), row = accounts.find(x => x.account === account);
    if (register) {
      if (row) throw new Error('这个账号已注册，请直接登录');
      const salt = crypto.randomUUID(), hash = await digest(password, salt);
      // 哈希计算期间其他标签页可能已注册，再读一次。
      accounts = list(KEYS.accounts);
      if (accounts.some(x => x.account === account)) throw new Error('这个账号已注册，请直接登录');
      row = { account, mentorId: id('mentor'), salt, hash, profile: {} }; accounts.push(row); write(KEYS.accounts, accounts);
    } else if (!row || row.authType==='profile' || await digest(password, row.salt) !== row.hash) throw new Error('账号或密码不正确');
    const value = { loggedIn: true, account, mentorId: row.mentorId, registered: !!row.profile?.registered, loginAt: now(), mode: 'local' };
    write(KEYS.auth, value); return value;
  }
  function skus() {
    if (localStorage.getItem(KEYS.skus) === null) write(KEYS.skus, []);
    return list(KEYS.skus);
  }
  function upsertSku(input) {
    const a = requireMentor(true), items = skus(), current = input.id ? items.find(x => x.id === input.id) : null;
    if (input.id && (!current || current.providerId !== a.mentorId)) throw new Error('只能管理自己发布的商品');
    const cat = categories.find(x => x.id === input.category), p = profile();
    const title = String(input.title || '').trim(), subtitle = String(input.subtitle || '').trim();
    const price = Number(input.price), capacityLeft = Number(input.capacityLeft);
    if (!cat || !disciplines.includes(input.discipline) || title.length < 4 || title.length > 60 || subtitle.length < 8 || subtitle.length > 500 || !String(input.price).trim() || !Number.isFinite(price) || price < 0 || price > 100000 || !String(input.capacityLeft).trim() || !Number.isInteger(capacityLeft) || capacityLeft < 0 || capacityLeft > 99 || !['on_shelf', 'off_shelf'].includes(input.status)) throw new Error('请检查商品标题、交付说明、价格、名额与分类');
    if (/代[写做投考]|保[过奖录]|包[过奖发录]|买卖(?:论文|成果)|售卖(?:竞赛|奖项|结果)/.test(title + subtitle)) throw new Error('请描述真实的经历梳理、规划与反馈服务，不得承诺或售卖结果');
    const deliveryCycle = String(input.deliveryCycle || '').trim().slice(0, 80), serviceMode = String(input.serviceMode || '').trim().slice(0, 80);
    if (!deliveryCycle || !serviceMode) throw new Error('请填写交付周期和服务方式');
    const value = { id: current?.id || id('sku'), providerId: a.mentorId, providerName: p.name || a.account, providerType: '申请经验前辈', providerBrief: [p.school, p.major, p.destination].filter(Boolean).join(' · ') || '本人申报 · 待核验', title, subtitle, category: cat.id, categoryLabel: cat.label, discipline: input.discipline, tags: [cat.label, input.discipline], price: Math.round(price * 100) / 100, capacityLeft, status: input.status, deliveryCycle, serviceMode, complianceNote, salesCount: current?.salesCount || 0, createdAt: current?.createdAt || now(), updatedAt: now() };
    if (current) items[items.indexOf(current)] = value; else items.unshift(value);
    write(KEYS.skus, items); return value;
  }
  const demands = () => list(KEYS.demands).map(x => ({ ...x, discipline: x.discipline || '通用学科', acceptStatus: x.acceptStatus || 'open', acceptedBy: x.acceptedBy || null }));
  const orders = () => { const a = requireMentor(false); return list(KEYS.orders).filter(x => x.mentorId === a.mentorId); };
  function studentOrders() {
    const own=new Map(demands().map(item=>[item.id,item]));
    return list(KEYS.orders).filter(item=>item.sourceType==='demand'&&item.mentorId&&own.get(item.sourceId)?.acceptedBy?.mentorId===item.mentorId)
      .map(item=>({...item,providerName:own.get(item.sourceId).acceptedBy.mentorName||'服务者'}));
  }
  function workbench() {
    const a=requireMentor(true), rows=read(KEYS.workbench,{});
    return {accepting:true,slots:[],...rows[a.mentorId]};
  }
  function providerAccepting(providerId) { return read(KEYS.workbench,{})[providerId]?.accepting!==false; }
  function saveWorkbench(value) {
    const a=requireMentor(true), rows=read(KEYS.workbench,{});
    rows[a.mentorId]=value;write(KEYS.workbench,rows);return value;
  }
  function setAccepting(value) {
    if(typeof value!=='boolean')throw new Error('请选择是否接收新需求');
    return saveWorkbench({...workbench(),accepting:value});
  }
  function addSlot(input) {
    const settings=workbench(),date=String(input.date||''),start=String(input.start||''),end=String(input.end||'');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(end)||start>=end)throw new Error('请选择有效日期，结束时间需晚于开始时间');
    const day=new Date(date+'T00:00:00');
    if(!Number.isFinite(day.getTime())||[day.getFullYear(),String(day.getMonth()+1).padStart(2,'0'),String(day.getDate()).padStart(2,'0')].join('-')!==date||new Date(date+'T'+end+':00').getTime()<=Date.now())throw new Error('请选择尚未结束的有效日期与时段');
    if(settings.slots.some(s=>s.date===date&&s.start<end&&s.end>start))throw new Error('这个时段与已有排班重叠，请调整后再保存');
    const slot={id:id('slot'),date,start,end,note:String(input.note||'').trim().slice(0,80)};
    saveWorkbench({...settings,slots:[...settings.slots,slot].sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start))});return slot;
  }
  function removeSlot(slotId) { const settings=workbench();saveWorkbench({...settings,slots:settings.slots.filter(x=>x.id!==slotId)}); }
  function workbenchSummary() {
    const items=orders(),settled=items.filter(x=>x.status==='completed'&&x.paymentStatus==='settled'&&Number.isFinite(x.price)&&x.price>=0);
    return {active:items.filter(x=>x.status==='in_progress').length,pending:items.filter(x=>x.status==='in_progress').length,completed:items.filter(x=>x.status==='completed').length,income:Math.round(settled.reduce((sum,x)=>sum+x.price,0)*100)/100};
  }
  function peerFavorites() {
    const a=requireMentor(true),rows=read(KEYS.peerFavorites,{});
    if(!Array.isArray(rows[a.mentorId])){
      rows[a.mentorId]=rows.legacyImported?[]:[...new Set(window.__TL?.savedMentors||[])].filter(x=>x!==a.mentorId);
      rows.legacyImported=true;
      write(KEYS.peerFavorites,rows);
    }
    return rows[a.mentorId];
  }
  function togglePeerFavorite(providerId) {
    const a=requireMentor(true),saved=peerFavorites(),rows=read(KEYS.peerFavorites,{});
    if(providerId===a.mentorId||!skus().some(x=>x.providerId===providerId)&&!saved.includes(providerId))throw new Error('暂时找不到这位同行，请刷新后重试');
    rows[a.mentorId]=saved.includes(providerId)?saved.filter(x=>x!==providerId):[...saved,providerId];write(KEYS.peerFavorites,rows);
    return rows[a.mentorId].includes(providerId);
  }
  function acceptDemand(demandId) {
    const a = requireMentor(true), items = demands(), row = items.find(x => x.id === demandId), allOrders = list(KEYS.orders);
    if(!workbench().accepting)throw new Error('你已暂停接单，请在服务工作台恢复后再承接新需求');
    if (!row || row.status !== 'published' || row.acceptStatus !== 'open' || allOrders.some(x => x.sourceType === 'demand' && x.sourceId === demandId)) throw new Error('该需求已被承接或已撤回，请刷新列表');
    row.acceptStatus = 'accepted'; row.updatedAt = now(); row.acceptedBy = { mentorId: a.mentorId, mentorName: profile().name || a.account, acceptedAt: row.updatedAt };
    const publicTitle=String(row.description||'').replace(/(?<!\d)1[3-9]\d{9}(?!\d)/g,'[手机号已隐藏]').replace(/(?<!\d)\d{17}[\dXx](?!\d)/g,'[证件号已隐藏]').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[邮箱已隐藏]');
    const order = { id: id('order'), mentorId: a.mentorId, sourceType: 'demand', sourceId: row.id, title: publicTitle, studentLabel: '匿名学生', discipline: row.discipline, categoryLabel: (row.categories || []).join('、'), price: null, status: 'in_progress', createdAt: now(), updatedAt: now(), note: '需求承接记录，服务范围与费用待双方确认；未付款。' };
    allOrders.unshift(order); commitDemands(items, allOrders); return order;
  }
  function completeOrder(orderId) {
    const a = requireMentor(true), allOrders = list(KEYS.orders), row = allOrders.find(x => x.id === orderId && x.mentorId === a.mentorId);
    if (!row || row.status !== 'in_progress') throw new Error('订单不存在或状态已变化');
    row.status = 'completed'; row.updatedAt = now();
    const items = demands(), d = items.find(x => x.id === row.sourceId);
    if (row.sourceType === 'demand' && d?.acceptedBy?.mentorId === a.mentorId) { d.acceptStatus = 'completed'; d.updatedAt = now(); }
    commitDemands(items, allOrders);
  }
  window.TongluMarket = { KEYS, categories, disciplines, complianceNote, auth, requireMentor, profile, saveProfile, registrationProfile, registerProfile, signIn, signOut, skus, upsertSku, demands, orders, studentOrders, acceptDemand, completeOrder, workbench, setAccepting, providerAccepting, addSlot, removeSlot, workbenchSummary, peerFavorites, togglePeerFavorite };
})();
