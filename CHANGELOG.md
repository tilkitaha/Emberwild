# Changelog

All notable Emberwild development stages are documented here.

## V2 — Settlement Adventure

### Added

- Playable traveler character and progression state.
- Six-chapter settlement journey.
- Timber, stone, berries, and herbs as gatherable resources.
- Ten replenishing gathering locations.
- Backpack/inventory system.
- Cooking and meal preparation.
- Energy recovery through meals and resting.
- Experience and four traveler progression levels.
- Trail Lanterns construction project.
- Community Garden construction project.
- Woodland Lookout construction project.
- Field Guide with objectives, recipes, resource requirements, gathering locations, and recommended actions.
- World-space representation of completed buildings.
- Player interaction with resources, inhabitants, and the campfire.
- Mobile movement controls and touch-friendly interactions.
- Save migration from the original prototype.
- Automated adventure/progression tests.
- Static production build workflow.
- Generated `gh-pages` branch for the playable web build.

### Improved

- The original living-world prototype now has a clear player purpose and progression loop.
- Settlement upgrades feed back into the world instead of existing only in menus.
- The Community Garden changes later gathering behavior.
- Existing inhabitant memories and relationships are retained during save migration.
- UI guidance makes objectives and missing resources easier to understand.
- Mobile playability and first-person walking controls were improved.
- Build configuration now separates public static-site code from Cloudflare-only development files.

### Preserved from V1

- Six autonomous inhabitants.
- Needs and daily routines.
- Contextual local dialogue.
- Relationships and memories.
- Weather and time-of-day simulation.
- Campfire gatherings and world events.
- Orbit, follow, and walk camera modes.
- Browser-local persistent world state.

### Technical notes

- No live LLM is required.
- No AI API key is required.
- Dialogue is contextual and rule/goal based.
- The game remains single-player.
- Saves are local to each browser/device.
- WebGL 2 is required.

### Validation

The V2 test suite covers the complete six-chapter journey, gathering, construction and cooking costs, player energy, recommended navigation, duplicate rewards, weather restrictions, and save migration.

The static Next.js production build compiles successfully after excluding unused Cloudflare-only source files from the public-site typecheck.

---

## V1 — Living World Prototype

### Initial concept

The first version established Emberwild as a browser-based 3D woodland settlement focused on autonomous characters rather than traditional scripted NPCs.

### Included

- Procedural Three.js woodland environment.
- Six inhabitants with separate roles and traits.
- Individual energy, food, and social needs.
- Goal-based routines.
- Context-aware local conversations.
- Memories and friendship state.
- Rainstorms and day/night changes.
- Campfire gatherings.
- Camera exploration and follow modes.
- Local browser persistence.

### Limitation

V1 was primarily an interactive simulation/showcase. It had no full player progression, inventory, gathering economy, construction loop, chapter system, or structured mission guidance.

V2 was created specifically to turn that simulation into a playable game while keeping the living-world systems active underneath it.
