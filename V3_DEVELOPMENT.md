# Emberwild V3 — Development Log

## Stage 1 — Protect V2 and create a V3 branch

V3 is developed on its own `v3` branch so the working V2 game remains stable.

## Stage 2 — Add a cognition layer instead of replacing the old simulation

The V2 simulation still controls the living settlement. V3 adds `SimulationV3`, which extends the original simulation and introduces periodic higher-level planning.

This preserves existing weather, needs, movement, relationships, saves, quests and scripted world events while making decisions more deliberate.

## Stage 3 — Build the agent planner

`agent-brain.ts` scores possible actions using:

1. safety and weather,
2. gatherings,
3. energy,
4. hunger,
5. social need,
6. relationship maintenance,
7. role responsibilities,
8. settlement shortages,
9. recent activity and novelty.

The highest-scoring plan becomes the agent’s next intention, and agents can remember why important decisions were made.

## Stage 4 — Improve memory and conversation

V3 conversation logic retrieves memories that overlap with the player’s question instead of always returning the newest memory.

The response generator also uses mood, current goal, relationships, resources and weather.

The game recognizes explicit player facts such as names, preferences, goals and `remember this` statements. Those facts become memories for the settlement and are saved locally.

## Stage 5 — Add microphone conversations

`use-voice-chat.ts` wraps browser speech APIs.

Flow:

1. select an inhabitant,
2. open Talk,
3. press the microphone,
4. speak,
5. speech recognition transcribes the sentence,
6. the V3 agent answers,
7. speech synthesis reads the reply aloud.

Typing remains available as a fallback.

## Stage 6 — Add multiplayer client state

`multiplayer.ts` adds a room client that synchronizes:

- player id,
- traveler name,
- x/z position,
- heading,
- level,
- current activity,
- presence heartbeat,
- room chat.

If an internet WebSocket endpoint is configured, the client uses it. Otherwise it uses `BroadcastChannel`, which is useful for instant two-tab testing in one browser.

## Stage 7 — Add the multiplayer room UI

The V3 UI includes:

- traveler name,
- room code,
- generated room code,
- join/leave controls,
- connection status,
- online player list,
- room messages.

The multiplayer panel can be opened from the top toolbar or with `M`.

## Stage 8 — Add a room server

`worker/room-hub.ts` implements a WebSocket room hub and `worker/index.ts` routes `/multiplayer` connections into a room identified by the room code.

For real internet rooms, production hosting must configure a `ROOM_HUB` Durable Object binding and expose the resulting WebSocket URL through `NEXT_PUBLIC_EMBERWILD_WS_URL`.

## Stage 9 — Render remote travelers in the 3D world

`scene-v3.ts` extends the existing Three.js scene with synchronized multiplayer travelers.

Each remote player now has:

- a visible 3D traveler body,
- an identifying color,
- a backpack,
- a world-space selection ring,
- a floating name + level label,
- synchronized x/z position,
- synchronized heading,
- interpolation between network updates,
- automatic removal when the player leaves or times out.

The multiplayer panel forwards room presence directly to the V3 scene, so the second player is not merely a name in a list — they appear inside Mosswood Hollow.

## Stage 10 — Keep V2 progression intact

V3 intentionally reuses the existing `Adventure` engine, so the six chapters, gathering, cooking, XP, inventory and construction systems remain compatible.

## Stage 11 — Add automated verification

The `v3` branch contains `.github/workflows/v3-ci.yml`.

It runs the repository’s verified production build and full Emberwild test suite. The workflow was aligned with the existing `npm test` pipeline because the legacy UI/render tests depend on the verified `dist` build rather than a standalone Next.js output directory.

## Implemented in the current V3 branch

- smarter local cognition,
- weighted autonomous planning,
- contextual memory retrieval,
- player facts remembered across sessions,
- relationship-aware dialogue,
- microphone transcription,
- spoken NPC responses,
- room UI,
- player presence/state synchronization,
- room chat,
- local two-tab multiplayer testing,
- visible synchronized remote 3D travelers,
- WebSocket/Durable Object room server implementation,
- V2 progression/save compatibility.

## Next V3 multiplayer iteration

- synchronize walking animations and richer avatar appearance,
- co-op gathering and construction authority,
- shared server-authoritative inventory/world state,
- reconnect/session recovery,
- persistent public/private rooms,
- server-side validation and anti-cheat rules.

## Next V3 AI iteration

- optional live LLM provider behind a server endpoint,
- semantic/vector memory retrieval,
- longer-term plans,
- agent-to-agent negotiation,
- dynamic quests created from world events,
- per-agent voice/personality profiles.

The current V3 agent system intentionally remains local and API-key-free. It is more stateful and autonomous than V2, but it is not yet an LLM-powered NPC architecture.
