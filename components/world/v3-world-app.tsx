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
import type { WorldScene, CameraMode } from './scene';

const colorStyle=(color:string)=>({'--agent-color':color} as CSSProperties);

export default function V3WorldApp(){
  const canvas=useRef<HTMLDivElement>(null),world=useRef<WorldScene|null>(null),sim=useRef<SimulationV3|null>(null);
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
    let cancelled=false;let instance:WorldScene|null=null;let autosave:ReturnType<typeof setInterval>|null=null;
    const simulation=new SimulationV3();const restored=simulation.restore();sim.current=simulation;
    import('./scene').then(({WorldScene})=>{
      if(cancelled||!canvas.current)return;
      try{
        let lastNotice=0;
        instance=new WorldScene(canvas.current,simulation,{onSelect:choose,onIntent:act,onReady:()=>setReady(true),onError:setError,onFrame:()=>{const notice=simulation.game.notices.at(-1);if(notice&&notice.id>lastNotice){lastNotice=notice.id;notify(notice.text);}render(n=>n+1);}});
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
        <button className={`icon-btn ${multiplayerOpen?'active':''}`} aria-label="Open multiplayer" title="Multiplayer (M)" onClick={()=>setMultiplayerOpen(p=>!p)}><Radio/></button>
        <button className={`icon-btn ${sound?'active':''}`} aria-label={sound?'Mute forest sounds':'Enable forest sounds'} title={sound?'Mute sounds':'Forest sounds'} aria-pressed={sound} onClick={audio}>{sound?<Volume2/>:<VolumeX/>}</button>
        <button className="icon-btn" aria-label="Open world journal" title="World journal (J)" onClick={()=>setJournal(true)}><BookOpen/></button>
        <button className="icon-btn" aria-label="How to explore" title="V3 help" onClick={()=>setHelp(true)}><CircleHelp/></button>
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
          <form className="chat-form v3-chat-form" onSubmit={onSubmit}><input ref={input} value={message} onChange={e=>setMessage(e.target.value)} aria-label={`Speak to ${agent.name}`} placeholder={`Talk or type to ${agent.name}…`} maxLength={240}/><button type="button" className={`voice-btn ${voice.listening?'listening':''}`} aria-label={voice.listening?'Stop microphone':'Talk with microphone'} title={voice.supported?'Talk with microphone':'Voice input unsupported'} onClick={()=>voice.listening?voice.stop():voice.start()} disabled={!voice.supported}>{voice.listening?<MicOff/>:<Mic/>}</button><button type="submit" aria-label="Send message" disabled={!message.trim()}><Send/></button></form>
          {voice.listening&&<p className="voice-status"><span className="v3-online-dot"/> Listening… speak naturally to {agent.name}.</p>}
          {voice.error&&<p className="interaction-hint">{voice.error}</p>}
          <div className="quick-chat">{['Why did you choose that?','What do you remember about me?','Who is your closest friend?'].map(t=><button key={t} onClick={()=>send(t)}>{t}</button>)}</div>
          {reply&&<p className="chat-response" aria-live="polite">{reply}</p>}
          <p className="interaction-hint">V3 dialogue uses memory retrieval, needs, role, mood, relationships and player facts. Microphone conversations are spoken back through browser TTS.</p>
        </>}
      </SheetContent>}
    </Sheet>

    <MultiplayerPanel open={multiplayerOpen} onClose={()=>setMultiplayerOpen(false)} getLocalPlayer={getLocalPlayer} onRemoteChat={onRemoteChat}/>

    <span className="world-badge"><Leaf/> V3 · smarter agents · voice · multiplayer</span>
    <span className="explore-tip">{mode==='walk'?<><Footprints size={13}/> Drag to look · WASD to walk · E to interact</>:<><MousePointer2 size={13}/> Drag to explore · select a resource to gather</>}</span>
    {mode==='walk'&&<><div className="crosshair"/><div className="walk-controls" aria-label="Walking controls">{[['w','Walk forward',ArrowUp],['a','Walk left',ArrowLeft],['s','Walk backward',ArrowDown],['d','Walk right',ArrowRight]].map(([key,label,Icon])=>{const I=Icon as typeof ArrowUp;return <button key={key as string} aria-label={label as string} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);world.current?.keys.add(key as string);}} onPointerUp={()=>world.current?.keys.delete(key as string)} onPointerCancel={()=>world.current?.keys.delete(key as string)} onLostPointerCapture={()=>world.current?.keys.delete(key as string)}><I/></button>;})}</div></>}

    <div className="bottom-hud">
      <section className="conversation-card glass" aria-label="Latest world conversation"><div className="conversation-title"><span><i className="live-dot"/>{paused?'World paused':'Life in the clearing'}</span><button onClick={()=>setJournal(true)}>Open journal ↗</button></div><p className="conversation-message"><strong>{last?.speaker??'Mosswood Hollow'}</strong>{last?.kind==='speech'?' · “':' · '}{last?.text??'The inhabitants are choosing what matters next.'}{last?.kind==='speech'?'”':''}</p><span className="conversation-meta">{last?.target&&<>{last.target==='You'?'Speaking to you':`with ${last.target}`}<span>·</span></>}{clockLabel(last?.time??980)}<span>·</span>{last?.kind==='speech'?'Conversation':last?.kind==='action'?'A small moment':'World journal'}</span></section>
      <div className="world-controls glass" aria-label="Simulation controls"><button className="control-btn" aria-label={paused?'Resume world':'Pause world'} title="Pause / resume (Space)" onClick={togglePause}>{paused?<Play/>:<Pause/>}</button><button className="control-btn speed-btn" onClick={nextSpeed} aria-label={`Simulation speed ${speed} times. Change speed.`}>{speed}×</button><span className="control-divider"/><button className={`control-btn ${mode==='orbit'?'active':''}`} onClick={()=>setCamera('orbit')} aria-pressed={mode==='orbit'}><Orbit/>Orbit</button><button className={`control-btn ${mode==='walk'?'active':''}`} onClick={()=>setCamera('walk')} aria-pressed={mode==='walk'}><Footprints/>Walk</button></div>
      <div className="world-event"><DropdownMenu><DropdownMenuTrigger asChild><button className="event-button glass"><Sparkles/>World events</button></DropdownMenuTrigger><DropdownMenuContent className="event-dropdown glass" side="top" align="end" sideOffset={13}><DropdownMenuLabel className="event-label">Change their day</DropdownMenuLabel><DropdownMenuItem className="event-option" onSelect={()=>triggerEvent('gather')}><Users/><span><strong>Gather at the fire</strong><small>Bring everyone together</small></span></DropdownMenuItem><DropdownMenuItem className="event-option" onSelect={()=>triggerEvent('rain')}><CloudRain/><span><strong>{s?.weather==='rain'?'Clear the skies':'A passing rainstorm'}</strong><small>{s?.weather==='rain'?'Return to the woodland trails':'Watch priorities change'}</small></span></DropdownMenuItem><DropdownMenuItem className="event-option" onSelect={()=>triggerEvent('sunset')}><Sunrise/><span><strong>Let evening fall</strong><small>Lanterns, embers, and fireflies</small></span></DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
    </div>
    {toast&&<div className="toast glass" role="status"><Check/>{toast}</div>}

    <Sheet open={journal} onOpenChange={setJournal}><SheetContent className="journal-sheet"><SheetHeader><SheetTitle>The world remembers.</SheetTitle><SheetDescription>V3 keeps inhabitant memories, relationships, player facts and multiplayer conversations.</SheetDescription></SheetHeader><Tabs defaultValue={agent?'memories':'journal'} className="journal-tabs"><TabsList><TabsTrigger value="journal">Journal</TabsTrigger><TabsTrigger value="memories">Memories</TabsTrigger><TabsTrigger value="bonds">Bonds</TabsTrigger></TabsList><TabsContent value="journal">{s?.events.map(e=><article key={e.id} className="journal-entry"><time>Day {Math.floor(e.time/1440)+1} · {clockLabel(e.time)}</time><p><strong>{e.speaker}</strong>{e.target?` to ${e.target}`:''}<br/>{e.kind==='speech'?`“${e.text}”`:e.text}</p></article>)}</TabsContent><TabsContent value="memories">{(agent?[agent]:agents).map(a=><div key={a.id}><div className="journal-icon" style={{color:a.color}}><Brain/>{a.name} · {a.memories.length} memories</div>{a.memories.map((m,i)=><article className="journal-entry" key={`${a.id}-${i}`}><time>Day {Math.floor(m.time/1440)+1} · {clockLabel(m.time)}</time><p>{m.text}</p></article>)}</div>)}</TabsContent><TabsContent value="bonds">{agents.flatMap((a,i)=>agents.slice(i+1).filter(b=>(a.relationships[b.id]??0)>0).map(b=><div className="relationship" key={`${a.id}-${b.id}`}><span className="avatar" style={colorStyle(a.color)}>{a.name[0]}</span><div><strong>{a.name} & {b.name}</strong><p>{(a.relationships[b.id]??0)>60?'A growing friendship':(a.relationships[b.id]??0)>25?'Getting to know each other':'A first connection'}</p></div><span>{a.relationships[b.id]}%</span></div>))}<div className="journal-entry"><time>V3 player memory</time><p>{s?.rememberedPlayerFacts.length?s.rememberedPlayerFacts.join(' · '):'Tell an inhabitant something about yourself and ask them to remember it.'}</p></div></TabsContent></Tabs><p className="help-note" style={{display:'flex',gap:7,alignItems:'center',margin:0}}><Save size={14}/>{saved?'Saved on this device':'World saves on this device every 10 seconds'}</p></SheetContent></Sheet>

    <Dialog open={help} onOpenChange={setHelp}><DialogContent className="help-dialog"><DialogHeader><DialogTitle>Emberwild V3</DialogTitle><DialogDescription className="help-note">A shared settlement with more autonomous inhabitants.</DialogDescription></DialogHeader><div className="help-grid"><div><Brain/><strong>Smarter agents</strong><p>Agents score competing needs, role duties, resources, relationships and recent memories before choosing their next action.</p></div><div><Mic/><strong>Voice conversations</strong><p>Open an inhabitant, press the microphone, speak naturally, and the browser transcribes your words. The inhabitant answers aloud.</p></div><div><Radio/><strong>Multiplayer rooms</strong><p>Join with a room code. Player position, level, activity, presence and room messages synchronize through the V3 multiplayer transport.</p></div><div><Hammer/><strong>V2 progression remains</strong><p>The six chapters, gathering, cooking, construction, mobile controls and saved worlds continue underneath V3.</p></div></div><p className="help-note">Internet multiplayer uses the V3 WebSocket room server when `NEXT_PUBLIC_EMBERWILD_WS_URL` is configured. Without it, the game falls back to a same-browser test room so two tabs can connect immediately.</p><p className="help-note">Space: pause · B: field guide · J: journal · M: multiplayer · E: interact · Escape: close panels.</p><button className="help-main" onClick={()=>setHelp(false)}>Back to Mosswood</button></DialogContent></Dialog>

    {(!ready||error)&&<div className="load-screen"><Flame strokeWidth={1}/><h2>EMBERWILD V3</h2>{error?<><p>{error}</p><button className="help-main" onClick={()=>window.location.reload()}>Reload world</button></>:<><p>Connecting minds, voices, and travelers…</p><div className="load-line"><span/></div></>}</div>}
  </main>;
}
