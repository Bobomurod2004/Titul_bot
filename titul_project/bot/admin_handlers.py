from telegram import Update, InlineKeyboardMarkup, InlineKeyboardButton
from telegram.ext import ContextTypes
from keyboards import admin_keyboard, main_keyboard, admin_user_actions_keyboard
from api_client import APIClient
import logging

logger = logging.getLogger(__name__)

async def admin_panel_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Admin paneliga kirish"""
    user = update.effective_user
    api_user = await APIClient.get_user(user.id)
    
    if api_user and api_user.get('role') in ['admin', 'superadmin']:
        from api_client import FRONTEND_URL
        web_url = f"{FRONTEND_URL}/admin/{user.id}"
        
        await update.message.reply_text(
            "🔐 <b>Admin Paneliga xush kelibsiz!</b>\n\n"
            "Siz bot orqali statistikani ko'rishingiz yoki professional <b>Veb Dashboard</b>ga o'tishingiz mumkin:",
            reply_markup=admin_keyboard(),
            parse_mode='HTML'
        )
        # Web app tugmasini alohida yuboramiz
        from keyboards import web_app_keyboard
        await update.message.reply_text(
            "💻 Professional boshqaruv paneli (Web):",
            reply_markup=web_app_keyboard(web_url, "🖥 Veb Dashboardga kirish"),
            parse_mode='HTML'
        )
    else:
        await update.message.reply_text("❌ Sizda admin huquqlari yo'q.")

async def admin_stats_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Tizim statistikasini ko'rish"""
    user = update.effective_user
    stats = await APIClient.get_admin_stats(user.id)
    
    if stats:
        # total_payments Decimal bo'lgani uchun string bo'lishi mumkin
        total_payments = float(stats.get('total_payments', 0))
        
        message = f"""
📊 <b>Tizim Statistikasi</b>

👥 Jami foydalanuvchilar: <b>{stats['total_users']}</b>
🧪 Jami testlar: <b>{stats['total_tests']}</b>
📝 Jami topshirilganlar: <b>{stats['total_submissions']}</b>
💰 Jami tushum: <b>{'%.2f' % total_payments} so'm</b>
🔥 Faol testlar: <b>{stats['active_tests']}</b>
⏳ Kutilayotgan to'lovlar: <b>{stats['pending_payments']}</b>
"""
        await update.message.reply_text(message, parse_mode='HTML')
    else:
        await update.message.reply_text("❌ Statistikani yuklashda xatolik.")

async def admin_broadcast_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Xabar yuborishni boshlash"""
    context.user_data['admin_state'] = 'waiting_for_broadcast_msg'
    await update.message.reply_text(
        "📢 <b>Barcha foydalanuvchilarga yuboriladigan xabarni kiriting:</b>\n\n"
        "<i>Bekor qilish uchun '🔙 Orqaga' tugmasini bosing.</i>",
        parse_mode='HTML'
    )

async def admin_user_search_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Foydalanuvchilarni izlashni boshlash"""
    context.user_data['admin_state'] = 'waiting_for_user_search'
    await update.message.reply_text(
        "👥 <b>Izlanayotgan foydalanuvchining ID sini yoki ismini kiriting:</b>",
        parse_mode='HTML'
    )

async def handle_admin_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Admin panelidagi matnli buyruqlarni qayta ishlash"""
    state = context.user_data.get('admin_state')
    text = update.message.text
    admin_id = update.effective_user.id

    if text == "🔙 Orqaga":
        context.user_data['admin_state'] = None
        return await admin_back_handler(update, context)

    if state == 'waiting_for_broadcast_msg':
        context.user_data['admin_state'] = None
        user_ids = await APIClient.get_all_user_ids(admin_id)
        
        count = 0
        await update.message.reply_text(f"⏳ {len(user_ids)} ta foydalanuvchiga xabar yuborilmoqda...")
        
        for uid in user_ids:
            try:
                await context.bot.send_message(chat_id=uid, text=text, parse_mode='HTML')
                count += 1
            except Exception as e:
                logger.error(f"Broadcast error for {uid}: {e}")
        
        await update.message.reply_text(f"✅ Xabar {count} ta foydalanuvchiga muvaffaqiyatli yuborildi.")

    elif state == 'waiting_for_user_search':
        users = await APIClient.get_all_users(admin_id, search=text)
        if not users:
            return await update.message.reply_text("❌ Foydalanuvchi topilmadi.")
        
        for u in users[:5]: # Faqat birinchi 5 tasini ko'rsatamiz
            msg = f"""
👤 <b>Foydalanuvchi:</b> {u['full_name']}
🆔 <b>Telegram ID:</b> <code>{u['telegram_id']}</code>
👔 <b>Rol:</b> {u['role']}
💰 <b>Balans:</b> {u['balance']} so'm
📅 <b>Sana:</b> {u['created_at'][:10]}
"""
            await update.message.reply_text(msg, reply_markup=admin_user_actions_keyboard(u['telegram_id']), parse_mode='HTML')

    elif state and state.startswith('waiting_for_bal_amount_'):
        parts = state.split("_")
        action = parts[4]
        target_id = parts[5]
        
        try:
            amount = float(text.strip())
            # Joriy balance ni olish uchun user ni qayta yuklaymiz
            user = await APIClient.get_user(target_id)
            current_balance = float(user.get('balance', 0))
            
            new_balance = current_balance + amount if action == "qo'shish" else current_balance - amount
            
            result = await APIClient.update_user_balance(admin_id, target_id, new_balance)
            if result:
                context.user_data['admin_state'] = None
                await update.message.reply_text(f"✅ Balans yangilandi. Yangi balans: {new_balance} so'm")
            else:
                await update.message.reply_text("❌ Balansni yangilashda xatolik.")
        except ValueError:
            await update.message.reply_text("❌ Iltimos, faqat son kiriting!")

    elif state and state.startswith('waiting_for_receipt_amount_'):
        receipt_id = state.split("_")[-1]
        try:
            amount = float(text.strip())
            import requests
            from api_client import API_BASE_URL
            response = requests.post(
                f"{API_BASE_URL}/admin/receipts/{receipt_id}/verify/",
                json={'action': 'accept', 'amount': amount, 'comment': 'Tasdiqlandi'},
                headers={'X-Telegram-Id': str(admin_id)}
            )
            if response.status_code == 200:
                res_data = response.json()
                context.user_data['admin_state'] = None
                await update.message.reply_text(f"✅ To'lov tasdiqlandi. Foydalanuvchi balansi {res_data['new_balance']} so'mga yetdi.")
                
                # Userga xabar yuborish
                user_tid = res_data.get('user_telegram_id')
                if user_tid:
                    try:
                        await context.bot.send_message(
                            chat_id=user_tid,
                            text=f"✅ <b>Tabriklaymiz!</b>\n\nSizning to'lovingiz tasdiqlandi.\nSumma: <b>{amount} so'm</b>\nYangi balans: <b>{res_data['new_balance']} so'm</b>",
                            parse_mode='HTML'
                        )
                    except:
                        pass
            else:
                await update.message.reply_text(f"❌ Xatolik yuz berdi: {response.text}")
        except ValueError:
            await update.message.reply_text("❌ Iltimos, faqat son kiriting!")

async def admin_back_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Asosiy menyuga qaytish"""
    user = update.effective_user
    api_user = await APIClient.get_user(user.id)
    is_admin = api_user and api_user.get('role') in ['admin', 'superadmin']
    
    await update.message.reply_text(
        "🔙 Asosiy menyuga qaytdingiz.",
        reply_markup=main_keyboard(is_admin=is_admin)
    )

async def admin_callback_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Admin inline tugmalarini qayta ishlash"""
    query = update.callback_query
    admin_id = update.effective_user.id
    data = query.data
    
    await query.answer()

    if data == "adm_close":
        return await query.message.delete()

    if data.startswith("adm_add_bal_") or data.startswith("adm_sub_bal_"):
        target_id = data.split("_")[-1]
        action = "qo'shish" if "add" in data else "ayirish"
        context.user_data['admin_state'] = f'waiting_for_bal_amount_{action}_{target_id}'
        await query.message.reply_text(f"💰 Balansdan {action} uchun miqdorni kiriting (so'mda):")

    elif data.startswith("adm_change_role_"):
        # Rolni o'zgartirish faqat Superadmin uchun
        api_user = await APIClient.get_user(admin_id)
        if api_user.get('role') != 'superadmin':
            return await query.message.reply_text("❌ Faqat Superadmin rollarni o'zgartira oladi.")
            
        target_id = data.split("_")[-1]
        keyboard = [
            [InlineKeyboardButton("User", callback_data=f"set_role_user_{target_id}"),
             InlineKeyboardButton("Teacher", callback_data=f"set_role_teacher_{target_id}")],
            [InlineKeyboardButton("Admin", callback_data=f"set_role_admin_{target_id}"),
             InlineKeyboardButton("Superadmin", callback_data=f"set_role_superadmin_{target_id}")]
        ]
        await query.message.reply_text("👔 Yangi rolni tanlang:", reply_markup=InlineKeyboardMarkup(keyboard))

    elif data.startswith("set_role_"):
        parts = data.split("_")
        role = parts[2]
        target_id = parts[3]
        
        result = await APIClient.update_user_role(admin_id, target_id, role)
        if result:
            await query.message.edit_text(f"✅ Foydalanuvchi roli '{role}' ga o'zgartirildi.")
        else:
            await query.message.reply_text("❌ Rolni o'zgartirishda xatolik.")

    elif data.startswith("rec_accept_") or data.startswith("rec_reject_"):
        receipt_id = data.split("_")[-1]
        action = "accept" if "accept" in data else "reject"
        
        if action == "accept":
            context.user_data['admin_state'] = f'waiting_for_receipt_amount_{receipt_id}'
            await query.message.reply_text("💰 Ushbu chek bo'yicha qancha pul o'tkazildi? (so'mda):")
        else:
            # Reject immediately
            try:
                # Backendga rad etishni yuborish
                import requests
                from api_client import API_BASE_URL
                response = requests.post(
                    f"{API_BASE_URL}/admin/receipts/{receipt_id}/verify/",
                    json={'action': 'reject', 'comment': 'Chek rad etildi'},
                    headers={'X-Telegram-Id': str(admin_id)}
                )
                if response.status_code == 200:
                    # Userga xabar yuborish
                    res_data = response.json()
                    # Hozircha user ID ni backenddan olish kerak yoki original xabardan
                    # Keling backend bizga user_telegram_id ni ham qaytarsin
                    # Yoki biz buni admin_handlers da user_data da saqlasak?
                    # Yaxshisi backend verificiationdan keyin user info qaytarsin.
                    await query.message.edit_reply_markup(reply_markup=None)
                    await query.message.reply_text("❌ Chek rad etildi.")
                else:
                    await query.message.reply_text("❌ Xatolik yuz berdi.")
            except Exception as e:
                logger.error(f"Reject verify error: {e}")
                await query.message.reply_text(f"❌ Xatolik: {e}")
