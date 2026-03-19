# Automation Setup

## What is ready now
- Frontend sends completed orders to `POST /api/orders`
- Backend validates the payload and puts the order into a generation queue
- Backend stores orders locally in `data/db.json`
- Backend stores photos locally in `storage/photos/<orderId>/`
- Backend can additionally sync orders to Supabase Postgres
- Backend can additionally upload photos to Supabase Storage
- Backend can generate a mock book without AI API keys
- Backend can generate a real book through OpenRouter when keys are present
- Backend can send the generated result to Telegram manager chat when bot credentials are present
- Frontend polls order status after submission
- Manager admin page is available at `/admin.html`
- Retry generation endpoint is available

## API endpoints
- `GET /api/health`
- `GET /api/orders`
- `GET /api/orders/:id`
- `POST /api/orders`
- `POST /api/orders/:id/retry`

## Local fallback architecture
- Database: `data/db.json`
- Orders mirror: `data/orders.json`
- Photos: `storage/photos/<orderId>/`

## Production-ready option
Configure:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`

Apply SQL from:
- `supabase/schema.sql`

Then the server will additionally:
- upsert orders to Supabase table `orders`
- append status changes to `order_status_history`
- upload photos to Supabase Storage

## OpenRouter config
Fill in:
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
- `OPENROUTER_BASE_URL`

Current recommended model:
- `deepseek/deepseek-v3.2`

## Start locally
1. Copy `.env.example` to `.env`
2. Fill in keys
3. Run `node server.js`
4. Open `http://localhost:3000`
5. Manager page: `http://localhost:3000/admin.html`

## What still depends on your credentials
- OpenRouter generation requires `OPENROUTER_API_KEY`
- Telegram delivery requires `TELEGRAM_BOT_TOKEN` and `TELEGRAM_MANAGER_CHAT_ID`
- Supabase sync requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
