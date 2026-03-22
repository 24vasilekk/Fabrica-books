# Deploy On VPS

## 1. Что должно быть на сервере

- Ubuntu 22.04+ или аналогичный Linux
- `node` 20+
- `npm`
- `pm2`
- `nginx`
- домен, который будет открывать Telegram WebApp

## 2. Клонирование и запуск

```bash
git clone <repo-url> fabrika-books
cd fabrika-books
cp .env.example .env
```

Заполни `.env`:

```env
HOST=127.0.0.1
PORT=3000
PUBLIC_BASE_URL=https://books.your-domain.com
CORS_ALLOW_ORIGIN=https://fabrica-books.vercel.app

OPENROUTER_API_KEY=...
OPENROUTER_MODEL=deepseek/deepseek-v3.2
OPENROUTER_MODEL_OUTLINE=deepseek/deepseek-v3.2
OPENROUTER_MODEL_WRITER=deepseek/deepseek-v3.2
OPENROUTER_MODEL_EDITOR=deepseek/deepseek-v3.2
OPENROUTER_OUTLINE_MAX_TOKENS=2500
OPENROUTER_CHAPTER_MAX_TOKENS=5000
OPENROUTER_EXPAND_MAX_TOKENS=6500
OPENROUTER_EDIT_MAX_TOKENS=12000

SEND_TO_TELEGRAM=false
TELEGRAM_BOT_TOKEN=
TELEGRAM_MANAGER_CHAT_ID=
```

Запуск:

```bash
npm install
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 3. Nginx

Пример конфига:

```nginx
server {
    listen 80;
    server_name books.your-domain.com;

    client_max_body_size 25m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Дальше включи HTTPS через `certbot`.

## 4. Telegram WebApp

В `@BotFather`:

1. `/mybots`
2. выбрать бота
3. `Bot Settings`
4. `Menu Button`
5. указать URL вида:

```text
https://books.your-domain.com
```

Если хочешь открывать сразу из inline-кнопки, в логике бота используй WebApp-кнопку с тем же URL.

## 5. Что проверить после деплоя

```text
https://books.your-domain.com/api/health
https://books.your-domain.com/admin.html
```

Проверь:

- открывается сайт
- создается заказ
- книга сохраняется
- в админке видны главы
- работает перегенерация отдельной главы

## 6. Что важно

- `storage/` и `data/` сейчас локальные, значит их нужно бэкапить
- без Supabase это рабочий VPS-MVP, но не идеальный production
- перед публичным запуском стоит закрыть `admin.html` базовой авторизацией через Nginx или отдельным логином
