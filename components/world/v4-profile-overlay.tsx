'use client';

import { useEffect, useMemo, useState } from 'react';
import { Award, Flame, Shield, Sparkles, UserRound, X } from 'lucide-react';
import { loadV4ProgressState, type V4ProgressState } from './v4-progression';

type PublicState = V4ProgressState & { settlementLevel?: number; reputationTitle?: string };

const titleFor = (rep: number) => rep >= 180 ? 'Heart of Mosswood' : rep >= 100 ? 'Settlement Keeper' : rep >= 50 ? 'Trusted Helper' : rep >= 15 ? 'Known Traveler' : 'Newcomer';
const levelFor = (xp: number) => xp >= 500 ? 5 : xp >= 280 ? 4 : xp >= 140 ? 3 : xp >= 50 ? 2 : 1;

export function V4ProfileOverlay() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<PublicState>(() => loadV4ProgressState());
  const [name, setName] = useState(state.name);

  useEffect(() => {
    const onProgress = (event: Event) => {
      const detail = (event as CustomEvent<PublicState>).detail;
      if (!detail) return;
      setState(detail);
      setName(detail.name);
    };
    window.addEventListener('emberwild:v4-progress', onProgress);
    return () => window.removeEventListener('emberwild:v4-progress', onProgress);
  }, []);

  const trust = useMemo(() => Object.values(state.trust).sort((a,b) => b.score - a.score), [state.trust]);
  const dailyDone = state.daily.talk >= 3 && state.daily.gather >= 10 && state.daily.contribute >= 2;
  const settlementLevel = state.settlementLevel ?? levelFor(state.settlementXp);
  const reputationTitle = state.reputationTitle ?? titleFor(state.reputation);

  const saveName = () => {
    const clean = name.trim().slice(0, 24);
    if (!clean) return;
    window.dispatchEvent(new CustomEvent('emberwild:v4-set-name', { detail: clean }));
  };

  return <>
    <button className="v4-profile-fab" onClick={() => setOpen(true)} aria-label="Open V4 player profile">
      <Shield size={17}/><span>V4 · Lv.{settlementLevel}</span>
    </button>
    {open && <aside className="v4-profile-panel" aria-label="Emberwild V4 profile">
      <div className="v4-panel-head"><div><span>EMBERWILD V4</span><strong>{reputationTitle}</strong></div><button onClick={() => setOpen(false)} aria-label="Close profile"><X size={18}/></button></div>

      <section className="v4-identity-card">
        <div className="v4-avatar"><UserRound/></div>
        <div><small>Traveler identity</small><div className="v4-name-row"><input value={name} onChange={e=>setName(e.target.value)} maxLength={24}/><button onClick={saveName}>Save</button></div><p>{state.reputation} reputation · settlement level {settlementLevel}</p></div>
      </section>

      <section className="v4-section">
        <h3><Flame size={16}/> Daily Mosswood missions</h3>
        <div className="v4-mission"><span>Speak with inhabitants</span><strong>{Math.min(3,state.daily.talk)}/3</strong></div>
        <div className="v4-mission"><span>Gather useful resources</span><strong>{Math.min(10,state.daily.gather)}/10</strong></div>
        <div className="v4-mission"><span>Contribute meals / feast</span><strong>{Math.min(2,state.daily.contribute)}/2</strong></div>
        <p className={dailyDone ? 'v4-daily-complete' : 'v4-daily-hint'}>{state.daily.claimed ? 'Daily reward claimed: +25 reputation.' : dailyDone ? 'Daily challenge complete — reward is being recorded.' : 'Complete all three to earn bonus reputation and settlement XP.'}</p>
      </section>

      <section className="v4-section">
        <h3><Sparkles size={16}/> Inhabitant trust</h3>
        {trust.length === 0 ? <p className="v4-empty">Talk to the inhabitants. Their trust in you now persists between sessions.</p> : trust.slice(0,6).map(person => <div className="v4-trust" key={person.name}><span>{person.name}</span><div><i style={{width:`${person.score}%`}}/></div><strong>{person.score}</strong></div>)}
      </section>

      <section className="v4-section">
        <h3><Award size={16}/> Achievements</h3>
        <div className="v4-achievements">{state.achievements.length ? state.achievements.slice(-8).map(a=><span key={a}>{a}</span>) : <p className="v4-empty">Your first achievements will appear as you explore, build and form bonds.</p>}</div>
      </section>
    </aside>}
  </>;
}
