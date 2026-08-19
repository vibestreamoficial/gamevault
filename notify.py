import telebot
import json
import time
import os

BOT_TOKEN = "8972714685:AAGSUWdXtF8WQm954sSBfcy6bbZVLgURxA0"
ADMIN_ID = 8974625644
DB_FILE = os.path.join(os.path.dirname(__file__), "backend", "database.json")

bot = telebot.TeleBot(BOT_TOKEN)

def get_withdrawals():
    try:
        with open(DB_FILE, 'r') as f:
            data = json.load(f)
        return data.get('withdrawals', [])
    except:
        return []

def save_withdrawal_status(wid, status):
    try:
        with open(DB_FILE, 'r') as f:
            data = json.load(f)
        for w in data.get('withdrawals', []):
            if w['id'] == wid:
                w['status'] = status
                break
        with open(DB_FILE, 'w') as f:
            json.dump(data, f, indent=2)
        return True
    except:
        return False

last_check = 0

def check_new_withdrawals():
    global last_check
    withdrawals = get_withdrawals()
    for w in withdrawals:
        if w.get('status') == 'pending' and w.get('id', '') > 'WD'+str(last_check):
            msg = f"""💰 *NOVO SAQUE!*

👤 *Nome:* {w.get('name', '-')}
📋 *CPF:* {w.get('cpf', '-')}
📱 *Chave Pix:* {w.get('pixKey', '-')}
📧 *Email:* {w.get('email', '-')}
💰 *Valor:* R$ {w.get('amount', 0):.2f}
🕐 *Horário:* {w.get('createdAt', '-')[:19].replace('T', ' ')}

⚡ *Para aprovar:* /aprovar {w['id']}
❌ *Para rejeitar:* /rejeitar {w['id']}"""

            bot.send_message(ADMIN_ID, msg, parse_mode="Markdown")
            last_check = int(time.time())

@bot.message_handler(commands=['aprovar'])
def cmd_aprove(msg):
    if msg.from_user.id != ADMIN_ID:
        bot.reply_to(msg, "❌ Apenas admin.")
        return
    parts = msg.text.split()
    if len(parts) < 2:
        bot.reply_to(msg, "Use: /aprovar WD123456")
        return
    wid = parts[1]
    if save_withdrawal_status(wid, 'approved'):
        bot.reply_to(msg, f"✅ Saque {wid} aprovado!")
    else:
        bot.reply_to(msg, "❌ Saque não encontrado.")

@bot.message_handler(commands=['rejeitar'])
def cmd_reject(msg):
    if msg.from_user.id != ADMIN_ID:
        bot.reply_to(msg, "❌ Apenas admin.")
        return
    parts = msg.text.split()
    if len(parts) < 2:
        bot.reply_to(msg, "Use: /rejeitar WD123456")
        return
    wid = parts[1]
    if save_withdrawal_status(wid, 'rejected'):
        bot.reply_to(msg, f"❌ Saque {wid} rejeitado e saldo devolvido.")
    else:
        bot.reply_to(msg, "❌ Saque não encontrado.")

@bot.message_handler(commands=['saques'])
def cmd_list(msg):
    if msg.from_user.id != ADMIN_ID:
        return
    withdrawals = get_withdrawals()
    pending = [w for w in withdrawals if w.get('status') == 'pending']
    if not pending:
        bot.reply_to(msg, "✅ Nenhum saque pendente.")
        return
    text = f"📋 *Saques pendentes:* {len(pending)}\n\n"
    for w in pending:
        text += f"💰 R$ {w['amount']:.2f} — {w.get('name', '-')} — /aprovar {w['id']} /rejeitar {w['id']}\n"
    bot.reply_to(msg, text, parse_mode="Markdown")

print("🤖 Monitor de saques rodando...")
print("📡 Verificando a cada 10 segundos...")

while True:
    try:
        check_new_withdrawals()
    except Exception as e:
        print(f"Erro: {e}")
    time.sleep(10)
