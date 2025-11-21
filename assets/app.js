(function(){
  const elApp=document.getElementById('app');
  const elUserInfo=document.getElementById('user-info');
  const dbKey='library-db';
  const enc=new TextEncoder();
  function sha256(s){return crypto.subtle.digest('SHA-256',enc.encode(s)).then(b=>{const v=new Uint8Array(b);let h='';for(let i=0;i<v.length;i++){h+=('00'+v[i].toString(16)).slice(-2)}return h})}
  function uid(p){const r=Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(2);return p?`${p}_${r}`:r}
  function today(){return new Date()}
  function addDays(d,n){const x=new Date(d.getTime());x.setDate(x.getDate()+n);return x}
  function fmtDate(d){const y=d.getFullYear();const m=('0'+(d.getMonth()+1)).slice(-2);const s=('0'+d.getDate()).slice(-2);return `${y}-${m}-${s}`}
  function parseDate(s){const p=s.split('-').map(Number);return new Date(p[0],p[1]-1,p[2])}
  function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
  const Store={data:null,load(){const raw=localStorage.getItem(dbKey);if(raw){this.data=JSON.parse(raw)}else{this.data={books:[],copies:[],readers:[],loans:[],reservations:[],fines:[],settings:{finePerDay:0.5,defaults:{student:{limit:5,days:30,renewMax:2},staff:{limit:10,days:60,renewMax:3}}}};this.seed();this.save()}},save(){localStorage.setItem(dbKey,JSON.stringify(this.data))},reset(){localStorage.removeItem(dbKey);this.load()},seed(){const adminId=uid('reader');const admin={id:adminId,card:'A0001',name:'管理员',type:'admin',status:'active',limits:{limit:50,days:90,renewMax:5},passwordHash:'',createdAt:fmtDate(today()),locked:false,lost:false};this.data.readers.push(admin);const b1={id:uid('book'),title:'软件工程',author:'Ian Sommerville',isbn:'9787111214997',press:'机械工业出版社',category:'TP3',createdAt:fmtDate(today())};const b2={id:uid('book'),title:'数据库系统概念',author:'Abraham Silberschatz',isbn:'9787111128065',press:'机械工业出版社',category:'TP311.13',createdAt:fmtDate(today())};this.data.books.push(b1,b2);const c1={id:uid('copy'),bookId:b1.id,barcode:'B0000001',location:'A-1-01',status:'available',reservedFor:null};const c2={id:uid('copy'),bookId:b1.id,barcode:'B0000002',location:'A-1-02',status:'available',reservedFor:null};const c3={id:uid('copy'),bookId:b2.id,barcode:'B0000003',location:'B-2-01',status:'available',reservedFor:null};this.data.copies.push(c1,c2,c3)},nextBarcode(){const s=this.data.copies.map(x=>x.barcode).filter(Boolean);if(s.length===0)return 'B0000001';const n=Math.max(...s.map(x=>Number(x.slice(1))));const k=('0000000'+(n+1)).slice(-7);return 'B'+k},nextCard(){const s=this.data.readers.map(x=>x.card).filter(Boolean);const nums=s.map(c=>{const m=/^R(\d{6})$/.exec(c);return m?Number(m[1]):null}).filter(x=>x!==null);const max=nums.length?Math.max(...nums):0;const k=('000000'+(max+1)).slice(-6);return 'R'+k},findBookByISBN(isbn){return this.data.books.find(x=>x.isbn===isbn)},findReaderByCard(card){return this.data.readers.find(x=>x.card===card)},findCopyByBarcode(bc){return this.data.copies.find(x=>x.barcode===bc)},availableCopies(bookId){return this.data.copies.filter(x=>x.bookId===bookId&&x.status==='available')},activeLoansByReader(readerId){return this.data.loans.filter(x=>x.readerId===readerId&&x.status==='borrowed')},overdueLoansByReader(readerId){const t=today();return this.data.loans.filter(x=>x.readerId===readerId&&x.status==='borrowed'&&parseDate(x.dueDate)<t)},reservationsForBook(bookId){return this.data.reservations.filter(x=>x.bookId===bookId&&x.status==='active')}}
  const Auth={user:null,async ensureAdminPassword(){const a=Store.data.readers.find(x=>x.type==='admin');if(a&&(!a.passwordHash||a.passwordHash==='')){a.passwordHash=await sha256('admin');Store.save()}},async login(card,pass){const r=Store.findReaderByCard(card);if(!r)return {ok:false,msg:'无此读者证'};if(r.locked)return {ok:false,msg:'读者已被锁定'};if(r.lost)return {ok:false,msg:'读者证已挂失'};if(r.type==='admin'){const h=await sha256(pass||'');if(h!==r.passwordHash)return {ok:false,msg:'密码错误'};this.user=r;return {ok:true}}else{if(!r.passwordHash){this.user=r;return {ok:true}}const h=await sha256(pass||'');if(h!==r.passwordHash)return {ok:false,msg:'密码错误'};this.user=r;return {ok:true}}},logout(){this.user=null}}
  const Router={route:null,go(r){location.hash=r},start(){this.route=location.hash.replace('#','')||'dashboard';render()},onChange(){this.route=location.hash.replace('#','')||'dashboard';render()}}
  function setUserInfo(){if(Auth.user){elUserInfo.innerHTML=`${Auth.user.name}（${Auth.user.type}）`}else{elUserInfo.innerHTML='未登录'} }
  function render(){setUserInfo();if(!Auth.user){renderLogin();return}switch(Router.route){case 'dashboard':renderDashboard();break;case 'catalog':renderCatalog();break;case 'borrow':renderBorrow();break;case 'search':renderSearch();break;case 'readers':renderReaders();break;case 'personal':renderPersonal();break;case 'stats':renderStats();break;case 'reports':renderReports();break;case 'settings':renderSettings();break;default:renderDashboard();}}
  function h(t){const d=document.createElement('div');d.innerHTML=t;return d}
  function renderLogin(){const x=h(`
    <div class="grid">
      <div class="card" style="grid-column:span 6">
        <h2>登录</h2>
        <form class="form" id="form-login">
          <label>读者证号</label>
          <input id="login-card" placeholder="例如学号" />
          <label>密码</label>
          <input id="login-pass" type="password" />
          <div class="actions">
            <button type="submit">登录</button>
            <button type="button" class="secondary" id="seed-reset">重置示例数据</button>
          </div>
        </form>
      </div>
      <div class="card" style="grid-column:span 6">
        <h2>注册新读者</h2>
        <form class="form" id="form-register">
          <label>姓名</label><input id="reg-name" />
          <label>证号（可留空自动分配）</label><input id="reg-card" />
          <label>类型</label><select id="reg-type"><option value="student">学生</option><option value="staff">教职工</option></select>
          <label>联系方式</label><input id="reg-contact" />
          <label>密码</label><input id="reg-pass" type="password" />
          <div class="actions"><button type="submit">注册并登录</button></div>
        </form>
      </div>
    </div>
  `);elApp.innerHTML='';elApp.appendChild(x);const f=document.getElementById('form-login');f.onsubmit=async e=>{e.preventDefault();const c=document.getElementById('login-card').value.trim();const p=document.getElementById('login-pass').value.trim();const r=await Auth.login(c,p);if(r.ok){Router.go('dashboard')}else{alert(r.msg)}};document.getElementById('seed-reset').onclick=()=>{Store.reset();Auth.logout();Router.go('dashboard')};const fr=document.getElementById('form-register');fr.onsubmit=async e=>{e.preventDefault();const n=document.getElementById('reg-name').value.trim();let c=document.getElementById('reg-card').value.trim();const t=document.getElementById('reg-type').value;const ct=document.getElementById('reg-contact').value.trim();const pw=document.getElementById('reg-pass').value.trim();if(!n||!pw){alert('姓名与密码必填');return}if(!c){c=Store.nextCard()}if(Store.findReaderByCard(c)){alert('证号已存在');return}const d=Store.data.settings.defaults[t];const r={id:uid('reader'),card:c,name:n,type:t,status:'active',contact:ct,limits:{limit:d.limit,days:d.days,renewMax:d.renewMax},passwordHash:await sha256(pw),createdAt:fmtDate(today()),locked:false,lost:false};Store.data.readers.push(r);Store.save();const ok=await Auth.login(c,pw);if(ok.ok){Router.go('dashboard')}else{alert('注册成功，但登录失败')}}}
  function renderDashboard(){const b=Store.data.books.length;const c=Store.data.copies.length;const r=Store.data.readers.length;const l=Store.data.loans.filter(x=>x.status==='borrowed').length;const x=h(`
    <div class="grid">
      <div class="card" style="grid-column:span 3"><h2>图书</h2><div>共 ${b}</div></div>
      <div class="card" style="grid-column:span 3"><h2>副本</h2><div>共 ${c}</div></div>
      <div class="card" style="grid-column:span 3"><h2>读者</h2><div>共 ${r}</div></div>
      <div class="card" style="grid-column:span 3"><h2>在借</h2><div>共 ${l}</div></div>
      <div class="card" style="grid-column:span 12">
        <div class="row">
          <button id="quick-catalog">快速编目</button>
          <button id="quick-borrow">快速借书</button>
          <button id="logout" class="secondary">退出登录</button>
        </div>
      </div>
    </div>
  `);elApp.innerHTML='';elApp.appendChild(x);document.getElementById('quick-catalog').onclick=()=>Router.go('catalog');document.getElementById('quick-borrow').onclick=()=>Router.go('borrow');document.getElementById('logout').onclick=()=>{Auth.logout();render()}}
  function renderCatalog(){const x=h(`
    <div class="grid">
      <div class="card" style="grid-column:span 6">
        <h2>录入新图书</h2>
        <form class="form" id="form-book">
          <label>书名</label><input id="book-title" />
          <label>作者</label><input id="book-author" />
          <label>ISBN</label><input id="book-isbn" />
          <label>出版社</label><input id="book-press" />
          <label>分类号</label><input id="book-cat" />
          <div class="actions"><button type="submit">保存</button></div>
        </form>
      </div>
      <div class="card" style="grid-column:span 6">
        <h2>生成图书副本</h2>
        <form class="form" id="form-copy">
          <label>ISBN</label><input id="copy-isbn" />
          <label>副本数量</label><input id="copy-count" type="number" value="1" />
          <label>馆藏地</label><input id="copy-loc" placeholder="如 A-1-01" />
          <div class="actions"><button type="submit">生成</button></div>
        </form>
      </div>
      <div class="card" style="grid-column:span 12">
        <h2>最近入库</h2>
        <table class="table" id="tbl-books"><thead><tr><th>书名</th><th>作者</th><th>ISBN</th><th>副本</th></tr></thead><tbody></tbody></table>
      </div>
    </div>
  `);elApp.innerHTML='';elApp.appendChild(x);document.getElementById('form-book').onsubmit=e=>{e.preventDefault();const t=document.getElementById('book-title').value.trim();const a=document.getElementById('book-author').value.trim();const i=document.getElementById('book-isbn').value.trim();const p=document.getElementById('book-press').value.trim();const c=document.getElementById('book-cat').value.trim();if(!t||!i){alert('书名与ISBN必填');return}if(Store.findBookByISBN(i)){alert('ISBN已存在');return}const b={id:uid('book'),title:t,author:a,isbn:i,press:p,category:c,createdAt:fmtDate(today())};Store.data.books.push(b);Store.save();renderCatalog()};document.getElementById('form-copy').onsubmit=e=>{e.preventDefault();const i=document.getElementById('copy-isbn').value.trim();const n=clamp(parseInt(document.getElementById('copy-count').value||'1'),1,500);const l=document.getElementById('copy-loc').value.trim()||'未设置';const bk=Store.findBookByISBN(i);if(!bk){alert('未找到该ISBN的图书');return}for(let k=0;k<n;k++){const bc=Store.nextBarcode();const cp={id:uid('copy'),bookId:bk.id,barcode:bc,location:l,status:'available',reservedFor:null};Store.data.copies.push(cp)}Store.save();renderCatalog()};const tb=document.querySelector('#tbl-books tbody');tb.innerHTML=Store.data.books.slice(-10).map(b=>{const c=Store.data.copies.filter(x=>x.bookId===b.id).length;return `<tr><td>${b.title}</td><td>${b.author}</td><td>${b.isbn}</td><td>${c}</td></tr>`}).join('')}
  function renderBorrow(){const x=h(`
    <div class="card">
      <div class="tabs">
        <button id="tab-b" class="active">借书</button>
        <button id="tab-r">还书</button>
        <button id="tab-n">续借</button>
      </div>
      <div id="panel-b">
        <form class="form" id="form-borrow">
          <label>读者证号</label><input id="borrow-card" />
          <label>图书条码</label><input id="borrow-barcode" />
          <div class="actions"><button type="submit">借出</button></div>
        </form>
      </div>
      <div id="panel-r" class="hidden">
        <form class="form" id="form-return">
          <label>图书条码</label><input id="return-barcode" />
          <div class="actions"><button type="submit">归还</button></div>
        </form>
      </div>
      <div id="panel-n" class="hidden">
        <form class="form" id="form-renew">
          <label>图书条码</label><input id="renew-barcode" />
          <div class="actions"><button type="submit">续借</button></div>
        </form>
      </div>
    </div>
  `);elApp.innerHTML='';elApp.appendChild(x);const tb=document.getElementById('tab-b');const tr=document.getElementById('tab-r');const tn=document.getElementById('tab-n');const pb=document.getElementById('panel-b');const pr=document.getElementById('panel-r');const pn=document.getElementById('panel-n');tb.onclick=()=>{tb.classList.add('active');tr.classList.remove('active');tn.classList.remove('active');pb.classList.remove('hidden');pr.classList.add('hidden');pn.classList.add('hidden')};tr.onclick=()=>{tr.classList.add('active');tb.classList.remove('active');tn.classList.remove('active');pr.classList.remove('hidden');pb.classList.add('hidden');pn.classList.add('hidden')};tn.onclick=()=>{tn.classList.add('active');tb.classList.remove('active');tr.classList.remove('active');pn.classList.remove('hidden');pb.classList.add('hidden');pr.classList.add('hidden')};document.getElementById('form-borrow').onsubmit=e=>{e.preventDefault();const card=document.getElementById('borrow-card').value.trim();const bc=document.getElementById('borrow-barcode').value.trim();const r=Store.findReaderByCard(card);if(!r){alert('读者不存在');return}if(r.locked||r.lost){alert('读者状态异常');return}const cp=Store.findCopyByBarcode(bc);if(!cp){alert('未找到该条码');return}if(cp.status!=='available'){alert('副本不可借');return}const ol=Store.overdueLoansByReader(r.id);if(ol.length>0){alert('存在超期记录，不可借书');return}const lim=r.limits?.limit??Store.data.settings.defaults[r.type]?.limit??3;const cur=Store.activeLoansByReader(r.id).length;if(cur>=lim){alert('超出借阅上限');return}if(cp.reservedFor&&cp.reservedFor!==r.id){alert('该副本已被预约');return}const days=r.limits?.days??Store.data.settings.defaults[r.type]?.days??30;const loan={id:uid('loan'),copyId:cp.id,bookId:cp.bookId,readerId:r.id,borrowDate:fmtDate(today()),dueDate:fmtDate(addDays(today(),days)),status:'borrowed',renewCount:0};cp.status='borrowed';cp.reservedFor=null;Store.data.loans.push(loan);Store.save();alert('借出成功')};document.getElementById('form-return').onsubmit=e=>{e.preventDefault();const bc=document.getElementById('return-barcode').value.trim();const cp=Store.findCopyByBarcode(bc);if(!cp){alert('未找到该条码');return}const loan=Store.data.loans.find(x=>x.copyId===cp.id&&x.status==='borrowed');if(!loan){alert('该副本未在借');return}loan.returnDate=fmtDate(today());loan.status='returned';cp.status='available';const d=parseDate(loan.dueDate);const t=today();if(t>d){const days=Math.ceil((t.getTime()-d.getTime())/86400000);const rate=Store.data.settings.finePerDay||0;const fine=Math.round(days*rate*100)/100;if(fine>0){Store.data.fines.push({id:uid('fine'),readerId:loan.readerId,loanId:loan.id,days:fine/rate,amount:fine,createdAt:fmtDate(today()),status:'unpaid'})}}const rs=Store.reservationsForBook(cp.bookId).filter(x=>x.status==='active');if(rs.length>0){rs.sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));cp.reservedFor=rs[0].readerId;cp.status='reserved'}Store.save();alert('归还处理完成')};document.getElementById('form-renew').onsubmit=e=>{e.preventDefault();const bc=document.getElementById('renew-barcode').value.trim();const cp=Store.findCopyByBarcode(bc);if(!cp){alert('未找到该条码');return}const loan=Store.data.loans.find(x=>x.copyId===cp.id&&x.status==='borrowed');if(!loan){alert('未找到在借记录');return}if(cp.reservedFor&&cp.reservedFor!==loan.readerId){alert('该副本已被其他读者预约，无法续借');return}const r=Store.data.readers.find(x=>x.id===loan.readerId);const max=r.limits?.renewMax??Store.data.settings.defaults[r.type]?.renewMax??1;if(loan.renewCount>=max){alert('已达最大续借次数');return}const days=r.limits?.days??Store.data.settings.defaults[r.type]?.days??30;const nd=fmtDate(addDays(parseDate(loan.dueDate),days));loan.dueDate=nd;loan.renewCount+=1;Store.save();alert('续借成功')}}
  function renderSearch(){const x=h(`
    <div class="card">
      <h2>图书检索</h2>
      <div class="form">
        <div class="row"><input id="q-title" placeholder="书名" /><input id="q-author" placeholder="作者" /><input id="q-isbn" placeholder="ISBN" /><input id="q-cat" placeholder="分类号" /><button id="q-go">搜索</button></div>
      </div>
      <table class="table" id="tbl-search"><thead><tr><th>书名</th><th>作者</th><th>ISBN</th><th>分类号</th><th>可借数量</th><th>馆藏位置</th><th>操作</th></tr></thead><tbody></tbody></table>
    </div>
  `);elApp.innerHTML='';elApp.appendChild(x);function doSearch(){const t=document.getElementById('q-title').value.trim().toLowerCase();const a=document.getElementById('q-author').value.trim().toLowerCase();const i=document.getElementById('q-isbn').value.trim();const c=document.getElementById('q-cat').value.trim().toLowerCase();const res=Store.data.books.filter(b=>(!t||b.title.toLowerCase().includes(t))&&(!a||b.author.toLowerCase().includes(a))&&(!i||b.isbn.includes(i))&&(!c||b.category.toLowerCase().includes(c)));const rows=res.map(b=>{const ac=Store.availableCopies(b.id);const locs=[...new Set(ac.map(x=>x.location))].join(',');return `<tr><td>${b.title}</td><td>${b.author}</td><td>${b.isbn}</td><td>${b.category||''}</td><td>${ac.length}</td><td>${locs}</td><td><button data-book="${b.id}" class="reserve">预约</button></td></tr>`}).join('');document.querySelector('#tbl-search tbody').innerHTML=rows;document.querySelectorAll('button.reserve').forEach(btn=>{btn.onclick=()=>{const bid=btn.getAttribute('data-book');if(!Auth.user){alert('请先登录');return}const exist=Store.data.reservations.find(x=>x.bookId===bid&&x.readerId===Auth.user.id&&x.status==='active');if(exist){alert('已预约该书');return}Store.data.reservations.push({id:uid('resv'),bookId:bid,readerId:Auth.user.id,status:'active',createdAt:fmtDate(today())});Store.save();alert('预约成功')}})}document.getElementById('q-go').onclick=doSearch;doSearch()}
  function renderReaders(){if(Auth.user.type!=='admin'){elApp.innerHTML='<div class="card">仅管理员可管理读者</div>';return}const x=h(`
    <div class="grid">
      <div class="card" style="grid-column:span 5">
        <h2>新增读者</h2>
        <form class="form" id="form-reader">
          <label>姓名</label><input id="rd-name" />
          <label>证号</label><input id="rd-card" />
          <label>类型</label><select id="rd-type"><option value="student">学生</option><option value="staff">教职工</option></select>
          <label>联系方式</label><input id="rd-contact" />
          <label>密码</label><input id="rd-pass" type="password" />
          <div class="row"><input id="rd-limit" type="number" placeholder="借阅上限" /><input id="rd-days" type="number" placeholder="借阅期限(天)" /><input id="rd-renew" type="number" placeholder="最大续借" /></div>
          <div class="actions"><button type="submit">创建</button></div>
        </form>
      </div>
      <div class="card" style="grid-column:span 7">
        <h2>读者列表</h2>
        <table class="table" id="tbl-readers"><thead><tr><th>姓名</th><th>证号</th><th>类型</th><th>状态</th><th>权限</th><th>操作</th></tr></thead><tbody></tbody></table>
      </div>
    </div>
  `);elApp.innerHTML='';elApp.appendChild(x);document.getElementById('form-reader').onsubmit=async e=>{e.preventDefault();const n=document.getElementById('rd-name').value.trim();const c=document.getElementById('rd-card').value.trim();const t=document.getElementById('rd-type').value;const ct=document.getElementById('rd-contact').value.trim();const pw=document.getElementById('rd-pass').value.trim();if(!n||!c){alert('姓名与证号必填');return}if(Store.findReaderByCard(c)){alert('证号已存在');return}const d=Store.data.settings.defaults[t];const lim=parseInt(document.getElementById('rd-limit').value||d.limit);const days=parseInt(document.getElementById('rd-days').value||d.days);const rn=parseInt(document.getElementById('rd-renew').value||d.renewMax);const r={id:uid('reader'),card:c,name:n,type:t,status:'active',contact:ct,limits:{limit:lim,days:days,renewMax:rn},passwordHash:pw?await sha256(pw):'',createdAt:fmtDate(today()),locked:false,lost:false};Store.data.readers.push(r);Store.save();renderReaders()};function refresh(){const tb=document.querySelector('#tbl-readers tbody');tb.innerHTML=Store.data.readers.map(r=>{const l=r.limits?.limit??'-';const d=r.limits?.days??'-';const rn=r.limits?.renewMax??'-';const st=r.locked?'锁定':(r.lost?'挂失':'正常');return `<tr><td>${r.name}</td><td>${r.card}</td><td>${r.type}</td><td>${st}</td><td>${l}/${d}/${rn}</td><td class="actions"><button data-id="${r.id}" class="lock">锁定</button><button data-id="${r.id}" class="lost">挂失</button><button data-id="${r.id}" class="perm">权限</button></td></tr>`}).join('');document.querySelectorAll('button.lock').forEach(b=>b.onclick=()=>{const id=b.getAttribute('data-id');const r=Store.data.readers.find(x=>x.id===id);r.locked=!r.locked;Store.save();refresh()});document.querySelectorAll('button.lost').forEach(b=>b.onclick=()=>{const id=b.getAttribute('data-id');const r=Store.data.readers.find(x=>x.id===id);r.lost=!r.lost;Store.save();refresh()});document.querySelectorAll('button.perm').forEach(b=>b.onclick=()=>{const id=b.getAttribute('data-id');const r=Store.data.readers.find(x=>x.id===id);const l=prompt('借阅上限',String(r.limits.limit));const d=prompt('借阅期限(天)',String(r.limits.days));const rn=prompt('最大续借',String(r.limits.renewMax));if(l&&d&&rn){r.limits={limit:parseInt(l),days:parseInt(d),renewMax:parseInt(rn)};Store.save();refresh()}})}refresh()}
  function renderPersonal(){const u=Auth.user;const loans=Store.data.loans.filter(x=>x.readerId===u.id);const cur=loans.filter(x=>x.status==='borrowed');const his=loans.filter(x=>x.status!=='borrowed');const fines=Store.data.fines.filter(x=>x.readerId===u.id);const res=Store.data.reservations.filter(x=>x.readerId===u.id&&x.status==='active');const x=h(`
    <div class="grid">
      <div class="card" style="grid-column:span 6"><h2>当前借阅</h2><table class="table"><thead><tr><th>书名</th><th>借出</th><th>到期</th><th>续借</th></tr></thead><tbody>${cur.map(l=>{const b=Store.data.books.find(x=>x.id===l.bookId);return `<tr><td>${b.title}</td><td>${l.borrowDate}</td><td>${l.dueDate}</td><td>${l.renewCount}</td></tr>`}).join('')}</tbody></table></div>
      <div class="card" style="grid-column:span 6"><h2>历史借阅</h2><table class="table"><thead><tr><th>书名</th><th>借出</th><th>归还</th></tr></thead><tbody>${his.map(l=>{const b=Store.data.books.find(x=>x.id===l.bookId);return `<tr><td>${b.title}</td><td>${l.borrowDate}</td><td>${l.returnDate||''}</td></tr>`}).join('')}</tbody></table></div>
      <div class="card" style="grid-column:span 6"><h2>超期与罚金</h2><table class="table"><thead><tr><th>书名</th><th>金额</th><th>状态</th></tr></thead><tbody>${fines.map(f=>{const l=Store.data.loans.find(x=>x.id===f.loanId);const b=Store.data.books.find(x=>x.id===l.bookId);return `<tr><td>${b.title}</td><td>¥${f.amount.toFixed(2)}</td><td><span class="badge warn">${f.status}</span></td></tr>`}).join('')}</tbody></table></div>
      <div class="card" style="grid-column:span 6"><h2>我的预约</h2><table class="table"><thead><tr><th>书名</th><th>创建时间</th><th>操作</th></tr></thead><tbody>${res.map(r=>{const b=Store.data.books.find(x=>x.id===r.bookId);return `<tr><td>${b.title}</td><td>${r.createdAt}</td><td><button data-id="${r.id}" class="cancel">取消</button></td></tr>`}).join('')}</tbody></table></div>
    </div>
  `);elApp.innerHTML='';elApp.appendChild(x);document.querySelectorAll('button.cancel').forEach(b=>b.onclick=()=>{const id=b.getAttribute('data-id');const r=Store.data.reservations.find(x=>x.id===id);r.status='cancelled';Store.save();renderPersonal()})}
  function renderStats(){const booksTop=topBooks(10);const byCat=groupByCategory();const byReader=topReaders(10);const x=h(`
    <div class="grid">
      <div class="card" style="grid-column:span 12"><h2>热门图书</h2><div class="statbar">${booksTop.map(b=>{const h=Math.min(150,b.count*12);return `<div><div class="bar" style="height:${h}px" title="${b.title} ${b.count}"></div><div class="label">${b.count}</div></div>`}).join('')}</div></div>
      <div class="card" style="grid-column:span 6"><h2>分类借阅分布</h2><table class="table"><thead><tr><th>分类</th><th>借阅次数</th></tr></thead><tbody>${byCat.map(x=>`<tr><td>${x.cat}</td><td>${x.count}</td></tr>`).join('')}</tbody></table></div>
      <div class="card" style="grid-column:span 6"><h2>读者借阅频率</h2><table class="table"><thead><tr><th>读者</th><th>次数</th></tr></thead><tbody>${byReader.map(x=>`<tr><td>${x.name}</td><td>${x.count}</td></tr>`).join('')}</tbody></table></div>
    </div>
  `);elApp.innerHTML='';elApp.appendChild(x)}
  function topBooks(n){const m=new Map();for(const l of Store.data.loans){const k=l.bookId;m.set(k,(m.get(k)||0)+1)}const arr=[...m.entries()].map(([k,c])=>{const b=Store.data.books.find(x=>x.id===k);return {title:b?b.title:'未知',count:c}}).sort((a,b)=>b.count-a.count);return arr.slice(0,n)}
  function groupByCategory(){const m=new Map();for(const l of Store.data.loans){const b=Store.data.books.find(x=>x.id===l.bookId);const k=b?.category||'未分类';m.set(k,(m.get(k)||0)+1)}return [...m.entries()].map(([k,c])=>({cat:k,count:c})).sort((a,b)=>b.count-a.count)}
  function topReaders(n){const m=new Map();for(const l of Store.data.loans){const k=l.readerId;m.set(k,(m.get(k)||0)+1)}const arr=[...m.entries()].map(([k,c])=>{const r=Store.data.readers.find(x=>x.id===k);return {name:r?r.name:'未知',count:c}}).sort((a,b)=>b.count-a.count);return arr.slice(0,n)}
  function renderReports(){const t=today();const overdue=Store.data.loans.filter(x=>x.status==='borrowed'&&parseDate(x.dueDate)<t);const last180=addDays(t,-180);const dead=Store.data.copies.filter(cp=>{const ls=Store.data.loans.filter(l=>l.copyId===cp.id);if(ls.length===0)return true;const last=ls.sort((a,b)=>new Date(b.borrowDate)-new Date(a.borrowDate))[0];return parseDate(last.borrowDate)<last180});const x=h(`
    <div class="grid">
      <div class="card" style="grid-column:span 6"><h2>超期未还</h2><table class="table"><thead><tr><th>书名</th><th>读者</th><th>到期</th></tr></thead><tbody>${overdue.map(l=>{const b=Store.data.books.find(x=>x.id===l.bookId);const r=Store.data.readers.find(x=>x.id===l.readerId);return `<tr><td>${b.title}</td><td>${r.name}</td><td>${l.dueDate}</td></tr>`}).join('')}</tbody></table></div>
      <div class="card" style="grid-column:span 6"><h2>长期未借阅的副本</h2><table class="table"><thead><tr><th>条码</th><th>书名</th><th>位置</th></tr></thead><tbody>${dead.map(cp=>{const b=Store.data.books.find(x=>x.id===cp.bookId);return `<tr><td>${cp.barcode}</td><td>${b.title}</td><td>${cp.location}</td></tr>`}).join('')}</tbody></table></div>
    </div>
  `);elApp.innerHTML='';elApp.appendChild(x)}
  function renderSettings(){if(Auth.user.type!=='admin'){elApp.innerHTML='<div class="card">仅管理员可配置系统参数</div>';return}const s=Store.data.settings;const x=h(`
    <div class="card">
      <h2>系统设置</h2>
      <form class="form" id="form-settings">
        <label>每日罚金(元)</label><input id="st-fine" type="number" step="0.01" value="${s.finePerDay}" />
        <div class="row"><label>学生上限</label><input id="st-st-limit" type="number" value="${s.defaults.student.limit}" /><label>学生期限</label><input id="st-st-days" type="number" value="${s.defaults.student.days}" /><label>学生续借</label><input id="st-st-ren" type="number" value="${s.defaults.student.renewMax}" /></div>
        <div class="row"><label>教职工上限</label><input id="st-staff-limit" type="number" value="${s.defaults.staff.limit}" /><label>教职工期限</label><input id="st-staff-days" type="number" value="${s.defaults.staff.days}" /><label>教职工续借</label><input id="st-staff-ren" type="number" value="${s.defaults.staff.renewMax}" /></div>
        <div class="actions"><button type="submit">保存</button></div>
      </form>
    </div>
  `);elApp.innerHTML='';elApp.appendChild(x);document.getElementById('form-settings').onsubmit=e=>{e.preventDefault();s.finePerDay=parseFloat(document.getElementById('st-fine').value||'0');s.defaults.student.limit=parseInt(document.getElementById('st-st-limit').value||'5');s.defaults.student.days=parseInt(document.getElementById('st-st-days').value||'30');s.defaults.student.renewMax=parseInt(document.getElementById('st-st-ren').value||'2');s.defaults.staff.limit=parseInt(document.getElementById('st-staff-limit').value||'10');s.defaults.staff.days=parseInt(document.getElementById('st-staff-days').value||'60');s.defaults.staff.renewMax=parseInt(document.getElementById('st-staff-ren').value||'3');Store.save();alert('设置已保存')}}
  window.addEventListener('hashchange',()=>Router.onChange());
  Store.load();Auth.ensureAdminPassword().then(()=>Router.start())
})();
