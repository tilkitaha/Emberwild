import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test, { after } from 'node:test';
import ts from 'typescript';

// Exercise the same simulation used in the renderer, without a browser or GPU.
const compiled = mkdtempSync(join(tmpdir(), 'emberwild-tests-'));
for (const name of ['adventure', 'simulation']) {
  const source = readFileSync(new URL(`../components/world/${name}.ts`, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
  writeFileSync(join(compiled, `${name}.mjs`), outputText.replace(/from '\.\/(adventure|simulation)'/g, "from './$1.mjs'"));
}
after(() => rmSync(compiled, { recursive: true, force: true }));
const { Simulation, walkable, OBSTACLES } = await import(pathToFileURL(join(compiled, 'simulation.mjs')).href);
const { RESOURCES, PROJECTS, CAMP } = await import(pathToFileURL(join(compiled, 'adventure.mjs')).href);

function tick(sim, seconds) { for (let elapsed = 0; elapsed < seconds; elapsed += .1) sim.step(.1); }
function perform(sim, intent) {
  assert.equal(sim.game.travel(intent), true, JSON.stringify(intent));
  let ticks = 0;
  while (sim.game.intent && ticks++ < 1800) {
    sim.step(.1);
    assert.ok(walkable(sim.game.player.x, sim.game.player.z), `Traveler entered an obstacle at ${sim.game.player.x}, ${sim.game.player.z}`);
  }
  assert.equal(sim.game.intent, null, `Task did not finish: ${JSON.stringify(intent)}`);
}
function storage(initial = {}) {
  const data = new Map(Object.entries(initial));
  globalThis.localStorage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  return data;
}

test('every gathering and building site can be reached from the clearing', () => {
  for (const node of [...RESOURCES, ...Object.values(PROJECTS), CAMP]) {
    assert.ok(walkable(node.x, node.z), `Blocked site: ${node.id ?? 'camp'}`);
    const sim = new Simulation();
    const intent = RESOURCES.includes(node) ? { kind: 'gather', id: node.id } : node === CAMP ? { kind: 'camp', id: 'rest' } : { kind: 'build', id: node.id };
    perform(sim, intent);
    assert.ok(sim.game.distance(node) <= 3, `Could not reach ${node.id ?? 'camp'}`);
  }
});

test('gathering requires arrival and completion; cancel and pause spend nothing', () => {
  const sim = new Simulation(), game = sim.game;
  game.travel({ kind: 'gather', id: 'fallen-pine' });
  assert.equal(game.player.inventory.wood, 0);
  const before = JSON.stringify(game.export());
  sim.step(0);
  assert.equal(JSON.stringify(game.export()), before);
  tick(sim, .3); game.cancel();
  assert.equal(game.player.inventory.wood, 0);
  assert.equal(game.player.energy, 100);
  perform(sim, { kind: 'gather', id: 'fallen-pine' });
  assert.equal(game.player.inventory.wood, 3);
  assert.equal(game.player.energy, 96);
  assert.equal(game.nodes['fallen-pine'].charges, 4);
  tick(sim, 3);
  assert.equal(game.player.inventory.wood, 3, 'An idle frame must not grant the reward again');
  game.travel({ kind: 'gather', id: 'fallen-pine' });
  tick(sim, .3); game.cancel();
  assert.equal(game.player.inventory.wood, 3, 'Cancel during harvesting must not grant items');
});

test('depleted resources replenish on world time and exhaustion guides the player to rest', () => {
  const sim = new Simulation(), game = sim.game;
  for (let i = 0; i < 5; i++) perform(sim, { kind: 'gather', id: 'fallen-pine' });
  assert.equal(game.nodes['fallen-pine'].charges, 0);
  perform(sim, { kind: 'gather', id: 'fallen-pine' });
  assert.equal(game.player.inventory.wood, 15);
  tick(sim, 121);
  assert.equal(game.nodes['fallen-pine'].charges, 5);
  game.player.energy = 0;
  assert.deepEqual(game.nextStep({ kind: 'gather', id: 'fallen-pine' }), { kind: 'camp', id: 'rest' });
  perform(sim, { kind: 'gather', id: 'fallen-pine' });
  assert.equal(game.player.inventory.wood, 15);
  perform(sim, { kind: 'camp', id: 'rest' });
  assert.equal(game.player.energy, 100);
});

test('construction enforces costs, prerequisites, one-time rewards, and garden bonuses', () => {
  const sim = new Simulation(), game = sim.game;
  perform(sim, { kind: 'build', id: 'garden' });
  assert.equal(game.stats.projects.length, 0);
  Object.assign(game.player.inventory, { wood: 20, stone: 12 });
  perform(sim, { kind: 'build', id: 'lanterns' });
  assert.equal(game.player.inventory.wood, 12);
  assert.equal(game.player.inventory.stone, 8);
  const xp = game.player.xp;
  perform(sim, { kind: 'build', id: 'lanterns' });
  assert.equal(game.player.xp, xp);
  perform(sim, { kind: 'build', id: 'garden' });
  assert.deepEqual(game.stats.projects, ['lanterns', 'garden']);
  assert.equal(game.player.inventory.wood, 0);
  assert.equal(game.player.inventory.stone, 0);
  perform(sim, { kind: 'gather', id: 'berry-patch' });
  assert.equal(game.player.inventory.berries, 4);
  assert.ok(sim.agents.every(a => a.memories.some(m => m.text.includes('community garden'))));
});

test('cooking and sharing consume exact ingredients; rain prevents a feast', () => {
  const sim = new Simulation(), game = sim.game;
  perform(sim, { kind: 'camp', id: 'cook' });
  assert.equal(game.player.inventory.meals, 0);
  Object.assign(game.player.inventory, { berries: 2, herbs: 1 });
  perform(sim, { kind: 'camp', id: 'cook' });
  assert.deepEqual(game.player.inventory, { wood: 0, stone: 0, berries: 0, herbs: 0, meals: 1 });
  game.player.energy = 40;
  perform(sim, { kind: 'camp', id: 'share' });
  assert.equal(game.player.energy, 55);
  assert.equal(game.player.inventory.meals, 0);
  assert.equal(game.stats.shared, 1);
  game.player.inventory.meals = 3;
  sim.event('rain');
  perform(sim, { kind: 'camp', id: 'feast' });
  assert.equal(game.player.inventory.meals, 3);
  assert.equal(game.stats.feasts, 0);
  sim.event('rain');
  perform(sim, { kind: 'camp', id: 'feast' });
  assert.equal(game.player.inventory.meals, 0);
  assert.equal(game.stats.feasts, 1);
  assert.equal(sim.gatherings, 1);
});

test('all six chapters are completable using only the recommended playable actions', () => {
  const sim = new Simulation();
  let actions = 0;
  while (!sim.game.finished && actions++ < 150) {
    assert.ok(sim.game.quest?.intent, 'Each unfinished chapter needs a next action');
    const step = sim.game.nextStep(sim.game.quest.intent);
    perform(sim, step);
  }
  assert.equal(sim.game.finished, true, `Stalled on ${sim.game.quest?.id} after ${actions} actions`);
  assert.equal(sim.game.stats.completed.length, 6);
  assert.equal(sim.game.stats.projects.length, 3);
  assert.ok(sim.game.stats.shared >= 3);
  assert.equal(sim.game.stats.feasts, 1);
  assert.equal(sim.game.level, 4);
  for (const count of Object.values(sim.game.player.inventory)) assert.ok(count >= 0);
  const xp = sim.game.player.xp;
  tick(sim, 60);
  assert.equal(sim.game.player.xp, xp, 'Completed chapters must not reward again');
});

test('manual movement cannot cross cabins, water, or the world boundary', () => {
  const sim = new Simulation();
  for (const target of [...OBSTACLES, { x: 25, z: 9 }, { x: 80, z: 80 }]) {
    sim.game.player.x = 4; sim.game.player.z = 8;
    sim.game.move(target.x - 4, target.z - 8);
    assert.ok(walkable(sim.game.player.x, sim.game.player.z));
  }
});

test('v1 world migration preserves history and leaves the earlier save untouched', () => {
  const original = new Simulation();
  tick(original, 80);
  original.chat('rowan', 'hello, friend');
  original.wood = 27; original.built = true;
  const oldSave = JSON.stringify(original.snapshot());
  const data = storage({ 'emberwild-world-v1': oldSave });
  const upgraded = new Simulation();
  assert.equal(upgraded.restore(), true);
  assert.equal(upgraded.time, original.time);
  assert.equal(upgraded.wood, 27);
  assert.equal(upgraded.built, true);
  assert.deepEqual(upgraded.agents[0].memories, original.agents[0].memories);
  assert.deepEqual(upgraded.agents[0].relationships, original.agents[0].relationships);
  assert.equal(upgraded.game.player.xp, 0);
  perform(upgraded, { kind: 'gather', id: 'fallen-pine' });
  assert.equal(upgraded.save(), true);
  assert.equal(data.get('emberwild-world-v1'), oldSave);
  const resumed = new Simulation();
  assert.equal(resumed.restore(), true);
  assert.equal(resumed.game.player.inventory.wood, 3);
  assert.equal(resumed.game.nodes['fallen-pine'].charges, 4);
});

test('v2 restores progression safely and cancels unfinished work without consuming supplies', () => {
  storage();
  const sim = new Simulation();
  Object.assign(sim.game.player.inventory, { wood: 20, stone: 12 });
  perform(sim, { kind: 'build', id: 'lanterns' });
  sim.game.onboarded = true;
  sim.game.travel({ kind: 'build', id: 'garden' });
  tick(sim, .4);
  const expected = JSON.parse(JSON.stringify(sim.game.export()));
  sim.save();
  const resumed = new Simulation();
  assert.equal(resumed.restore(), true);
  assert.deepEqual(resumed.game.export(), expected);
  assert.equal(resumed.game.intent, null);
  assert.equal(resumed.game.action, null);
});

test('damaged newer saves fall back; malformed optional data does not crash the world', () => {
  const sim = new Simulation();
  const oldSave = JSON.stringify(sim.snapshot());
  storage({ 'emberwild-world-v1': oldSave, 'emberwild-world-v2': '{broken' });
  assert.equal(new Simulation().restore(), true);
  const malformed = JSON.parse(oldSave);
  malformed.agents[0].relationships = null;
  malformed.agents[1].path = [null, { x: 'bad', z: 0 }];
  malformed.events = [null, { id: 1 }];
  malformed.adventure = { version: 2, player: { x: 0 } };
  storage({ 'emberwild-world-v2': JSON.stringify(malformed) });
  const repaired = new Simulation();
  assert.equal(repaired.restore(), true);
  assert.doesNotThrow(() => tick(repaired, 60));
  assert.equal(repaired.game.player.xp, 0);
  globalThis.localStorage = { getItem() { throw new Error('unavailable'); }, setItem() { throw new Error('quota'); } };
  assert.equal(new Simulation().restore(), false);
  assert.equal(repaired.save(), false);
});
