# Local Run Without Supabase

## Minimum required
Create `.env` near `server.js` with:

```env
PORT=3000
HOST=127.0.0.1

OPENROUTER_API_KEY=YOUR_OPENROUTER_KEY
OPENROUTER_MODEL=deepseek/deepseek-v3.2
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
SEND_TO_TELEGRAM=false

TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
TELEGRAM_MANAGER_CHAT_ID=YOUR_TELEGRAM_CHAT_ID

PUBLIC_BASE_URL=http://localhost:3000
```

## Start
```bash
node server.js
```

## Open
- Site: `http://localhost:3000`
- Admin: `http://localhost:3000/admin.html`
- Health: `http://localhost:3000/api/health`

## What happens after sending the order
1. Order is saved locally in `data/db.json`
2. Photos are saved locally in `storage/photos/<orderId>/`
3. Generated book is saved locally in `storage/books/<orderId>.txt`
4. Server puts the order into queue
5. OpenRouter generates the book
6. Telegram sending is disabled by default, so the generated book appears in admin and in local files only

## Important note
Without Supabase, storage is fully local.
This is fine for local testing and MVP, but not for production.
