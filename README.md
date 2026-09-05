# Emberwild — A Living World

[Play the public demo](https://emberwild-living-world.snowy-apple-0180.chatgpt.site)

A playable woodland simulation with six autonomous inhabitants.

- Three.js renders the terrain, forest, settlement, animated characters, water, weather, and day/night cycle.
- A goal-based simulation chooses work, food, rest, and social activities. A* pathfinding avoids buildings and water.
- Nearby conversations create memories and relationships. Shared work finishes a visible garden bench.
- Orbit, follow, and first-person walking support mouse, keyboard, and touch.
- State is saved locally on the current device. The simulation stops advancing in hidden tabs.

Dialogue uses contextual rules; no external language model is connected. There are no API keys or external model charges. All environment geometry is generated at runtime, and the application ships its dependencies.

The application is in components/world; simulation.ts is independent of rendering. Run npm run build for the production build.

Validation: 20 simulated minutes, movement and needs invariants, shared construction, weather response, commands, all place-to-place paths, local save/restore, application type check, production build.

## Run locally

Requires Node.js 22.13 or later, npm, and Bash (WSL on Windows).

```bash
npm ci
npm run dev
```

Open the local address printed by the development server. Run `npm run build` for a production build.

## Creation and limitations

Created from one initial prompt and a reference screenshot. The user supplied the creative direction; ChatGPT generated the implementation, checked simulation logic, and deployed the prototype. Dialogue is contextual and rule-based, without a live language model. Browser visual testing was not performed.

The source manifest omits the original deployment identity so forks do not point at the existing live Site.
