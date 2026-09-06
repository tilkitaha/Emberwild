'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { Flame, Sun, Moon, CloudRain, Volume2, VolumeX, BookOpen, CircleHelp, Pause, Play, Footprints, Orbit, Crosshair, Sparkles, Users, Sunrise, X, MessageCircle, Brain, Send, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Leaf, MousePointer2, Check, Save, Backpack, Hammer, Mic, MicOff, Radio } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { clockLabel } from './simulation';
import { SimulationV3 } from './simulation-v3';
import { AdventureHud } from './adventure-hud';
import { MultiplayerPanel } from './multiplayer-panel';
import { useVoiceChat } from './use-voice-chat';
import type { Intent } from './adventure';
import type { MultiplayerChat } from './multiplayer';
import type { CameraMode } from './scene';
import type { V3WorldScene } from './scene-v3';

const colorStyle=(color:string)=>({'--agent-color':color} as CSSProperties);

export default function V3WorldApp(){
  const canvas=useRef<HTMLDivElement>(null),world=useRef<V3WorldScene|null>(null),sim=useRef<SimulationV3|null>(null);
  const [ready,setReady]=useState(false),[error,setError]=useState(''),[,render]=useState(0);
  const [selected,setSelected]=useState<string|null>(null),[mode,setMode]=useState<CameraMode>('orbit'),[paused,setPaused]=useState(false),[speed,setSpeed]=useState(1),[sound,setSound]=useState(false);
  const [journal,setJournal]=useState(false),[help,setHelp]=useState(false),[chatOpen,setChatOpen]=useState(false),[message,setMessage]=useState(''),[reply,setReply]=useState(''),[toast,setToast]=useState(''),[saved,setSaved]=useState(false);
  const [guideOpen,setGuideOpen]=useState(false),[multiplayerOpen,setMultiplayerOpen]=useState(false);
  const toastTimer=useRef<ReturnType<typeof setTimeout>|null>(null),selectedRef=useRef<string|null>(null),input=useRef<HTMLInputElement>(null);
  const voiceSendRef=useRef<(text:string)=>void>(()=>{});

  const notify=useCallback((s:string)=>{setToast(s);if(toastTimer.current)clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(''),4200);},[]);
  const choose=useCallback((id:string|null)=>{selectedRef.current=id;setSelected(id);setChatOpen(false);setReply('');setMessage('');world.current?.select(id);},[]);
  const act=useCallback((intent:Intent)=>{const simulation=sim.current;if(!simulation)return;choose(null);simulation.game.onboarded=true;simulation.game.travel(intent);setPaused(false);if(world.current){world.current.paused=false;world.current.focusPlayer();setMode(world.current.mode);}render(n=>n+1);},[choose]);
  const changeGuide=useCallback((open:boolean)=>{setGuideOpen(open);if(open){choose(null);world.current?.keys.clear();}},[choose]);
  const voice=useVoiceChat(text=>voiceSendRef.current(text));

  useEffect(()=>{
    let cancelled=false;let instance:V3WorldScene|null=null;let autosave:ReturnType<typeof setInterval>|null=null;
    const simulation=new SimulationV3();const restored=simulation.restore();sim.current=simulation;
    import('./scene-v3').then(({V3WorldScene})=>{
      if(cancelled||!canvas.current)return;
      try{
        let lastNotice=0;
        instance=new V3WorldScene(canvas.current,simulation,{onSelect:choose,onIntent:act,onReady:()=>setReady(true),onError:setError,onFrame:()=>{const notice=simulation.game.notices.at(-1);if(notice&&notice.id>lastNotice){lastNotice=notice.id;notify(notice.text);}render(n=>n+1);}});
        world.current=instance;
        if(restored)notify('Welcome back. V3 remembers your V2 world.');
        autosave=setInterval(()=>setSaved(simulation.save()),10000);
      }catch(e){console.error('World initialization failed',e);setError('This world needs a browser with WebGL 2. Try opening it in Safari or Chrome, then reload.');}
    }).catch(()=>setError('The world could not load. Check your connection and reload.'));
    return()=>{cancelled=true;if(autosave)clearInterval(autosave);if(toastTimer.current)clearTimeout(toastTimer.current);simulation.save();instance?.dispose();world.current=null;};
  },[choose,notify,act]);

  useEffect(()=>{if(world.current){world.current.inputEnabled=!journal&&!help&&!guideOpen&&!multiplayerOpen;if(journal||help||guideOpen||multiplayerOpen)world.current.keys.clear();}},[journal,help,guideOpen,multiplayerOpen]);
  useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if((e.target as HTMLElement)?.closest('input,textarea,[role="dialog"]')||(e.key===' '&&(e.target as HTMLElement)?.closest('button,a,[role="button"]')))return;if(e.key===' '){e.preventDefault();setPaused(p=>{if(world.current)world.current.paused=!p;return !p;});}if(e.key.toLowerCase()==='j')setJournal(p=>!p);if(e.key.toLowerCase()==='m')setMultiplayerOpen(p=>!p);if(e.key==='Escape'){choose(null);setMultiplayerOpen(false);if(world.current?.mode==='walk'){world.current.setMode('orbit');setMode('orbit');}}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);},[choose]);

  const s=sim.current;
  const agents=s?.agents??[];
  const agent=agents.find(a=>a.id===selected);
  const last=s?.events.find(e=>e.kind==='speech')??s?.events[0];
  const hour=((s?.time??980)%1440)/60;
  const WeatherIcon=s?.weather==='rain'?CloudRain:hour>19.5||hour<6?Moon:Sun;
  const setCamera=(next:CameraMode)=>{world.current?.setMode(next);setMode(next);if(next==='walk'){choose(null);notify('Drag to look. Use the arrows or WASD to walk.');}else if(next==='follow')notify(`Following ${sim.current?.agents.find(a=>a.id===selectedRef.current)?.name??'Rowan'}.`);};
  const togglePause=()=>{setPaused(p=>{if(world.current)world.current.paused=!p;return !p;});};
  const nextSpeed=()=>{const next=speed===1?2:speed===2?4:1;setSpeed(next);if(world.current)world.current.speed=next;};
  const triggerEvent=(kind:'rain'|'gather'|'sunset')=>{if(!s)return;notify(s.event(kind));if(paused){setPaused(false);if(world.current)world.current.paused=false;}render(n=>n+1);};
  const send=(text:string,spoken=false)=>{if(!s||!selected||!text.trim())return;const answer=s.chat(selected,text);setReply(answer);setMessage('');if(spoken)voice.speak(answer);render(n=>n+1);};
  voiceSendRef.current=(text:string)=>{setMessage(text);send(text,true);};
  const onSubmit=(e:FormEvent)=>{e.preventDefault();send(message,false);};
  const startChat=()=>{setChatOpen(p=>!p);setTimeout(()=>input.current?.focus(),70);};
  const audio=async()=>{try{const enabled=await world.current?.toggleAudio();setSound(!!enabled);}catch{notify('Sound isn’t available in this browser.');}};
  const need=(label:string,value:number)=><div className="need-row" key={label}><span>{label}</span><Progress value={value} aria-label={`${label}: ${Math.round(value)} percent`} /><span>{Math.round(value)}%</span></div>;
  const onRemoteChat=(entry:MultiplayerChat)=>{s?.log('speech',entry.playerName,entry.text,'Multiplayer room');render(n=>n+1);};
  const getLocalPlayer=()=>{if(!s)return null;const p=s.game.player;return{x:p.x,z:p.z,heading:p.heading,level:s.game.level,activity:s.game.quest?.title??'Exploring Mosswood'};};

  return <main className="world-app" data-camera={mode} data-version="v3">
    <div className="world-canvas" ref={canvas}/><div className="world-shade"/>
    <header className="topbar">
      <div className="brand"><Flame size={34} strokeWidth={1.25}/><div><h1>EMBERWILD <sup className="v3-tag">V3</sup></h1><p className="brand-sub">A shared living world</p></div></div>
      <div className="top-time"><WeatherIcon size={18}/><span>Day {Math.floor((s?.time??980)/1440)+1}</span><span className="time-divider"/><span>{clockLabel(s?.time??980)}</span><span className="time-divider"/><span>{s?.weather==='rain'?'Passing rain':hour>19.5||hour<6?'Under the stars':hour>17?'Evening light':'Golden afternoon'}</span></div>
      <nav className="top-actions" aria-label="World tools">
        <button className={`icon-btn multiplayer-top-btn ${multiplayerOpen?'active':''}`} aria-label="Open multiplayer" title="Multiplayer (M)" onClick={()=>setMultiplayerOpen(p=>!p)}><Radio/><span>Multiplayer</span></button>
        <button className={`icon-btn secondary-top-action ${sound?'active':''}`} aria-label={sound?'Mute forest sounds':'Enable forest sounds'} title={sound?'Mute sounds':'Forest sounds'} aria-pressed={sound} onClick={audio}>{sound?<Volume2/>:<VolumeX/>}</button>
        <button className="icon-btn secondary-top-action" aria-label="Open world journal" title="World journal (J)" onClick={()=>setJournal(true)}><BookOpen/></button>
        <button className="icon-btn secondary-top-action" aria-label="How to explore" title="V3 help" onClick={()=>setHelp(true)}><CircleHelp/></button>
      </nav>
    </header>

    <section className="location" aria-label="Current location"><span className="eyebrow">The Northern Woodlands</span><h2>Mosswood Hollow</h2><p>Every life remembers. Every player changes the story.</p><div className="location-line"/></section>
    <nav className="roster" aria-label="Meet the inhabitants"><p className="roster-heading">{agents.length||6} intelligent inhabitants</p>{agents.map(a=><button key={a.id} className={`resident-btn ${selected===a.id?'selected':''}`} style={colorStyle(a.color)} aria-label={`${a.name}, ${a.role}. ${a.activity}`} aria-pressed={selected===a.id} onClick={()=>choose(selected===a.id?null:a.id)}><span className="avatar">{a.name.charAt(0)}</span><span className="resident-copy"><strong>{a.name}</strong><small>{a.activity.startsWith('Walking')?'On the move':a.activity}</small></span></button>)}</nav>
    {s&&ready&&<AdventureHud simulation={s} paused={paused} walking={mode==='walk'} obscured={!!agent||journal||help||guideOpen||multiplayerOpen} onIntent={act} onGuideChange={changeGuide} onFocus={()=>{world.current?.focusPlayer();setMode(world.current?.mode??'orbit');choose(null);}}/>}

    <Sheet open={!!agent&&!journal&&!help&&!guideOpen&&!multiplayerOpen} modal={false} onOpenChange={open=>{if(!open)choose(null);}}>
      {agent&&<SheetContent className="agent-panel glass agent-sheet" showCloseButton={false} onOpenAutoFocus={e=>e.preventDefault()} onCloseAutoFocus={e=>e.preventDefault()} onInteractOutside={e=>e.preventDefault()}>
        <button className="panel-close" aria-label="Close inhabitant details" onClick={()=>choose(null)}><X/></button>
        <div className="panel-top"><span className="avatar large" style={colorStyle(agent.color)}>{agent.name.charAt(0)}</span><div><SheetTitle className="agent-name">{agent.name}</SheetTitle><SheetDescription className="agent-role">{agent.role} · V3 autonomous agent</SheetDescription></div></div>
        <div className="agent-traits">{agent.traits.map(t=><span key={t}>{t}</span>)}</div>
        <div className="agent-goal"><label>Current intention</label>{agent.goal}</div>
        <div>{need('Energy',agent.energy)}{need('Nourished',agent.food)}{need('Belonging',agent.social)}</div>
        {!chatOpen&&<p className="memory-preview"><label><Brain/> Relevant memory</label>“{agent.memories[0]?.text}”</p>}
        <div className="agent-actions"><button onClick={startChat}><MessageCircle/>{chatOpen?'Close chat':'Talk'}</button><button onClick={()=>setCamera(mode==='follow'?'orbit':'follow')}><Crosshair/>{mode==='follow'?'Unfollow':'Follow'}</button><button onClick={()=>setJournal(true)}><BookOpen/>Memories</button></div>
        {chatOpen&&<>
          <form className="chat-form v3-chat-form" onSubmit={onSubmit}><input ref={input} value={message} onChange={e=>setMessage(e.target.value)} aria-label={`Speak to ${agent.name}`} placeholder={`Talk or type to ${agent.name}…`} maxLength={240}/><button type="button" className={`voice-btn ${voice.listening?'listening':''}`} aria-label={voice.listening?'Stop microphone':'Talk with microphone'} title={voice.supported?'Talk with microphone':'Open this page in Safari for voice input'} onClick={()=>voice.listening?voice.stop():voice.start()}>{voice.listening?<MicOff/>:<Mic/>}</button><button type="submit" aria-label="Send message" disabled={!message.trim()}><Send/></button></form>
          {voice.listening&&<p className="voice-status"><span className="v3-online-dot"/> Listening… speak naturally to {agent.name}.</p>}
          {!voice.supported&&!voice.error&&<p className="interaction-hint">Voice recognition is unavailable in this browser. On iPhone, open Emberwild directly in Safari; in-app browsers can expose the API without actually allowing recognition.</p>}
          {voice.error&&<p className="interaction-hint voice-error">{voice.error}</p>}
          <div className="quick-chat">{['Why did you choose that?','What do you remember about me?','Who is your closest friend?'].map(t=><button key={t} onClick={()=>send(t)}>{t}</button>)}</div>
          {reply&&<p className="chat-response" aria-live="polite">{reply}</p>}
          <p className="interaction-hint">V3 dialogue uses memory retrieval, needs, role, mood, relationships and player facts. Microphone conversations are spoken back through browser TTS.</p>
        </>}
      </SheetContent>}
    </Sheet>

    <MultiplayerPanel open={multiplayerOpen} onClose={()=>setMultiplayerOpen(false)} getLocalPlayer={getLocalPlayer} onRemoteChat={onRemoteChat} onPlayers={(players,localId)=>world.current?.setRemotePlayers(players,localId)}/>
    <span className="world-badge"><Leaf/> V3 · smarter agents · voice · multiplayer</span>
    <span className="explore-tip">{mode==='walk'?<><Footprints size={13}/> Drag to look · WASD to walk · E to interact</>:<><MousePointer2 size={13}/> Drag to explore · select a resource to gather</>}</span>
    {mode==='walk'&&<><div className="crosshair"/><div className="walk-controls" aria-label="Walking controls">{[['w','Walk forward',ArrowUp],['a','Walk left',ArrowLeft],['s','Walk backward',ArrowDown],['d','Walk right',ArrowRight]].map(([key,label,Icon])=>{const I=Icon as typeof ArrowUp;return <button key={key as string} aria-label={label as string} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);world.current?.keys.add(key as string);}} onPointerUp={()=>world.current?.keys.delete(key as string)} onPointerCancel={()=>world.current?.keys.delete(key as string)} onLostPointerCapture={()=>world.current?.keys.delete(key as string)}><I/></button>;})}</div></>}

    <div className="bottom-hud">
      <section className="conversation-card glass" aria-label="Latest world conversation"><div className="conversation-title"><span><i className="live-dot"/>{paused?'World paused':'Life in the clearing'}</span><button onClick={()=>setJournal(true)}>Open journal ↗</button></div><p className="conversation-message"><strong>{last?.speaker??'Mosswood Hollow'}</strong>{last?.kind==='speech'?' · “':' · '}{last?.text??'The inhabitants are choosing what matters next.'}{last?.kind==='speech'?'”':''}</p><span className="conversation-meta">{last?.target&&<>{last.target==='You'?'Speaking to you':last.target}<span>·</span></>}{clockLabel(last?.time??s?.time??980)}<span>·</span>{last?.kind==='speech'?'Conversation':'World journal'}</span></section>
      <div className="world-controls glass" aria-label="Simulation controls"><button className="control-btn" aria-label={paused?'Resume world':'Pause world'} title="Pause / resume (Space)" onClick={togglePause}>{paused?<Play/>:<Pause/>}</button><button className="control-btn speed-btn" onClick={nextSpeed} aria-label={`Simulation speed ${speed} times. Change speed.`}>{speed}×</button><span className="control-divider"/><button className={`control-btn ${mode==='orbit'?'active':''}`} aria-pressed={mode==='orbit'} onClick={()=>setCamera('orbit')}><Orbit/>Orbit</button><button className={`control-btn ${mode==='walk'?'active':''}`} aria-pressed={mode==='walk'} onClick={()=>setCamera('walk')}><Footprints/>Walk</button></div>
      <div className="world-event"><DropdownMenu><DropdownMenuTrigger className="event-button glass"><Sparkles/>World events</DropdownMenuTrigger><DropdownMenuContent className="event-menu glass event-dropdown" align="end" side="top"><DropdownMenuLabel className="event-label">Let the world shift</DropdownMenuLabel>{[['rain','Let rain pass through','Shelter, stories, and a slower pace.',CloudRain],['gather','Call everyone to the fire','Pause chores for a shared moment.',Users],['sunset','Skip to evening','Move time forward to the night routines.',Sunrise]].map(([id,title,desc,Icon])=>{const I=Icon as typeof CloudRain;return <DropdownMenuItem className="event-option" key={id as string} onSelect={()=>triggerEvent(id as 'rain'|'gather'|'sunset')}><I/><span><strong>{title as string}</strong><small>{desc as string}</small></span></DropdownMenuItem>;})}</DropdownMenuContent></DropdownMenu></div>
    </div>

    <Sheet open={journal} onOpenChange={setJournal}><SheetContent className="journal-sheet"><SheetHeader><SheetTitle>World journal</SheetTitle><SheetDescription>A living record of conversations, choices, memories, and V3 intentions.</SheetDescription></SheetHeader><Tabs defaultValue="events" className="journal-tabs"><TabsList><TabsTrigger value="events">Timeline</TabsTrigger><TabsTrigger value="people">Inhabitants</TabsTrigger><TabsTrigger value="bonds">Bonds</TabsTrigger></TabsList><TabsContent value="events">{(s?.events??[]).slice(0,40).map(e=><article className="journal-entry" key={e.id}><time>{clockLabel(e.time)}</time><p><strong>{e.speaker}</strong>{e.target&&<> → <strong>{e.target}</strong></>} · {e.text}</p></article>)}</TabsContent><TabsContent value="people">{agents.map(a=><article className="journal-entry" key={a.id}><div className="journal-icon" style={colorStyle(a.color)}><span className="avatar">{a.name.charAt(0)}</span>{a.role}</div><p><strong>{a.name}</strong> · {a.activity}</p><p>{a.memories.at(-1)?.text}</p></article>)}</TabsContent><TabsContent value="bonds">{s?.relationships.filter(r=>r.score>26).sort((a,b)=>b.score-a.score).map(r=>{const one=agents.find(a=>a.id===r.a),two=agents.find(a=>a.id===r.b);return <div className="relationship" key={r.a+r.b}><div><strong>{one?.name} & {two?.name}</strong><p>{r.label}</p></div><span>{r.score}%</span></div>})}</TabsContent></Tabs></SheetContent></Sheet>

    <Dialog open={help} onOpenChange={setHelp}><DialogContent className="help-dialog"><DialogHeader><DialogTitle>Enter Emberwild V3</DialogTitle><DialogDescription>Explore, speak, remember, and share the clearing.</DialogDescription></DialogHeader><div className="help-grid"><div><MousePointer2/><strong>Explore</strong><p>Drag to orbit. Tap an inhabitant or a resource marker.</p></div><div><Footprints/><strong>Walk</strong><p>Use WASD, arrow controls, or drag to look.</p></div><div><Mic/><strong>Speak</strong><p>Select an inhabitant, open Talk, then use the microphone in Safari/Chrome where supported.</p></div><div><Radio/><strong>Multiplayer</strong><p>Use the Multiplayer button and share the same room code with another device.</p></div></div></DialogContent></Dialog>

    {toast&&<div className="toast glass"><Check/>{toast}</div>}
    {saved&&<span className="save-indicator"><Save/>Saved</span>}
    {!ready&&!error&&<div className="load-screen"><Flame/><h2>EMBERWILD V3</h2><p>Connecting minds, voices, and travelers…</p><div className="load-line"><span/></div></div>}
    {error&&<div className="load-screen"><Flame/><h2>Emberwild is resting</h2><p>{error}</p><button className="help-main" onClick={()=>location.reload()}>Try again</button></div>}
  </main>;
}