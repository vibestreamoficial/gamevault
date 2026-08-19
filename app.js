// GameVault - Plataforma de Jogos com Prêmios Reais
// Versão 1.0.0

// ==========================================
// DATA
// ==========================================
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

// ==========================================
// STATE
// ==========================================
let state = {
    user: null,
    currentPage: 'home',
    currentGame: null,
    currentQuiz: { index:0, score:0, questions:[] },
    sessionStart: Date.now(),
    realityCheckShown: false
};

// Load from localStorage
function loadState() {
    const saved = localStorage.getItem('gamevault_user');
    if (saved) {
        state.user = JSON.parse(saved);
        updateUI();
    }
    // Session timer for reality checks
    setInterval(checkReality, 60000);
}

function saveUser() {
    if (state.user) {
        localStorage.setItem('gamevault_user', JSON.stringify(state.user));
    }
}

function defaultUser(email, name) {
    return {
        email, name,
        balance: 50, // bônus de cadastro
        deposit: 0,
        played: 0,
        won: 0,
        kyc: 'pending',
        limits: { daily:500, weekly:2000, monthly:5000, sessionMin:120 },
        selfExclusion: null,
        transactions: [
            { type:'bonus', amount:50, desc:'Bônus de cadastro', date: new Date().toLocaleDateString('pt-BR') }
        ],
        history: []
    };
}

// ==========================================
// UI HELPERS
// ==========================================
function $(id) { return document.getElementById(id); }

function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const el = $('page-'+page);
    if (el) el.classList.add('active');
    state.currentPage = page;
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`.nav-link[data-page="${page}"]`);
    if (activeLink) activeLink.classList.add('active');
    renderPage(page);
    window.scrollTo(0,0);
}

function renderPage(page) {
    switch(page) {
        case 'home': renderFeatured(); break;
        case 'games': renderGames(); break;
        case 'wallet': renderWallet(); break;
        case 'tournaments': renderTournaments(); break;
        case 'responsible': renderResponsible(); break;
        case 'dashboard': renderDashboard(); break;
        case 'history': renderHistory(); break;
        case 'limits': renderLimits(); break;
    }
}

function renderFeatured() {
    const grid = $('featuredGames');
    if (!grid) return;
    grid.innerHTML = GAMES.filter(g => g.badge).map(gameCard).join('');
}

function renderGames(filter='all') {
    const grid = $('featuredGames') || document.querySelector('.games-grid');
    const container = document.querySelector('#page-games .container');
    if (!container) return;
    const filtered = filter==='all' ? GAMES : GAMES.filter(g=>g.category===filter);
    let html = `<div class="filter-bar">
        <button class="filter-btn ${filter==='all'?'active':''}" onclick="renderGames('all')">Todos</button>
        <button class="filter-btn ${filter==='skill'?'active':''}" onclick="renderGames('skill')">Habilidade</button>
        <button class="filter-btn ${filter==='trivia'?'active':''}" onclick="renderGames('trivia')">Trivia</button>
        <button class="filter-btn ${filter==='puzzle'?'active':''}" onclick="renderGames('puzzle')">Puzzle</button>
        <button class="filter-btn ${filter==='arcade'?'active':''}" onclick="renderGames('arcade')">Arcade</button>
    </div>
    <div class="games-grid">${filtered.map(gameCard).join('')}</div>`;
    container.innerHTML = html;
}

function gameCard(g) {
    return `<div class="game-card" onclick="playGame(${g.id})">
        <div class="game-thumb">
            ${g.icon}
            ${g.badge ? `<span class="game-badge badge-${g.badge}">${g.badge==='hot'?'🔥 Popular':g.badge==='new'?'✨ Novo':'⭐ Pro'}</span>` : ''}
        </div>
        <div class="game-info">
            <h3>${g.name}</h3>
            <div class="game-cat">${g.category} • ${g.players.toLocaleString()} jogadores</div>
            <div class="game-meta">
                <span class="game-prize">R$ ${g.prize},00</span>
                <button class="game-play">Jogar R$ ${g.entry}</button>
            </div>
        </div>
    </div>`;
}

// ==========================================
// GAME PLAY
// ==========================================
function playGame(id) {
    if (!state.user) { showModal('login'); return; }
    if (state.user.selfExclusion) { showToast('Autoexclusão ativa. Não é possível jogar.','error'); return; }
    const game = GAMES.find(g=>g.id===id);
    if (!game) return;
    if (state.user.balance < game.entry) { showToast('Saldo insuficiente. Faça um depósito.','error'); return; }
    state.currentGame = game;
    showPage('gameplay');
    
    if (game.category === 'trivia') {
        startQuiz();
    } else if (game.category === 'skill') {
        startSkillGame();
    } else {
        startArcadeGame();
    }
}

function startQuiz() {
    state.currentQuiz = { index:0, score:0, questions:shuffle([...QUIZ_QUESTIONS]).slice(0,5) };
    renderQuizQuestion();
}

function renderQuizQuestion() {
    const { index, score, questions } = state.currentQuiz;
    const container = $('page-gameplay');
    if (!container) return;
    if (index >= questions.length) {
        finishQuiz();
        return;
    }
    const q = questions[index];
    container.innerHTML = `
        <div class="game-play-area">
            <h2>${state.currentGame.icon} ${state.currentGame.name}</h2>
            <div class="prize-display">Prêmio: R$ ${state.currentGame.prize},00</div>
            <p style="color:var(--text-secondary);margin-bottom:8px;">Pergunta ${index+1}/${questions.length} • Acertos: ${score}</p>
            <p style="font-size:18px;font-weight:600;margin-bottom:24px;">${q.q}</p>
            ${q.opts.map((o,i)=>`<button class="quiz-option" onclick="answerQuiz(${i},${q.correct})">${o}</button>`).join('')}
        </div>`;
}

function answerQuiz(chosen, correct) {
    const opts = document.querySelectorAll('.quiz-option');
    opts.forEach((o,i) => {
        o.disabled = true;
        if (i===correct) o.classList.add('correct');
        if (i===chosen && chosen!==correct) o.classList.add('wrong');
    });
    if (chosen===correct) state.currentQuiz.score++;
    setTimeout(()=>{ state.currentQuiz.index++; renderQuizQuestion(); }, 1200);
}

function finishQuiz() {
    const { score, questions } = state.currentQuiz;
    const pct = score / questions.length;
    let prize = 0;
    if (pct >= 0.8) prize = state.currentGame.prize;
    else if (pct >= 0.6) prize = Math.floor(state.currentGame.prize * 0.5);
    else if (pct >= 0.4) prize = Math.floor(state.currentGame.prize * 0.2);
    
    if (prize > 0) {
        state.user.balance += prize;
        state.user.won += prize;
        state.user.transactions.unshift({ type:'win', amount:prize, desc:`Vitória em ${state.currentGame.name}`, date:new Date().toLocaleDateString('pt-BR') });
    }
    state.user.balance -= state.currentGame.entry;
    state.user.played++;
    state.user.history.unshift({ game:state.currentGame.name, result:prize>0?'Ganhou':'Perdeu', amount:prize, date:new Date().toLocaleDateString('pt-BR') });
    saveUser();
    updateUI();

    const container = $('page-gameplay');
    container.innerHTML = `
        <div class="game-play-area">
            <h2>${prize>0?'🎉 Parabéns!':'😔 Tente Novamente'}</h2>
            <p style="font-size:18px;margin:16px 0;">Acertou ${score}/${questions.length} perguntas</p>
            <div class="prize-display">${prize>0?`+ R$ ${prize},00`:'R$ 0,00'}</div>
            <div style="margin-top:32px;display:flex;gap:12px;justify-content:center;">
                <button class="btn btn-primary" onclick="playGame(${state.currentGame.id})"><i class="fas fa-redo"></i> Jogar Novamente</button>
                <button class="btn btn-outline" onclick="showPage('games')"><i class="fas fa-arrow-left"></i> Voltar</button>
            </div>
        </div>`;
}

function startSkillGame() {
    // Rock-paper-scissors style
    const options = ['✊','✋','✌️'];
    const names = ['Pedra','Papel','Tesoura'];
    const container = $('page-gameplay');
    container.innerHTML = `
        <div class="game-play-area">
            <h2>${state.currentGame.icon} ${state.currentGame.name}</h2>
            <div class="prize-display">Prêmio: R$ ${state.currentGame.prize},00</div>
            <p style="color:var(--text-secondary);margin-bottom:24px;">Escolha sua jogada:</p>
            ${options.map((o,i)=>`<button class="quiz-option" style="text-align:center;font-size:48px;max-width:160px;display:inline-block;margin:8px;" onclick="playSkill(${i})">${o}<br><span style="font-size:14px;">${names[i]}</span></button>`).join('')}
        </div>`;
}

function playSkill(playerChoice) {
    const computerChoice = Math.floor(Math.random()*3);
    const wins = [[-1,1,0],[0,-1,1],[1,0,-1]];
    const result = wins[playerChoice][computerChoice];
    
    let prize = 0;
    if (result > 0) prize = state.currentGame.prize;
    else if (result === 0) prize = Math.floor(state.currentGame.entry); // empate devolve
    
    if (prize > 0 && result > 0) {
        state.user.balance += prize;
        state.user.won += prize;
        state.user.transactions.unshift({ type:'win', amount:prize, desc:`Vitória em ${state.currentGame.name}`, date:new Date().toLocaleDateString('pt-BR') });
    }
    state.user.balance -= state.currentGame.entry;
    state.user.played++;
    state.user.history.unshift({ game:state.currentGame.name, result:result>0?'Ganhou':result===0?'Empate':'Perdeu', amount:prize, date:new Date().toLocaleDateString('pt-BR') });
    saveUser();
    updateUI();

    const emojis = ['✊','✋','✌️'];
    const names = ['Pedra','Papel','Tesoura'];
    const container = $('page-gameplay');
    container.innerHTML = `
        <div class="game-play-area">
            <h2>${result>0?'🎉 Você Ganhou!':result===0?'🤝 Empate!':'😔 Você Perdeu!'}</h2>
            <p style="font-size:24px;margin:20px 0;">Você: ${emojis[playerChoice]} vs ${emojis[computerChoice]} :Computador</p>
            <div class="prize-display">${prize>0?`+ R$ ${prize},00`:'R$ 0,00'}</div>
            <div style="margin-top:32px;display:flex;gap:12px;justify-content:center;">
                <button class="btn btn-primary" onclick="playGame(${state.currentGame.id})"><i class="fas fa-redo"></i> Jogar Novamente</button>
                <button class="btn btn-outline" onclick="showPage('games')"><i class="fas fa-arrow-left"></i> Voltar</button>
            </div>
        </div>`;
}

function startArcadeGame() {
    // Click speed game
    let clicks = 0;
    const startTime = Date.now();
    const container = $('page-gameplay');
    container.innerHTML = `
        <div class="game-play-area">
            <h2>${state.currentGame.icon} ${state.currentGame.name}</h2>
            <div class="prize-display">Prêmio: R$ ${state.currentGame.prize},00</div>
            <p style="color:var(--text-secondary);margin-bottom:24px;">Clique o mais rápido que puder em 10 segundos!</p>
            <div id="arcadeTimer" style="font-size:48px;font-weight:800;color:var(--accent-cyan);margin:20px 0;">10</div>
            <button id="arcadeBtn" class="btn btn-primary" style="font-size:24px;padding:30px 60px;border-radius:16px;" onclick="arcadeClick()">🎯 CLICAR!</button>
            <div id="arcadeCount" style="font-size:32px;font-weight:800;margin-top:16px;">0 cliques</div>
        </div>`;
    
    const timer = setInterval(()=>{
        const elapsed = (Date.now() - startTime) / 1000;
        const remaining = Math.max(0, 10 - Math.floor(elapsed));
        const timerEl = $('arcadeTimer');
        if (timerEl) timerEl.textContent = remaining;
        if (remaining <= 0) {
            clearInterval(timer);
            finishArcade(clicks);
        }
    }, 100);
    
    window._arcadeInterval = setInterval(()=>{
        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed >= 10) clearInterval(window._arcadeInterval);
    }, 100);
}

function arcadeClick() {
    if (!window._arcadeCount) window._arcadeCount = 0;
    window._arcadeCount++;
    const countEl = $('arcadeCount');
    if (countEl) countEl.textContent = window._arcadeCount + ' cliques';
}

function finishArcade(totalClicks) {
    window._arcadeCount = 0;
    let prize = 0;
    if (totalClicks >= 80) prize = state.currentGame.prize;
    else if (totalClicks >= 50) prize = Math.floor(state.currentGame.prize * 0.5);
    else if (totalClicks >= 30) prize = Math.floor(state.currentGame.prize * 0.2);
    
    if (prize > 0) {
        state.user.balance += prize;
        state.user.won += prize;
        state.user.transactions.unshift({ type:'win', amount:prize, desc:`Vitória em ${state.currentGame.name}`, date:new Date().toLocaleDateString('pt-BR') });
    }
    state.user.balance -= state.currentGame.entry;
    state.user.played++;
    state.user.history.unshift({ game:state.currentGame.name, result:prize>0?'Ganhou':'Perdeu', amount:prize, date:new Date().toLocaleDateString('pt-BR') });
    saveUser();
    updateUI();

    const container = $('page-gameplay');
    container.innerHTML = `
        <div class="game-play-area">
            <h2>${prize>0?'🎉 Incrível!':'😔 Quase lá!'}</h2>
            <p style="font-size:18px;margin:16px 0;">${totalClicks} cliques em 10 segundos</p>
            <div class="prize-display">${prize>0?`+ R$ ${prize},00`:'R$ 0,00'}</div>
            <div style="margin-top:32px;display:flex;gap:12px;justify-content:center;">
                <button class="btn btn-primary" onclick="playGame(${state.currentGame.id})"><i class="fas fa-redo"></i> Jogar Novamente</button>
                <button class="btn btn-outline" onclick="showPage('games')"><i class="fas fa-arrow-left"></i> Voltar</button>
            </div>
        </div>`;
}

// ==========================================
// WALLET
// ==========================================
function renderWallet() {
    const page = $('page-wallet');
    if (!page || !state.user) return;
    page.innerHTML = `
        <div class="container" style="padding-top:32px;">
            <h2 style="font-size:24px;font-weight:800;margin-bottom:24px;"><i class="fas fa-wallet" style="color:var(--accent-purple);"></i> Minha Carteira</h2>
            <div class="wallet-grid">
                <div class="wallet-card">
                    <h3><i class="fas fa-coins"></i> Saldo</h3>
                    <div class="balance-big">R$ ${state.user.balance.toFixed(2).replace('.',',')}</div>
                    <div class="balance-label">Disponível para saque</div>
                    <div style="margin-top:16px;display:flex;gap:8px;">
                        <button class="btn btn-success btn-sm" onclick="showDepositModal()"><i class="fas fa-plus"></i> Depositar</button>
                        <button class="btn btn-outline btn-sm" onclick="showWithdrawModal()"><i class="fas fa-arrow-up"></i> Sacar</button>
                    </div>
                </div>
                <div class="wallet-card">
                    <h3><i class="fas fa-exchange-alt"></i> Depósito Rápido</h3>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                        <button class="btn btn-outline btn-sm" onclick="quickDeposit(10)">R$ 10</button>
                        <button class="btn btn-outline btn-sm" onclick="quickDeposit(25)">R$ 25</button>
                        <button class="btn btn-outline btn-sm" onclick="quickDeposit(50)">R$ 50</button>
                        <button class="btn btn-outline btn-sm" onclick="quickDeposit(100)">R$ 100</button>
                        <button class="btn btn-outline btn-sm" onclick="quickDeposit(200)">R$ 200</button>
                    </div>
                </div>
            </div>
            <div class="wallet-card" style="margin-top:24px;">
                <h3><i class="fas fa-list"></i> Últimas Transações</h3>
                ${state.user.transactions.length === 0 ? '<div class="empty-state"><i class="fas fa-receipt"></i><p>Nenhuma transação ainda</p></div>' :
                state.user.transactions.slice(0,10).map(t => `
                    <div class="history-item">
                        <div class="left">
                            <div class="icon" style="background:${t.type==='win'?'rgba(16,185,129,0.15)':t.type==='deposit'?'rgba(34,211,238,0.15)':'rgba(239,68,68,0.15)'}">
                                <i class="fas fa-${t.type==='win'?'trophy':t.type==='deposit'?'arrow-down':'arrow-up'}" style="color:${t.type==='win'?'var(--accent-green)':t.type==='deposit'?'var(--accent-cyan)':'var(--accent-red)'}"></i>
                            </div>
                            <div><div class="name">${t.desc}</div><div class="date">${t.date}</div></div>
                        </div>
                        <span class="amount ${t.amount>0?'amount-pos':'amount-neg'}">${t.amount>0?'+':''} R$ ${Math.abs(t.amount).toFixed(2).replace('.',',')}</span>
                    </div>
                `).join('')}
            </div>
        </div>`;
}

function quickDeposit(amount) {
    state.user.balance += amount;
    state.user.deposit += amount;
    state.user.transactions.unshift({ type:'deposit', amount:amount, desc:'Depósito via PIX', date:new Date().toLocaleDateString('pt-BR') });
    saveUser();
    updateUI();
    renderWallet();
    showToast(`Depósito de R$ ${amount},00 realizado!`,'success');
}

function showDepositModal() {
    const amount = prompt('Digite o valor do depósito (R$):');
    if (amount && !isNaN(amount) && Number(amount) > 0) {
        quickDeposit(Number(amount));
    }
}

function showWithdrawModal() {
    if (state.user.balance < 10) { showToast('Saque mínimo: R$ 10,00','error'); return; }
    const amount = prompt(`Saldo: R$ ${state.user.balance.toFixed(2)}\nDigite o valor do saque (R$):`);
    if (amount && !isNaN(amount) && Number(amount) > 0 && Number(amount) <= state.user.balance) {
        state.user.balance -= Number(amount);
        state.user.transactions.unshift({ type:'withdraw', amount:-Number(amount), desc:'Saque via PIX', date:new Date().toLocaleDateString('pt-BR') });
        saveUser();
        updateUI();
        renderWallet();
        showToast(`Saque de R$ ${Number(amount).toFixed(2)} solicitado!`,'success');
    } else if (amount) {
        showToast('Valor inválido ou saldo insuficiente','error');
    }
}

// ==========================================
// TOURNAMENTS
// ==========================================
function renderTournaments() {
    const page = $('page-tournaments');
    if (!page) return;
    page.innerHTML = `
        <div class="container" style="padding-top:32px;">
            <div class="section-header">
                <h2><i class="fas fa-trophy"></i> Torneios</h2>
                <p>Compita com outros jogadores por prêmios maiores</p>
            </div>
            ${TOURNAMENTS.map(t => `
                <div class="tournament-card">
                    <div class="tournament-info">
                        <h3>${t.name}</h3>
                        <div class="tournament-meta">
                            <span><i class="fas fa-gamepad"></i> ${t.game}</span>
                            <span><i class="fas fa-users"></i> ${t.players} jogadores</span>
                            <span><i class="fas fa-clock"></i> ${t.time}</span>
                            <span><i class="fas fa-tag"></i> Entry: R$ ${t.entry},00</span>
                        </div>
                    </div>
                    <div class="tournament-prize">
                        <div class="amount">R$ ${t.prize},00</div>
                        <button class="btn ${t.status==='Aberto'?'btn-primary':'btn-outline'} btn-sm" style="margin-top:8px;" ${t.status!=='Aberto'?'disabled':''} onclick="joinTournament(${t.id})">${t.status==='Aberto'?'Participar':'Em Breve'}</button>
                    </div>
                </div>
            `).join('')}
        </div>`;
}

function joinTournament(id) {
    if (!state.user) { showModal('login'); return; }
    const t = TOURNAMENTS.find(x=>x.id===id);
    if (t && state.user.balance >= t.entry) {
        state.user.balance -= t.entry;
        state.user.transactions.unshift({ type:'entry', amount:-t.entry, desc:`Entry: ${t.name}`, date:new Date().toLocaleDateString('pt-BR') });
        saveUser();
        updateUI();
        showToast(`Inscrito no ${t.name}!`,'success');
    } else {
        showToast('Saldo insuficiente','error');
    }
}

// ==========================================
// RESPONSIBLE GAMING
// ==========================================
function renderResponsible() {
    const page = $('page-responsible');
    if (!page) return;
    page.innerHTML = `
        <div class="container" style="padding-top:32px;max-width:800px;">
            <div class="section-header">
                <h2><i class="fas fa-shield-halved"></i> Jogo Responsável</h2>
                <p>Sua segurança e bem-estar são nossa prioridade</p>
            </div>
            <div class="info-card">
                <h3><i class="fas fa-18-up" style="color:var(--accent-red);"></i> Apenas Maiores de 18 Anos</h3>
                <p>Esta plataforma é destinada exclusivamente a pessoas com 18 anos ou mais. Nosso sistema verifica idade no cadastro e durante o uso. Jogos de azar e competições com prêmios envolvem risco financeiro.</p>
            </div>
            <div class="info-card">
                <h3><i class="fas fa-balance-scale" style="color:var(--accent-gold);"></i> Conformidade - Lei 14.790/2023</h3>
                <p>Em conformidade com a Lei 14.790/2023 que regulamenta as loterias, as apostas de quota fixa, o jogo do bicho e as apostas de torcida organizada no Brasil. Operamos dentro das normas legais vigentes.</p>
            </div>
            <div class="info-card">
                <h3><i class="fas fa-ban" style="color:var(--accent-red);"></i> Autoexclusão</h3>
                <p>Se você sente que está jogando além do que pode, ative a autoexclusão. Durante o período, sua conta será bloqueada para jogos.</p>
                <div class="exclusion-options">
                    <button class="exclusion-btn" onclick="activateExclusion(1)"><span class="period">24h</span><span class="desc">Autoexcluir por 24 horas</span></button>
                    <button class="exclusion-btn" onclick="activateExclusion(7)"><span class="period">7 dias</span><span class="desc">Autoexcluir por 7 dias</span></button>
                    <button class="exclusion-btn" onclick="activateExclusion(30)"><span class="period">30 dias</span><span class="desc">Autoexcluir por 30 dias</span></button>
                </div>
            </div>
            <div class="info-card">
                <h3><i class="fas fa-clock" style="color:var(--accent-cyan);"></i> Limites de Jogo</h3>
                <p>Defina limites para proteger seu financeiro. Acesse <a href="#" onclick="showPage('limits')">Meus Limites</a> para configurar.</p>
            </div>
            <div class="info-card">
                <h3><i class="fas fa-phone" style="color:var(--accent-green);"></i> Ajuda Profissional</h3>
                <p>Se você ou alguém que conhece tem problema com jogos de azar:</p>
                <ul style="list-style:none;margin-top:12px;">
                    <li style="padding:6px 0;color:var(--text-secondary);">📞 CVV: 188 (24h)</li>
                    <li style="padding:6px 0;color:var(--text-secondary);">📞 SAMU: 192</li>
                    <li style="padding:6px 0;color:var(--text-secondary);">🌐 www.aab-jogadores.org.br</li>
                </ul>
            </div>
        </div>`;
}

function activateExclusion(days) {
    if (!state.user) return;
    if (!confirm(`Ativar autoexclusão por ${days} dias? Sua conta será bloqueada para jogos.`)) return;
    state.user.selfExclusion = { days, start: Date.now(), end: Date.now() + days * 86400000 };
    saveUser();
    showToast(`Autoexclusão de ${days} dias ativada.Boa sorte.`,'info');
}

// ==========================================
// LIMITS
// ==========================================
function renderLimits() {
    const page = $('page-limits');
    if (!page || !state.user) return;
    page.innerHTML = `
        <div class="container" style="padding-top:32px;max-width:600px;">
            <h2 style="font-size:24px;font-weight:800;margin-bottom:24px;"><i class="fas fa-sliders-h" style="color:var(--accent-purple);"></i> Meus Limites</h2>
            <div class="wallet-card">
                <div class="input-group">
                    <label>Limite Diário (R$)</label>
                    <input type="number" id="limitDaily" value="${state.user.limits.daily}">
                </div>
                <div class="input-group">
                    <label>Limite Semanal (R$)</label>
                    <input type="number" id="limitWeekly" value="${state.user.limits.weekly}">
                </div>
                <div class="input-group">
                    <label>Limite Mensal (R$)</label>
                    <input type="number" id="limitMonthly" value="${state.user.limits.monthly}">
                </div>
                <div class="input-group">
                    <label>Sessão Máxima (minutos)</label>
                    <input type="number" id="limitSession" value="${state.user.limits.sessionMin}">
                </div>
                <button class="btn btn-primary" onclick="saveLimits()"><i class="fas fa-save"></i> Salvar Limites</button>
            </div>
            <div class="wallet-card" style="margin-top:16px;">
                <h3><i class="fas fa-chart-bar"></i> Seu Uso Hoje</h3>
                <div class="limit-row"><span>Tempo de sessão</span><span>${Math.floor((Date.now()-state.sessionStart)/60000)} min</span></div>
                <div class="limit-row"><span>Jogos jogados hoje</span><span>${state.user.played}</span></div>
                <div class="limit-row"><span>Ganhos hoje</span><span class="amount-pos">R$ ${state.user.won.toFixed(2).replace('.',',')}</span></div>
            </div>
        </div>`;
}

function saveLimits() {
    state.user.limits.daily = Number($('limitDaily').value)||500;
    state.user.limits.weekly = Number($('limitWeekly').value)||2000;
    state.user.limits.monthly = Number($('limitMonthly').value)||5000;
    state.user.limits.sessionMin = Number($('limitSession').value)||120;
    saveUser();
    showToast('Limites salvos com sucesso!','success');
}

// ==========================================
// DASHBOARD & HISTORY
// ==========================================
function renderDashboard() {
    const page = $('page-dashboard');
    if (!page || !state.user) return;
    page.innerHTML = `
        <div class="container" style="padding-top:32px;">
            <h2 style="font-size:24px;font-weight:800;margin-bottom:24px;"><i class="fas fa-tachometer-alt" style="color:var(--accent-purple);"></i> Dashboard</h2>
            <div class="dash-stats">
                <div class="dash-stat"><div class="label">Saldo</div><div class="value" style="color:var(--accent-gold);">R$ ${state.user.balance.toFixed(2).replace('.',',')}</div></div>
                <div class="dash-stat"><div class="label">Jogos Jogados</div><div class="value">${state.user.played}</div></div>
                <div class="dash-stat"><div class="label">Total Ganho</div><div class="value" style="color:var(--accent-green);">R$ ${state.user.won.toFixed(2).replace('.',',')}</div></div>
                <div class="dash-stat"><div class="label">Total Depositado</div><div class="value">R$ ${state.user.deposit.toFixed(2).replace('.',',')}</div></div>
            </div>
            <div class="wallet-card">
                <h3><i class="fas fa-shield-halved"></i> Status KYC</h3>
                <div class="kyc-status kyc-${state.user.kyc}">
                    <i class="fas fa-${state.user.kyc==='approved'?'check-circle':'clock'}" style="font-size:24px;"></i>
                    <div>
                        <strong>${state.user.kyc==='approved'?'Verificado':'Pendente'}</strong>
                        <p style="font-size:13px;color:var(--text-secondary);">${state.user.kyc==='approved'?'Sua identidade foi verificada.':'Complete a verificação para sacar.'}</p>
                    </div>
                </div>
                ${state.user.kyc==='pending'?`<button class="btn btn-primary btn-sm" onclick="verifyKYC()"><i class="fas fa-id-card"></i> Verificar Agora</button>`:''}
            </div>
        </div>`;
}

function renderHistory() {
    const page = $('page-history');
    if (!page || !state.user) return;
    page.innerHTML = `
        <div class="container" style="padding-top:32px;max-width:600px;">
            <h2 style="font-size:24px;font-weight:800;margin-bottom:24px;"><i class="fas fa-history" style="color:var(--accent-purple);"></i> Histórico</h2>
            <div class="wallet-card">
                ${state.user.history.length===0?'<div class="empty-state"><i class="fas fa-gamepad"></i><p>Nenhum jogo ainda</p></div>':
                state.user.history.map(h=>`
                    <div class="history-item">
                        <div class="left">
                            <div class="icon" style="background:${h.result==='Ganhou'?'rgba(16,185,129,0.15)':'rgba(239,68,68,0.15)'}">
                                <i class="fas fa-${h.result==='Ganhou'?'trophy':'times'}" style="color:${h.result==='Ganhou'?'var(--accent-green)':'var(--accent-red)'}"></i>
                            </div>
                            <div><div class="name">${h.game}</div><div class="date">${h.date}</div></div>
                        </div>
                        <span class="amount ${h.amount>0?'amount-pos':'amount-neg'}">${h.result} ${h.amount>0?`+R$ ${h.amount.toFixed(2).replace('.',',')}`:''}</span>
                    </div>
                `).join('')}
            </div>
        </div>`;
}

function verifyKYC() {
    state.user.kyc = 'approved';
    saveUser();
    renderDashboard();
    showToast('KYC verificado com sucesso!','success');
}

// ==========================================
// AUTH
// ==========================================
function showModal(type) {
    const overlay = $('authModal');
    overlay.classList.add('open');
    if (type==='login') {
        $('modalContent').innerHTML = `
            <button class="modal-close" onclick="closeModal()">&times;</button>
            <h2>Entrar</h2>
            <div class="input-group"><label>Email</label><input type="email" id="loginEmail" placeholder="seu@email.com"></div>
            <div class="input-group"><label>Senha</label><input type="password" id="loginPass" placeholder="••••••"></div>
            <button class="btn btn-primary" onclick="doLogin()"><i class="fas fa-sign-in-alt"></i> Entrar</button>
            <div class="alt-action">Não tem conta? <a href="#" onclick="showModal('register')">Cadastre-se</a></div>`;
    } else {
        $('modalContent').innerHTML = `
            <button class="modal-close" onclick="closeModal()">&times;</button>
            <h2>Criar Conta</h2>
            <div class="input-group"><label>Nome</label><input type="text" id="regName" placeholder="Seu nome"></div>
            <div class="input-group"><label>Email</label><input type="email" id="regEmail" placeholder="seu@email.com"></div>
            <div class="input-group"><label>Senha</label><input type="password" id="regPass" placeholder="Mínimo 6 caracteres"></div>
            <div class="input-group"><label>CPF (verificação)</label><input type="text" id="regCPF" placeholder="000.000.000-00"></div>
            <div class="input-group">
                <label><input type="checkbox" id="regAge"> Tenho 18 anos ou mais</label>
            </div>
            <button class="btn btn-primary" onclick="doRegister()"><i class="fas fa-user-plus"></i> Cadastrar</button>
            <div class="alt-action">Já tem conta? <a href="#" onclick="showModal('login')">Entrar</a></div>`;
    }
}

function closeModal() { $('authModal').classList.remove('open'); }

function doLogin() {
    const email = $('loginEmail').value.trim();
    const pass = $('loginPass').value;
    if (!email || !pass) { showToast('Preencha todos os campos','error'); return; }
    const saved = localStorage.getItem('gamevault_users');
    const users = saved ? JSON.parse(saved) : [];
    const user = users.find(u=>u.email===email);
    if (user) {
        state.user = user;
    } else {
        state.user = defaultUser(email, email.split('@')[0]);
    }
    saveUser();
    localStorage.setItem('gamevault_users', JSON.stringify([...users.filter(u=>u.email!==email), state.user]));
    updateUI();
    closeModal();
    showToast(`Bem-vindo, ${state.user.name}!`,'success');
}

function doRegister() {
    const name = $('regName').value.trim();
    const email = $('regEmail').value.trim();
    const pass = $('regPass').value;
    const age = $('regAge').checked;
    if (!name || !email || !pass) { showToast('Preencha todos os campos','error'); return; }
    if (!age) { showToast('Você precisa ter 18+ para se cadastrar','error'); return; }
    if (pass.length < 6) { showToast('Senha deve ter no mínimo 6 caracteres','error'); return; }
    state.user = defaultUser(email, name);
    saveUser();
    const saved = localStorage.getItem('gamevault_users');
    const users = saved ? JSON.parse(saved) : [];
    localStorage.setItem('gamevault_users', JSON.stringify([...users, state.user]));
    updateUI();
    closeModal();
    showToast(`Conta criada! R$ 50,00 de bônus!`,'success');
}

function logout() {
    state.user = null;
    localStorage.removeItem('gamevault_user');
    updateUI();
    showPage('home');
    showToast('Sessão encerrada','info');
}

// ==========================================
// UI UPDATE
// ==========================================
function updateUI() {
    if (state.user) {
        $('userName').textContent = state.user.name;
        $('userBalance').textContent = state.user.balance.toFixed(2).replace('.',',');
        $('authButtons').style.display = 'none';
        $('userActions').style.display = 'block';
    } else {
        $('userName').textContent = 'Entrar';
        $('userBalance').textContent = '0,00';
        $('authButtons').style.display = 'block';
        $('userActions').style.display = 'none';
    }
}

function toggleUserMenu() { $('userDropdown').classList.toggle('open'); }

// Close dropdown on outside click
document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) {
        const dd = $('userDropdown');
        if (dd) dd.classList.remove('open');
    }
});

// ==========================================
// TOAST
// ==========================================
function showToast(msg, type='info') {
    const container = document.querySelector('.toast-container') || (() => {
        const div = document.createElement('div');
        div.className = 'toast-container';
        document.body.appendChild(div);
        return div;
    })();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// ==========================================
// REALITY CHECK
// ==========================================
function checkReality() {
    if (!state.user) return;
    const elapsed = (Date.now() - state.sessionStart) / 60000;
    if (elapsed >= 60 && !state.realityCheckShown) {
        state.realityCheckShown = true;
        const overlay = document.createElement('div');
        overlay.className = 'reality-check-overlay';
        overlay.innerHTML = `
            <div class="reality-check-box">
                <h2>⏰ Verificação de Realidade</h2>
                <p style="color:var(--text-secondary);">Você está jogando há</p>
                <div class="session-time">${Math.floor(elapsed)} minutos</div>
                <p style="color:var(--text-secondary);margin-bottom:24px;">Jogos de azar envolvem risco. Jogue com responsabilidade.</p>
                <button class="btn btn-primary" onclick="this.closest('.reality-check-overlay').remove()">Continuar Jogando</button>
                <br><br>
                <button class="btn btn-outline" onclick="this.closest('.reality-check-overlay').remove();showPage('responsible')">Ver Dicas de Jogo Responsável</button>
            </div>`;
        document.body.appendChild(overlay);
    }
}

// ==========================================
// UTILS
// ==========================================
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ==========================================
// INIT
// ==========================================
window.addEventListener('load', () => {
    loadState();
    renderFeatured();
    // Counter animation
    document.querySelectorAll('.stat-num').forEach(el => {
        const target = parseInt(el.dataset.target);
        let current = 0;
        const step = target / 60;
        const timer = setInterval(() => {
            current += step;
            if (current >= target) { current = target; clearInterval(timer); }
            el.textContent = Math.floor(current).toLocaleString('pt-BR');
        }, 30);
    });
    // Hide preloader
    setTimeout(() => {
        const preloader = $('preloader');
        if (preloader) preloader.classList.add('hidden');
    }, 1500);
    // Reset reality check on new session
    state.sessionStart = Date.now();
    state.realityCheckShown = false;
});

// Keyboard shortcut
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});
