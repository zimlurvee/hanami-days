# Hanami Days Online

An original 3D open-world school-town life sandbox for the browser. It takes gameplay inspiration from school-life sandbox games but uses no code or characters from other games. Most models are generated in code; the third-party assets are listed under Credits below.

**Status: Phase 1 of 6 (core foundation).** See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full design and roadmap.

## What works now (Phase 1)

- Large town (400 m x 400 m): Japanese high school (two floors, rooftop, library, cafeteria, labs, teachers' room, gym, playground, gate), residential streets, shops, supermarket, apartments, park, playground, swimming pool, beach, hospital, police station, shrine, bus stops, parking, roads.
- The residential streets use Kenney's CC0 City Kit Suburban houses (kenney.nl). Two extra districts use the same kits: Sunny Hills Suburb (south-east) and an Industrial District (north-west, off a service road from the main road). Kenney buildings are solid but not enterable; the school, shops, apartments, hospital and other public buildings are enterable.
- Real collision with Rapier: doors, walls, stairs (auto-step), indoor floors, rooftop access, no invisible walls except the map edge.
- Third-person character with three selectable models (built-in Student, Anime School Girl, Random OC) chosen in Character Edit or the pause menu. Walk, run, jump and idle animation are driven procedurally on each model's skeleton, so any rigged humanoid can be added in `src/game/characters/models.ts`.
- Orbit camera: mouse look, wheel zoom, collision pull-in so walls never block the view.
- Day/night cycle, sun and moon, stars, sunny / cloudy / rainy lighting and fog.
- Main menu, settings (graphics, controls with key rebinding, gameplay), pause menu with time and weather controls, HUD with location name and rotating mini-map.
- Settings persist in `localStorage`.

## Not built yet

| Feature | Phase |
|---|---|
| Character editor, save slots (stored on the device, no accounts) | 2 |
| NPCs, dialogue, interactions, props | 3 |
| Multiplayer server, rooms, codes, chat, host tools | 4 |
| Vehicles, rain particles, more locations / interiors | 5 |
| Audio, language, post-processing, performance pass | 6 |


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

## Credits (third-party assets in `public/models/`)

- City Kit Suburban and City Kit Industrial by Kenney (kenney.nl), CC0.
- "Anime school girl (Rigged)" by darknessvoid403, CC-BY-4.0: https://sketchfab.com/3d-models/anime-school-girl-rigged-fafb9852faa14d48852e860868aa8cd9
- "Random oc" by Delenapro, CC-BY-4.0: https://sketchfab.com/3d-models/random-oc-caf2b80feea24f2096ca52cfcda97939

The CC-BY credits are also shown in the in-game Credits screen, as the licence requires. Everything else is generated in code.

World layout is plain data generation in `src/game/world/*.ts` (no React), rendered with instanced meshes in 50 m chunks, with colliders created directly on the Rapier world. Add a building by writing a builder function and calling it from `world/index.ts`.


## Multiplayer (no accounts)

Players just type a username, then Quick Join, Create Room, Join by Code, or open a public room. Rooms are temporary. The server lives in `server/` and must be deployed separately from Netlify: see `server/README.md` (free Cloudflare Workers, no card). Then set `VITE_SERVER_URL` in Netlify.

## Controls and menus

- First launch asks PC or Mobile. Mobile shows touch controls laid out like the original game. Change it in Settings.
- **Character Option** (main menu) picks your character before playing.
- In game, **Menu** has Area Move (teleport), Character Change, Weather and Status. **Chara Edit** is the in-game side panel (Camera/Effect, Chara Edit, Pose mode, Item, Hide), like the original's mechanic.
- Props (place chairs, tables, benches, boxes, balls, plants, cake, parasol; synced in rooms) and Pose mode (wave, cheer, sit, bow) are built. Items (cap, glasses, backpack, ribbon, headphones; synced), Language (English, Bahasa Melayu, 日本語), Missions with money, a grass texture and fuller sakura trees with falling petals are built too. Not built yet: combat, a shop to spend money, saving to the cloud. To use your own grass image, put it at `public/textures/grass.jpg` (only if you have the right to use it).
