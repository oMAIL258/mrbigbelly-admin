# Mr. Big Belly — Store admin

The order board the shop uses to confirm orders, set the prep time, mark ready / done, and reject with a reason. One master login (email + password).

## Stack
- Next.js 15 (App Router) · TypeScript · Tailwind
- Supabase Auth (email/password) + Supabase realtime for the order board
- LINE Messaging API push for order-status updates to the customer

## Local setup
```bash
cp .env.example .env.local
npm install
npm run dev
```
Then sign in at <http://localhost:3000/login>.

The admin user is created once in the Supabase Auth dashboard — invite `mr.bigbelly.juiceandmore@gmail.com` and set the password. Change it from Supabase Auth before launch.

## Deploy (Netlify)
Env vars in Site settings → Environment:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `LINE_CHANNEL_ACCESS_TOKEN`
