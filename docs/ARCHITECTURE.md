# Hanami Days Online: Architecture and Roadmap

Original title: **Hanami Days Online**. A 3D multiplayer life simulation set in a Japanese-inspired school town. It takes gameplay inspiration from Sakura School Simulator but uses no proprietary assets, code or characters.

## 1. Responsibilities

| Layer | Tech | Owns |
|---|---|---|
| Frontend | React + Vite + TypeScript | App shell, menus, HUD, all rendering |
| 3D | Three.js via React Three Fiber, drei | World, characters, camera, lighting |
| Physics | Rapier (`@react-three/rapier`) | Player collision, ground detection, stairs, vehicles (Phase 5) |
| Client state | Zustand | App screen, settings, world settings, HUD state |
| Accounts | None. Players enter a username only | Settings and character saved in the browser |
| Realtime | Node + `ws` server (`server/`) on an external host | Rooms, player state, props, chat, host permissions, NPC sim |
| Hosting | Netlify (frontend only) | Static build and SPA redirects |

Netlify never hosts the multiplayer server. Functions are stateless and short-lived, so they cannot hold WebSocket sessions. The Colyseus server runs on a host with long-lived processes (Fly.io, Railway, Render or a VPS). The frontend reads its URL from `VITE_COLYSEUS_URL`.

## 2. Data flow

```
Browser (React + R3F)
  |-- WSS ----> Node ws server (room state, chat, props, NPC sim)
Netlify serves the static bundle only.
```

- The client sends **inputs and intents** (move input, "place prop", "kick player"). It never writes shared state directly.
- The server validates each intent (permissions, rate limits, bounds), updates schema state and broadcasts patches.
- Remote players are interpolated on the client between server snapshots.

## 3. Database (Supabase, arrives in Phase 2 and 4)

- `profiles`: id (= auth.users.id), username (unique), avatar_url, created_at
- `character_slots`: id, user_id, slot_index, name, appearance (jsonb)
- `user_settings`: user_id, settings (jsonb)
- `rooms_history`: user_id, room_code, room_name, last_joined_at
- `favourite_rooms`: user_id, room_code
- `saved_rooms`: id, owner_id, name, config (jsonb), props (jsonb)

Row Level Security is enabled on every table with `auth.uid() = user_id` policies. The service-role key is only ever used on the multiplayer server, never in the browser.

## 4. Network design

- Server tick: 20 Hz patch rate. Clients send movement at 15 Hz.
- Player state: position, yaw, animation id, emote id, vehicle id, appearance.
- Props: server-owned list with owner id. Move, rotate, scale and delete are validated against owner or host permission.
- NPCs: simulated on the server from a shared schedule keyed to the world clock. Clients receive only the schedule slot and a coarse position at low frequency, then animate locally. Distance-based updates keep traffic small.
- Chat: room-scoped broadcast, length-limited and rate-limited.
- Reconnect: Colyseus reconnection tokens with a 30 second window.
- Cleanup: empty rooms dispose after a short delay.

## 5. Phase 1 scope (this delivery)

Done: project scaffold, Netlify config, stores, input system, procedural town (school, residential, commercial, public areas, roads, beach, trees), Rapier collision with stairs and rooftop access, third-person character with procedural animation (idle, walk, run, jump), orbit camera with zoom and collision pull-in, day and night lighting, main menu, settings menu (persisted), pause menu, HUD with minimap.

Not yet built (later phases): character editor, props, NPCs, accounts, multiplayer server, vehicles, weather particles.

## 6. Roadmap

1. **Phase 1** Foundation (this delivery).
2. **Phase 2** Appearance model, character editor, slots, Supabase auth and saving.
3. **Phase 3** NPC schedules, dialogue and friendship, interaction system, props and placement.
4. **Phase 4** Colyseus server, rooms and codes, sync, chat, host controls, shared props.
5. **Phase 5** Vehicles, weather, more NPC behaviour, interiors.
6. **Phase 6** Performance pass, RLS review, deployment and production testing.

## 7. Known limitations and mitigations

- **No bundled 3D assets.** Everything is procedural geometry. Mitigation: the character and prop modules read from a data model so glTF models can replace them later.
- **Browser performance.** Instancing for trees and repeated meshes, shadow quality tiers, DPR scaling, distance-based NPC updates.
- **Cheating.** Server validates every intent. Movement validation is speed-bounded in Phase 4.
- **Free hosting limits.** Colyseus on a free tier may sleep. Document a paid always-on option.
