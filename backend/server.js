const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const PIX_KEY = 'fff503e1-60b3-457b-bdc4-ddf2c892cfda';
const PIX_NAME = 'White Vendas';
const DB_FILE = path.join(__dirname, 'database.json');

function loadDB(){try{return JSON.parse(fs.readFileSync(DB_FILE,'utf8'));}catch{return{users:[],transactions:[],pendingDeposits:[]};}}
function saveDB(db){fs.writeFileSync(DB_FILE,JSON.stringify(db,null,2));}

function generatePixPayload(amount,txid){
    const val=amount.toFixed(2);
    let payload='00020126580014br.gov.bcb.pix0136'+PIX_KEY+'0212GameVault Pay520400005303986540'+String(val.length).padStart(2,'0')+val+'5802BR5913'+PIX_NAME.substring(0,13)+'6009SAO PAULO62070503'+txid.substring(0,3)+'6304';
    let crc=0xFFFF;
    for(let i=0;i<payload.length;i++){crc^=payload.charCodeAt(i);for(let j=0;j<8;j++){crc=(crc&1)?(crc>>1)^0xA001:crc>>1;}}
    return payload+(crc&0xFFFF).toString(16).toUpperCase().padStart(4,'0');
}

function parseBody(req){return new Promise((resolve)=>{let body='';req.on('data',c=>body+=c);req.on('end',()=>{try{resolve(JSON.parse(body));}catch{resolve({});}});});}
function json(res,data,status=200){res.writeHead(status,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'});res.end(JSON.stringify(data));}

const server=http.createServer(async(req,res)=>{
    if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'});return res.end();}
    const url=new URL(req.url,`http://localhost:${PORT}`);

    // Criar cobrança PIX
    if(req.method==='POST'&&url.pathname==='/api/pix/create'){
        const body=await parseBody(req);
        const amount=parseFloat(body.amount);const email=body.email;
        if(!amount||amount<1||!email)return json(res,{error:'Dados inválidos'},400);
        const txid='GV'+Date.now().toString(36).toUpperCase()+crypto.randomBytes(3).toString('hex').toUpperCase();
        const payload=generatePixPayload(amount,txid);
        const db=loadDB();
        db.pendingDeposits.push({txid,amount,email,status:'pending',createdAt:new Date().toISOString()});
        saveDB(db);
        return json(res,{txid,amount,payload,pixKey:PIX_KEY,pixName:PIX_NAME});
    }

    // Verificar status
    if(req.method==='GET'&&url.pathname==='/api/pix/status'){
        const txid=url.searchParams.get('txid');
        if(!txid)return json(res,{error:'txid obrigatório'},400);
        const db=loadDB();const d=db.pendingDeposits.find(x=>x.txid===txid);
        if(!d)return json(res,{error:'Não encontrado'},404);
        return json(res,{txid:d.txid,amount:d.amount,status:d.status});
    }

    // Confirmar pagamento
    if(req.method==='POST'&&url.pathname==='/api/pix/confirm'){
        const body=await parseBody(req);
        const{txid,email}=body;
        if(!txid||!email)return json(res,{error:'Dados inválidos'},400);
        const db=loadDB();const d=db.pendingDeposits.find(x=>x.txid===txid&&x.email===email);
        if(!d)return json(res,{error:'Não encontrado'},404);
        if(d.status==='paid')return json(res,{status:'already_paid'});
        d.status='paid';d.paidAt=new Date().toISOString();
        let user=db.users.find(u=>u.email===email);
        if(!user){user={email,name:email.split('@')[0],balance:50,deposit:0,won:0,withdrawn:0,kyc:'pending',limits:{daily:500,weekly:2000,monthly:5000},selfExclusion:null,transactions:[],history:[]};db.users.push(user);}
        user.balance+=d.amount;user.deposit+=d.amount;
        user.transactions.unshift({t:'deposit',a:d.amount,d:`Depósito PIX R$ ${d.amount.toFixed(2)}`,dt:new Date().toLocaleDateString('pt-BR'),id:txid});
        saveDB(db);
        return json(res,{status:'paid',amount:d.amount,balance:user.balance});
    }

    // Saque
    if(req.method==='POST'&&url.pathname==='/api/withdraw'){
        const body=await parseBody(req);const{email,amount}=body;
        if(!email||!amount||amount<10)return json(res,{error:'Dados inválidos'},400);
        const db=loadDB();const user=db.users.find(u=>u.email===email);
        if(!user||user.balance<amount)return json(res,{error:'Saldo insuficiente'},400);
        user.balance-=amount;user.withdrawn+=amount;
        user.transactions.unshift({t:'withdraw',a:-amount,d:`Saque PIX R$ ${amount.toFixed(2)}`,dt:new Date().toLocaleDateString('pt-BR')});
        saveDB(db);return json(res,{status:'ok',balance:user.balance});
    }

    // Admin
    if(req.method==='GET'&&url.pathname==='/api/admin/users'){
        const db=loadDB();return json(res,{users:db.users.map(u=>({name:u.name,email:u.email,balance:u.balance,deposit:u.deposit,won:u.won,withdrawn:u.withdrawn,kyc:u.kyc}))});
    }

    // Static files
    const filePath=path.join(__dirname,'..',req.url==='/'?'index.html':req.url);
    if(fs.existsSync(filePath)&&fs.statSync(filePath).isFile()){
        const ext=path.extname(filePath);
        const types={'.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json'};
        res.writeHead(200,{'Content-Type':types[ext]||'text/plain'});
        return fs.createReadStream(filePath).pipe(res);
    }
    json(res,{error:'Not found'},404);
});

server.listen(PORT,()=>{console.log(`🎮 GameVault Server: http://localhost:${PORT}`);console.log(`📡 PIX: ${PIX_KEY}`);});
