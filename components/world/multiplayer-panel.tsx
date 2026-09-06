'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Radio, Send, Users, X } from 'lucide-react';
import { MultiplayerClient, type MultiplayerChat, type MultiplayerPlayer } from './multiplayer';

type LocalPlayerState = {
  x: number;
  z: number;
  heading: number;
  level: number;
  activity: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  getLocalPlayer: () => LocalPlayerState | null;
  onRemoteChat?: (chat: MultiplayerChat) => void;
  onPlayers?: (players: MultiplayerPlayer[], localId: string) => void;
};

const makeRoom = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const appStoreBuild = process.env.NEXT_PUBLIC_APP_STORE_BUILD === '1';

export function MultiplayerPanel({ open, onClose, getLocalPlayer, onRemoteChat, onPlayers }: Props) {
  const client = useMemo(() => new MultiplayerClient(), []);
  const [name, setName] = useState('Traveler');
  const [room, setRoom] = useState('MOSSWOOD');
  const [status, setStatus] = useState('Not connected');
  const [players, setPlayers] = useState<MultiplayerPlayer[]>([]);
  const [chat, setChat] = useState<MultiplayerChat[]>([]);
  const [message, setMessage] = useState('');
  const [joined, setJoined] = useState(false);
  const syncTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const updatePlayers = (next: MultiplayerPlayer[]) => {
    const visible = appStoreBuild
      ? next.map((player, index) => ({ ...player, name: player.id === client.id ? 'You' : `Traveler ${index + 1}` }))
      : next;
    setPlayers(visible);
    onPlayers?.(visible, client.id);
  };

  const receiveChat = (entry: MultiplayerChat) => {
    if (appStoreBuild) return;
    setChat(current => [...current.slice(-29), entry]);
    if (entry.playerId !== client.id) onRemoteChat?.(entry);
  };

  const join = () => {
    const playerName = appStoreBuild ? `Traveler-${client.id.slice(0, 4).toUpperCase()}` : name;
    client.connect({ room, name: playerName, onPlayers: updatePlayers, onChat: receiveChat, onStatus: setStatus });
    setJoined(true);
    if (syncTimer.current) clearInterval(syncTimer.current);
    syncTimer.current = setInterval(() => {
      const state = getLocalPlayer();
      if (state) client.publishPlayer(state);
    }, 250);
  };

  const leave = () => {
    client.disconnect();
    if (syncTimer.current) clearInterval(syncTimer.current);
    syncTimer.current = null;
    setPlayers([]);
    onPlayers?.([], client.id);
    setJoined(false);
    setStatus('Not connected');
  };

  useEffect(() => () => leave(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = () => {
    if (appStoreBuild || !message.trim()) return;
    client.sendChat(message);
    setMessage('');
  };

  if (!open) return null;
  return <aside className="v3-multiplayer glass" aria-label="Multiplayer room">
    <div className="v3-panel-title"><span><Radio size={18}/> Multiplayer</span><button onClick={onClose} aria-label="Close multiplayer panel"><X size={18}/></button></div>
    {!joined ? <div className="v3-room-setup">
      {!appStoreBuild&&<label>Traveler name<input value={name} onChange={e=>setName(e.target.value)} maxLength={30}/></label>}
      <label>Room code<div className="v3-room-row"><input value={room} onChange={e=>setRoom(e.target.value.toUpperCase())} maxLength={20}/><button onClick={()=>setRoom(makeRoom())}>New</button></div></label>
      <button className="v3-primary" onClick={join}><Users size={17}/> Join room</button>
      <p>{appStoreBuild ? 'App Store multiplayer shares live player presence and movement. Open player chat is disabled in this release while moderation tools are being completed.' : 'Without a configured WebSocket server, V3 automatically uses a same-browser test room so you can open two tabs and test multiplayer immediately.'}</p>
    </div> : <>
      <div className="v3-room-status"><strong>{room}</strong><span>{status}</span><button onClick={leave}>Leave</button></div>
      <div className="v3-player-list">
        {players.map(player=><div key={player.id}><span className="v3-online-dot"/><strong>{player.name}{player.id===client.id?' (you)':''}</strong><small>Lv.{player.level} · {player.activity}</small></div>)}
      </div>
      {!appStoreBuild&&<>
        <div className="v3-chat-log">
          {chat.length===0&&<p>No player messages yet.</p>}
          {chat.map(entry=><p key={entry.id}><strong>{entry.playerName}</strong> {entry.text}</p>)}
        </div>
        <div className="v3-player-chat"><input value={message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')submit();}} placeholder="Message the room…" maxLength={240}/><button onClick={submit} aria-label="Send room message"><Send size={17}/></button></div>
      </>}
    </>}
  </aside>;
}
