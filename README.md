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
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — public half of the push keypair; the private half lives on the ordering site.

## On the counter terminal (Sunmi D3 / any Android)
The admin installs as an app from Chrome; there is nothing to download.
1. Open the admin site in **Chrome**, sign in, tap ⋮ → **Install app** (or *Add to home screen*).
2. Open it from the new icon, tap **Test alarm** once and allow notifications. Turn the terminal's media volume up.
3. Leave the order board on screen. It keeps the screen awake while it is open and rings every 8 s until each new order is accepted.

### Alerts while the board is not in front
Settings → *Alerts on this device* registers the installed app with Android's push service, so an order rings even behind the till app or with the screen off. It needs `sql/09-device-alerts.sql`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` here, and the matching pair on the ordering site, which is what actually sends the push.

Android may still put Chrome to sleep to save battery; allow background activity for Chrome on the terminal. The LINE staff alert on Settings (`sql/03-staff-alerts.sql`) stays the route for a phone away from the shop.
