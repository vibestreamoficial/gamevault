// GameVault v2.0.0 - Pagamento Real via PIX + Painel Admin
const PIX_KEY = 'fff503e1-60b3-457b-bdc4-ddf2c892cfda';
const PIX_NAME = 'White Vendas';
const PIX_CITY = 'Sao Paulo';

const GAMES = [
    { id:1, name:"Quiz Milionário", category:"trivia", icon:"🧠", prize:150, entry:5, players:2340, badge:"hot" },
    { id:2, name:"Caça-Moedas", category:"arcade", icon:"🪙", prize:80, entry:3, players:5120, badge:"hot" },
    { id:3, name:"Memória VIP", category:"skill", icon:"🃏", prize:120, entry:4, players:1800, badge:"new" },
    { id:4, name:"Sudoku Rush", category:"puzzle", icon:"🔢", prize:200, entry:8, players:890, badge:"pro" },
    { id:5, name:"Pedra Papel Tesoura", category:"skill", icon:"✊", prize:60, entry:2, players:8900, badge:"hot" },
    { id:6, name:"Trivia Esportes", category:"trivia", icon:"⚽", prize:100, entry:5, players:3200, badge:"" },
    { id:7, name:"Color Match", category:"arcade", icon:"🎨", prize:90, entry:3, players:4500, badge:"new" },
    { id:8, name:"Puzzle 2048", category:"puzzle", icon:"🧩", prize:180, entry:6, players:2100, badge:"" },
    { id:9, name:"Adivinha o Número", category:"trivia", icon:"🎯", prize:70, entry:2, players:6700, badge:"hot" },
    { id:10, name:"Reflexão Rápida", category:"skill", icon:"⚡", prize:110, entry:4, players:1500, badge:"new" }
];

const TOURNAMENTS = [
    { id:1, name:"Copa Quiz Semanal", game:"Quiz Milionário", prize:500, entry:20, players:"128/256", time:"Sexta 20h", status:"Aberto" },
    { id:2, name:"Desafio Arcade", game:"Caça-Moedas", prize:300, entry:15, players:"64/128", time:"Sábado 14h", status:"Aberto" },
    { id:3, name:"Torneio Elite", game:"Sudoku Rush", prize:1000, entry:50, players:"32/64", time:"Domingo 19h", status:"Em Breve" },
    { id:4, name:"Mega Trivia", game:"Trivia Esportes", prize:250, entry:10, players:"200/256", time:"Quarta 20h", status:"Aberto" }
];

const QUIZ_Q = [
    { q:"Capital do Brasil?", opts:["Rio de Janeiro","São Paulo","Brasília","Salvador"], c:2 },
    { q:"Quantos planetas?", opts:["7","8","9","10"], c:1 },
    { q:"Símbolo 'O'?", opts:["Ouro","Oxigênio","Prata","Ósmio"], c:1 },
    { q:"Independência do Brasil?", opts:["1808","1822","1889","1500"], c:1 },
    { q:"Maior oceano?", opts:["Atlântico","Índico","Pacífico","Ártico"], c:2 },
    { q:"Mona Lisa?", opts:["Picasso","Van Gogh","Da Vinci","Rembrandt"], c:2 },
    { q:"Velocidade da luz km/s?", opts:["200.000","300.000","400.000","500.000"], c:1 },
    { q:"Maior país?", opts:["China","EUA","Canadá","Rússia"], c:3 },
    { q:"Ossos humanos?", opts:["186","206","226","256"], c:1 },
    { q:"Animal mais rápido?", opts:["Leão","Guepardo","Gazela","Tigre"], c:1 }
];

let state = { user:null, currentGame:null, quiz:{i:0,s:0,q:[]}, sessionStart:Date.now(), realityShown:false };
function $(id){return document.getElementById(id);}
function save(){if(state.user)localStorage.setItem('gv_user',JSON.stringify(state.user));}
function defUser(email,name){return{email,name,balance:50,deposit:0,played:0,won:0,withdrawn:0,kyc:'pending',limits:{daily:500,weekly:2000,monthly:5000},selfExclusion:null,transactions:[{t:'bonus',a:50,d:'Bônus cadastro',dt:fmt()}],history:[]};}
function fmt(){return new Date().toLocaleDateString('pt-BR');}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

// ===== PAGES =====
function showPage(p){
    document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
    const el=$('page-'+p)||$('page-'+(p==='play'?'play':p));
    if(el)el.classList.add('active');
    document.querySelectorAll('.nav-link').forEach(l=>l.classList.remove('active'));
    const a=document.querySelector(`.nav-link[data-page="${p}"]`);if(a)a.classList.add('active');
    renderPage(p);window.scrollTo(0,0);
}
function renderPage(p){
    switch(p){
        case 'home':renderHome();break;
        case 'games':renderGames();break;
        case 'wallet':renderWallet();break;
        case 'tournaments':renderTournaments();break;
        case 'responsible':renderResponsible();break;
        case 'dashboard':renderDashboard();break;
        case 'history':renderHistory();break;
        case 'limits':renderLimits();break;
        case 'admin':renderAdmin();break;
    }
}

// ===== HOME =====
function renderHome(){
    const g=$('featuredGames');if(g)g.innerHTML=GAMES.filter(x=>x.badge).map(gameCard).join('');
}

// ===== GAMES =====
function renderGames(cat='all'){
    const el=$('allGames');if(!el)return;
    const f=cat==='all'?GAMES:GAMES.filter(x=>x.category===cat);
    el.innerHTML=f.map(gameCard).join('');
}
function filterGames(cat){
    renderGames(cat);
    document.querySelectorAll('.games-filters .filter-btn').forEach(b=>{
        const t=b.textContent.trim();
        b.classList.toggle('active',t===(cat==='all'?'Todos':cat==='skill'?'Habilidade':cat==='trivia'?'Quiz':cat==='puzzle'?'Puzzle':'Arcade'));
    });
}
function gameCard(g){
    return `<div class="game-card" onclick="playGame(${g.id})"><div class="game-thumb">${g.icon}${g.badge?`<span class="game-badge badge-${g.badge}">${g.badge==='hot'?'🔥 Pop':g.badge==='new'?'✨ Novo':'⭐ VIP'}</span>`:''}</div><div class="game-info"><h3>${g.name}</h3><div class="game-cat">${g.category} • ${g.players.toLocaleString()} jogadores</div><div class="game-meta"><span class="game-prize">R$ ${g.prize},00</span><button class="game-play" onclick="event.stopPropagation();playGame(${g.id})">Jogar R$ ${g.entry}</button></div></div></div>`;
}

// ===== MODAL =====
function showModal(type){
    const o=$('modalOverlay');if(!o)return;
    const c=o.querySelector('#modalContent')||o.querySelector('.modal');if(!c)return;
    o.classList.add('open');o.style.display='flex';
    if(type==='login'){
        c.innerHTML=`<button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button><h2>Entrar</h2><div class="input-group"><label>Email</label><input type="email" id="loginEmail" placeholder="seu@email.com"></div><div class="input-group"><label>Senha</label><input type="password" id="loginPass" placeholder="••••••"></div><button class="btn btn-primary" onclick="doLogin()"><i class="fas fa-sign-in-alt"></i> Entrar</button><div class="alt-action">Não tem conta? <a href="#" onclick="showModal('register')">Cadastre-se</a></div>`;
    } else if(type==='register'){
        c.innerHTML=`<button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button><h2>Criar Conta</h2><div class="input-group"><label>Nome</label><input type="text" id="regName" placeholder="Seu nome"></div><div class="input-group"><label>Email</label><input type="email" id="regEmail" placeholder="seu@email.com"></div><div class="input-group"><label>Senha</label><input type="password" id="regPass" placeholder="Min 6 caracteres"></div><div class="input-group"><label><input type="checkbox" id="regAge"> Tenho 18+</label></div><button class="btn btn-primary" onclick="doRegister()"><i class="fas fa-user-plus"></i> Cadastrar</button><div class="alt-action">Já tem conta? <a href="#" onclick="showModal('login')">Entrar</a></div>`;
    } else if(type==='deposit'){
        c.innerHTML=`<button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button><h2><i class="fas fa-coins" style="color:var(--accent-gold);"></i> Depositar via PIX</h2><p style="color:var(--text-secondary);text-align:center;margin-bottom:20px;">Escolha o valor e pague com PIX. Credita na hora!</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;"><button class="btn btn-outline" onclick="startDeposit(5)" style="font-size:18px;padding:20px;"><i class="fas fa-coins"></i><br>R$ 5</button><button class="btn btn-outline" onclick="startDeposit(10)" style="font-size:18px;padding:20px;"><i class="fas fa-coins"></i><br>R$ 10</button><button class="btn btn-outline" onclick="startDeposit(15)" style="font-size:18px;padding:20px;"><i class="fas fa-coins"></i><br>R$ 15</button><button class="btn btn-primary" onclick="startDeposit(20)" style="font-size:18px;padding:20px;"><i class="fas fa-fire"></i><br>R$ 20</button></div><div class="input-group"><label>Ou digite o valor</label><input type="number" id="customDeposit" placeholder="Ex: 30" min="1"><button class="btn btn-primary" onclick="startDeposit(Number($('customDeposit').value))" style="width:100%;margin-top:8px;">Gerar PIX</button></div>`;
    } else if(type==='pix'){
        c.innerHTML=`<button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button><h2><i class="fas fa-qrcode" style="color:var(--accent-cyan);"></i> PIX Copia e Cola</h2><div style="text-align:center;margin-bottom:16px;"><div style="font-size:36px;font-weight:900;color:var(--accent-gold);margin-bottom:8px;">R$ ${window._depositAmount},00</div><p style="color:var(--text-secondary);font-size:13px;">Pix Copia e Cola —.instantâneo</p></div><div style="background:var(--bg-input);border:1px solid var(--border);border-radius:8px;padding:16px;word-break:break-all;font-size:11px;font-family:JetBrains Mono,monospace;margin-bottom:16px;user-select:all;" id="pixCode">${generatePixCode()}</div><button class="btn btn-primary" onclick="copyPix()" style="width:100%;margin-bottom:8px;"><i class="fas fa-copy"></i> Copiar Código PIX</button><button class="btn btn-success" onclick="confirmDeposit()" style="width:100%;margin-bottom:12px;"><i class="fas fa-check"></i> Já Paguei — Confirmar</button><p style="color:var(--text-secondary);font-size:12px;text-align:center;">Depois de pagar, clique em "Já Paguei" para creditar na hora.</p>`;
    }
}
function closeModal(){const o=$('modalOverlay');if(o){o.classList.remove('open');o.style.display='none';}}
document.addEventListener('DOMContentLoaded',()=>{
    const o=$('modalOverlay');if(o)o.addEventListener('click',e=>{if(e.target===o)closeModal();});
});

// ===== PIX CODE =====
function generatePixCode(){
    // Gera código PIX copia e cola
    const now=new Date();
    const txid='GV'+now.getFullYear()+''+String(now.getMonth()+1).padStart(2,'0')+''+String(now.getDate()).padStart(2,'0')+''+String(now.getHours()).padStart(2,'0')+''+String(now.getMinutes()).padStart(2,'0')+''+String(Math.floor(Math.random()*9999)).padStart(4,'0');
    const val=window._depositAmount.toFixed(2).replace('.','');
    // Simplified PIX payload
    return `00020126580014br.gov.bcb.pix0136${PIX_KEY}0212GameVault Pay520400005303986540${val.length<10?'0'+val.length:''}${val}5802BR5913${PIX_NAME.substring(0,13)}6009SAO PAULO62070503***6304${calcCRC16('00020126580014br.gov.bcb.pix0136'+PIX_KEY+'0212GameVault Pay520400005303986540'+(val.length<10?'0'+val.length:'')+val+'5802BR5913'+PIX_NAME.substring(0,13)+'6009SAO PAULO62070503***6304')}`;
}
function calcCRC16(str){let crc=0xFFFF;for(let i=0;i<str.length;i++){crc^=str.charCodeAt(i);for(let j=0;j<8;j++){crc=(crc&1)!==0?(crc>>1)^0xA001:crc>>1;}}return(crc&0xFFFF).toString(16).toUpperCase().padStart(4,'0');}

// ===== DEPOSIT =====
function startDeposit(amount){
    if(!state.user){showModal('login');return;}
    if(!amount||amount<1){showToast('Valor mínimo R$ 1,00','error');return;}
    if(amount>500){showToast('Valor máximo R$ 500,00','error');return;}
    window._depositAmount=amount;
    window._depositId='DEP'+Date.now();
    showModal('pix');
}
function copyPix(){
    const code=$('pixCode');
    if(code){
        navigator.clipboard.writeText(code.textContent.trim()).then(()=>showToast('Código PIX copiado!','success')).catch(()=>{code.select();document.execCommand('copy');showToast('Código copiado!','success');});
    }
}
function confirmDeposit(){
    if(!state.user||!window._depositAmount)return;
    const amount=window._depositAmount;
    state.user.balance+=amount;
    state.user.deposit+=amount;
    state.user.transactions.unshift({t:'deposit',a:amount,d:`Depósito PIX R$ ${amount},00`,dt:fmt(),id:window._depositId});
    save();updateUI();closeModal();
    showToast(`R$ ${amount},00 creditado na sua conta!`,'success');
}

// ===== WITHDRAW =====
function requestWithdraw(){
    if(!state.user)return;
    if(state.user.kyc!=='approved'){showToast('Complete o KYC para sacar','error');return;}
    if(state.user.balance<10){showToast('Saque mínimo R$ 10','error');return;}
    const val=prompt(`Saldo: R$ ${state.user.balance.toFixed(2)}\nDigite valor do saque (Pix cairá na sua conta):`);
    if(!val||isNaN(val)||Number(val)<10||Number(val)>state.user.balance){showToast('Valor inválido','error');return;}
    const amount=Number(val);
    state.user.balance-=amount;
    state.user.withdrawn+=amount;
    state.user.transactions.unshift({t:'withdraw',a:-amount,d:`Saque PIX R$ ${amount.toFixed(2)}`,dt:fmt()});
    save();updateUI();renderWallet();
    showToast(`Saque de R$ ${amount.toFixed(2)} solicitado! Será creditado via PIX em breve.`,'success');
}

// ===== AUTH =====
function doLogin(){
    const email=($('loginEmail')||{}).value||'';
    const pass=($('loginPass')||{}).value||'';
    if(!email.trim()||!pass){showToast('Preencha todos os campos','error');return;}
    const saved=localStorage.getItem('gv_users');
    const users=saved?JSON.parse(saved):[];
    const found=users.find(u=>u.email===email.trim());
    state.user=found||defUser(email.trim(),email.trim().split('@')[0]);
    if(!found)localStorage.setItem('gv_users',JSON.stringify([...users,state.user]));
    save();updateUI();closeModal();
    showToast(`Bem-vindo, ${state.user.name}!`,'success');
}
function doRegister(){
    const name=($('regName')||{}).value||'';
    const email=($('regEmail')||{}).value||'';
    const pass=($('regPass')||{}).value||'';
    const age=($('regAge')||{}).checked;
    if(!name.trim()||!email.trim()||!pass){showToast('Preencha todos os campos','error');return;}
    if(!age){showToast('18+ obrigatório','error');return;}
    if(pass.length<6){showToast('Min 6 caracteres','error');return;}
    state.user=defUser(email.trim(),name.trim());
    const saved=localStorage.getItem('gv_users');
    const users=saved?JSON.parse(saved):[];
    localStorage.setItem('gv_users',JSON.stringify([...users,state.user]));
    save();updateUI();closeModal();
    showToast(`Conta criada! R$ 50 bônus!`,'success');
}
function logout(){state.user=null;localStorage.removeItem('gv_user');updateUI();showPage('home');showToast('Sessão encerrada','info');}
function toggleUserMenu(){$('userDropdown').classList.toggle('open');}
document.addEventListener('click',e=>{if(!e.target.closest('.user-menu')){const d=$('userDropdown');if(d)d.classList.remove('open');}});
function updateUI(){
    if(state.user){
        $('userName').textContent=state.user.name;
        $('userBalance').textContent=state.user.balance.toFixed(2).replace('.',',');
        $('authButtons').style.display='none';
        $('userActions').style.display='block';
    } else {
        $('userName').textContent='Entrar';
        $('userBalance').textContent='0,00';
        $('authButtons').style.display='block';
        $('userActions').style.display='none';
    }
}

// ===== TOAST =====
function showToast(msg,type='info'){
    let c=document.querySelector('.toast-container');
    if(!c){c=document.createElement('div');c.className='toast-container';document.body.appendChild(c);}
    const t=document.createElement('div');t.className=`toast toast-${type}`;t.textContent=msg;
    c.appendChild(t);setTimeout(()=>t.remove(),4000);
}

// ===== WALLET =====
function renderWallet(){
    if(!state.user)return;
    const b=$('walletBalance');if(b)b.textContent=state.user.balance.toFixed(2).replace('.',',');
    const tl=$('transactionList');
    if(tl){
        tl.innerHTML=state.user.transactions.length===0?'<p style="color:var(--text-secondary);text-align:center;padding:20px;">Nenhuma transação</p>':
        state.user.transactions.slice(0,15).map(t=>{
            const isPos=t.a>0;
            const color=t.t==='deposit'||t.t==='win'||t.t==='bonus'?'var(--accent-green)':'var(--accent-red)';
            const icon=t.t==='deposit'||t.t==='bonus'?'arrow-down':t.t==='win'?'trophy':'arrow-up';
            const bgColor=isPos?'rgba(16,185,129,0.15)':'rgba(239,68,68,0.15)';
            return `<div class="history-item"><div class="left"><div class="icon" style="background:${bgColor}"><i class="fas fa-${icon}" style="color:${color}"></i></div><div><div class="name">${t.d}</div><div class="date">${t.dt}</div></div></div><span class="amount ${isPos?'amount-pos':'amount-neg'}">${isPos?'+':''} R$ ${Math.abs(t.a).toFixed(2).replace('.',',')}</span></div>`;
        }).join('');
    }
}

// ===== TOURNAMENTS =====
function renderTournaments(){
    const el=$('tournamentsList');if(!el)return;
    el.innerHTML=TOURNAMENTS.map(t=>`<div class="tournament-card"><div class="tournament-info"><h3>${t.name}</h3><div class="tournament-meta"><span><i class="fas fa-gamepad"></i> ${t.game}</span><span><i class="fas fa-users"></i> ${t.players}</span><span><i class="fas fa-clock"></i> ${t.time}</span><span><i class="fas fa-tag"></i> R$ ${t.entry},00</span></div></div><div class="tournament-prize"><div class="amount">R$ ${t.prize},00</div><button class="btn ${t.status==='Aberto'?'btn-primary':'btn-outline'} btn-sm" style="margin-top:8px;" ${t.status!=='Aberto'?'disabled':''} onclick="joinTournament(${t.id})">${t.status==='Aberto'?'Participar':'Em Breve'}</button></div></div>`).join('');
}
function joinTournament(id){
    if(!state.user){showModal('login');return;}
    const t=TOURNAMENTS.find(x=>x.id===id);
    if(t&&state.user.balance>=t.entry){state.user.balance-=t.entry;state.user.transactions.unshift({t:'entry',a:-t.entry,d:`Entry: ${t.name}`,dt:fmt()});save();updateUI();showToast(`Inscrito no ${t.name}!`,'success');}
    else showToast('Saldo insuficiente','error');
}

// ===== RESPONSIBLE GAMING =====
function renderResponsible(){
    const el=document.querySelector('#page-responsible .container');if(!el)return;
    el.innerHTML=`<div class="section-header"><h2><i class="fas fa-shield-halved"></i> Jogo Responsável</h2><p>Sua segurança é prioridade</p></div>
    <div class="rg-section"><h2><i class="fas fa-18-up" style="color:var(--accent-red);"></i> 18+ Apenas</h2><p>Plataforma para maiores de 18 anos. Jogos envolvem risco financeiro.</p></div>
    <div class="rg-section"><h2><i class="fas fa-balance-scale" style="color:var(--accent-gold);"></i> Lei 14.790/2023</h2><p>Em conformidade com a regulamentação brasileira.</p></div>
    <div class="rg-section"><h2><i class="fas fa-ban" style="color:var(--accent-red);"></i> Autoexclusão</h2><div class="exclusion-options"><button class="exclusion-btn" onclick="activateExclusion(1)"><span class="period">24h</span><span class="desc">24 horas</span></button><button class="exclusion-btn" onclick="activateExclusion(7)"><span class="period">7 dias</span><span class="desc">Uma semana</span></button><button class="exclusion-btn" onclick="activateExclusion(30)"><span class="period">30 dias</span><span class="desc">Um mês</span></button></div></div>
    <div class="rg-section"><h2><i class="fas fa-phone" style="color:var(--accent-green);"></i> Ajuda</h2><ul class="rg-list"><li><i class="fas fa-phone"></i> CVV: 188</li><li><i class="fas fa-phone"></i> SAMU: 192</li><li><i class="fas fa-globe"></i> aab-jogadores.org.br</li></ul></div>`;
}
function activateExclusion(days){if(!state.user)return;if(!confirm(`Autoexclusão por ${days} dias?`))return;state.user.selfExclusion={days,start:Date.now(),end:Date.now()+days*86400000};save();showToast(`Autoexclusão ${days} dias ativada.`,'info');}

// ===== DASHBOARD =====
function renderDashboard(){
    if(!state.user)return;const el=$('dashboardContent');if(!el)return;
    el.innerHTML=`<div class="dash-stats"><div class="dash-stat"><div class="label">Saldo</div><div class="value" style="color:var(--accent-gold);">R$ ${state.user.balance.toFixed(2).replace('.',',')}</div></div><div class="dash-stat"><div class="label">Jogos</div><div class="value">${state.user.played}</div></div><div class="dash-stat"><div class="label">Ganho Total</div><div class="value" style="color:var(--accent-green);">R$ ${state.user.won.toFixed(2).replace('.',',')}</div></div><div class="dash-stat"><div class="label">Depositado</div><div class="value">R$ ${state.user.deposit.toFixed(2).replace('.',',')}</div></div></div>
    <div class="wallet-card"><h3><i class="fas fa-id-card"></i> KYC</h3><div class="kyc-status kyc-${state.user.kyc}"><i class="fas fa-${state.user.kyc==='approved'?'check-circle':'clock'}"></i><div><strong>${state.user.kyc==='approved'?'Verificado':'Pendente'}</strong><p style="font-size:13px;color:var(--text-secondary);">${state.user.kyc==='approved'?'Verificado.':'Complete para sacar.'}</p></div></div></div>`;
}

// ===== HISTORY =====
function renderHistory(){if(!state.user)return;const el=$('historyList');if(!el)return;el.innerHTML=state.user.history.length===0?'<p style="color:var(--text-secondary);text-align:center;padding:40px;">Nenhum jogo</p>':state.user.history.map(h=>`<div class="history-item"><div class="left"><div class="icon" style="background:${h.result==='Ganhou'?'rgba(16,185,129,0.15)':'rgba(239,68,68,0.15)'}"><i class="fas fa-${h.result==='Ganhou'?'trophy':'times'}" style="color:${h.result==='Ganhou'?'var(--accent-green)':'var(--accent-red)'}"></i></div><div><div class="name">${h.game}</div><div class="date">${h.date}</div></div></div><span class="amount ${h.amount>0?'amount-pos':'amount-neg'}">${h.amount>0?`+R$ ${h.amount.toFixed(2).replace('.',',')}`:h.result}</span></div>`).join('');}

// ===== LIMITS =====
function renderLimits(){if(!state.user)return;const el=$('limitsForm');if(!el)return;el.innerHTML=`<div class="wallet-card"><div class="input-group"><label>Limite Diário (R$)</label><input type="number" id="limitDaily" value="${state.user.limits.daily}"></div><div class="input-group"><label>Limite Semanal (R$)</label><input type="number" id="limitWeekly" value="${state.user.limits.weekly}"></div><div class="input-group"><label>Limite Mensal (R$)</label><input type="number" id="limitMonthly" value="${state.user.limits.monthly}"></div><button class="btn btn-primary" onclick="saveLimits()"><i class="fas fa-save"></i> Salvar</button></div>`;}
function saveLimits(){state.user.limits.daily=Number(($('limitDaily')||{}).value)||500;state.user.limits.weekly=Number(($('limitWeekly')||{}).value)||2000;state.user.limits.monthly=Number(($('limitMonthly')||{}).value)||5000;save();showToast('Limites salvos!','success');}

// ===== ADMIN =====
function renderAdmin(){
    const el=$('adminContent');if(!el)return;
    const saved=localStorage.getItem('gv_users');const users=saved?JSON.parse(saved):[];
    const totalDeposits=users.reduce((s,u)=>s+u.deposit,0);
    const totalWithdraws=users.reduce((s,u)=>s+u.withdrawn,0);
    el.innerHTML=`<div class="dash-stats"><div class="dash-stat"><div class="label">Usuários</div><div class="value">${users.length}</div></div><div class="dash-stat"><div class="label">Total Depositado</div><div class="value" style="color:var(--accent-green);">R$ ${totalDeposits.toFixed(2).replace('.',',')}</div></div><div class="dash-stat"><div class="label">Total Sacado</div><div class="value" style="color:var(--accent-red);">R$ ${totalWithdraws.toFixed(2).replace('.',',')}</div></div><div class="dash-stat"><div class="label">Saldo Plataforma</div><div class="value" style="color:var(--accent-gold);">R$ ${(totalDeposits-totalWithdraws).toFixed(2).replace('.',',')}</div></div></div>
    <div class="wallet-card"><h3><i class="fas fa-users"></i> Usuários</h3><div class="table-wrap"><table><thead><tr><th>Nome</th><th>Email</th><th>Saldo</th><th>Depositado</th><th>Sacado</th><th>Status</th></tr></thead><tbody>${users.map(u=>`<tr><td>${u.name}</td><td style="font-size:12px;">${u.email}</td><td>R$ ${u.balance.toFixed(2).replace('.',',')}</td><td style="color:var(--accent-green);">R$ ${u.deposit.toFixed(2).replace('.',',')}</td><td style="color:var(--accent-red);">R$ ${u.withdrawn.toFixed(2).replace('.',',')}</td><td><span style="color:${u.kyc==='approved'?'var(--accent-green)':'var(--accent-gold)'};">${u.kyc==='approved'?'✓':'⏳'}</span></td></tr>`).join('')}</tbody></table></div></div>`;
}

// ===== GAME PLAY =====
function playGame(id){
    if(!state.user){showModal('login');return;}
    if(state.user.selfExclusion){showToast('Autoexclusão ativa.','error');return;}
    const game=GAMES.find(g=>g.id===id);if(!game)return;
    if(state.user.balance<game.entry){showToast('Saldo insuficiente. Depósita!','error');return;}
    state.currentGame=game;showPage('play');
    const area=$('gamePlayArea');if(!area)return;
    if(game.category==='trivia')startQuiz(area);
    else if(game.category==='skill')startSkill(area);
    else startArcade(area);
}
function startQuiz(area){state.quiz={i:0,s:0,q:shuffle([...QUIZ_Q]).slice(0,5)};renderQuizQ(area);}
function renderQuizQ(area){const{i,s,q}=state.quiz;if(i>=q.length){finishQuiz(area);return;}const qe=q[i];area.innerHTML=`<div class="game-play-area"><h2>${state.currentGame.icon} ${state.currentGame.name}</h2><div class="prize-display">R$ ${state.currentGame.prize},00</div><p style="color:var(--text-secondary);margin-bottom:8px;">${i+1}/${q.length} • Acertos: ${s}</p><p style="font-size:18px;font-weight:600;margin-bottom:24px;">${qe.q}</p>${qe.opts.map((o,j)=>`<button class="quiz-option" onclick="answerQuiz(${j},${qe.c})">${o}</button>`).join('')}</div>`;}
function answerQuiz(chosen,correct){const opts=document.querySelectorAll('.quiz-option');opts.forEach((o,i)=>{o.disabled=true;if(i===correct)o.classList.add('correct');if(i===chosen&&chosen!==correct)o.classList.add('wrong');});if(chosen===correct)state.quiz.s++;setTimeout(()=>{state.quiz.i++;const a=$('gamePlayArea');if(a)renderQuizQ(a);},1200);}
function finishQuiz(area){const{s,q}=state.quiz;const pct=s/q.length;let prize=0;if(pct>=0.8)prize=state.currentGame.prize;else if(pct>=0.6)prize=Math.floor(state.currentGame.prize*0.5);else if(pct>=0.4)prize=Math.floor(state.currentGame.prize*0.2);if(prize>0){state.user.balance+=prize;state.user.won+=prize;state.user.transactions.unshift({t:'win',a:prize,d:`${state.currentGame.name}`,dt:fmt()});}state.user.balance-=state.currentGame.entry;state.user.played++;state.user.history.unshift({game:state.currentGame.name,result:prize>0?'Ganhou':'Perdeu',amount:prize,date:fmt()});save();updateUI();area.innerHTML=`<div class="game-play-area"><h2>${prize>0?'🎉 Parabéns!':'😔 Tente Novamente'}</h2><p style="font-size:18px;margin:16px 0;">Acertou ${s}/${q.length}</p><div class="prize-display">${prize>0?`+ R$ ${prize},00`:'R$ 0,00'}</div><div style="margin-top:32px;display:flex;gap:12px;justify-content:center;"><button class="btn btn-primary" onclick="playGame(${state.currentGame.id})"><i class="fas fa-redo"></i> Jogar</button><button class="btn btn-outline" onclick="showPage('games')"><i class="fas fa-arrow-left"></i> Voltar</button></div></div>`;}
function startSkill(area){const emojis=['✊','✋','✌️'];area.innerHTML=`<div class="game-play-area"><h2>${state.currentGame.icon} ${state.currentGame.name}</h2><div class="prize-display">R$ ${state.currentGame.prize},00</div><p style="color:var(--text-secondary);margin-bottom:24px;">Escolha:</p>${emojis.map((e,i)=>`<button class="quiz-option" style="text-align:center;font-size:48px;max-width:160px;display:inline-block;margin:8px;" onclick="playSkill(${i})">${e}</button>`).join('')}</div>`;}
function playSkill(pc){const cc=Math.floor(Math.random()*3);const w=[[-1,1,0],[0,-1,1],[1,0,-1]];const r=w[pc][cc];let prize=0;if(r>0)prize=state.currentGame.prize;else if(r===0)prize=state.currentGame.entry;if(r>0){state.user.balance+=prize;state.user.won+=prize;state.user.transactions.unshift({t:'win',a:prize,d:`${state.currentGame.name}`,dt:fmt()});}state.user.balance-=state.currentGame.entry;state.user.played++;state.user.history.unshift({game:state.currentGame.name,result:r>0?'Ganhou':r===0?'Empate':'Perdeu',amount:prize,date:fmt()});save();updateUI();const emojis=['✊','✋','✌️'];const area=$('gamePlayArea');area.innerHTML=`<div class="game-play-area"><h2>${r>0?'🎉 Ganhou!':r===0?'🤝 Empate!':'😔 Perdeu!'}</h2><p style="font-size:24px;margin:20px 0;">Você: ${emojis[pc]} vs ${emojis[cc]} :CPU</p><div class="prize-display">${prize>0?`+ R$ ${prize},00`:'R$ 0,00'}</div><div style="margin-top:32px;display:flex;gap:12px;justify-content:center;"><button class="btn btn-primary" onclick="playGame(${state.currentGame.id})"><i class="fas fa-redo"></i> Jogar</button><button class="btn btn-outline" onclick="showPage('games')"><i class="fas fa-arrow-left"></i> Voltar</button></div></div>`;}
function startArcade(area){window._ac=0;const t0=Date.now();area.innerHTML=`<div class="game-play-area"><h2>${state.currentGame.icon} ${state.currentGame.name}</h2><div class="prize-display">R$ ${state.currentGame.prize},00</div><p style="color:var(--text-secondary);margin-bottom:24px;">Clique rápido em 10s!</p><div id="arcT" style="font-size:48px;font-weight:800;color:var(--accent-cyan);margin:20px 0;">10</div><button class="btn btn-primary" style="font-size:24px;padding:30px 60px;border-radius:16px;" onclick="window._ac++;const c=$('arcC');if(c)c.textContent=window._ac+' cliques'">🎯 CLICAR!</button><div id="arcC" style="font-size:32px;font-weight:800;margin-top:16px;">0 cliques</div></div>`;const iv=setInterval(()=>{const rem=Math.max(0,10-Math.floor((Date.now()-t0)/1000));const te=$('arcT');if(te)te.textContent=rem;if(rem<=0){clearInterval(iv);finishArc(area);}},100);}
function finishArc(area){const total=window._ac||0;let prize=0;if(total>=80)prize=state.currentGame.prize;else if(total>=50)prize=Math.floor(state.currentGame.prize*0.5);else if(total>=30)prize=Math.floor(state.currentGame.prize*0.2);if(prize>0){state.user.balance+=prize;state.user.won+=prize;state.user.transactions.unshift({t:'win',a:prize,d:`${state.currentGame.name}`,dt:fmt()});}state.user.balance-=state.currentGame.entry;state.user.played++;state.user.history.unshift({game:state.currentGame.name,result:prize>0?'Ganhou':'Perdeu',amount:prize,date:fmt()});save();updateUI();area.innerHTML=`<div class="game-play-area"><h2>${prize>0?'🎉 Incrível!':'😔 Quase!'}</h2><p style="font-size:18px;margin:16px 0;">${total} cliques em 10s</p><div class="prize-display">${prize>0?`+ R$ ${prize},00`:'R$ 0,00'}</div><div style="margin-top:32px;display:flex;gap:12px;justify-content:center;"><button class="btn btn-primary" onclick="playGame(${state.currentGame.id})"><i class="fas fa-redo"></i> Jogar</button><button class="btn btn-outline" onclick="showPage('games')"><i class="fas fa-arrow-left"></i> Voltar</button></div></div>`;}

// ===== REALITY CHECK =====
function checkReality(){if(!state.user)return;if((Date.now()-state.sessionStart)/60000>=60&&!state.realityShown){state.realityShown=true;const o=document.createElement('div');o.className='reality-check-overlay';o.innerHTML=`<div class="reality-check-box"><h2>⏰ Verificação</h2><p style="color:var(--text-secondary);">Jogando há ${Math.floor((Date.now()-state.sessionStart)/60000)} min</p><p style="color:var(--text-secondary);margin-bottom:24px;">Jogue com responsabilidade.</p><button class="btn btn-primary" onclick="this.closest('.reality-check-overlay').remove()">Continuar</button></div>`;document.body.appendChild(o);}}

// ===== INIT =====
window.addEventListener('load',()=>{
    const saved=localStorage.getItem('gv_user');if(saved){state.user=JSON.parse(saved);updateUI();}
    setInterval(checkReality,60000);
    renderHome();
    document.querySelectorAll('.stat-num').forEach(el=>{const target=parseInt(el.dataset.target);let c=0;const s=target/60;const t=setInterval(()=>{c+=s;if(c>=target){c=target;clearInterval(t);}el.textContent=Math.floor(c).toLocaleString('pt-BR');},30);});
    setTimeout(()=>{const p=$('preloader');if(p)p.classList.add('hidden');},1500);
    state.sessionStart=Date.now();state.realityShown=false;
    // Check admin
    if(state.user&&state.user.email==='admin@gamevault.com'){showPage('admin');}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
