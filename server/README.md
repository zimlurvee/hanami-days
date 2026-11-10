# Hanami Days multiplayer server

A small Node.js WebSocket server. Players need no account: they type a username and join a room.

## Deploy on Render (free, no coding)

1. Go to render.com and sign up with GitHub.
2. **New +** → **Blueprint** → pick the `hanami-days` repo. Render reads `render.yaml` and creates the service.
3. When it finishes, copy the address, e.g. `https://hanami-days-server.onrender.com`.
4. In Netlify: **Site configuration → Environment variables → Add** `VITE_SERVER_URL` = `wss://hanami-days-server.onrender.com` (same address, `wss://` instead of `https://`). Then **Deploys → Trigger deploy**.

The free plan sleeps after ~15 minutes without players. The first join afterwards takes up to a minute to wake it.

To lock the server to your site only, set `ALLOWED_ORIGINS=https://hanamidays.netlify.app` on Render.

## Run locally

```
cd server && npm install && npm start     # ws://localhost:8080
npm test                                   # end-to-end test
```

Checks: `GET /health`, `GET /rooms`.
