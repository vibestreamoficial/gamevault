// GameVault - Backend com Mercado Pago
// Coloque suas credenciais abaixo

const MP_ACCESS_TOKEN = 'SEU_ACCESS_TOKEN_AQUI'; // Cole aqui
const MP_PUBLIC_KEY = 'SEU_PUBLIC_KEY_AQUI'; // Cole aqui

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PIX_KEY = 'fff503e1-60b3-457b-bdc4-ddf2c892cfda';
const DB_FILE = path.join(__dirname, 'database.json');

function loadDB(){try{return JSON.parse(fs.readFileSync(DB_FILE,'utf8'));}catch{return{users:[],withdrawals:[],pendingDeposits:[]};}}
function saveDB(db){fs.writeFileSync(DB_FILE,JSON.stringify(db,null,2));}

async function mpRequest(endpoint, method, body){
    const res = await fetch('https://api.mercadopago.com'+endpoint, {
        method: method,
        headers: {
            'Authorization': 'Bearer '+MP_ACCESS_TOKEN,
            'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined
    });
    return await res.json();
}

function parseBody(req){return new Promise(r=>{let b='';req.on('data',c=>b+=c);req.on('end',()=>{try{r(JSON.parse(b));}catch{r({});}});});}
function json(res,data,status=200){res.writeHead(status,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'});res.end(JSON.stringify(data));}

const server = http.createServer(async(req,res)=>{
    if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'});return res.end();}
    const url = new URL(req.url, `http://localhost:${PORT}`);

    // Criar pagamento PIX
    if(req.method==='POST' && url.pathname==='/api/mp/pix/create'){
        const body = await parseBody(req);
        const {amount, email, description} = body;
        if(!amount || amount < 1) return json(res,{error:'Valor inválido'},400);
        
        try {
            const payment = await mpRequest('/v1/payments', 'POST', {
                transaction_amount: parseFloat(amount),
                description: description || 'Depósito GameVault',
                payment_method_id: 'pix',
                payer: { email: email || 'gamevault@email.com' },
                external_reference: 'GV-'+Date.now()
            });
            
            if(payment.id){
                const db = loadDB();
                db.pendingDeposits.push({
                    mpId: payment.id,
                    amount: parseFloat(amount),
                    email: email,
                    status: payment.status,
                    qrCode: payment.point_of_interaction?.transaction_data?.qr_code,
                    qrCodeBase64: payment.point_of_interaction?.transaction_data?.qr_code_base64,
                    ticketUrl: payment.point_of_interaction?.transaction_data?.ticket_url,
                    createdAt: new Date().toISOString()
                });
                saveDB(db);
                return json(res, {
                    ok: true,
                    paymentId: payment.id,
                    status: payment.status,
                    qrCode: payment.point_of_interaction?.transaction_data?.qr_code,
                    qrCodeBase64: payment.point_of_interaction?.transaction_data?.qr_code_base64,
                    ticketUrl: payment.point_of_interaction?.transaction_data?.ticket_url
                });
            } else {
                return json(res, {error: payment.message || 'Erro ao criar pagamento'}, 400);
            }
        } catch(e) {
            return json(res, {error: e.message}, 500);
        }
    }

    // Verificar status do pagamento
    if(req.method==='GET' && url.pathname==='/api/mp/status'){
        const paymentId = url.searchParams.get('id');
        if(!paymentId) return json(res,{error:'ID obrigatório'},400);
        try {
            const payment = await mpRequest('/v1/payments/'+paymentId, 'GET');
            
            if(payment.status === 'approved'){
                const db = loadDB();
                const dep = db.pendingDeposits.find(d => d.mpId == paymentId);
                if(dep && dep.status !== 'approved'){
                    dep.status = 'approved';
                    let user = db.users.find(u => u.email === dep.email);
                    if(!user){
                        user = {email:dep.email,name:dep.email.split('@')[0],balance:50,deposit:0,won:0,withdrawn:0,kyc:'pending',limits:{daily:500,weekly:2000,monthly:5000},selfExclusion:null,transactions:[],history:[]};
                        db.users.push(user);
                    }
                    user.balance += dep.amount;
                    user.deposit += dep.amount;
                    user.transactions.unshift({t:'deposit',a:dep.amount,d:'Depósito Mercado Pago R$ '+dep.amount.toFixed(2),dt:new Date().toLocaleDateString('pt-BR'),id:paymentId});
                    saveDB(db);
                }
            }
            
            return json(res, {status: payment.status, id: payment.id});
        } catch(e) {
            return json(res, {error: e.message}, 500);
        }
    }

    // Webhook do Mercado Pago (notificação automática)
    if(req.method==='POST' && url.pathname==='/api/mp/webhook'){
        const body = await parseBody(req);
        if(body.type === 'payment'){
            const paymentId = body.data?.id;
            if(paymentId){
                try {
                    const payment = await mpRequest('/v1/payments/'+paymentId, 'GET');
                    if(payment.status === 'approved'){
                        const db = loadDB();
                        const dep = db.pendingDeposits.find(d => d.mpId == paymentId);
                        if(dep && dep.status !== 'approved'){
                            dep.status = 'approved';
                            let user = db.users.find(u => u.email === dep.email);
                            if(!user){
                                user = {email:dep.email,name:dep.email.split('@')[0],balance:50,deposit:0,won:0,withdrawn:0,kyc:'pending',limits:{daily:500,weekly:2000,monthly:5000},selfExclusion:null,transactions:[],history:[]};
                                db.users.push(user);
                            }
                            user.balance += dep.amount;
                            user.deposit += dep.amount;
                            user.transactions.unshift({t:'deposit',a:dep.amount,d:'Depósito Mercado Pago R$ '+dep.amount.toFixed(2),dt:new Date().toLocaleDateString('pt-BR'),id:String(paymentId)});
                            saveDB(db);
                            console.log('✅ Pagamento aprovado: R$'+dep.amount+' para '+dep.email);
                        }
                    }
                } catch(e) { console.log('Erro webhook:', e.message); }
            }
        }
        return json(res, {ok:true});
    }

    // Solicitar saque
    if(req.method==='POST' && url.pathname==='/api/withdraw'){
        const body = await parseBody(req);
        const {email, name, cpf, pixKey, amount} = body;
        if(!email || !amount || amount < 10) return json(res,{error:'Dados inválidos'},400);
        
        const db = loadDB();
        const user = db.users.find(u => u.email === email);
        if(!user || user.balance < amount) return json(res,{error:'Saldo insuficiente'},400);
        
        user.balance -= amount;
        user.withdrawn += amount;
        user.transactions.unshift({t:'withdraw',a:-amount,d:'Saque PicPay R$ '+amount.toFixed(2),dt:new Date().toLocaleDateString('pt-BR')});
        
        db.withdrawals.push({
            id:'WD'+Date.now(), email, name, cpf, pixKey, amount,
            status:'pending', createdAt:new Date().toISOString()
        });
        
        saveDB(db);
        return json(res,{ok:true, balance:user.balance});
    }

    // Admin - listar saques
    if(req.method==='GET' && url.pathname==='/api/admin/withdrawals'){
        const db = loadDB();
        return json(res,{withdrawals: db.withdrawals || []});
    }

    // Admin - aprovar saque
    if(req.method==='POST' && url.pathname==='/api/admin/withdraw/approve'){
        const body = await parseBody(req);
        const {id} = body;
        const db = loadDB();
        const w = (db.withdrawals||[]).find(x => x.id === id);
        if(!w) return json(res,{error:'Não encontrado'},404);
        w.status = 'approved';
        saveDB(db);
        return json(res,{ok:true});
    }

    // Admin - rejeitar saque
    if(req.method==='POST' && url.pathname==='/api/admin/withdraw/reject'){
        const body = await parseBody(req);
        const {id} = body;
        const db = loadDB();
        const w = (db.withdrawals||[]).find(x => x.id === id);
        if(!w) return json(res,{error:'Não encontrado'},404);
        w.status = 'rejected';
        const user = db.users.find(u => u.email === w.email);
        if(user){ user.balance += w.amount; user.withdrawn -= w.amount; }
        saveDB(db);
        return json(res,{ok:true});
    }

    // Admin - stats
    if(req.method==='GET' && url.pathname==='/api/admin/stats'){
        const db = loadDB();
        const totalDep = db.users.reduce((s,u)=>s+(u.deposit||0),0);
        const totalWit = db.users.reduce((s,u)=>s+(u.withdrawn||0),0);
        const totalWon = db.users.reduce((s,u)=>s+(u.won||0),0);
        return json(res,{totalUsers:db.users.length,totalDeposits:totalDep,totalWithdraws:totalWit,totalWon,profit:totalDep-totalWit-totalWon});
    }

    // Admin - listar usuários
    if(req.method==='GET' && url.pathname==='/api/admin/users'){
        const db = loadDB();
        return json(res,{users:db.users.map(u=>({email:u.email,name:u.name,balance:u.balance,deposit:u.deposit,won:u.won,withdrawn:u.withdrawn}))});
    }

    // Static files
    const filePath = req.url === '/' ? path.join(__dirname,'..','index.html') : path.join(__dirname,'..',req.url);
    if(fs.existsSync(filePath) && fs.statSync(filePath).isFile()){
        const ext = path.extname(filePath);
        const types = {'.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json'};
        res.writeHead(200,{'Content-Type':types[ext]||'text/plain'});
        return fs.createReadStream(filePath).pipe(res);
    }
    json(res,{error:'Not found'},404);
});

server.listen(PORT, ()=>{
    console.log('🎮 GameVault Server: http://localhost:'+PORT);
    console.log('💳 Mercado Pago: '+(MP_ACCESS_TOKEN !== 'SEU_ACCESS_TOKEN_AQUI' ? '✅ Configurado' : '❌ Credenciais pendentes'));
    console.log('📡 PIX Key: '+PIX_KEY);
});
