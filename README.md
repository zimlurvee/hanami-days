# Hanami Days Online

An original 3D open-world school-town life sandbox for the browser. It takes gameplay inspiration from school-life sandbox games but uses no third-party assets, code or characters: every model is generated in code.

**Status: Phase 1 of 6 (core foundation).** See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full design and roadmap.

## What works now (Phase 1)

- Large town (400 m x 400 m): Japanese high school (two floors, rooftop, library, cafeteria, labs, teachers' room, gym, playground, gate), residential streets, shops, supermarket, apartments, park, playground, swimming pool, beach, hospital, police station, shrine, bus stops, parking, roads.
- Real collision with Rapier: doors, walls, stairs (auto-step), indoor floors, rooftop access, no invisible walls except the map edge.
- Third-person character: walk, run, jump, smooth acceleration, idle breathing, running lean, jump pose.
- Orbit camera: mouse look, wheel zoom, collision pull-in so walls never block the view.
- Day/night cycle, sun and moon, stars, sunny / cloudy / rainy lighting and fog.
- Main menu, settings (graphics, controls with key rebinding, gameplay), pause menu with time and weather controls, HUD with location name and rotating mini-map.
- Settings persist in `localStorage`.

## Not built yet

| Feature | Phase |
|---|---|
| Character editor, save slots, accounts (Supabase) | 2 |
| NPCs, dialogue, interactions, props | 3 |
| Multiplayer server, rooms, codes, chat, host tools | 4 |
| Vehicles, rain particles, more locations / interiors | 5 |
| Audio, language, post-processing, performance pass | 6 |

The Multiplayer, Character Edit and Profile buttons open a screen that says what they are waiting on rather than pretending to work.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # builds to dist/
npm run typecheck  # strict TypeScript check (not part of the Netlify build)
npm run preview
```

Needs Node 18+ (Node 20 recommended). Copy `.env.example` to `.env` when later phases need it; Phase 1 needs no environment variables.

**Controls (rebindable in Settings):** WASD move, Shift run, Space jump, mouse look (click the game to capture the mouse), wheel zoom, Esc pause.

## Deploy the frontend to Netlify

1. Push this folder to a Git repository.
2. In Netlify choose **Add new site, Import an existing project** and pick the repo.
3. Netlify reads `netlify.toml`: build command `npm run build`, publish directory `dist`, SPA redirect to `index.html`.
4. Under **Site configuration, Environment variables** add the `VITE_*` values from `.env.example` once Phases 2 and 4 need them. Only public values go here. Never put a Supabase service-role key in a `VITE_` variable.

Netlify hosts only the static frontend. The multiplayer server (Phase 4) runs on a separate host that supports long-lived WebSocket processes (Fly.io, Railway, Render or a VPS). Its URL goes in `VITE_COLYSEUS_URL` as a `wss://` address.

## Project layout

```
src/
  components/   Menus, HUD (React UI)
  game/         world, characters, camera, input, runtime state (3D)
  stores/       Zustand stores: app screen, settings, world clock
  styles/
docs/ARCHITECTURE.md
netlify.toml  .env.example
```

World layout is plain data generation in `src/game/world/*.ts` (no React), rendered with instanced meshes in 50 m chunks, with colliders created directly on the Rapier world. Add a building by writing a builder function and calling it from `world/index.ts`.
