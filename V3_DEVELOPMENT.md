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

The highest-scoring plan becomes the agent’s next intention.

## Stage 4 — Improve memory and conversation

V3 conversation logic can retrieve memories that overlap with the player’s question instead of always returning the newest memory.

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

## Stage 9 — Keep V2 progression intact

V3 intentionally reuses the existing `Adventure` engine, so the six chapters, gathering, cooking, XP, inventory and construction systems remain compatible.

## Stage 10 — Add automated verification

The `v3` branch contains `.github/workflows/v3-ci.yml`.

It verifies:

- dependency installation,
- production Next.js build,
- existing gameplay tests.

## V3.0 vs later V3 iterations

Implemented in the current V3 branch:

- smarter local cognition,
- contextual memory retrieval,
- player facts,
- microphone transcription,
- spoken NPC responses,
- room UI,
- player presence/state synchronization,
- room chat,
- local two-tab multiplayer testing,
- WebSocket/Durable Object server implementation.

Next V3 multiplayer iteration:

- render remote travelers as real 3D characters,
- synchronize animations,
- co-op gathering and construction authority,
- shared world state instead of only player state,
- reconnect/session recovery,
- server-authoritative anti-cheat validation.

Next V3 AI iteration:

- optional live LLM provider behind a server endpoint,
- semantic/vector memory retrieval,
- longer-term plans,
- agent-to-agent negotiation,
- dynamic quests created from world events,
- per-agent voice/personality profiles.
