# Emberwild V2 — A Living Woodland Settlement

[Play Emberwild V2](https://raw.githack.com/tilkitaha/Emberwild/gh-pages/index.html)

Emberwild V2 turns the original living-world prototype into a playable settlement adventure. You enter Mosswood Hollow as a traveler, meet six autonomous inhabitants, gather resources, cook meals, build settlement upgrades, complete six chapters, and leave behind events that become part of the world's memory.

> V1 proved the living-world concept. V2 adds a real gameplay loop, player progression, construction, objectives, persistence, and a more complete public build.

## What changed in V2

- Six-chapter progression from first arrival to a final settlement feast.
- A controllable traveler with movement, energy, experience, and four progression levels.
- Ten replenishing gathering locations for timber, stone, berries, and herbs.
- Backpack/inventory tracking and resource costs.
- Cooking system that converts gathered ingredients into meals.
- Three visible settlement projects: trail lanterns, a community garden, and a woodland lookout.
- A field guide with objectives, recipes, building requirements, gathering locations, and recommended next actions.
- Player interactions with inhabitants, resources, the campfire, and the world.
- Save migration so worlds created in the earlier prototype can continue in V2.
- Mobile/touch controls alongside keyboard and mouse controls.
- Automated progression and compatibility tests.
- Static production build published from the `gh-pages` branch.

## Development story

The full V1 → V2 build history is documented in **[V2_DEVELOPMENT.md](./V2_DEVELOPMENT.md)**.

The version-by-version changes are tracked in **[CHANGELOG.md](./CHANGELOG.md)**.

## Core gameplay loop

1. Explore Mosswood Hollow.
2. Meet and talk with the inhabitants.
3. Gather timber, stone, berries, and herbs.
4. Manage your traveler's energy and backpack.
5. Cook meals and share resources.
6. Complete chapter objectives.
7. Build improvements that physically appear in the world.
8. Watch inhabitants continue their own routines, friendships, conversations, and memories.
9. Return later and continue from your saved world.

## The settlement adventure

The six chapters gradually introduce the systems instead of exposing everything at once. The journey begins with meeting the settlement, then moves through gathering, cooking, helping the community, construction, and finally a shared settlement feast.

The three construction projects are:

- **Trail Lanterns** — improve the visual identity of the settlement paths.
- **Community Garden** — becomes a persistent world upgrade and improves berry/herb gathering.
- **Woodland Lookout** — a larger late-game construction objective.

Completed projects appear in the Three.js world and can also become part of the inhabitants' remembered events.

## Living-world simulation

The original simulation remains active underneath the V2 progression system. The six inhabitants continue to:

- work and move around the settlement,
- eat and rest according to their needs,
- talk to one another,
- form and maintain relationships,
- remember shared events,
- react to rain, evening, gatherings, and other world events.

Dialogue is currently contextual and rule/goal based. **No live LLM is connected and no API key is required.**

## Controls

| Control | Action |
| --- | --- |
| Select a resource or field-guide task | Walk to it and interact |
| Drag / scroll or pinch | Orbit the camera / zoom |
| WASD / Arrow keys | Move in Walk mode |
| Drag in Walk mode | Look around |
| Shift | Move faster |
| E | Interact / gather / rest near the fire |
| B | Open the field guide |
| J | Open the world journal |
| Space | Pause / resume the world |
| Escape | Leave Walk mode / close a panel |

Touch controls include movement arrows, an Interact button, tappable gathering spots, and touch camera controls.

## Save system

Progress is saved locally in the browser every 10 seconds and when the tab is hidden.

V2 includes migration support for earlier Emberwild saves. Existing villagers, memories, relationships, simulation time, and shared resources are retained where possible. The older save is preserved during migration, and incomplete traveler tasks are cancelled safely on reload without consuming supplies.

## Testing

The V2 development pass added automated checks for:

- completing the full six-chapter journey,
- gathering and resource depletion,
- construction costs,
- cooking and recipe costs,
- player energy recovery,
- recommended-action navigation,
- duplicate reward protection,
- weather restrictions,
- save migration and compatibility.

The production/static build also passes TypeScript compilation after separating Cloudflare-only development files from the public static build.

## Architecture

- `components/world/simulation.ts` — inhabitants, needs, dialogue, relationships, world events, persistence.
- `components/world/adventure.ts` — traveler, inventory, gathering, recipes, construction, chapter progression.
- `components/world/scene.ts` — procedural Three.js forest, characters, weather, resources, buildings, cameras.
- `components/world/adventure-hud.tsx` — field guide, backpack, objectives, recipes, construction UI.
- `components/world/world-app.tsx` — main interface, lifecycle, panels, journal, interactions.
- `tests/adventure.test.mjs` — progression and gameplay-system tests.

## Run locally

Requires Node.js 22.13+ and npm.

```bash
npm ci
npm run dev
```

Useful checks:

```bash
npm run test:game
npm run build
npm test
```

## Branches

- `main` — current Emberwild V2 source.
- `v2` — stable V2 snapshot/branch.
- `gh-pages` — generated static public build.

## Current limitations

- Single-player only.
- Progress is local to each browser/device.
- WebGL 2 is required.
- Inhabitant dialogue is simulated locally rather than generated by a live language model.
- No online accounts or cloud save yet.
- No multiplayer or shared persistent server world yet.

## Next direction

Possible future development includes real LLM-powered inhabitants, long-term semantic memory, deeper relationship systems, procedural quests, cloud saves, economy/trading, more settlement construction, and a larger explorable map.

---

**Emberwild V2** is the second major development stage of the original one-prompt living-world prototype: from an autonomous forest simulation into a small but complete playable settlement game.