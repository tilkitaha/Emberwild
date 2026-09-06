import { Simulation } from './simulation';
import { composeAgentReply, extractPlayerFact, planForAgent, relationshipAfterConversation, type BrainWorld } from './agent-brain';

const positiveLanguage = /thank|thanks|nice|great|love|beautiful|helpful|teşekkür|sağ ol|güzel|harika/i;

export class SimulationV3 extends Simulation {
  private nextBrainTick = 8;
  private playerFacts: string[] = [];

  constructor() {
    super();
    this.log('world', 'Mosswood Intelligence', 'V3 agent cognition is active: needs, roles, memories and relationships now compete when inhabitants choose what to do next.');
  }

  private brainWorld(): BrainWorld {
    return {
      weather: this.weather,
      hour: (this.time % 1440) / 60,
      built: this.built,
      gathering: this.agents.some(a => a.activity.includes('campfire')),
      wood: this.wood,
      food: this.food,
      elapsed: this.elapsed,
    };
  }

  step(dt: number) {
    super.step(dt);
    if (dt <= 0 || this.elapsed < this.nextBrainTick) return;
    this.nextBrainTick = this.elapsed + 15;

    const world = this.brainWorld();
    // Re-plan only idle inhabitants so V3 cognition enriches, rather than fights,
    // the original V2 simulation and its scripted world events.
    const idle = this.agents
      .filter(a => !a.moving && a.path.length === 0 && a.hold <= this.elapsed)
      .sort((a,b) => (a.nextDecision - this.elapsed) - (b.nextDecision - this.elapsed))
      .slice(0, 2);

    for (const agent of idle) {
      const plan = planForAgent(agent, world);
      const currentPlace = agent.destination;
      if (plan.place === currentPlace && agent.nextDecision > this.elapsed + 4) continue;
      this.go(agent, plan.place, plan.goal);
      this.remember(agent, `I chose to ${plan.goal.charAt(0).toLowerCase()+plan.goal.slice(1)} My reason was ${plan.reason}.`);
    }
  }

  chat(id: string, message: string) {
    const agent = this.agents.find(a => a.id === id);
    if (!agent) return '';
    const text = message.trim().slice(0, 240);
    if (!text) return '';

    this.log('speech', 'You', text, agent.name);
    const lower = text.toLowerCase();
    let reply: string;

    if (/\b(go|come|meet|gather|join)\b/.test(lower) && /fire|camp|together/.test(lower)) {
      this.go(agent, 'camp', 'Meet the traveler at the campfire and continue the conversation there.');
      reply = 'I’ll meet you by the campfire. I want to hear the rest there.';
    } else if (/\b(rest|sleep|tired|shelter)\b/.test(lower)) {
      this.go(agent, 'lodge', 'Take the traveler’s advice, recover, and reconsider the next priority.');
      reply = 'You’re right. I’ll rest at the lodge, then decide what matters next.';
    } else {
      reply = composeAgentReply(agent, text, this.brainWorld(), this.playerFacts, this.agents);
    }

    const fact = extractPlayerFact(text);
    if (fact && !this.playerFacts.some(x => x.toLowerCase() === fact.toLowerCase())) {
      this.playerFacts.push(fact);
      this.playerFacts = this.playerFacts.slice(-20);
      for (const inhabitant of this.agents) this.remember(inhabitant, `The traveler told the settlement: ${fact}.`);
      reply += ' I’ll remember that.';
    }

    this.game.meet(id);
    this.remember(agent, `The traveler said: “${text}”`);
    this.say(agent, reply, 'You');
    agent.social = Math.min(100, agent.social + 6);

    // A conversation now changes trust, not just a generic social meter.
    const positive = positiveLanguage.test(text);
    for (const other of this.agents) {
      if (other.id === agent.id) continue;
      if (Math.hypot(other.x-agent.x, other.z-agent.z) < 5) {
        agent.relationships[other.id] = relationshipAfterConversation(agent.relationships[other.id] ?? 0, positive);
      }
    }
    return reply;
  }

  save() {
    const saved = super.save();
    try { localStorage.setItem('emberwild-v3-player-facts', JSON.stringify(this.playerFacts)); } catch { /* storage is optional */ }
    return saved;
  }

  restore() {
    const restored = super.restore();
    try {
      const raw = localStorage.getItem('emberwild-v3-player-facts');
      const facts = raw ? JSON.parse(raw) : [];
      if (Array.isArray(facts)) this.playerFacts = facts.filter(x => typeof x === 'string').slice(-20);
    } catch { this.playerFacts = []; }
    this.nextBrainTick = this.elapsed + 5;
    return restored;
  }

  get relationships() {
    const bonds: { a: string; b: string; score: number; label: string }[] = [];
    const seen = new Set<string>();
    for (const agent of this.agents) {
      for (const [otherId, score] of Object.entries(agent.relationships)) {
        const key = [agent.id, otherId].sort().join(':');
        if (seen.has(key)) continue;
        seen.add(key);
        const otherScore = this.agents.find(a => a.id === otherId)?.relationships[agent.id] ?? 0;
        const combined = Math.max(0, Math.min(100, Math.round((score + otherScore) / 2)));
        const label = combined >= 75 ? 'Close friends' : combined >= 55 ? 'Trusted companions' : combined >= 35 ? 'Growing bond' : 'Getting acquainted';
        bonds.push({ a: agent.id, b: otherId, score: combined, label });
      }
    }
    return bonds;
  }

  get rememberedPlayerFacts() { return [...this.playerFacts]; }
}
