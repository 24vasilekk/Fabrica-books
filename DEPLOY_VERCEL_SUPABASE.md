# Vercel + Supabase (Free) + Backend

Эта схема сейчас самая практичная:
- Frontend: Vercel
- Backend API (`server.js`): Render/Railway/VPS
- DB: Supabase Free

## 1) Supabase (бесплатно)

1. Создай проект в Supabase (Free plan).
2. Открой `SQL Editor`.
3. Выполни SQL из файла:
   - `supabase/schema.sql`
4. В `Storage` создай bucket:
   - name: `book-photos`
   - public: `true`

## 2) Backend (Render/Railway/VPS)

Разверни репозиторий как Node app и укажи env:

```env
HOST=0.0.0.0
PORT=3000
PUBLIC_BASE_URL=https://YOUR-BACKEND-DOMAIN

OPENROUTER_API_KEY=YOUR_OPENROUTER_KEY
OPENROUTER_MODEL=deepseek/deepseek-v3.2
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

SEND_TO_TELEGRAM=false
TELEGRAM_BOT_TOKEN=
TELEGRAM_MANAGER_CHAT_ID=

SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET=book-photos

# Можно список через запятую:
CORS_ALLOW_ORIGIN=https://fabrica-books.vercel.app,https://YOUR-PROD-DOMAIN
```

Проверка:
- `https://YOUR-BACKEND-DOMAIN/api/health`

Если всё ок, в health должно быть:
- `supabaseConfigured: true`
- `dataStore: "supabase+local-json"`

## 3) Frontend (Vercel)

Vercel можно оставить только для статического фронта.

Важно: `OPENROUTER_API_KEY` должен быть на backend, не на frontend.

После деплоя открой сайт:
1. Перейди в `Личный кабинет`.
2. В поле `API сервера` вставь `https://YOUR-BACKEND-DOMAIN`.
3. Нажми `Применить`, затем `Проверить`.

То же самое в `admin.html` (поле API URL в шапке).

## 4) Мини-чеклист готовности

1. Создаёшь заказ на фронте.
2. На финальном экране нет ошибки сервера.
3. В админке появляется заказ.
4. Работает `Переочередить заказ`.
5. Если OpenRouter ключ задан: генерируется не mock, а live-текст.

## 5) Пока без полноценной БД-миграции

Сервер всё равно пишет локальный fallback:
- `data/db.json`
- `storage/photos/...`
- `storage/books/...`

Даже если Supabase временно недоступен, базовая работа не останавливается.
