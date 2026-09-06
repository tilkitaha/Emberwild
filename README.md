# Emberwild — A Living World

[Play the public demo](https://emberwild-living-world.snowy-apple-0180.chatgpt.site)

A woodland settlement game with six autonomous inhabitants. Explore as a traveler, meet your neighbors, gather supplies, and help Mosswood Hollow grow.

This branch adds the settlement adventure. The public demo remains on the earlier release until the update is published.

## The settlement adventure

- Six chapters take you from meeting your neighbors to hosting a settlement feast.
- Gather timber, stone, berries, and herbs from ten replenishing spots. Cooking converts berries and herbs into meals.
- Build trail lanterns, a community garden, and a woodland lookout. Completed buildings appear in the forest and become part of the villagers’ memories. The garden increases berry and herb harvests.
- Gain experience, progress through four traveler levels, and manage your energy by resting or sharing meals.
- A field guide tracks objectives, inventory, building costs, camp recipes, and gathering locations. Its recommended action walks you to the next useful task, including collecting missing materials.
- The original world continues around you: villagers work, eat, rest, talk, make friends, and remember shared events. Rain, gatherings, and sunset change their routines.

## Controls

| Control | Action |
| --- | --- |
| Select a resource or field-guide task | Walk to it and interact |
| Drag / scroll or pinch | Orbit the camera / zoom |
| Walk + WASD or arrow keys | Move your traveler in first person |
| Drag in Walk mode | Look around |
| Shift while walking | Move faster |
| E | Interact with a nearby resource or inhabitant; rest near the fire |
| B | Open the field guide |
| J | Open the world journal |
| Space | Pause or resume |
| Escape | Leave Walk mode / close a panel |

Touch controls include walking arrows, an Interact button, and tappable gathering spots. Select a villager to talk, follow their routine, or inspect their memories.

## Run locally

Requires Node.js 22.13 or later, npm, and Bash (WSL on Windows).

```bash
npm ci
npm run dev
```

Open the local address printed by the development server.

```bash
npm run test:game  # simulation, progression, and save migration tests
npm run build     # production build
npm test          # production build and all repository tests
```

## Progress and architecture

Progress saves to this browser on this device every 10 seconds and when the tab is hidden. The simulation stops advancing in hidden tabs. Older Emberwild saves migrate automatically, preserving the villagers, memories, relationships, time, and shared stores. The earlier save is retained. Unfinished traveler tasks are cancelled on reload without spending supplies.

- `components/world/simulation.ts`: villagers, needs, contextual dialogue, navigation, world events, and persistence.
- `components/world/adventure.ts`: traveler movement, inventory, gathering, crafting, construction, and chapter progression.
- `components/world/scene.ts`: procedural Three.js forest, characters, resources, buildings, weather, and cameras.
- `components/world/adventure-hud.tsx`: field guide, trail map, backpack, objectives, and task controls.
- `components/world/world-app.tsx`: the world interface, villager panels, journal, and lifecycle.

## Creation and limitations

The initial prototype was created from one prompt and a reference screenshot. This release adds a further development pass with a playable settlement progression system.

Dialogue uses contextual rules and goal-based behavior. No live language model is connected, no API key is required, and there are no external model charges. All environment geometry is generated at runtime. The game is single-player, requires WebGL 2, and stores progress locally; opening the public link on another device starts a separate world.

Automated checks cover chapter completion using the recommended actions, resource depletion, energy recovery, construction and recipe costs, duplicate rewards, navigation, weather restrictions, and save migration. Browser visual testing has not been performed.

The GitHub copy of the hosting manifest omits the original deployment identity so forks do not point at the existing live Site.
