# Emberwild V3 — A Shared Living World

[Play the current V3 preview](https://raw.githack.com/tilkitaha/Emberwild/v3-preview/index.html)

Emberwild V3 evolves the V2 settlement adventure into a social, voice-enabled world with smarter autonomous inhabitants.

> V1 proved the living-world concept. V2 added a real game loop. V3 adds cross-device multiplayer, microphone conversations, spoken NPC replies, stronger memory retrieval, player facts, relationship-aware dialogue, visible remote travelers, and a weighted autonomous decision planner.

## V3 headline features

### Internet multiplayer rooms — live in the preview

Two people on different phones/computers can now open the V3 preview, enter the **same room code**, and join the same Emberwild multiplayer channel.

V3 synchronizes:

- traveler name,
- player position,
- heading,
- level,
- current activity,
- online presence,
- room chat,
- visible remote traveler avatars in the Three.js world.

The public preview uses a zero-account WebSocket relay when no custom server URL is configured. Room traffic is ephemeral: the relay forwards live messages to the other clients in the same channel and does not provide world persistence/history. The room code acts as the channel identifier, so do not use the public preview for sensitive/private information.

For a dedicated production deployment, the repository still includes `worker/room-hub.ts` and the Durable Object configuration example. Set:

```bash
NEXT_PUBLIC_EMBERWILD_WS_URL=wss://your-own-room-server.example/multiplayer
```

and the same client automatically uses the private/self-hosted room server instead of the public relay.

### Smarter autonomous agents

V3 adds a separate cognition layer on top of the V2 simulation. Inhabitants score competing priorities instead of relying only on fixed route rotation.

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

The resulting plan includes a destination, goal, reason and score. Agents can remember why they selected important actions.

### Memory-aware conversations

Dialogue uses relevant memories, mood, current autonomous plan, role/personality traits, strongest relationships, settlement resources, weather, and facts the traveler explicitly tells the inhabitants.

Examples:

- `Remember that I want to become a ranger.`
- `What do you remember about me?`
- `Why did you choose that?`
- `Who is your closest friend?`
- `What are you planning to do next?`

Player facts are saved locally and carried across sessions alongside the V2 world save.

### Microphone conversations

Open an inhabitant and press the microphone button.

1. Browser speech recognition converts your speech to text.
2. The message goes to the selected inhabitant.
3. The V3 cognition layer produces the reply.
4. Browser speech synthesis reads the answer aloud.

Typing still works normally. Microphone access requires browser permission and a secure origin.

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
- `components/world/multiplayer.ts` — internet room client, reconnects, presence, state and room chat.
- `components/world/multiplayer-panel.tsx` — room UI.
- `components/world/scene-v3.ts` — visible remote traveler avatars.
- `worker/room-hub.ts` — optional dedicated WebSocket room hub.
- `wrangler.v3.example.jsonc` — production Durable Object binding/migration example.
- `app/v3.css` — V3 UI additions.

See **[V3_DEVELOPMENT.md](./V3_DEVELOPMENT.md)** for the implementation stages.

## Run locally

Requires Node.js 22.13+.

```bash
npm ci
npm run dev
```

Open two devices, use the same V3 URL and join the same room code to test cross-device multiplayer.

## Verification

The `v3` branch has automated GitHub Actions checks for:

- production build,
- existing Emberwild gameplay tests,
- V3 preview publishing,
- a live internet relay smoke test using two independent WebSocket clients.

## Current V3 status

- Smarter local agents: implemented.
- Player-fact memory: implemented.
- Microphone transcription: implemented.
- Spoken NPC replies: implemented.
- Room/presence/chat client: implemented.
- Cross-device internet rooms: implemented in the public preview.
- Visible 3D remote player avatars: implemented.
- Automatic multiplayer reconnect: implemented.
- Dedicated self-hosted WebSocket/Durable Object server: code/config included, deployment optional.
- Shared authoritative resources/building state: future co-op iteration.
- Live LLM-backed NPCs: not connected yet; current V3 intelligence runs locally and requires no API key.
