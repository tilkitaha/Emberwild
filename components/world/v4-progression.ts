import type { Player, ProgressStats } from './adventure';

export type V4DailyState = {
  date: string;
  talk: number;
  gather: number;
  contribute: number;
  claimed: boolean;
};

export type V4Trust = { name: string; score: number };

export type V4ProgressState = {
  version: 4;
  name: string;
  reputation: number;
  settlementXp: number;
  trust: Record<string, V4Trust>;
  achievements: string[];
  daily: V4DailyState;
};

type Snapshot = {
  gathered: number;
  projects: number;
  shared: number;
  feasts: number;
  xp: number;
};

const STORAGE_KEY = 'emberwild-v4-progression';
const todayKey = () => new Date().toISOString().slice(0, 10);
const freshDaily = (): V4DailyState => ({ date: todayKey(), talk: 0, gather: 0, contribute: 0, claimed: false });

const defaultState = (): V4ProgressState => ({
  version: 4,
  name: 'Traveler',
  reputation: 0,
  settlementXp: 0,
  trust: {},
  achievements: [],
  daily: freshDaily(),
});

const totalGathered = (stats: ProgressStats) => Object.values(stats.gathered).reduce((sum, value) => sum + value, 0);

export const loadV4ProgressState = (): V4ProgressState => {
  if (typeof window === 'undefined') return defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<V4ProgressState>;
    if (parsed.version !== 4) return defaultState();
    return {
      ...defaultState(),
      ...parsed,
      trust: parsed.trust ?? {},
      achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
      daily: parsed.daily?.date === todayKey() ? parsed.daily : freshDaily(),
    };
  } catch {
    return defaultState();
  }
};

export class V4Progression {
  private state: V4ProgressState = loadV4ProgressState();
  private snapshot: Snapshot | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('emberwild:v4-set-name', this.onSetName as EventListener);
      queueMicrotask(() => this.emit());
    }
  }

  private onSetName = (event: CustomEvent<string>) => {
    const clean = String(event.detail ?? '').trim().replace(/\s+/g, ' ').slice(0, 24);
    if (!clean) return;
    this.state.name = clean;
    this.persist();
  };

  private resetDailyIfNeeded() {
    if (this.state.daily.date !== todayKey()) this.state.daily = freshDaily();
  }

  private unlock(id: string) {
    if (!this.state.achievements.includes(id)) this.state.achievements.push(id);
  }

  private checkDailyReward() {
    const daily = this.state.daily;
    if (!daily.claimed && daily.talk >= 3 && daily.gather >= 10 && daily.contribute >= 2) {
      daily.claimed = true;
      this.state.reputation += 25;
      this.state.settlementXp += 30;
      this.unlock('Daily Helper');
    }
  }

  private persist() {
    this.resetDailyIfNeeded();
    this.checkDailyReward();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state)); } catch { /* optional storage */ }
    this.emit();
  }

  private emit() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('emberwild:v4-progress', { detail: this.publicState }));
  }

  observeAdventure(stats: ProgressStats, player: Player) {
    this.resetDailyIfNeeded();
    const next: Snapshot = {
      gathered: totalGathered(stats),
      projects: stats.projects.length,
      shared: stats.shared,
      feasts: stats.feasts,
      xp: player.xp,
    };
    if (!this.snapshot) {
      this.snapshot = next;
      return;
    }

    const gatheredDelta = Math.max(0, next.gathered - this.snapshot.gathered);
    const projectDelta = Math.max(0, next.projects - this.snapshot.projects);
    const sharedDelta = Math.max(0, next.shared - this.snapshot.shared);
    const feastDelta = Math.max(0, next.feasts - this.snapshot.feasts);
    const xpDelta = Math.max(0, next.xp - this.snapshot.xp);
    this.snapshot = next;

    if (!gatheredDelta && !projectDelta && !sharedDelta && !feastDelta && !xpDelta) return;

    this.state.daily.gather += gatheredDelta;
    this.state.daily.contribute += sharedDelta + feastDelta * 3;
    this.state.reputation += Math.min(12, Math.floor(gatheredDelta / 2)) + projectDelta * 12 + sharedDelta * 3 + feastDelta * 10;
    this.state.settlementXp += gatheredDelta + projectDelta * 25 + sharedDelta * 5 + feastDelta * 20 + Math.floor(xpDelta / 4);

    if (gatheredDelta > 0) this.unlock('Forager');
    if (next.projects >= 1) this.unlock('Builder');
    if (next.projects >= 3) this.unlock('Caretaker');
    if (next.feasts >= 1) this.unlock('Feast Host');
    this.persist();
  }

  recordConversation(agentId: string, agentName: string, text: string, positive: boolean) {
    this.resetDailyIfNeeded();
    const current = this.state.trust[agentId] ?? { name: agentName, score: 0 };
    const bonus = positive ? 5 : 2;
    current.name = agentName;
    current.score = Math.min(100, current.score + bonus);
    this.state.trust[agentId] = current;
    this.state.daily.talk += 1;
    this.state.reputation += positive ? 2 : 1;

    const nameMatch = text.match(/(?:my name is|i am|i'm|benim adım|adım)\s+([\p{L}'-]{2,24})/iu);
    if (nameMatch?.[1]) this.state.name = nameMatch[1];

    if (current.score >= 25) this.unlock('Friend of Mosswood');
    if (current.score >= 60) this.unlock(`Trusted by ${agentName}`);
    this.persist();
  }

  trustFor(agentId: string) { return this.state.trust[agentId]?.score ?? 0; }

  trustLabel(agentId: string) {
    const trust = this.trustFor(agentId);
    return trust >= 75 ? 'deeply trusted' : trust >= 50 ? 'trusted' : trust >= 25 ? 'familiar' : trust >= 10 ? 'warming up' : 'new acquaintance';
  }

  get settlementLevel() {
    return this.state.settlementXp >= 500 ? 5 : this.state.settlementXp >= 280 ? 4 : this.state.settlementXp >= 140 ? 3 : this.state.settlementXp >= 50 ? 2 : 1;
  }

  get reputationTitle() {
    return this.state.reputation >= 180 ? 'Heart of Mosswood' : this.state.reputation >= 100 ? 'Settlement Keeper' : this.state.reputation >= 50 ? 'Trusted Helper' : this.state.reputation >= 15 ? 'Known Traveler' : 'Newcomer';
  }

  get publicState(): V4ProgressState & { settlementLevel: number; reputationTitle: string } {
    return {
      ...this.state,
      trust: Object.fromEntries(Object.entries(this.state.trust).map(([id, value]) => [id, { ...value }])),
      achievements: [...this.state.achievements],
      daily: { ...this.state.daily },
      settlementLevel: this.settlementLevel,
      reputationTitle: this.reputationTitle,
    };
  }
}
