import type { Agent, Memory } from './simulation';
import { PLACES } from './simulation';

export type BrainWorld = {
  weather: 'clear' | 'rain';
  hour: number;
  built: boolean;
  gathering: boolean;
  wood: number;
  food: number;
  elapsed: number;
};

export type BrainPlan = {
  place: keyof typeof PLACES;
  goal: string;
  reason: string;
  score: number;
};

const rolePlans: Record<string, Array<Omit<BrainPlan, 'score'>>> = {
  rowan: [
    { place: 'workshop', goal: 'Shape timber for the next settlement project.', reason: 'builder craft' },
    { place: 'garden', goal: 'Inspect what the settlement has built and plan the next improvement.', reason: 'builder responsibility' },
  ],
  mira: [
    { place: 'garden', goal: 'Tend the herbs and check what the settlement needs.', reason: 'botanist routine' },
    { place: 'woods', goal: 'Search for useful herbs and notice changes in the woodland.', reason: 'botanist exploration' },
  ],
  finn: [
    { place: 'river', goal: 'Search the riverbank for provisions and useful discoveries.', reason: 'forager route' },
    { place: 'woods', goal: 'Gather berries and scout a safer trail home.', reason: 'forager route' },
  ],
  elara: [
    { place: 'camp', goal: 'Listen for stories and check who might need company.', reason: 'storykeeper social role' },
    { place: 'lookout', goal: 'Reflect on recent events and decide what story should be remembered.', reason: 'storykeeper reflection' },
  ],
  theo: [
    { place: 'woods', goal: 'Collect suitable wood for the settlement projects.', reason: 'woodworker supply' },
    { place: 'workshop', goal: 'Turn gathered timber into something useful for the settlement.', reason: 'woodworker craft' },
  ],
  ash: [
    { place: 'lookout', goal: 'Explore the northern trail and map what lies beyond the clearing.', reason: 'explorer curiosity' },
    { place: 'river', goal: 'Scout the river edge and learn another route through Mosswood.', reason: 'explorer curiosity' },
  ],
};

const clamp = (n: number) => Math.max(0, Math.min(100, n));

export function moodFor(agent: Agent) {
  if (agent.energy < 28) return 'exhausted';
  if (agent.food < 35) return 'hungry';
  if (agent.social < 35) return 'lonely';
  if (agent.social > 82 && agent.energy > 55) return 'content';
  if (agent.energy > 78 && agent.food > 65) return 'focused';
  return 'steady';
}

export function planForAgent(agent: Agent, world: BrainWorld): BrainPlan {
  const candidates: BrainPlan[] = [];
  const add = (place: keyof typeof PLACES, goal: string, reason: string, score: number) => candidates.push({ place, goal, reason, score });

  if (world.weather === 'rain') add('lodge', 'Find shelter and use the quiet time to think ahead.', 'weather safety', 1000);
  if (world.gathering) add('camp', 'Join the settlement gathering and reconnect with everyone.', 'shared gathering', 920);
  if (agent.energy < 32 || world.hour > 22 || world.hour < 6) add('lodge', 'Rest before exhaustion starts affecting tomorrow.', 'energy management', 820 + (32 - agent.energy) * 4);
  if (agent.food < 42) add('camp', 'Eat and check the shared stores before returning to work.', 'hunger', 760 + (42 - agent.food) * 3);
  if (agent.social < 46) add('camp', 'Find someone familiar and have a real conversation.', 'social need', 700 + (46 - agent.social) * 3);

  const strongestBond = Object.values(agent.relationships).sort((a,b)=>b-a)[0] ?? 0;
  if (strongestBond > 45 && agent.social < 70) add('camp', 'Make time for a friend instead of working alone.', 'relationship maintenance', 560 + strongestBond);

  for (const plan of rolePlans[agent.id] ?? []) {
    let score = 420;
    if (agent.id === 'theo' && plan.place === 'woods' && world.wood < 10) score += 160;
    if ((agent.id === 'mira' || agent.id === 'finn') && world.food < 20) score += 150;
    if (agent.id === 'rowan' && plan.place === 'garden' && !world.built && world.wood >= 8) score += 190;
    if (agent.id === 'elara' && plan.place === 'camp' && agent.social < 75) score += 70;
    score += Math.min(70, agent.meetings * 3);
    candidates.push({ ...plan, score });
  }

  // Small deterministic novelty bonus prevents every agent from repeating the same route forever.
  candidates.forEach((candidate, i) => {
    candidate.score += ((Math.floor(world.elapsed / 31) + i + agent.id.length) % 5) * 9;
    if (agent.destination === candidate.place) candidate.score -= 45;
  });

  return candidates.sort((a,b)=>b.score-a.score)[0] ?? {
    place: 'camp', goal: 'Pause by the fire and decide what matters next.', reason: 'fallback', score: 0,
  };
}

function tokens(text: string) {
  return new Set(text.toLowerCase().replace(/[^a-z0-9ğüşöçıİ ]/gi, ' ').split(/\s+/).filter(x=>x.length > 2));
}

export function relevantMemory(memories: Memory[], message: string) {
  const query = tokens(message);
  let best: { memory: Memory; score: number } | null = null;
  for (const memory of memories) {
    const words = tokens(memory.text);
    let score = 0;
    for (const word of query) if (words.has(word)) score += 3;
    if (/remember|memory|before|last time|hatır|daha önce/.test(message.toLowerCase())) score += 2;
    score += Math.max(0, 2 - memories.indexOf(memory) * .12);
    if (!best || score > best.score) best = { memory, score };
  }
  return best && best.score >= 2.2 ? best.memory : memories[0];
}

export function extractPlayerFact(message: string) {
  const text = message.trim().slice(0, 240);
  const patterns = [
    /(?:my name is|i am called|benim adım|adım)\s+([^,.!?]{2,40})/i,
    /(?:i like|i love|seviyorum)\s+([^,.!?]{2,80})/i,
    /(?:i want to|i plan to|istiyorum|planlıyorum)\s+([^,.!?]{2,100})/i,
    /(?:remember that|remember this|bunu hatırla[: ]*)\s*([^.!?]{2,120})/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

export function composeAgentReply(agent: Agent, message: string, world: BrainWorld, playerFacts: string[], allAgents: Agent[]) {
  const lower = message.toLowerCase();
  const memory = relevantMemory(agent.memories, message);
  const mood = moodFor(agent);
  const topBond = Object.entries(agent.relationships).sort((a,b)=>b[1]-a[1])[0];
  const friend = topBond ? allAgents.find(a=>a.id===topBond[0]) : undefined;
  const rememberedPlayer = playerFacts.at(-1);

  if (/\b(hello|hi|hey|merhaba|selam)\b/.test(lower)) {
    return `Hello, traveler. I’m ${agent.name}. I’m feeling ${mood} today. ${agent.bio}`;
  }
  if (/remember|memory|memories|recall|hatır/.test(lower)) {
    return memory ? `I do remember. ${memory.text}${rememberedPlayer ? ` And I remember something you told us: ${rememberedPlayer}.` : ''}` : 'I am still making my first memories here.';
  }
  if (/friend|relationship|who.*(like|know)|arkadaş/.test(lower)) {
    return friend ? `${friend.name} is the person I feel closest to right now. We are at ${Math.round(topBond![1])}% trust, and our recent conversations have changed how I think about this place.` : 'I am still learning who I can rely on. Trust grows slowly here.';
  }
  if (/plan|goal|doing|working|help|job|planın|hedef/.test(lower)) {
    const plan = planForAgent(agent, world);
    return `Right now I want to ${plan.goal.charAt(0).toLowerCase()+plan.goal.slice(1)} I chose that because of ${plan.reason}, and I’m feeling ${mood}.`;
  }
  if (/why|neden/.test(lower)) {
    const plan = planForAgent(agent, world);
    return `Because I’m balancing what I need with what Mosswood needs. My strongest reason right now is ${plan.reason}. ${memory ? `I’m also thinking about this: ${memory.text}` : ''}`;
  }
  if (/weather|rain|sun|hava|yağmur/.test(lower)) {
    return world.weather === 'rain' ? 'The rain changes everyone’s priorities. Safety first, then work. I’ll use the shelter time to think about what comes next.' : 'The weather is calm enough to work or explore, so I can choose based on my needs instead of just reacting.';
  }
  if (/hungry|food|eat|dinner|supper|yemek|aç/.test(lower)) {
    return `The settlement has about ${Math.floor(world.food)} portions in the shared stores. I’m at ${Math.round(agent.food)}% nourishment, so ${agent.food < 45 ? 'food is becoming one of my priorities.' : 'I can keep working for a while.'}`;
  }
  if (/who are|your name|yourself|kimsin/.test(lower)) return `I’m ${agent.name}, the ${agent.role.toLowerCase()}. ${agent.bio} My traits are ${agent.traits.join(' and ').toLowerCase()}.`;
  if (/thank|nice|beautiful|love|teşekkür|güzel/.test(lower)) return `That means something to me. ${rememberedPlayer ? `I haven’t forgotten what you told us about ${rememberedPlayer}.` : 'People become part of Mosswood through small moments like this.'}`;

  const memoryLine = memory ? ` Something you said makes me think of this memory: ${memory.text}` : '';
  const friendLine = friend && topBond![1] > 25 ? ` ${friend.name} might see it differently; we’ve been getting closer.` : '';
  return `I’m listening. I’m ${mood}, and my current goal is to ${agent.goal.charAt(0).toLowerCase()+agent.goal.slice(1)}.${memoryLine}${friendLine}`;
}

export function relationshipAfterConversation(current: number, positive: boolean) {
  return clamp(current + (positive ? 7 : 3));
}
