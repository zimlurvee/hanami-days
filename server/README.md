# Hanami Days multiplayer server

Players need no account: they type a username and join a room. The same room code runs in two places:
Cloudflare Workers (free, no card) and plain Node.js (any VPS, or your own PC).

## Deploy on Cloudflare (free, no credit card)

1. Sign up at dash.cloudflare.com (email only).
2. **Workers & Pages** → **Create** → **Import a repository** (Connect to Git) → choose `hanami-days`.
3. Project name `hanami-days-server`. Leave the root directory as `/`. Build command empty. Deploy command: `npx wrangler deploy`. Save and deploy.
4. When it finishes, open the project to find its address, like `https://hanami-days-server.YOURNAME.workers.dev`.
5. Check it: open `<address>/health`. You should see `{"ok":true,...}`.
6. In Netlify: **Site configuration → Environment variables** → add `VITE_SERVER_URL` = the address with `wss://` instead of `https://`. Then **Deploys → Trigger deploy**.

Free plan limit: 100,000 requests a day. Each player uses roughly 1,800 an hour while moving (idle players cost almost nothing), so a few friends can play for hours. The server does not sleep.

To allow only your site, set `ALLOWED_ORIGINS` in `wrangler.toml` to `https://hanamidays.netlify.app`.

## Run on Node

```
cd server && npm install && npm start     # ws://localhost:8080
npm test                                   # end-to-end test
```
