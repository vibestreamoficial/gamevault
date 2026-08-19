// GameVault v1.0.1 - Fixed modal + ID mismatch
const GAMES = [
    { id:1, name:"Quiz Milionário", category:"trivia", icon:"🧠", prize:150, entry:5, players:2340, badge:"hot", desc:"Responde perguntas e ganhe dinheiro real." },
    { id:2, name:"Caça-Moedas", category:"arcade", icon:"🪙", prize:80, entry:3, players:5120, badge:"hot", desc:"Colete moedas no tempo certo." },
    { id:3, name:"Memória VIP", category:"skill", icon:"🃏", prize:120, entry:4, players:1800, badge:"new", desc:"Jogo de memória com prêmios reais." },
    { id:4, name:"Sudoku Rush", category:"puzzle", icon:"🔢", prize:200, entry:8, players:890, badge:"pro", desc:"Resolva Sudoku contra o relógio." },
    { id:5, name:"Pedra Papel Tesoura", category:"skill", icon:"✊", prize:60, entry:2, players:8900, badge:"hot", desc:"Desafie outros jogadores." },
    { id:6, name:"Trivia Esportes", category:"trivia", icon:"⚽", prize:100, entry:5, players:3200, badge:"", desc:"Teste seu conhecimento esportivo." },
    { id:7, name:"Color Match", category:"arcade", icon:"🎨", prize:90, entry:3, players:4500, badge:"new", desc:"Combine as cores no tempo certo." },
    { id:8, name:"Puzzle 2048", category:"puzzle", icon:"🧩", prize:180, entry:6, players:2100, badge:"", desc:"Alcance 2048 e ganhe o prêmio." },
    { id:9, name:"Adivinha o Número", category:"trivia", icon:"🎯", prize:70, entry:2, players:6700, badge:"hot", desc:"Acerte o número secreto." },
    { id:10, name:"Reflexão Rápida", category:"skill", icon:"⚡", prize:110, entry:4, players:1500, badge:"new", desc:"Teste seus reflexos." }
];
const TOURNAMENTS = [
    { id:1, name:"Copa Quiz Semanal", game:"Quiz Milionário", prize:500, entry:20, players:"128/256", time:"Sexta 20h", status:"Aberto" },
    { id:2, name:"Desafio Arcade", game:"Caça-Moedas", prize:300, entry:15, players:"64/128", time:"Sábado 14h", status:"Aberto" },
    { id:3, name:"Torneio Elite", game:"Sudoku Rush", prize:1000, entry:50, players:"32/64", time:"Domingo 19h", status:"Em Breve" },
    { id:4, name:"Mega Trivia", game:"Trivia Esportes", prize:250, entry:10, players:"200/256", time:"Quarta 20h", status:"Aberto" }
];
const QUIZ_QUESTIONS = [
    { q:"Qual é a capital do Brasil?", opts:["Rio de Janeiro","São Paulo","Brasília","Salvador"], correct:2 },
    { q:"Quantos planetas tem no sistema solar?", opts:["7","8","9","10"], correct:1 },
    { q:"Qual elemento químico tem símbolo 'O'?", opts:["Ouro","Oxigênio","Prata","Ósmio"], correct:1 },
    { q:"Em que ano o Brasil ficou independente?", opts:["1808","1822","1889","1500"], correct:1 },
    { q:"Qual é o maior oceano do mundo?", opts:["Atlântico","Índico","Pacífico","Ártico"], correct:2 },
    { q:"Quem pintou a Mona Lisa?", opts:["Picasso","Van Gogh","Da Vinci","Rembrandt"], correct:2 },
    { q:"Qual é a velocidade da luz em km/s?", opts:["200.000","300.000","400.000","500.000"], correct:1 },
    { q:"Qual é o maior país do mundo?", opts:["China","EUA","Canadá","Rússia"], correct:3 },
    { q:"Quantos ossos tem o corpo humano?", opts:["186","206","226","256"], correct:1 },
    { q:"Qual é o animal terrestre mais rápido?", opts:["Leão","Guepardo","Gazela","Tigre"], correct:1 }
];

let state = { user:null, currentPage:'home', currentGame:null, currentQuiz:{index:0,score:0,questions:[]}, sessionStart:Date.now(), realityCheckShown:false };

function $(id){ return document.getElementById(id); }
function saveUser(){ if(state.user) localStorage.setItem('gamevault_user',JSON.stringify(state.user)); }

function defaultUser(email,name){
    return { email,name,balance:50,deposit:0,played:0,won:0,kyc:'pending',limits:{daily:500,weekly:2000,monthly:5000,sessionMin:120},selfExclusion:null,transactions:[{type:'bonus',amount:50,desc:'Bônus de cadastro',date:new Date().toLocaleDateString('pt-BR')}],history:[] };
}

function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

// ========== PAGES ==========
function showPage(page){
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    const el = $('page-'+page) || $('page-'+page.replace('gameplay','play'));
    if(el) el.classList.add('active');
    state.currentPage = page;
    document.querySelectorAll('.nav-link').forEach(l=>l.classList.remove('active'));
    const al = document.querySelector(`.nav-link[data-page="${page}"]`);
    if(al) al.classList.add('active');
    renderPage(page);
    window.scrollTo(0,0);
}

function renderPage(page){
    switch(page){
        case 'home': renderFeatured(); break;
        case 'games': renderGamesGrid(); break;
        case 'wallet': renderWallet(); break;
        case 'tournaments': renderTournaments(); break;
        case 'responsible': renderResponsible(); break;
        case 'dashboard': renderDashboard(); break;
        case 'history': renderHistory(); break;
        case 'limits': renderLimits(); break;
    }
}

function renderFeatured(){
    const g = $('featuredGames');
    if(g) g.innerHTML = GAMES.filter(x=>x.badge).map(gameCard).join('');
}

function renderGamesGrid(filter='all'){
    const el = $('allGames');
    if(!el) return;
    const f = filter==='all'?GAMES:GAMES.filter(x=>x.category===filter);
    el.innerHTML = f.map(gameCard).join('');
}

function filterGames(cat){ renderGamesGrid(cat); document.querySelectorAll('.games-filters .filter-btn').forEach(b=>{ b.classList.toggle('active',b.textContent.trim()===(cat==='all'?'Todos':cat==='skill'?'Habilidade':cat==='trivia'?'Quiz':cat==='puzzle'?'Puzzle':'Arcade')); }); }

function gameCard(g){
    return `<div class="game-card" onclick="playGame(${g.id})"><div class="game-thumb">${g.icon}${g.badge?`<span class="game-badge badge-${g.badge}">${g.badge==='hot'?'🔥 Pop':g.badge==='new'?'✨ Novo':'⭐ VIP'}</span>`:''}</div><div class="game-info"><h3>${g.name}</h3><div class="game-cat">${g.category} • ${g.players.toLocaleString()} jogadores</div><div class="game-meta"><span class="game-prize">R$ ${g.prize},00</span><button class="game-play" onclick="event.stopPropagation();playGame(${g.id})">Jogar R$ ${g.entry}</button></div></div></div>`;
}

// ========== MODAL ==========
function showModal(type){
    const overlay = $('modalOverlay');
    if(!overlay) return;
    const content = overlay.querySelector('#modalContent') || overlay.querySelector('.modal > div:last-child');
    if(!content) return;
    overlay.classList.add('open');
    overlay.style.display = 'flex';
    if(type==='login'){
        content.innerHTML = `<button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button><h2>Entrar</h2><div class="input-group"><label>Email</label><input type="email" id="loginEmail" placeholder="seu@email.com"></div><div class="input-group"><label>Senha</label><input type="password" id="loginPass" placeholder="••••••"></div><button class="btn btn-primary" onclick="doLogin()"><i class="fas fa-sign-in-alt"></i> Entrar</button><div class="alt-action">Não tem conta? <a href="#" onclick="showModal('register')">Cadastre-se</a></div>`;
    } else if(type==='register'){
        content.innerHTML = `<button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button><h2>Criar Conta</h2><div class="input-group"><label>Nome</label><input type="text" id="regName" placeholder="Seu nome"></div><div class="input-group"><label>Email</label><input type="email" id="regEmail" placeholder="seu@email.com"></div><div class="input-group"><label>Senha</label><input type="password" id="regPass" placeholder="Mínimo 6 caracteres"></div><div class="input-group"><label>CPF</label><input type="text" id="regCPF" placeholder="000.000.000-00"></div><div class="input-group"><label><input type="checkbox" id="regAge"> Tenho 18 anos ou mais</label></div><button class="btn btn-primary" onclick="doRegister()"><i class="fas fa-user-plus"></i> Cadastrar</button><div class="alt-action">Já tem conta? <a href="#" onclick="showModal('login')">Entrar</a></div>`;
    }
}

function closeModal(){
    const overlay = $('modalOverlay');
    if(overlay){ overlay.classList.remove('open'); overlay.style.display='none'; }
}

// Click overlay to close
document.addEventListener('DOMContentLoaded',()=>{
    const overlay = $('modalOverlay');
    if(overlay) overlay.addEventListener('click',(e)=>{ if(e.target===overlay) closeModal(); });
});

// ========== AUTH ==========
function doLogin(){
    const email = ($('loginEmail')||{}).value||'';
    const pass = ($('loginPass')||{}).value||'';
    if(!email.trim()||!pass){ showToast('Preencha todos os campos','error'); return; }
    const saved = localStorage.getItem('gamevault_users');
    const users = saved ? JSON.parse(saved) : [];
    const found = users.find(u=>u.email===email.trim());
    state.user = found || defaultUser(email.trim(), email.trim().split('@')[0]);
    if(!found){ localStorage.setItem('gamevault_users',JSON.stringify([...users,state.user])); }
    saveUser(); updateUI(); closeModal();
    showToast(`Bem-vindo, ${state.user.name}!`,'success');
}

function doRegister(){
    const name = ($('regName')||{}).value||'';
    const email = ($('regEmail')||{}).value||'';
    const pass = ($('regPass')||{}).value||'';
    const age = ($('regAge')||{}).checked;
    if(!name.trim()||!email.trim()||!pass){ showToast('Preencha todos os campos','error'); return; }
    if(!age){ showToast('Você precisa ter 18+ para se cadastrar','error'); return; }
    if(pass.length<6){ showToast('Senha deve ter no mínimo 6 caracteres','error'); return; }
    state.user = defaultUser(email.trim(), name.trim());
    const saved = localStorage.getItem('gamevault_users');
    const users = saved ? JSON.parse(saved) : [];
    localStorage.setItem('gamevault_users',JSON.stringify([...users,state.user]));
    saveUser(); updateUI(); closeModal();
    showToast(`Conta criada! R$ 50,00 de bônus!`,'success');
}

function logout(){ state.user=null; localStorage.removeItem('gamevault_user'); updateUI(); showPage('home'); showToast('Sessão encerrada','info'); }

function toggleUserMenu(){ $('userDropdown').classList.toggle('open'); }

document.addEventListener('click',(e)=>{ if(!e.target.closest('.user-menu')){ const dd=$('userDropdown'); if(dd) dd.classList.remove('open'); } });

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

// ========== TOAST ==========
function showToast(msg,type='info'){
    const c=document.querySelector('.toast-container');
    if(!c){ const d=document.createElement('div');d.className='toast-container';document.body.appendChild(d); }
    const container=document.querySelector('.toast-container');
    const t=document.createElement('div');
    t.className=`toast toast-${type}`;
    t.textContent=msg;
    container.appendChild(t);
    setTimeout(()=>t.remove(),4000);
}

// ========== WALLET ==========
function renderWallet(){
    if(!state.user) return;
    const b = $('walletBalance');
    if(b) b.textContent=state.user.balance.toFixed(2).replace('.',',');
    const tl = $('transactionList');
    if(tl){
        tl.innerHTML = state.user.transactions.length===0?'<p style="color:var(--text-secondary);text-align:center;padding:20px;">Nenhuma transação</p>':
        state.user.transactions.slice(0,10).map(t=>`<div class="history-item"><div class="left"><div class="icon" style="background:${t.type==='win'||t.type==='bonus'?'rgba(16,185,129,0.15)':t.type==='deposit'?'rgba(34,211,238,0.15)':'rgba(239,68,68,0.15)'}"><i class="fas fa-${t.type==='win'||t.type==='bonus'?'trophy':t.type==='deposit'?'arrow-down':'arrow-up'}" style="color:${t.type==='win'||t.type==='bonus'?'var(--accent-green)':t.type==='deposit'?'var(--accent-cyan)':'var(--accent-red)'}"></i></div><div><div class="name">${t.desc}</div><div class="date">${t.date}</div></div></div><span class="amount ${t.amount>0?'amount-pos':'amount-neg'}">${t.amount>0?'+':''} R$ ${Math.abs(t.amount).toFixed(2).replace('.',',')}</span></div>`).join('');
    }
}

// ========== TOURNAMENTS ==========
function renderTournaments(){
    const el = $('tournamentsList');
    if(!el) return;
    el.innerHTML = TOURNAMENTS.map(t=>`<div class="tournament-card"><div class="tournament-info"><h3>${t.name}</h3><div class="tournament-meta"><span><i class="fas fa-gamepad"></i> ${t.game}</span><span><i class="fas fa-users"></i> ${t.players}</span><span><i class="fas fa-clock"></i> ${t.time}</span><span><i class="fas fa-tag"></i> R$ ${t.entry},00</span></div></div><div class="tournament-prize"><div class="amount">R$ ${t.prize},00</div><button class="btn ${t.status==='Aberto'?'btn-primary':'btn-outline'} btn-sm" style="margin-top:8px;" ${t.status!=='Aberto'?'disabled':''} onclick="joinTournament(${t.id})">${t.status==='Aberto'?'Participar':'Em Breve'}</button></div></div>`).join('');
}

function joinTournament(id){
    if(!state.user){ showModal('login'); return; }
    const t=TOURNAMENTS.find(x=>x.id===id);
    if(t&&state.user.balance>=t.entry){
        state.user.balance-=t.entry;
        state.user.transactions.unshift({type:'entry',amount:-t.entry,desc:`Entry: ${t.name}`,date:new Date().toLocaleDateString('pt-BR')});
        saveUser(); updateUI(); showToast(`Inscrito no ${t.name}!`,'success');
    } else showToast('Saldo insuficiente','error');
}

// ========== RESPONSIBLE GAMING ==========
function renderResponsible(){
    const el = document.querySelector('#page-responsible .container');
    if(!el) return;
    el.innerHTML = `<div class="section-header"><h2><i class="fas fa-shield-halved"></i> Jogo Responsável</h2><p>Sua segurança e bem-estar são nossa prioridade</p></div>
    <div class="rg-section"><h2><i class="fas fa-18-up" style="color:var(--accent-red);"></i> Apenas Maiores de 18 Anos</h2><p>Plataforma destinada exclusivamente a maiores de 18 anos. Jogos envolvem risco financeiro.</p></div>
    <div class="rg-section"><h2><i class="fas fa-balance-scale" style="color:var(--accent-gold);"></i> Lei 14.790/2023</h2><p>Em conformidade com a Lei 14.790/2023 que regulamenta loterias e apostas no Brasil.</p></div>
    <div class="rg-section"><h2><i class="fas fa-ban" style="color:var(--accent-red);"></i> Autoexclusão</h2><p>Ative a autoexclusão para bloquear sua conta temporariamente.</p>
    <div class="exclusion-options"><button class="exclusion-btn" onclick="activateExclusion(1)"><span class="period">24h</span><span class="desc">24 horas</span></button><button class="exclusion-btn" onclick="activateExclusion(7)"><span class="period">7 dias</span><span class="desc">Uma semana</span></button><button class="exclusion-btn" onclick="activateExclusion(30)"><span class="period">30 dias</span><span class="desc">Um mês</span></button></div></div>
    <div class="rg-section"><h2><i class="fas fa-phone" style="color:var(--accent-green);"></i> Ajuda</h2><ul class="rg-list"><li><i class="fas fa-phone"></i> CVV: 188 (24h)</li><li><i class="fas fa-phone"></i> SAMU: 192</li><li><i class="fas fa-globe"></i> www.aab-jogadores.org.br</li></ul></div>`;
}

function activateExclusion(days){
    if(!state.user) return;
    if(!confirm(`Ativar autoexclusão por ${days} dias?`)) return;
    state.user.selfExclusion={days,start:Date.now(),end:Date.now()+days*86400000};
    saveUser(); showToast(`Autoexclusão de ${days} dias ativada.`,'info');
}

// ========== DASHBOARD ==========
function renderDashboard(){
    if(!state.user) return;
    const el = $('dashboardContent');
    if(!el) return;
    el.innerHTML = `
    <div class="dash-stats"><div class="dash-stat"><div class="label">Saldo</div><div class="value" style="color:var(--accent-gold);">R$ ${state.user.balance.toFixed(2).replace('.',',')}</div></div><div class="dash-stat"><div class="label">Jogos</div><div class="value">${state.user.played}</div></div><div class="dash-stat"><div class="label">Ganho Total</div><div class="value" style="color:var(--accent-green);">R$ ${state.user.won.toFixed(2).replace('.',',')}</div></div><div class="dash-stat"><div class="label">Depositado</div><div class="value">R$ ${state.user.deposit.toFixed(2).replace('.',',')}</div></div></div>
    <div class="wallet-card"><h3><i class="fas fa-shield-halved"></i> KYC</h3><div class="kyc-status kyc-${state.user.kyc}"><i class="fas fa-${state.user.kyc==='approved'?'check-circle':'clock'}"></i><div><strong>${state.user.kyc==='approved'?'Verificado':'Pendente'}</strong><p style="font-size:13px;color:var(--text-secondary);">${state.user.kyc==='approved'?'Identidade verificada.':'Complete para sacar.'}</p></div></div></div>`;
}

// ========== HISTORY ==========
function renderHistory(){
    if(!state.user) return;
    const el = $('historyList');
    if(!el) return;
    el.innerHTML = state.user.history.length===0?'<p style="color:var(--text-secondary);text-align:center;padding:40px;">Nenhum jogo ainda</p>':
    state.user.history.map(h=>`<div class="history-item"><div class="left"><div class="icon" style="background:${h.result==='Ganhou'?'rgba(16,185,129,0.15)':'rgba(239,68,68,0.15)'}"><i class="fas fa-${h.result==='Ganhou'?'trophy':'times'}" style="color:${h.result==='Ganhou'?'var(--accent-green)':'var(--accent-red)'}"></i></div><div><div class="name">${h.game}</div><div class="date">${h.date}</div></div></div><span class="amount ${h.amount>0?'amount-pos':'amount-neg'}">${h.result} ${h.amount>0?`+R$ ${h.amount.toFixed(2).replace('.',',')}`:''}</span></div>`).join('');
}

// ========== LIMITS ==========
function renderLimits(){
    if(!state.user) return;
    const el = $('limitsForm');
    if(!el) return;
    el.innerHTML = `<div class="wallet-card"><div class="input-group"><label>Limite Diário (R$)</label><input type="number" id="limitDaily" value="${state.user.limits.daily}"></div><div class="input-group"><label>Limite Semanal (R$)</label><input type="number" id="limitWeekly" value="${state.user.limits.weekly}"></div><div class="input-group"><label>Limite Mensal (R$)</label><input type="number" id="limitMonthly" value="${state.user.limits.monthly}"></div><div class="input-group"><label>Sessão Máx (min)</label><input type="number" id="limitSession" value="${state.user.limits.sessionMin}"></div><button class="btn btn-primary" onclick="saveLimits()"><i class="fas fa-save"></i> Salvar</button></div>`;
}

function saveLimits(){
    state.user.limits.daily=Number(($('limitDaily')||{}).value)||500;
    state.user.limits.weekly=Number(($('limitWeekly')||{}).value)||2000;
    state.user.limits.monthly=Number(($('limitMonthly')||{}).value)||5000;
    state.user.limits.sessionMin=Number(($('limitSession')||{}).value)||120;
    saveUser(); showToast('Limites salvos!','success');
}

// ========== GAME PLAY ==========
function playGame(id){
    if(!state.user){ showModal('login'); return; }
    if(state.user.selfExclusion){ showToast('Autoexclusão ativa.','error'); return; }
    const game = GAMES.find(g=>g.id===id);
    if(!game) return;
    if(state.user.balance<game.entry){ showToast('Saldo insuficiente.','error'); return; }
    state.currentGame = game;
    showPage('play');
    const area = $('gamePlayArea');
    if(!area) return;
    if(game.category==='trivia') startQuiz(area);
    else if(game.category==='skill') startSkill(area);
    else startArcade(area);
}

function startQuiz(area){
    state.currentQuiz={index:0,score:0,questions:shuffle([...QUIZ_QUESTIONS]).slice(0,5)};
    renderQuizQ(area);
}

function renderQuizQ(area){
    const {index,score,questions}=state.currentQuiz;
    if(index>=questions.length){ finishQuiz(area); return; }
    const q=questions[index];
    area.innerHTML=`<div class="game-play-area"><h2>${state.currentGame.icon} ${state.currentGame.name}</h2><div class="prize-display">Prêmio: R$ ${state.currentGame.prize},00</div><p style="color:var(--text-secondary);margin-bottom:8px;">Pergunta ${index+1}/${questions.length} • Acertos: ${score}</p><p style="font-size:18px;font-weight:600;margin-bottom:24px;">${q.q}</p>${q.opts.map((o,i)=>`<button class="quiz-option" onclick="answerQuiz(${i},${q.correct},${area.id})">${o}</button>`).join('')}</div>`;
}

function answerQuiz(chosen,correct){
    const opts=document.querySelectorAll('.quiz-option');
    opts.forEach((o,i)=>{o.disabled=true;if(i===correct)o.classList.add('correct');if(i===chosen&&chosen!==correct)o.classList.add('wrong');});
    if(chosen===correct)state.currentQuiz.score++;
    setTimeout(()=>{state.currentQuiz.index++;const a=$('gamePlayArea');if(a)renderQuizQ(a);},1200);
}

function finishQuiz(area){
    const {score,questions}=state.currentQuiz;
    const pct=score/questions.length;
    let prize=0;
    if(pct>=0.8) prize=state.currentGame.prize;
    else if(pct>=0.6) prize=Math.floor(state.currentGame.prize*0.5);
    else if(pct>=0.4) prize=Math.floor(state.currentGame.prize*0.2);
    if(prize>0){state.user.balance+=prize;state.user.won+=prize;state.user.transactions.unshift({type:'win',amount:prize,desc:`${state.currentGame.name}`,date:new Date().toLocaleDateString('pt-BR')});}
    state.user.balance-=state.currentGame.entry;state.user.played++;
    state.user.history.unshift({game:state.currentGame.name,result:prize>0?'Ganhou':'Perdeu',amount:prize,date:new Date().toLocaleDateString('pt-BR')});
    saveUser();updateUI();
    area.innerHTML=`<div class="game-play-area"><h2>${prize>0?'🎉 Parabéns!':'😔 Tente Novamente'}</h2><p style="font-size:18px;margin:16px 0;">Acertou ${score}/${questions.length}</p><div class="prize-display">${prize>0?`+ R$ ${prize},00`:'R$ 0,00'}</div><div style="margin-top:32px;display:flex;gap:12px;justify-content:center;"><button class="btn btn-primary" onclick="playGame(${state.currentGame.id})"><i class="fas fa-redo"></i> Jogar Novamente</button><button class="btn btn-outline" onclick="showPage('games')"><i class="fas fa-arrow-left"></i> Voltar</button></div></div>`;
}

function startSkill(area){
    const emojis=['✊','✋','✌️'];
    area.innerHTML=`<div class="game-play-area"><h2>${state.currentGame.icon} ${state.currentGame.name}</h2><div class="prize-display">Prêmio: R$ ${state.currentGame.prize},00</div><p style="color:var(--text-secondary);margin-bottom:24px;">Escolha sua jogada:</p>${emojis.map((e,i)=>`<button class="quiz-option" style="text-align:center;font-size:48px;max-width:160px;display:inline-block;margin:8px;" onclick="playSkill(${i})">${e}</button>`).join('')}</div>`;
}

function playSkill(pc){
    const cc=Math.floor(Math.random()*3);
    const w=[[-1,1,0],[0,-1,1],[1,0,-1]];
    const r=w[pc][cc];
    let prize=0;
    if(r>0)prize=state.currentGame.prize;
    else if(r===0)prize=state.currentGame.entry;
    if(r>0){state.user.balance+=prize;state.user.won+=prize;state.user.transactions.unshift({type:'win',amount:prize,desc:`${state.currentGame.name}`,date:new Date().toLocaleDateString('pt-BR')});}
    state.user.balance-=state.currentGame.entry;state.user.played++;
    state.user.history.unshift({game:state.currentGame.name,result:r>0?'Ganhou':r===0?'Empate':'Perdeu',amount:prize,date:new Date().toLocaleDateString('pt-BR')});
    saveUser();updateUI();
    const emojis=['✊','✋','✌️'];
    const area=$('gamePlayArea');
    area.innerHTML=`<div class="game-play-area"><h2>${r>0?'🎉 Você Ganhou!':r===0?'🤝 Empate!':'😔 Você Perdeu!'}</h2><p style="font-size:24px;margin:20px 0;">Você: ${emojis[pc]} vs ${emojis[cc]} :CPU</p><div class="prize-display">${prize>0?`+ R$ ${prize},00`:'R$ 0,00'}</div><div style="margin-top:32px;display:flex;gap:12px;justify-content:center;"><button class="btn btn-primary" onclick="playGame(${state.currentGame.id})"><i class="fas fa-redo"></i> Jogar Novamente</button><button class="btn btn-outline" onclick="showPage('games')"><i class="fas fa-arrow-left"></i> Voltar</button></div></div>`;
}

function startArcade(area){
    window._arcCount=0;
    const t0=Date.now();
    area.innerHTML=`<div class="game-play-area"><h2>${state.currentGame.icon} ${state.currentGame.name}</h2><div class="prize-display">Prêmio: R$ ${state.currentGame.prize},00</div><p style="color:var(--text-secondary);margin-bottom:24px;">Clique o mais rápido em 10 segundos!</p><div id="arcTimer" style="font-size:48px;font-weight:800;color:var(--accent-cyan);margin:20px 0;">10</div><button id="arcBtn" class="btn btn-primary" style="font-size:24px;padding:30px 60px;border-radius:16px;" onclick="window._arcCount++;$('arcCount').textContent=window._arcCount+' cliques'">🎯 CLICAR!</button><div id="arcCount" style="font-size:32px;font-weight:800;margin-top:16px;">0 cliques</div></div>`;
    const iv=setInterval(()=>{
        const rem=Math.max(0,10-Math.floor((Date.now()-t0)/1000));
        const te=$('arcTimer');if(te)te.textContent=rem;
        if(rem<=0){clearInterval(iv);finishArcade(area);}
    },100);
}

function finishArcade(area){
    const total=window._arcCount||0;
    let prize=0;
    if(total>=80)prize=state.currentGame.prize;
    else if(total>=50)prize=Math.floor(state.currentGame.prize*0.5);
    else if(total>=30)prize=Math.floor(state.currentGame.prize*0.2);
    if(prize>0){state.user.balance+=prize;state.user.won+=prize;state.user.transactions.unshift({type:'win',amount:prize,desc:`${state.currentGame.name}`,date:new Date().toLocaleDateString('pt-BR')});}
    state.user.balance-=state.currentGame.entry;state.user.played++;
    state.user.history.unshift({game:state.currentGame.name,result:prize>0?'Ganhou':'Perdeu',amount:prize,date:new Date().toLocaleDateString('pt-BR')});
    saveUser();updateUI();
    area.innerHTML=`<div class="game-play-area"><h2>${prize>0?'🎉 Incrível!':'😔 Quase lá!'}</h2><p style="font-size:18px;margin:16px 0;">${total} cliques em 10s</p><div class="prize-display">${prize>0?`+ R$ ${prize},00`:'R$ 0,00'}</div><div style="margin-top:32px;display:flex;gap:12px;justify-content:center;"><button class="btn btn-primary" onclick="playGame(${state.currentGame.id})"><i class="fas fa-redo"></i> Jogar Novamente</button><button class="btn btn-outline" onclick="showPage('games')"><i class="fas fa-arrow-left"></i> Voltar</button></div></div>`;
}

// ========== REALITY CHECK ==========
function checkReality(){
    if(!state.user)return;
    if((Date.now()-state.sessionStart)/60000>=60&&!state.realityCheckShown){
        state.realityCheckShown=true;
        const o=document.createElement('div');o.className='reality-check-overlay';
        o.innerHTML=`<div class="reality-check-box"><h2>⏰ Verificação de Realidade</h2><p style="color:var(--text-secondary);">Você está jogando há</p><div class="session-time">${Math.floor((Date.now()-state.sessionStart)/60000)} min</div><p style="color:var(--text-secondary);margin-bottom:24px;">Jogue com responsabilidade.</p><button class="btn btn-primary" onclick="this.closest('.reality-check-overlay').remove()">Continuar</button></div>`;
        document.body.appendChild(o);
    }
}

// ========== INIT ==========
window.addEventListener('load',()=>{
    const saved=localStorage.getItem('gamevault_user');
    if(saved){state.user=JSON.parse(saved);updateUI();}
    setInterval(checkReality,60000);
    renderFeatured();
    document.querySelectorAll('.stat-num').forEach(el=>{
        const target=parseInt(el.dataset.target);let c=0;const s=target/60;
        const t=setInterval(()=>{c+=s;if(c>=target){c=target;clearInterval(t);}el.textContent=Math.floor(c).toLocaleString('pt-BR');},30);
    });
    setTimeout(()=>{const p=$('preloader');if(p)p.classList.add('hidden');},1500);
    state.sessionStart=Date.now();state.realityCheckShown=false;
});

document.addEventListener('keydown',(e)=>{if(e.key==='Escape')closeModal();});
