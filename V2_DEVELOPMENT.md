# Emberwild V2 — Development Log

This document records how Emberwild evolved from the original living-world prototype into the V2 settlement adventure.

## Stage 0 — Original prototype (V1)

The first version focused on proving that a small 3D world could feel alive.

The prototype already had:

- a procedural Three.js woodland,
- six inhabitants with individual needs and routines,
- contextual local dialogue,
- memories and relationship state,
- weather and time-of-day changes,
- campfire gatherings,
- camera orbit/follow/walk modes,
- browser-local persistence.

What it did **not** yet have was a strong player purpose. The user could observe and interact with the inhabitants, but there was no real progression loop, resource economy, construction system, or chapter structure.

That became the goal of V2.

---

## Stage 1 — Define the V2 game loop

The first design decision was to give the player a role inside the settlement instead of remaining only an observer.

The new loop became:

1. Explore.
2. Meet inhabitants.
3. Gather materials.
4. Manage inventory and energy.
5. Cook/share food.
6. Complete objectives.
7. Construct settlement upgrades.
8. Progress through chapters.
9. Save and continue later.

The guiding principle was to keep the autonomous world running underneath the new gameplay systems instead of replacing it.

---

## Stage 2 — Add the traveler/player state

A new traveler system was introduced separately from the inhabitant simulation.

The traveler gained:

- position and movement state,
- energy,
- experience,
- progression level,
- inventory/backpack,
- current objective/chapter,
- active travel/action intent,
- completed construction state.

Separating the traveler from the inhabitant model made it possible to add traditional game mechanics without turning the existing autonomous characters into player-controlled NPCs.

Main implementation: `components/world/adventure.ts`.

---

## Stage 3 — Resource gathering

The forest was expanded with ten replenishing resource spots.

Resource types:

- timber,
- stone,
- berries,
- herbs.

Gathering was connected to:

- world-space locations,
- player navigation,
- interaction distance,
- resource depletion,
- replenishment,
- inventory changes,
- objective progression.

The goal was to make construction and cooking depend on actions performed inside the 3D world rather than menu-only progression.

---

## Stage 4 — Backpack and resource economy

The traveler received a real inventory model.

The backpack became the shared input for:

- recipes,
- building costs,
- objective requirements,
- recommended actions.

This gave the player a reason to decide what to collect and in which order.

The field guide later exposed these values visually so the player could understand what was missing without inspecting code or hidden state.

---

## Stage 5 — Cooking and energy

Berries and herbs were turned into useful ingredients instead of passive collectibles.

The cooking system added:

- camp recipes,
- ingredient costs,
- prepared meals,
- player energy recovery,
- shared-meal progression moments.

Resting near the fire was also connected to energy recovery, giving the campfire a gameplay function in addition to its original social/world-event role.

---

## Stage 6 — Settlement construction

Three persistent construction projects were added:

### Trail Lanterns
An early construction objective that introduces material requirements and visible settlement upgrades.

### Community Garden
A functional upgrade that becomes part of the world and improves berry/herb gathering.

### Woodland Lookout
A larger late-game construction objective requiring more preparation and resources.

Construction was designed to do more than update a checklist. Completed projects are reflected in the rendered world and can be referenced by the simulation's memory/event system.

---

## Stage 7 — Six-chapter progression

The new mechanics were organized into a six-chapter journey so the player learns systems gradually.

The chapter flow moves from arrival and social interaction into gathering, cooking, helping the community, construction, and finally a settlement feast.

Each chapter has explicit completion conditions rather than relying on a linear scripted timer.

This meant the game could be tested automatically by simulating the same actions a player would take.

---

## Stage 8 — Field Guide / mission guidance

Once the number of systems grew, the game needed a clear way to answer a simple player question:

> What should I do next?

The Field Guide was added with:

- current chapter,
- objective status,
- backpack contents,
- recipes,
- building costs,
- gathering locations,
- recommended next action.

The recommended-action system can select a useful destination and move the traveler toward it, including gathering missing resources needed for a later objective.

Main implementation: `components/world/adventure-hud.tsx`.

---

## Stage 9 — Connect gameplay to the 3D world

The new gameplay state was connected back into the existing Three.js scene.

The scene gained support for:

- the traveler,
- gathering locations,
- interactable resources,
- completed construction projects,
- player-focused camera behavior,
- keyboard/touch movement,
- interaction feedback.

Main implementation: `components/world/scene.ts`.

The important design goal was that gameplay objects physically exist in Mosswood Hollow rather than only appearing in UI panels.

---

## Stage 10 — Keep the inhabitants alive underneath the game

The original six inhabitants were not converted into static quest-givers.

They continue to:

- move according to routines,
- work,
- eat,
- rest,
- talk,
- maintain social needs,
- form relationships,
- remember events,
- react to weather and world events.

The player progression system and autonomous simulation run together.

This remains one of the core ideas of Emberwild: the game loop happens **inside** a world that keeps moving even when the player is not directly controlling its inhabitants.

---

## Stage 11 — Save migration and compatibility

V2 changed the shape of the saved game state, so existing V1 worlds needed a safe migration path.

The migration logic preserves earlier state where possible, including:

- inhabitants,
- memories,
- relationships,
- simulation time,
- shared resources/world state.

Additional V2 traveler state is created when missing.

The earlier save is retained, and unfinished player actions are cancelled safely on reload so resources are not consumed by half-completed tasks.

Autosave occurs every 10 seconds and when the tab becomes hidden.

---

## Stage 12 — Mobile and interaction improvements

The game already supported mouse/keyboard exploration, but V2 added stronger touch support so the public version could be used from a phone.

Mobile interaction includes:

- walking arrows,
- an Interact action,
- tappable gathering locations,
- touch camera movement,
- field-guide navigation.

This was important because Emberwild is intended to be shared as a public browser demo rather than requiring a desktop install.

---

## Stage 13 — Automated gameplay tests

V2 introduced a larger automated test suite around the actual progression systems.

Tests cover:

- the complete six-chapter journey,
- recommended actions,
- navigation,
- resource depletion,
- gathering rewards,
- cooking costs,
- construction costs,
- energy recovery,
- duplicate reward protection,
- weather restrictions,
- save migration.

The goal is not only to test isolated functions but to verify that the full journey can actually be completed through legal game actions.

Main test file: `tests/adventure.test.mjs`.

---

## Stage 14 — Production build fixes

The first public V2 deployment attempts exposed a hosting/build issue unrelated to the game itself.

The repository inherited Cloudflare-specific development files such as `db/index.ts`, which imports `cloudflare:workers`. A normal static Next.js build tried to type-check that unused file and failed.

The public build configuration was adjusted so Cloudflare-only development code is excluded from the static-site TypeScript build.

After that change:

- Next.js compilation succeeded,
- TypeScript checks succeeded,
- static pages were generated successfully.

---

## Stage 15 — Public static build pipeline

Because the original ChatGPT Site deployment identity was intentionally not stored in the public GitHub copy, V2 could not simply overwrite the original hosted V1 URL.

A GitHub Actions pipeline was added to:

1. install dependencies,
2. generate the static production build,
3. publish the generated output to the `gh-pages` branch.

The `gh-pages` branch is therefore generated output, while `main` remains the editable V2 source code.

Current public build:

https://raw.githack.com/tilkitaha/Emberwild/gh-pages/index.html

---

# V2 architecture summary

## Simulation layer
`components/world/simulation.ts`

Responsible for inhabitants, needs, contextual dialogue, relationships, world time, events, and persistence.

## Adventure layer
`components/world/adventure.ts`

Responsible for the traveler, progression, inventory, gathering, cooking, construction, and objectives.

## Rendering layer
`components/world/scene.ts`

Responsible for the procedural forest, Three.js objects, inhabitants, traveler, weather, resources, construction visuals, cameras, and input.

## Interface layer
`components/world/world-app.tsx`
`components/world/adventure-hud.tsx`

Responsible for the main HUD, resident interaction, journal, field guide, objectives, backpack, controls, and player feedback.

---

# What V2 is — and is not

V2 is now a playable browser game rather than only an autonomous-world showcase.

It includes a meaningful progression loop, persistent player state, construction, gathering, cooking, objectives, mobile controls, and automated testing.

However, the inhabitants do **not** currently use a live LLM. Their dialogue and decisions are generated by local contextual rules and goal-based behavior. No external AI API key is required.

---

# Possible V3 directions

A future version could explore:

- real LLM-driven inhabitants,
- semantic long-term memory,
- stronger emergent relationships,
- procedural missions,
- a larger explorable world,
- settlement economy and trading,
- crafting trees,
- cloud save/accounts,
- multiplayer or shared persistent worlds,
- more environmental events,
- deeper NPC skills and professions,
- generational or long-timescale simulation.

V2 deliberately focuses on making the current world genuinely playable before adding those larger systems.
