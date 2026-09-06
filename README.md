# Emberwild V3 — A Shared Living World

Emberwild V3 evolves the V2 settlement adventure into a social, voice-enabled world with smarter autonomous inhabitants.

> V1 proved the living-world concept. V2 added a real game loop. V3 adds multiplayer infrastructure, microphone conversations, voice replies, stronger memory retrieval, player facts, relationship-aware dialogue, and a weighted autonomous decision planner.

## V3 headline features

### Multiplayer rooms

- Join by traveler name + room code.
- Sync player position, heading, level, activity, presence and room chat.
- WebSocket transport for internet multiplayer through the V3 room server.
- Same-browser `BroadcastChannel` fallback lets two tabs test multiplayer immediately without a server.
- Room traffic is intentionally lightweight so it can later support visible remote avatars and shared co-op actions.

The client reads the production WebSocket endpoint from:

```bash
NEXT_PUBLIC_EMBERWILD_WS_URL=wss://your-host.example/multiplayer
```

The repository includes `worker/room-hub.ts` and the `/multiplayer` routing logic needed for a Cloudflare Durable Object room server. The Durable Object binding must be configured in the production hosting environment before internet rooms are considered live.

### Smarter autonomous agents

V3 adds a separate cognition layer on top of the V2 simulation. Inhabitants now score competing priorities instead of relying only on fixed route rotation.

Inputs include:

- energy,
- hunger,
- social need,
- weather,
- time of day,
- role-specific responsibilities,
- shared food and wood shortages,
- relationship strength,
- recent memories,
- whether a settlement gathering is happening,
- what the agent was already doing.

The resulting plan includes a destination, goal, reason and score. Agents also remember why they selected important actions.

### Memory-aware conversations

Dialogue now uses:

- relevant memory retrieval,
- mood,
- current autonomous plan,
- role and personality traits,
- strongest relationship,
- settlement resources,
- weather,
- facts the traveler explicitly tells the inhabitants.

Examples:

- `Remember that I want to become a ranger.`
- `What do you remember about me?`
- `Why did you choose that?`
- `Who is your closest friend?`
- `What are you planning to do next?`

Player facts are saved locally and carried across sessions alongside the V2 world save.

### Microphone conversations

Open an inhabitant and press the microphone button.

- Browser speech recognition converts speech to text.
- The message is sent directly to the selected inhabitant.
- The V3 cognition layer produces the reply.
- Browser speech synthesis reads the answer aloud.
- Typing still works normally.

Microphone access requires browser permission and a secure origin in production.

## V2 gameplay retained

V3 keeps the settlement adventure underneath the new systems:

- six progression chapters,
- resource gathering,
- backpack/inventory,
- cooking and sharing meals,
- traveler energy + XP + four levels,
- trail lanterns,
- community garden,
- woodland lookout,
- field guide,
- mobile controls,
- autonomous inhabitant routines,
- relationships and memories,
- rain, evening and campfire events,
- save migration from earlier Emberwild worlds.

## Key V3 files

- `components/world/v3-world-app.tsx` — V3 interface and feature integration.
- `components/world/simulation-v3.ts` — cognition layer connected to the V2 simulation.
- `components/world/agent-brain.ts` — weighted planning, memory retrieval and contextual response generation.
- `components/world/use-voice-chat.ts` — microphone speech recognition and spoken NPC replies.
- `components/world/multiplayer.ts` — multiplayer room client, presence, state and room chat.
- `components/world/multiplayer-panel.tsx` — room UI.
- `worker/room-hub.ts` — WebSocket room hub.
- `worker/index.ts` — routes `/multiplayer` to the room hub.
- `app/v3.css` — V3 UI additions.

See **[V3_DEVELOPMENT.md](./V3_DEVELOPMENT.md)** for the implementation stages and current production limitations.

## Run locally

Requires Node.js 22.13+.

```bash
npm ci
npm run dev
```

To test multiplayer without a room server, open the game in two browser tabs and join the same room code.

## Verification

The `v3` branch has its own GitHub Actions workflow:

```text
Emberwild V3 CI
```

It installs dependencies, runs the production Next.js build and executes the existing Emberwild gameplay tests.

## Current V3 status

- Smarter local agents: implemented.
- Player-fact memory: implemented.
- Microphone transcription: implemented.
- Spoken NPC replies: implemented.
- Room/presence/chat client: implemented.
- Local two-tab multiplayer fallback: implemented.
- WebSocket room server code: implemented.
- Production internet multiplayer: requires deployment with `ROOM_HUB` Durable Object binding + `NEXT_PUBLIC_EMBERWILD_WS_URL`.
- Visible 3D remote player avatars: next V3 multiplayer iteration.
- Live LLM-backed NPCs: not connected yet; current V3 intelligence runs locally and requires no API key.
