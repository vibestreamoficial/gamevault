// GameVault v5.0.0 - 100% Frontend, zero erros
const ADMIN_EMAILS=['nicolas21301012@gmail.com','dohypemeno5@gmail.com'];
const PIX_KEY='fff503e1-60b3-457b-bdc4-ddf2c892cfda';
const API_URL='https://emphasis-strings-modelling-herbal.trycloudflare.com';
const API_URLS=[API_URL];

const GAMES=[
{id:1,name:"Quiz Milionário",category:"trivia",icon:"🧠",prize:150,entry:5,players:2340,badge:"hot"},
{id:2,name:"Caça-Moedas",category:"arcade",icon:"🪙",prize:80,entry:3,players:5120,badge:"hot"},
{id:3,name:"Memória VIP",category:"skill",icon:"🃏",prize:120,entry:4,players:1800,badge:"new"},
{id:4,name:"Sudoku Rush",category:"puzzle",icon:"🔢",prize:200,entry:8,players:890,badge:"pro"},
{id:5,name:"Pedra Papel Tesoura",category:"skill",icon:"✊",prize:60,entry:2,players:8900,badge:"hot"},
{id:6,name:"Trivia Esportes",category:"trivia",icon:"⚽",prize:100,entry:5,players:3200,badge:""},
{id:7,name:"Color Match",category:"arcade",icon:"🎨",prize:90,entry:3,players:4500,badge:"new"},
{id:8,name:"Puzzle 2048",category:"puzzle",icon:"🧩",prize:180,entry:6,players:2100,badge:""},
{id:9,name:"Adivinha o Número",category:"trivia",icon:"🎯",prize:70,entry:2,players:6700,badge:"hot"},
{id:10,name:"Reflexão Rápida",category:"skill",icon:"⚡",prize:110,entry:4,players:1500,badge:"new"}
];

const TOURNAMENTS=[
{id:1,name:"Copa Quiz Semanal",game:"Quiz Milionário",prize:500,entry:20,players:"128/256",time:"Sexta 20h",status:"Aberto"},
{id:2,name:"Desafio Arcade",game:"Caça-Moedas",prize:300,entry:15,players:"64/128",time:"Sábado 14h",status:"Aberto"},
{id:3,name:"Torneio Elite",game:"Sudoku Rush",prize:1000,entry:50,players:"32/64",time:"Domingo 19h",status:"Em Breve"},
{id:4,name:"Mega Trivia",game:"Trivia Esportes",prize:250,entry:10,players:"200/256",time:"Quarta 20h",status:"Aberto"}
];

const QUIZ_Q=[
{q:"Capital do Brasil?",opts:["Rio de Janeiro","São Paulo","Brasília","Salvador"],c:2},
{q:"Quantos planetas?",opts:["7","8","9","10"],c:1},
{q:"Símbolo 'O'?",opts:["Ouro","Oxigênio","Prata","Ósmio"],c:1},
{q:"Independência?",opts:["1808","1822","1889","1500"],c:1},
{q:"Maior oceano?",opts:["Atlântico","Índico","Pacífico","Ártico"],c:2},
{q:"Mona Lisa?",opts:["Picasso","Van Gogh","Da Vinci","Rembrandt"],c:2},
{q:"Velocidade da luz?",opts:["200.000","300.000","400.000","500.000"],c:1},
{q:"Maior país?",opts:["China","EUA","Canadá","Rússia"],c:3},
{q:"Ossos humanos?",opts:["186","206","226","256"],c:1},
{q:"Animal mais rápido?",opts:["Leão","Guepardo","Gazela","Tigre"],c:1}
];

let state={user:null,admin:null,currentGame:null,quiz:{i:0,s:0,q:[]},sessionStart:Date.now(),realityShown:false};
function $(id){return document.getElementById(id);}
function save(){if(state.user)localStorage.setItem('gv_user',JSON.stringify(state.user));if(state.admin)localStorage.setItem('gv_admin',JSON.stringify(state.admin));}
function defUser(e,n){var bonus=ADMIN_EMAILS.includes(String(e||'').toLowerCase())?40:20;return{email:e,name:n,balance:bonus,deposit:0,played:0,won:0,withdrawn:0,kyc:'pending',limits:{daily:500,weekly:2000,monthly:5000},selfExclusion:null,transactions:[{t:'bonus',a:bonus,d:'Bônus cadastro',dt:fmt()}],history:[],createdAt:new Date().toISOString()};}
function fmt(){return new Date().toLocaleDateString('pt-BR');}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function getUsers(){try{return JSON.parse(localStorage.getItem('gv_users'))||[];}catch{return[];}}
function setUsers(u){localStorage.setItem('gv_users',JSON.stringify(u));}
function getBanned(){try{return JSON.parse(localStorage.getItem('gv_banned'))||[];}catch{return[];}}
function setBanned(b){localStorage.setItem('gv_banned',JSON.stringify(b));}
function apiToken(){return localStorage.getItem('gv_api_token')||'';}
async function apiFetch(path,options){
    options=options||{};options.headers=Object.assign({'Content-Type':'application/json'},options.headers||{});
    if(apiToken())options.headers.Authorization='Bearer '+apiToken();
    var lastError=null;
    for(var apiUrl of localStorage.getItem('gv_api_url')?[localStorage.getItem('gv_api_url'),API_URL]:API_URLS){
        try{
            var response=await fetch(apiUrl+path,options);
    var data=await response.json().catch(function(){return{};});
    if(response.status===401&&path!=='/api/auth/login')localStorage.removeItem('gv_api_token');
    if(!response.ok)throw new Error(data.error||('HTTP '+response.status));
    return data;
        }catch(error){lastError=error;if(error.message!=='Failed to fetch')throw error;}
    }
    throw new Error(lastError?.message||'Falha técnica: servidor offline');
}

// ===== PAGES =====
function showPage(p){
    document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
    var el=$('page-'+p);if(el)el.classList.add('active');
    document.querySelectorAll('.nav-link').forEach(l=>l.classList.remove('active'));
    var a=document.querySelector('.nav-link[data-page="'+p+'"]');if(a)a.classList.add('active');
    if(p==='admin'){window.location.href='/panel';return;}
    renderPage(p);window.scrollTo(0,0);
}
function renderPage(p){
    switch(p){
        case'home':renderHome();break;case'games':renderGames();break;
        case'wallet':renderWallet();break;case'tournaments':renderTournaments();break;
        case'responsible':renderResponsible();break;case'dashboard':renderDashboard();break;
        case'history':renderHistory();break;case'limits':renderLimits();break;
    }
}
function renderHome(){var g=$('featuredGames');if(g)g.innerHTML=GAMES.filter(function(x){return x.badge;}).map(gameCard).join('');}

// ===== GAMES =====
function renderGames(cat){
    cat=cat||'all';var el=$('allGames');if(!el)return;
    el.innerHTML=(cat==='all'?GAMES:GAMES.filter(function(x){return x.category===cat;})).map(gameCard).join('');
}
function filterGames(cat){
    renderGames(cat);
    document.querySelectorAll('.games-filters .filter-btn').forEach(function(b){
        var t=b.textContent.trim();
        b.classList.toggle('active',t===(cat==='all'?'Todos':cat==='skill'?'Habilidade':cat==='trivia'?'Quiz':cat==='puzzle'?'Puzzle':'Arcade'));
    });
}
function gameCard(g){
    return '<div class="game-card" onclick="playGame('+g.id+')"><div class="game-thumb">'+g.icon+(g.badge?'<span class="game-badge badge-'+g.badge+'">'+(g.badge==='hot'?'🔥 Pop':g.badge==='new'?'✨ Novo':'⭐ VIP')+'</span>':'')+'</div><div class="game-info"><h3>'+g.name+'</h3><div class="game-cat">'+g.category+' • '+g.players.toLocaleString()+' jogadores</div><div class="game-meta"><span class="game-prize">R$ '+g.prize+',00</span><button class="game-play" onclick="event.stopPropagation();playGame('+g.id+')">Jogar R$ '+g.entry+'</button></div></div></div>';
}

// ===== MODAL =====
function showModal(type){
    var o=$('modalOverlay');if(!o)return;var c=o.querySelector('#modalContent')||o.querySelector('.modal');if(!c)return;
    o.classList.add('open');o.style.display='flex';
    if(type==='login'){
        c.innerHTML='<button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button><h2>Entrar</h2><div class="input-group"><label>Email</label><input type="email" id="loginEmail" placeholder="seu@email.com"></div><div class="input-group"><label>Senha</label><input type="password" id="loginPass" placeholder="••••••"></div><button class="btn btn-primary" onclick="doLogin()"><i class="fas fa-sign-in-alt"></i> Entrar</button><div class="alt-action">Não tem conta? <a href="#" onclick="showModal(\'register\')">Cadastre-se</a></div><div style="text-align:center;margin-top:12px;"><a href="/panel" class="btn btn-outline btn-sm" style="text-decoration:none;font-size:11px;padding:6px 12px;width:auto;display:inline-flex;"><i class="fas fa-user-shield"></i> Admin</a></div>';
    }else if(type==='register'){
        c.innerHTML='<button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button><h2>Criar Conta</h2><div class="input-group"><label>Nome</label><input type="text" id="regName" placeholder="Seu nome"></div><div class="input-group"><label>Email</label><input type="email" id="regEmail" placeholder="seu@email.com"></div><div class="input-group"><label>Senha</label><input type="password" id="regPass" placeholder="Min 6"></div><div class="input-group"><label><input type="checkbox" id="regAge"> Tenho 18+</label></div><button class="btn btn-primary" onclick="doRegister()"><i class="fas fa-user-plus"></i> Cadastrar</button><div class="alt-action">Já tem conta? <a href="#" onclick="showModal(\'login\')">Entrar</a></div>';
    }else if(type==='deposit'){
        c.innerHTML='<button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button><h2><i class="fas fa-coins" style="color:var(--accent-gold);"></i> Depositar via PIX</h2><p style="color:var(--text-secondary);text-align:center;margin-bottom:20px;">Pagamento na hora!</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;"><button class="btn btn-outline" onclick="startDeposit(5)" style="font-size:18px;padding:20px;"><i class="fas fa-coins"></i><br>R$ 5</button><button class="btn btn-outline" onclick="startDeposit(10)" style="font-size:18px;padding:20px;"><i class="fas fa-coins"></i><br>R$ 10</button><button class="btn btn-outline" onclick="startDeposit(15)" style="font-size:18px;padding:20px;"><i class="fas fa-coins"></i><br>R$ 15</button><button class="btn btn-primary" onclick="startDeposit(20)" style="font-size:18px;padding:20px;"><i class="fas fa-fire"></i><br>R$ 20</button></div><div class="input-group"><label>Valor customizado</label><input type="number" id="customDeposit" placeholder="Ex: 30" min="1"><button class="btn btn-primary" onclick="startDeposit(Number(document.getElementById(\'customDeposit\').value))" style="width:100%;margin-top:8px;">Gerar PIX</button></div>';
    }else if(type==='withdraw'){        c.innerHTML='<button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button><h2><i class="fas fa-money-bill-wave" style="color:var(--accent-green);"></i> Sacar via PicPay</h2><p style="color:var(--text-secondary);text-align:center;margin-bottom:16px;font-size:13px;">Saldo: <strong style="color:var(--accent-gold);">R$ '+state.user.balance.toFixed(2).replace('.',',')+'</strong></p><div class="input-group"><label>Nome Completo</label><input type="text" id="wName" placeholder="Como está no CPF" value="'+(state.user.name||'')+'"></div><div class="input-group"><label>CPF</label><input type="text" id="wCPF" placeholder="000.000.000-00" maxlength="14" oninput="maskCPF(this)"></div><div class="input-group"><label>Chave Pix (PicPay)</label><input type="text" id="wPix" placeholder="UUID, CPF, email ou telefone"></div><div class="input-group"><label>Valor (R$)</label><input type="number" id="wAmount" placeholder="Mínimo R$ 10" min="10" max="'+state.user.balance+'"></div><button class="btn btn-success" onclick="submitWithdraw()" style="width:100%;"><i class="fas fa-check"></i> Solicitar Saque</button><p style="color:var(--text-secondary);font-size:11px;text-align:center;margin-top:12px;">Solicitação enviada para aprovação. Pagamento via PicPay em até 24h.</p>';
    }else if(type==='pix'){
        c.innerHTML='<button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button><h2><i class="fas fa-qrcode" style="color:var(--accent-cyan);"></i> PIX</h2><div style="text-align:center;margin-bottom:16px;"><div style="font-size:36px;font-weight:900;color:var(--accent-gold);margin-bottom:8px;">R$ '+window._depAmt+',00</div></div><div style="background:var(--bg-input);border:1px solid var(--border);border-radius:8px;padding:16px;word-break:break-all;font-size:11px;font-family:monospace;margin-bottom:16px;user-select:all;" id="pixCode">'+(window._depPayload||'Gerando...')+'</div><button class="btn btn-primary" onclick="copyPix()" style="width:100%;margin-bottom:8px;"><i class="fas fa-copy"></i> Copiar PIX</button><button class="btn btn-success" onclick="confirmDeposit()" style="width:100%;margin-bottom:12px;"><i class="fas fa-check"></i> Já Paguei</button>';
    }
}
function closeModal(){var o=$('modalOverlay');if(o){o.classList.remove('open');o.style.display='none';}}
document.addEventListener('DOMContentLoaded',function(){var o=$('modalOverlay');if(o)o.addEventListener('click',function(e){if(e.target===o)closeModal();});});

// ===== PIX =====
function genPixCode(amount){
    var txid='GV'+Date.now().toString(36).toUpperCase()+Math.random().toString(36).substring(2,6).toUpperCase();
    var payload='00020126580014br.gov.bcb.pix0136'+PIX_KEY+'0212GameVault520400005303986540'+String(amount.toFixed(2).length).padStart(2,'0')+amount.toFixed(2)+'5802BR5913White Vendas6009SAO PAULO62070503'+txid.substring(0,3)+'6304';
    var crc=0xFFFF;for(var i=0;i<payload.length;i++){crc^=payload.charCodeAt(i);for(var j=0;j<8;j++){crc=(crc&1)?(crc>>1)^0xA001:crc>>1;}}
    return{txid:txid,payload:payload+(crc&0xFFFF).toString(16).toUpperCase().padStart(4,'0')};
}
function startDeposit(amount){
    if(!state.user){showModal('login');return;}
    if(!amount||amount<1){showToast('Mínimo R$ 1','error');return;}
    if(amount>500){showToast('Máximo R$ 500','error');return;}
    var banned=getBanned();if(banned.indexOf(state.user.email)!==-1){showToast('Conta banida!','error');return;}
    apiFetch('/api/deposits',{method:'POST',body:JSON.stringify({amount:amount})}).then(function(result){
        window._depAmt=amount;window._depTxid=result.txid;window._depPayload=result.payload;
        showModal('pix');var codeEl=$('pixCode');if(codeEl)codeEl.textContent=result.payload;
    }).catch(function(error){showToast(error.message||'Não foi possível gerar o depósito','error');});
}
function copyPix(){var code=$('pixCode');if(code){navigator.clipboard.writeText(code.textContent.trim()).then(function(){showToast('PIX copiado!','success');}).catch(function(){code.select();document.execCommand('copy');showToast('Copiado!','success');});}}
function confirmDeposit(){
    if(!state.user||!window._depAmt||!window._depTxid)return;
    closeModal();showToast('Depósito em análise. Credita após aprovação admin.','info');
}

// ===== AUTH =====
function doLogin(){
    var email=(($('loginEmail')||{}).value||'').trim();
    var pass=(($('loginPass')||{}).value||'');
    if(!email||!pass){showToast('Preencha tudo','error');return;}
    if((email==='Nicolas21301012@gmail.com'||email==='dohypemeno5@gmail.com')&&pass==='admin123'){window.location.href='/panel';return;}
    apiFetch('/api/auth/login',{method:'POST',body:JSON.stringify({email:email,password:pass})}).then(function(result){
        localStorage.setItem('gv_api_token',result.token);state.user=result.user;save();updateUI();closeModal();
        showToast('Bem-vindo, '+result.user.name+'!','success');
    }).catch(function(){
        var found=null;var users=getUsers();
        for(var i=0;i<users.length;i++){if(users[i].email===email){found=users[i];break;}}
        state.user=found||defUser(email,email.split('@')[0]);
        if(!found){users.push(state.user);setUsers(users);}
        save();updateUI();closeModal();showToast('Modo local: API offline.','info');
    });
}
function doRegister(){
    var name=(($('regName')||{}).value||'').trim();
    var email=(($('regEmail')||{}).value||'').trim();
    var pass=(($('regPass')||{}).value||'');
    var age=(($('regAge')||{}).checked);
    if(!name||!email||!pass){showToast('Preencha tudo','error');return;}
    if(!age){showToast('18+ obrigatório','error');return;}
    if(pass.length<6){showToast('Min 6','error');return;}
    apiFetch('/api/auth/register',{method:'POST',body:JSON.stringify({name:name,email:email,password:pass})}).then(function(result){
        localStorage.setItem('gv_api_token',result.token);state.user=result.user;save();updateUI();closeModal();
        showToast('Conta criada! R$ '+result.user.balance+' de bônus!','success');
    }).catch(function(error){showToast(error.message||'Erro ao criar conta','error');});
}
function logout(){state.user=null;localStorage.removeItem('gv_user');updateUI();showPage('home');showToast('Sessão encerrada','info');}
function toggleUserMenu(){$('userDropdown').classList.toggle('open');}
document.addEventListener('click',function(e){if(!e.target.closest('.user-menu')){var d=$('userDropdown');if(d)d.classList.remove('open');}});
function updateUI(){
    if(state.user){$('userName').textContent=state.user.name;$('userBalance').textContent=state.user.balance.toFixed(2).replace('.',',');$('authButtons').style.display='none';$('userActions').style.display='block';}
    else{$('userName').textContent='Entrar';$('userBalance').textContent='0,00';$('authButtons').style.display='block';$('userActions').style.display='none';}
}
function showToast(msg,type){
    type=type||'info';var c=document.querySelector('.toast-container');
    if(!c){c=document.createElement('div');c.className='toast-container';document.body.appendChild(c);}
    var t=document.createElement('div');t.className='toast toast-'+type;t.textContent=msg;
    c.appendChild(t);setTimeout(function(){t.remove();},4000);
}

// ===== WALLET =====
function renderWallet(){
    if(!state.user)return;var b=$('walletBalance');if(b)b.textContent=state.user.balance.toFixed(2).replace('.',',');
    var tl=$('transactionList');if(!tl)return;
    if(state.user.transactions.length===0){tl.innerHTML='<p style="color:var(--text-secondary);text-align:center;padding:20px;">Nenhuma transação</p>';return;}
    tl.innerHTML=state.user.transactions.slice(0,15).map(function(t){
        var p=t.a>0;var color=(t.t==='deposit'||t.t==='win'||t.t==='bonus')?'var(--accent-green)':'var(--accent-red)';
        var icon=(t.t==='deposit'||t.t==='bonus')?'arrow-down':t.t==='win'?'trophy':'arrow-up';
        var bg=p?'rgba(16,185,129,0.15)':'rgba(239,68,68,0.15)';
        return '<div class="history-item"><div class="left"><div class="icon" style="background:'+bg+'"><i class="fas fa-'+icon+'" style="color:'+color+'"></i></div><div><div class="name">'+t.d+'</div><div class="date">'+t.dt+'</div></div></div><span class="amount '+(p?'amount-pos':'amount-neg')+'">'+(p?'+':'')+' R$ '+Math.abs(t.a).toFixed(2).replace('.',',')+'</span></div>';
    }).join('');
}

// ===== TOURNAMENTS =====
function renderTournaments(){var el=$('tournamentsList');if(!el)return;el.innerHTML=TOURNAMENTS.map(function(t){return '<div class="tournament-card"><div class="tournament-info"><h3>'+t.name+'</h3><div class="tournament-meta"><span><i class="fas fa-gamepad"></i> '+t.game+'</span><span><i class="fas fa-users"></i> '+t.players+'</span><span><i class="fas fa-clock"></i> '+t.time+'</span><span><i class="fas fa-tag"></i> R$ '+t.entry+',00</span></div></div><div class="tournament-prize"><div class="amount">R$ '+t.prize+',00</div><button class="btn '+(t.status==='Aberto'?'btn-primary':'btn-outline')+' btn-sm" style="margin-top:8px;" '+(t.status!=='Aberto'?'disabled':'')+' onclick="joinTournament('+t.id+')">'+(t.status==='Aberto'?'Participar':'Em Breve')+'</button></div></div>';}).join('');}
function joinTournament(id){if(!state.user){showModal('login');return;}var t=null;for(var i=0;i<TOURNAMENTS.length;i++){if(TOURNAMENTS[i].id===id){t=TOURNAMENTS[i];break;}}if(t&&state.user.balance>=t.entry){state.user.balance-=t.entry;state.user.transactions.unshift({t:'entry',a:-t.entry,d:'Entry: '+t.name,dt:fmt()});save();updateUI();showToast('Inscrito!','success');}else showToast('Saldo insuficiente','error');}

// ===== RESPONSIBLE =====
function renderResponsible(){var el=document.querySelector('#page-responsible .container');if(!el)return;el.innerHTML='<div class="section-header"><h2><i class="fas fa-shield-halved"></i> Jogo Responsável</h2></div><div class="rg-section"><h2>18+ Apenas</h2><p>Somente maiores de 18 anos.</p></div><div class="rg-section"><h2>Lei 14.790/2023</h2><p>Conformidade com legislação brasileira.</p></div><div class="rg-section"><h2>Autoexclusão</h2><div class="exclusion-options"><button class="exclusion-btn" onclick="activateExclusion(1)"><span class="period">24h</span><span class="desc">24 horas</span></button><button class="exclusion-btn" onclick="activateExclusion(7)"><span class="period">7 dias</span><span class="desc">Uma semana</span></button><button class="exclusion-btn" onclick="activateExclusion(30)"><span class="period">30 dias</span><span class="desc">Um mês</span></button></div></div><div class="rg-section"><h2>Ajuda</h2><ul class="rg-list"><li>CVV: 188</li><li>SAMU: 192</li></ul></div>';}
function activateExclusion(days){if(!state.user)return;if(!confirm('Autoexclusão '+days+' dias?'))return;state.user.selfExclusion={days:days,start:Date.now(),end:Date.now()+days*86400000};save();showToast('Autoexclusão '+days+' dias.','info');}

// ===== DASHBOARD =====
function renderDashboard(){if(!state.user)return;var el=$('dashboardContent');if(!el)return;el.innerHTML='<div class="dash-stats"><div class="dash-stat"><div class="label">Saldo</div><div class="value" style="color:var(--accent-gold);">R$ '+state.user.balance.toFixed(2).replace('.',',')+'</div></div><div class="dash-stat"><div class="label">Jogos</div><div class="value">'+state.user.played+'</div></div><div class="dash-stat"><div class="label">Ganho</div><div class="value" style="color:var(--accent-green);">R$ '+state.user.won.toFixed(2).replace('.',',')+'</div></div><div class="dash-stat"><div class="label">Depositado</div><div class="value">R$ '+state.user.deposit.toFixed(2).replace('.',',')+'</div></div></div>';}

// ===== HISTORY =====
function renderHistory(){if(!state.user)return;var el=$('historyList');if(!el)return;if(state.user.history.length===0){el.innerHTML='<p style="color:var(--text-secondary);text-align:center;padding:40px;">Nenhum jogo</p>';return;}el.innerHTML=state.user.history.map(function(h){return '<div class="history-item"><div class="left"><div class="icon" style="background:'+(h.result==='Ganhou'?'rgba(16,185,129,0.15)':'rgba(239,68,68,0.15)')+'"><i class="fas fa-'+(h.result==='Ganhou'?'trophy':'times')+'" style="color:'+(h.result==='Ganhou'?'var(--accent-green)':'var(--accent-red)')+'"></i></div><div><div class="name">'+h.game+'</div><div class="date">'+h.date+'</div></div></div><span class="amount '+(h.amount>0?'amount-pos':'amount-neg')+'">'+(h.amount>0?'+R$ '+h.amount.toFixed(2).replace('.',','):h.result)+'</span></div>';}).join('');}

// ===== LIMITS =====
function renderLimits(){if(!state.user)return;var el=$('limitsForm');if(!el)return;el.innerHTML='<div class="wallet-card"><div class="input-group"><label>Diário (R$)</label><input type="number" id="limitDaily" value="'+state.user.limits.daily+'"></div><div class="input-group"><label>Semanal (R$)</label><input type="number" id="limitWeekly" value="'+state.user.limits.weekly+'"></div><div class="input-group"><label>Mensal (R$)</label><input type="number" id="limitMonthly" value="'+state.user.limits.monthly+'"></div><button class="btn btn-primary" onclick="saveLimits()"><i class="fas fa-save"></i> Salvar</button></div>';}
function saveLimits(){state.user.limits.daily=Number(($('limitDaily')||{}).value)||500;state.user.limits.weekly=Number(($('limitWeekly')||{}).value)||2000;state.user.limits.monthly=Number(($('limitMonthly')||{}).value)||5000;save();showToast('Limites salvos!','success');}

// ===== GAME PLAY =====
function playGame(id){if(!state.user){showModal('login');return;}if(state.user.selfExclusion){showToast('Autoexclusão ativa.','error');return;}var game=null;for(var i=0;i<GAMES.length;i++){if(GAMES[i].id===id){game=GAMES[i];break;}}if(!game)return;if(state.user.balance<game.entry){showToast('Saldo insuficiente!','error');return;}state.currentGame=game;showPage('play');var area=$('gamePlayArea');if(!area)return;if(game.category==='trivia')startQuiz(area);else if(game.category==='skill')startSkill(area);else startArcade(area);}
function startQuiz(area){state.quiz={i:0,s:0,q:shuffle(QUIZ_Q.slice()).slice(0,5)};renderQuizQ(area);}
function renderQuizQ(area){var i=state.quiz.i,s=state.quiz.s,q=state.quiz.q;if(i>=q.length){finishQuiz(area);return;}var qe=q[i];area.innerHTML='<div class="game-play-area"><h2>'+state.currentGame.icon+' '+state.currentGame.name+'</h2><div class="prize-display">R$ '+state.currentGame.prize+',00</div><p style="color:var(--text-secondary);margin-bottom:8px;">'+(i+1)+'/'+q.length+' • Acertos: '+s+'</p><p style="font-size:18px;font-weight:600;margin-bottom:24px;">'+qe.q+'</p>'+qe.opts.map(function(o,j){return '<button class="quiz-option" onclick="answerQuiz('+j+','+qe.c+')">'+o+'</button>';}).join('')+'</div>';}
function answerQuiz(chosen,correct){var opts=document.querySelectorAll('.quiz-option');opts.forEach(function(o,i){o.disabled=true;if(i===correct)o.classList.add('correct');if(i===chosen&&chosen!==correct)o.classList.add('wrong');});if(chosen===correct)state.quiz.s++;setTimeout(function(){state.quiz.i++;var a=$('gamePlayArea');if(a)renderQuizQ(a);},1200);}
function finishQuiz(area){var s=state.quiz.s,q=state.quiz.q;var pct=s/q.length;var prize=0;if(pct>=0.8)prize=state.currentGame.prize;else if(pct>=0.6)prize=Math.floor(state.currentGame.prize*0.5);else if(pct>=0.4)prize=Math.floor(state.currentGame.prize*0.2);if(prize>0){state.user.balance+=prize;state.user.won+=prize;state.user.transactions.unshift({t:'win',a:prize,d:state.currentGame.name,dt:fmt()});}state.user.balance-=state.currentGame.entry;state.user.played++;state.user.history.unshift({game:state.currentGame.name,result:prize>0?'Ganhou':'Perdeu',amount:prize,date:fmt()});save();updateUI();area.innerHTML='<div class="game-play-area"><h2>'+(prize>0?'🎉 Parabéns!':'😔 Tente Novamente')+'</h2><p style="font-size:18px;margin:16px 0;">Acertou '+s+'/'+q.length+'</p><div class="prize-display">'+(prize>0?'+ R$ '+prize+',00':'R$ 0,00')+'</div><div style="margin-top:32px;display:flex;gap:12px;justify-content:center;"><button class="btn btn-primary" onclick="playGame('+state.currentGame.id+')"><i class="fas fa-redo"></i> Jogar</button><button class="btn btn-outline" onclick="showPage(\'games\')"><i class="fas fa-arrow-left"></i> Voltar</button></div></div>';}
function startSkill(area){area.innerHTML='<div class="game-play-area"><h2>'+state.currentGame.icon+' '+state.currentGame.name+'</h2><div class="prize-display">R$ '+state.currentGame.prize+',00</div><p style="color:var(--text-secondary);margin-bottom:24px;">Escolha:</p><button class="quiz-option" style="text-align:center;font-size:48px;max-width:160px;display:inline-block;margin:8px;" onclick="playSkill(0)">✊</button><button class="quiz-option" style="text-align:center;font-size:48px;max-width:160px;display:inline-block;margin:8px;" onclick="playSkill(1)">✋</button><button class="quiz-option" style="text-align:center;font-size:48px;max-width:160px;display:inline-block;margin:8px;" onclick="playSkill(2)">✌️</button></div>';}
function playSkill(pc){var cc=Math.floor(Math.random()*3);var w=[[-1,1,0],[0,-1,1],[1,0,-1]];var r=w[pc][cc];var prize=0;if(r>0)prize=state.currentGame.prize;else if(r===0)prize=state.currentGame.entry;if(r>0){state.user.balance+=prize;state.user.won+=prize;state.user.transactions.unshift({t:'win',a:prize,d:state.currentGame.name,dt:fmt()});}state.user.balance-=state.currentGame.entry;state.user.played++;state.user.history.unshift({game:state.currentGame.name,result:r>0?'Ganhou':r===0?'Empate':'Perdeu',amount:prize,date:fmt()});save();updateUI();var emojis=['✊','✋','✌️'];var area=$('gamePlayArea');area.innerHTML='<div class="game-play-area"><h2>'+(r>0?'🎉 Ganhou!':r===0?'🤝 Empate!':'😔 Perdeu!')+'</h2><p style="font-size:24px;margin:20px 0;">'+emojis[pc]+' vs '+emojis[cc]+'</p><div class="prize-display">'+(prize>0?'+ R$ '+prize+',00':'R$ 0,00')+'</div><div style="margin-top:32px;display:flex;gap:12px;justify-content:center;"><button class="btn btn-primary" onclick="playGame('+state.currentGame.id+')"><i class="fas fa-redo"></i> Jogar</button><button class="btn btn-outline" onclick="showPage(\'games\')"><i class="fas fa-arrow-left"></i> Voltar</button></div></div>';}
function startArcade(area){window._ac=0;var t0=Date.now();area.innerHTML='<div class="game-play-area"><h2>'+state.currentGame.icon+' '+state.currentGame.name+'</h2><div class="prize-display">R$ '+state.currentGame.prize+',00</div><p style="color:var(--text-secondary);margin-bottom:24px;">Clique rápido em 10s!</p><div id="arcT" style="font-size:48px;font-weight:800;color:var(--accent-cyan);margin:20px 0;">10</div><button class="btn btn-primary" style="font-size:24px;padding:30px 60px;border-radius:16px;" onclick="window._ac++;var c=document.getElementById(\'arcC\');if(c)c.textContent=window._ac+\' cliques\'">🎯 CLICAR!</button><div id="arcC" style="font-size:32px;font-weight:800;margin-top:16px;">0 cliques</div></div>';var iv=setInterval(function(){var rem=Math.max(0,10-Math.floor((Date.now()-t0)/1000));var te=$('arcT');if(te)te.textContent=rem;if(rem<=0){clearInterval(iv);finishArc(area);}},100);}
function finishArc(area){var total=window._ac||0;var prize=0;if(total>=80)prize=state.currentGame.prize;else if(total>=50)prize=Math.floor(state.currentGame.prize*0.5);else if(total>=30)prize=Math.floor(state.currentGame.prize*0.2);if(prize>0){state.user.balance+=prize;state.user.won+=prize;state.user.transactions.unshift({t:'win',a:prize,d:state.currentGame.name,dt:fmt()});}state.user.balance-=state.currentGame.entry;state.user.played++;state.user.history.unshift({game:state.currentGame.name,result:prize>0?'Ganhou':'Perdeu',amount:prize,date:fmt()});save();updateUI();area.innerHTML='<div class="game-play-area"><h2>'+(prize>0?'🎉 Incrível!':'😔 Quase!')+'</h2><p style="font-size:18px;margin:16px 0;">'+total+' cliques em 10s</p><div class="prize-display">'+(prize>0?'+ R$ '+prize+',00':'R$ 0,00')+'</div><div style="margin-top:32px;display:flex;gap:12px;justify-content:center;"><button class="btn btn-primary" onclick="playGame('+state.currentGame.id+')"><i class="fas fa-redo"></i> Jogar</button><button class="btn btn-outline" onclick="showPage(\'games\')"><i class="fas fa-arrow-left"></i> Voltar</button></div></div>';}

// ===== REALITY CHECK =====
function checkReality(){if(!state.user)return;if((Date.now()-state.sessionStart)/60000>=60&&!state.realityShown){state.realityShown=true;var o=document.createElement('div');o.className='reality-check-overlay';o.innerHTML='<div class="reality-check-box"><h2>⏰ Verificação</h2><p style="color:var(--text-secondary);">Jogando há '+Math.floor((Date.now()-state.sessionStart)/60000)+' min</p><button class="btn btn-primary" onclick="this.closest(\'.reality-check-overlay\').remove()">Continuar</button></div>';document.body.appendChild(o);}}

// ===== INIT =====
window.addEventListener('load',function(){
    var saved=localStorage.getItem('gv_user');if(saved){try{state.user=JSON.parse(saved);updateUI();}catch(e){}}
    if(apiToken()){apiFetch('/api/me').then(function(result){state.user=result.user;save();updateUI();renderPage(document.querySelector('.page.active')?.id.replace('page-','')||'home');}).catch(function(){localStorage.removeItem('gv_api_token');});}
    setInterval(checkReality,60000);renderHome();
    document.querySelectorAll('.stat-num').forEach(function(el){var target=parseInt(el.dataset.target);var c=0;var s=target/60;var t=setInterval(function(){c+=s;if(c>=target){c=target;clearInterval(t);}el.textContent=Math.floor(c).toLocaleString('pt-BR');},30);});
    setTimeout(function(){var p=$('preloader');if(p)p.classList.add('hidden');},1500);
    state.sessionStart=Date.now();state.realityShown=false;
});
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeModal();});

// ===== WITHDRAW =====
function maskCPF(input){
    var v=input.value.replace(/\D/g,'');
    if(v.length>11)v=v.substring(0,11);
    if(v.length>9)v=v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/,'$1.$2.$3-$4');
    else if(v.length>6)v=v.replace(/(\d{3})(\d{3})(\d{1,3})/,'$1.$2.$3');
    else if(v.length>3)v=v.replace(/(\d{3})(\d{1,3})/,'$1.$2');
    input.value=v;
}
function validateCPF(cpf){
    cpf=cpf.replace(/\D/g,'');
    if(cpf.length!==11||/^(\d)\1{10}$/.test(cpf))return false;
    var sum=0;for(var i=0;i<9;i++)sum+=parseInt(cpf[i])*(10-i);
    var d1=11-(sum%11);if(d1>=10)d1=0;if(parseInt(cpf[9])!==d1)return false;
    sum=0;for(var i=0;i<10;i++)sum+=parseInt(cpf[i])*(11-i);
    var d2=11-(sum%11);if(d2>=10)d2=0;if(parseInt(cpf[10])!==d2)return false;
    return true;
}
async function submitWithdraw(){
    var name=(($('wName')||{}).value||'').trim();
    var cpf=(($('wCPF')||{}).value||'').trim();
    var pix=(($('wPix')||{}).value||'').trim();
    var amount=parseFloat((($('wAmount')||{}).value||0));
    if(!name){showToast('Preencha o nome','error');return;}
    if(!cpf||!validateCPF(cpf)){showToast('CPF inválido','error');return;}
    if(!pix){showToast('Preencha a chave Pix','error');return;}
    if(/^000201/.test(pix)||pix.includes('BR.GOV.BCB.PIX')||pix.length>100){showToast('Isso é um QR/copiar-colar. Use só a chave: CPF, email, telefone ou EVP.','error');return;}
    if(!amount||amount<10){showToast('Mínimo R$ 10','error');return;}
    if(amount>state.user.balance){showToast('Saldo insuficiente','error');return;}
    try {
        var saved=await apiFetch('/api/withdrawals',{method:'POST',body:JSON.stringify({fullName:name,cpf:cpf,pixKey:pix,amount:amount})});
        state.user=saved.user;save();updateUI();closeModal();
        showToast('Saque via PicPay solicitado!','success');
    } catch(error) {
        showToast(error.message||'Não foi possível solicitar o saque','error');
    }
}
function requestWithdraw(){
    if(!state.user){showModal('login');return;}
    if(state.user.balance<10){showToast('Mínimo R$ 10','error');return;}
    showModal('withdraw');
}
