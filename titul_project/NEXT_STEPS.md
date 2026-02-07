# Keyingi Qadamlar - Titul Test Bot

## 1. Bot Token Olish (5 daqiqa)

### @BotFather dan token olish:

1. Telegram da `@BotFather` ni qidiring
2. `/newbot` buyrug'ini yuboring
3. Bot nomini kiriting (masalan: `Titul Test Bot`)
4. Bot username kiriting (masalan: `titul_test_bot`)
5. Token oling va `.env` fayliga qo'shing:

```bash
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
```

## 2. Bot Ishga Tushirish (2 daqiqa)

```bash
cd /home/bobomurod/Botlar/Titul_botlar/titul_project/bot
source ../venv/bin/activate
python bot.py
```

## 3. Test Qilish (10 daqiqa)

### Backend Test:
```bash
# Terminal 1
cd backend
source ../venv/bin/activate
python manage.py runserver 0.0.0.0:8000

# Browser: http://localhost:8000/admin/
# Login: admin / admin
```

### Frontend Test:
```bash
# Terminal 2
cd frontend
npm run dev

# Browser: http://localhost:3000
```

### Bot Test:
```bash
# Terminal 3
cd bot
source ../venv/bin/activate
python bot.py

# Telegram: /start
```

## 4. End-to-End Test

1. **Bot da `/start`** bosing
2. **"🧪 Test yaratish"** tugmasini bosing
3. Web sahifada test yarating
4. Access code oling
5. **"📚 Javob yuborish"** orqali test toping
6. Javoblarni belgilang
7. **"📊 Testlarim"** da natijalarni ko'ring
8. PDF yuklab oling

## 5. Production Deployment (30 daqiqa)

### Backend (Railway):
```bash
# Railway CLI o'rnatish
npm install -g @railway/cli

# Login
railway login

# Project yaratish
railway init

# PostgreSQL qo'shish
railway add

# Deploy
railway up
```

### Frontend (Vercel):
```bash
# Vercel CLI o'rnatish
npm install -g vercel

# Deploy
cd frontend
vercel
```

### Environment Variables:
```bash
# Railway (Backend)
DB_NAME=railway_db
DB_USER=postgres
DB_PASSWORD=***
DB_HOST=containers-us-west-xxx.railway.app
DB_PORT=5432
SECRET_KEY=***
DEBUG=False
ALLOWED_HOSTS=*.railway.app

# Vercel (Frontend)
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api/v1
NEXT_PUBLIC_SITE_URL=https://your-frontend.vercel.app
```

## 6. Bot Webhook (Optional)

```python
# bot/webhook.py
from flask import Flask, request
from telegram import Update

app = Flask(__name__)

@app.route('/webhook', methods=['POST'])
def webhook():
    update = Update.de_json(request.get_json(), bot)
    # Handle update
    return 'ok'

# Set webhook
bot.set_webhook('https://your-backend.railway.app/webhook')
```

## 7. Monitoring va Logging

### Sentry Integration:
```bash
pip install sentry-sdk

# settings.py
import sentry_sdk
sentry_sdk.init(dsn="your-sentry-dsn")
```

### Logging:
```python
# backend/settings.py
LOGGING = {
    'version': 1,
    'handlers': {
        'file': {
            'class': 'logging.FileHandler',
            'filename': 'debug.log',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file'],
            'level': 'INFO',
        },
    },
}
```

## 8. Backup Strategy

```bash
# PostgreSQL backup
pg_dump -U postgres titul_db > backup.sql

# Restore
psql -U postgres titul_db < backup.sql

# Automated backup (cron)
0 2 * * * pg_dump -U postgres titul_db > /backups/titul_$(date +\%Y\%m\%d).sql
```

## 9. Performance Optimization

### Django:
```python
# settings.py
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
    }
}
```

### Next.js:
```javascript
// next.config.js
module.exports = {
  images: {
    domains: ['your-backend.railway.app'],
  },
  compress: true,
}
```

## 10. Security Checklist

- [ ] DEBUG=False in production
- [ ] SECRET_KEY xavfsiz
- [ ] ALLOWED_HOSTS to'g'ri sozlangan
- [ ] CORS to'g'ri sozlangan
- [ ] SQL injection himoyasi
- [ ] XSS himoyasi
- [ ] CSRF token
- [ ] HTTPS faqat
- [ ] Rate limiting
- [ ] Input validation

---

## Tezkor Ishga Tushirish

```bash
# 1. Bot token olish va .env ga qo'shish
# 2. Barcha serviceslarni ishga tushirish:

# Terminal 1: Backend
cd backend && source ../venv/bin/activate && python manage.py runserver

# Terminal 2: Frontend  
cd frontend && npm run dev

# Terminal 3: Bot
cd bot && source ../venv/bin/activate && python bot.py

# 3. Test qilish: http://localhost:3000
# 4. Bot test: Telegram da /start
```

**Hammasi tayyor! 🎉**
