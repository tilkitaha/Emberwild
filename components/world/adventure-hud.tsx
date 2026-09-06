'use client';

import { useEffect, useState } from 'react';
import { Backpack, BookOpen, Check, ChevronRight, Flag, Flame, Hammer, Leaf, MapPin, Navigation, Sparkles, Utensils, X, Zap } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { CAMP, ITEMS, PROJECTS, RESOURCES, type CampAction, type Intent, type Item } from './adventure';
import type { Simulation } from './simulation';

type Props = {
  simulation: Simulation;
  paused: boolean;
  walking: boolean;
  obscured: boolean;
  onIntent: (intent: Intent) => void;
  onFocus: () => void;
  onGuideChange: (open: boolean) => void;
};

const itemKeys = Object.keys(ITEMS) as Item[];
const campOptions: { id: CampAction; title: string; detail: string; cost: string }[] = [
  { id: 'cook', title: 'Cook a warm meal', detail: 'Turn gathered ingredients into a meal to share.', cost: '2 berries + 1 herb → 1 meal' },
  { id: 'share', title: 'Share a meal', detail: 'Add 4 portions to the village stores and recover 15 energy.', cost: '1 cooked meal' },
  { id: 'rest', title: 'Rest by the fire', detail: 'Take a breath. Your energy returns to 100.', cost: 'Free · 5 seconds at normal speed' },
  { id: 'feast', title: 'Host a settlement feast', detail: 'Invite everyone to gather, eat, and make a memory.', cost: '3 cooked meals · clear skies' },
];

export function AdventureHud({ simulation, paused, walking, obscured, onIntent, onFocus, onGuideChange }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('journey');
  const game = simulation.game;
  const player = game.player;
  const quest = game.quest;
  const next = quest?.intent ? game.nextStep(quest.intent) : null;
  const chapter = game.stats.completed.length;
  const levelStart = [0, 0, 60, 180, 380][game.level];
  const levelEnd = [0, 60, 180, 380, 380][game.level];
  const xpPercent = game.level === 4 ? 100 : (player.xp - levelStart) / (levelEnd - levelStart) * 100;

  const changeOpen = (value: boolean) => { setOpen(value); onGuideChange(value); };
  const act = (intent: Intent) => { changeOpen(false); game.onboarded = true; onIntent(intent); };
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'b' || event.repeat || (event.target as HTMLElement)?.closest('input,textarea,[role="dialog"]')) return;
      if (obscured) return;
      event.preventDefault();
      setOpen(value => !value);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [obscured]);
  useEffect(() => { onGuideChange(open); }, [open, onGuideChange]);

  return <>
    <button className="icon-btn field-guide-toggle" aria-label="Open field guide and backpack" title="Field guide (B)" onClick={() => changeOpen(true)}><Backpack /></button>
    <section className="traveler-status glass" aria-label="Traveler progress">
      <button className="traveler-heading" onClick={onFocus} title="Find your traveler"><span className="traveler-symbol"><Navigation /></span><span><small>Mosswood Hollow</small><strong>{game.title}</strong></span><span className="level-number">{game.level}</span></button>
      <Progress className="xp-meter" value={xpPercent} aria-label={`Level ${game.level}. ${player.xp} experience points`} />
      <div className="traveler-vitals"><span><Zap />{Math.round(player.energy)} energy</span><button onClick={() => { setTab('supplies'); changeOpen(true); }}><Backpack />{itemKeys.reduce((sum, item) => sum + player.inventory[item], 0)} items</button></div>
    </section>

    {!obscured && <section className={`quest-card glass ${game.finished ? 'journey-complete' : ''}`} aria-label="Current objective">
      <div className="quest-eyebrow"><span><Flag />Your journey</span><button onClick={() => { setTab('journey'); changeOpen(true); }}>{Math.min(chapter + 1, 6)} / 6 <ChevronRight /></button></div>
      <h2>{quest?.title ?? 'You belong here.'}</h2>
      <p>{game.onboarded ? quest?.description ?? 'The Hollow has a new home, and you helped build it. Keep exploring and making memories.' : 'Your story starts here. Meet your neighbors, gather supplies, and help this little settlement grow.'}</p>
      {quest && <div className="quest-checklist">{quest.tasks.map(task => <div key={task.label} className={task.value >= task.target ? 'task-done' : ''}><span>{task.value >= task.target ? <Check /> : <i />}{task.label}</span><b>{Math.min(task.value, task.target)}/{task.target}</b></div>)}</div>}
      {next ? <button className="journey-primary" onClick={() => act(next)}><Navigation />{game.onboarded ? game.labelFor(next) : 'Begin your journey'}<ChevronRight /></button> : <button className="journey-primary" onClick={() => { setTab('journey'); changeOpen(true); }}><Sparkles />View your story<ChevronRight /></button>}
      {!game.onboarded && <small className="quest-tip">Choose a task and your traveler walks there.</small>}
    </section>}

    {game.intent && !open && <div className="travel-status glass" role="status">
      <div><Navigation /><span>{paused ? 'Paused · ' : game.action ? '' : 'Walking to '}{game.labelFor(game.intent)}</span><button aria-label="Cancel current task" onClick={() => game.cancel()}><X /></button></div>
      {game.action ? <Progress value={game.progress * 100} aria-label="Task progress" /> : <small>{Math.ceil(game.distance(game.destination!))} m away · {walking ? 'Walking manually cancels this task' : 'Your traveler is on the way'}</small>}
    </div>}
    {walking && !obscured && <button className="interact-button glass" disabled={paused || !!game.intent} onClick={() => game.interactNearby()}><Leaf />Interact <kbd>E</kbd></button>}

    <Sheet open={open} onOpenChange={changeOpen}>
      <SheetContent className="journal-sheet field-guide">
        <SheetHeader><div className="guide-kicker"><BookOpen />A traveler’s companion</div><SheetTitle>Your field guide</SheetTitle><SheetDescription>Build a life in Mosswood, one small act at a time.</SheetDescription></SheetHeader>
        <Tabs value={tab} onValueChange={setTab} className="journal-tabs guide-tabs">
          <TabsList><TabsTrigger value="journey">Journey</TabsTrigger><TabsTrigger value="supplies">Supplies</TabsTrigger><TabsTrigger value="build">Build</TabsTrigger><TabsTrigger value="camp">Camp</TabsTrigger></TabsList>
          <TabsContent value="journey">
            <div className="journey-overview"><span>Level {game.level} · {game.title}</span><strong>{player.xp} XP</strong></div>
            <Progress value={chapter / 6 * 100} aria-label={`${chapter} of 6 chapters complete`} />
            <p className="guide-note">{chapter} of 6 chapters complete. Tasks are saved on this device.</p>
            {game.quests().map((q, index) => {
              const complete = game.stats.completed.includes(q.id);
              const current = quest?.id === q.id;
              const step = q.intent && game.nextStep(q.intent);
              return <article className={`chapter-card ${current ? 'current' : ''}`} key={q.id}>
                <div className="chapter-heading"><span>{complete ? <Check /> : String(index + 1).padStart(2, '0')}</span><h3>{q.title}</h3><small>+{q.xp} XP</small></div>
                <p>{q.description}</p>
                {current && <><div className="quest-checklist">{q.tasks.map(task => <div className={task.value >= task.target ? 'task-done' : ''} key={task.label}><span>{task.label}</span><b>{Math.min(task.value, task.target)}/{task.target}</b></div>)}</div>{step && <button className="guide-action" onClick={() => act(step)}><Navigation />{game.labelFor(step)}<ChevronRight /></button>}</>}
                {!current && !complete && <small className="guide-note">Complete the earlier chapters to earn this reward.</small>}
              </article>;
            })}
          </TabsContent>

          <TabsContent value="supplies">
            <div className="inventory-grid">{itemKeys.map(item => <div key={item}><i style={{ background: ITEMS[item].color }} /><strong>{player.inventory[item]}</strong><span>{ITEMS[item].label}</span></div>)}</div>
            <div className="map-heading"><span><MapPin />Mosswood trail map</span><small>Tap a gathering spot</small></div>
            <svg className="trail-map" viewBox="-42 -42 84 84" role="group" aria-label="Gathering locations. North is at the top.">
              <rect x="-42" y="-42" width="84" height="84" rx="3" fill="#23362c" />
              <path d="M 1 -30 Q -3 -7 0 0 T -4 35 M -30 8 Q 0 6 35 17" fill="none" stroke="#907958" strokeWidth="1" opacity=".6" />
              <ellipse cx="25" cy="9" rx="10" ry="16.1" fill="#405e60" opacity=".8" />
              <text x="-36" y="-34" fontSize="3" fill="#b2c2b5">N ↑</text>
              {Object.values(PROJECTS).map(p => <rect key={p.id} x={p.x - 1} y={p.z - 1} width="2" height="2" fill={game.stats.projects.includes(p.id) ? '#e4c483' : 'none'} stroke="#e4c483" strokeWidth=".4" />)}
              <circle cx={CAMP.x} cy={CAMP.z} r="1.3" fill="#efb17d"><title>Campfire</title></circle>
              {RESOURCES.map(node => <g key={node.id} role="button" tabIndex={0} aria-label={`${node.label}, ${game.nodes[node.id].charges} harvests available`} className="map-spot" onClick={() => act({ kind: 'gather', id: node.id })} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); act({ kind: 'gather', id: node.id }); } }}>
                <title>{node.label}</title><circle cx={node.x} cy={node.z} r="3" fill="transparent" /><circle cx={node.x} cy={node.z} r="1.15" fill={ITEMS[node.item].color} opacity={game.nodes[node.id].charges ? 1 : .25} />
              </g>)}
              <circle cx={player.x} cy={player.z} r="1.45" fill="#b4ecd7" stroke="#fff" strokeWidth=".4"><title>Your traveler</title></circle>
            </svg>
            <p className="guide-note">Mint dot: you · gold squares: building sites. Gathering uses 4 energy. Rest at the campfire when you need it.</p>
            {RESOURCES.map(node => {
              const stock = game.nodes[node.id];
              return <button className="resource-row" key={node.id} disabled={!stock.charges} onClick={() => act(game.nextStep({ kind: 'gather', id: node.id }))}>
                <i style={{ background: ITEMS[node.item].color }} /><span><strong>{node.label}</strong><small>{stock.charges ? `${stock.charges} harvests · +${node.yield + (game.stats.projects.includes('garden') && ['berries', 'herbs'].includes(node.item) ? 1 : 0)} ${ITEMS[node.item].label.toLowerCase()}` : `Replenishes in ${Math.ceil(Math.max(0, stock.regrowsAt - simulation.elapsed))}s of world time`}</small></span><b>{Math.ceil(game.distance(node))} m</b><ChevronRight />
              </button>;
            })}
          </TabsContent>

          <TabsContent value="build">
            <p className="guide-note">Use your backpack supplies to improve the Hollow. Buildings stay in your world and become part of everyone’s memories.</p>
            {Object.values(PROJECTS).map(project => {
              const built = game.stats.projects.includes(project.id);
              const reason = game.canBuild(project.id);
              const step = game.nextStep({ kind: 'build', id: project.id });
              return <article className="project-card" key={project.id}>
                <div className="project-icon">{built ? <Check /> : <Hammer />}<span>{built ? 'Complete' : `+${project.xp} XP`}</span></div>
                <h3>{project.name}</h3><p>{project.description}</p>
                <div className="project-cost">{Object.entries(project.cost).map(([item, count]) => <span className={player.inventory[item as Item] >= count || built ? 'enough' : ''} key={item}>{ITEMS[item as Item].label} <b>{built ? count : `${player.inventory[item as Item]}/${count}`}</b></span>)}</div>
                {!built && <>{reason && <small className="guide-note">{reason}.</small>}<button className="guide-action" onClick={() => act(step)}>{reason ? <Navigation /> : <Hammer />}{reason ? game.labelFor(step) : 'Walk over & build'}<ChevronRight /></button></>}
              </article>;
            })}
          </TabsContent>

          <TabsContent value="camp">
            <div className="camp-intro"><Flame /><div><h3>A place around the fire</h3><p>{simulation.weather === 'rain' ? 'Rain is passing through. You can still cook and rest.' : 'The fire is warm. There’s always room for one more.'}</p></div></div>
            <div className="camp-energy"><span><Zap />Your energy</span><strong>{Math.round(player.energy)} / 100</strong></div><Progress value={player.energy} aria-label="Traveler energy" />
            {campOptions.map(option => {
              const intent: Intent = { kind: 'camp', id: option.id };
              const step = game.nextStep(intent);
              const blockedByRain = option.id === 'feast' && simulation.weather === 'rain';
              const prepared = step.kind === 'camp' && step.id === option.id;
              return <article className="camp-card" key={option.id}><h3>{option.title}</h3><p>{option.detail}</p><span className="recipe"><Utensils />{option.cost}</span><button className="guide-action" disabled={blockedByRain} onClick={() => act(step)}>{prepared ? <Flame /> : <Navigation />}{blockedByRain ? 'Waiting for clear skies' : game.labelFor(step)}<ChevronRight /></button></article>;
            })}
          </TabsContent>
        </Tabs>
        <p className="guide-footer">WASD in Walk mode · E to interact · B for this guide</p>
      </SheetContent>
    </Sheet>
  </>;
}
