# Titul Test Bot

DTM uslubidagi test platformasi - Telegram bot + Django backend + Next.js frontend

## 📋 Loyiha Tarkibi

- **Backend:** Django REST Framework + PostgreSQL
- **Frontend:** Next.js 15 + React 19 + TailwindCSS
- **Bot:** python-telegram-bot
- **Database:** PostgreSQL

## 🚀 Ishga Tushirish

### 1. Environment Variables

`.env` faylini yarating:

```bash
# Database
DB_NAME=titul_db
DB_USER=postgres
DB_PASSWORD=titul_bot
DB_HOST=localhost
DB_PORT=5432

# Django
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather

# URLs
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 2. Virtual Environment

```bash
# Virtual environment yaratish
python3 -m venv venv
source venv/bin/activate

# Dependencies o'rnatish
pip install -r requirements.txt
```

### 3. Database Setup

```bash
# PostgreSQL database yaratish
sudo -u postgres createdb titul_db

# Migrations
cd backend
python manage.py migrate

# Superuser yaratish (optional)
python manage.py createsuperuser
```

### 4. Backend Ishga Tushirish

```bash
cd backend
source ../venv/bin/activate
python manage.py runserver 0.0.0.0:8000
```

**Admin Panel:** http://localhost:8000/admin/
**API:** http://localhost:8000/api/v1/

### 5. Frontend Ishga Tushirish

```bash
cd frontend
npm install
npm run dev
```

**Frontend:** http://localhost:3000

### 6. Bot Ishga Tushirish

```bash
cd bot
source ../venv/bin/activate
python bot.py
```

## 📚 API Endpoints

### Users
- `POST /api/v1/users/` - Foydalanuvchi yaratish
- `GET /api/v1/users/{telegram_id}/` - Ma'lumotlarni olish

### Tests
- `POST /api/v1/tests/` - Test yaratish
- `GET /api/v1/tests/code/{access_code}/` - Access code orqali
- `GET /api/v1/tests/user/{telegram_id}/` - Foydalanuvchi testlari
- `POST /api/v1/tests/{id}/finish/` - Testni yakunlash

### Submissions
- `POST /api/v1/submissions/` - Javob yuborish
- `GET /api/v1/submissions/test/{test_id}/` - Test javoblari
- `GET /api/v1/submissions/test/{test_id}/report/` - PDF yuklab olish

### Payments
- `POST /api/v1/payments/` - To'lov yaratish
- `GET /api/v1/payments/user/{telegram_id}/` - To'lovlar tarixi

## 🏗️ Loyiha Strukturasi

```
titul_project/
├── backend/              # Django backend
│   ├── manage.py
│   ├── titul_backend/   # Django project
│   └── tests/           # Django app
├── bot/                 # Telegram bot
│   ├── bot.py
│   ├── handlers.py
│   ├── keyboards.py
│   └── api_client.py
├── frontend/            # Next.js frontend
│   └── src/
│       └── app/
├── venv/               # Python virtual environment
├── requirements.txt    # Python dependencies
└── .env               # Environment variables
```

## 🔧 Development

### Backend Development

```bash
# Yangi migration yaratish
python manage.py makemigrations

# Migrations qo'llash
python manage.py migrate

# Shell ochish
python manage.py shell
```

### Frontend Development

```bash
# Development server
npm run dev

# Production build
npm run build

# Production server
npm start
```

## 📦 Deployment

### Railway / Heroku

1. PostgreSQL database yaratish
2. Environment variables sozlash
3. Backend deploy qilish
4. Frontend deploy qilish
5. Bot webhook sozlash (optional)

### Docker (keyingi versiya)

```bash
docker-compose up -d
```

## 🤝 Contributing

1. Fork qiling
2. Feature branch yarating (`git checkout -b feature/amazing`)
3. Commit qiling (`git commit -m 'Add amazing feature'`)
4. Push qiling (`git push origin feature/amazing`)
5. Pull Request oching

## 📝 License

MIT License

## 👨‍💻 Author

Titul Test Bot - 2026

## 📞 Support

Telegram: @support
