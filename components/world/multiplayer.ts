'use client';

export type MultiplayerPlayer = {
  id: string;
  name: string;
  x: number;
  z: number;
  heading: number;
  level: number;
  activity: string;
  updatedAt: number;
};

export type MultiplayerChat = {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  at: number;
};

type MultiplayerMessage =
  | { type: 'hello'; player: MultiplayerPlayer }
  | { type: 'state'; player: MultiplayerPlayer }
  | { type: 'leave'; playerId: string }
  | { type: 'chat'; chat: MultiplayerChat }
  | { type: 'snapshot'; players: MultiplayerPlayer[] };

type Options = {
  room: string;
  name: string;
  onPlayers: (players: MultiplayerPlayer[]) => void;
  onChat: (chat: MultiplayerChat) => void;
  onStatus: (status: string) => void;
};

const randomId = () => (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).slice(0, 18);
const sanitizeRoom = (room: string) => room.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20) || 'MOSSWOOD';
const PUBLIC_RELAY = 'wss://router.metapage.io';

export class MultiplayerClient {
  readonly id = randomId();
  private socket: WebSocket | null = null;
  private channel: BroadcastChannel | null = null;
  private options: Options | null = null;
  private players = new Map<string, MultiplayerPlayer>();
  private local: MultiplayerPlayer | null = null;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private mode: 'websocket' | 'relay' | 'local' | null = null;
  private manualDisconnect = false;

  connect(options: Options) {
    this.disconnect();
    this.manualDisconnect = false;
    this.options = { ...options, room: sanitizeRoom(options.room), name: options.name.trim().slice(0, 30) || 'Traveler' };
    this.local = { id: this.id, name: this.options.name, x: 0, z: 0, heading: 0, level: 1, activity: 'Joining Mosswood', updatedAt: Date.now() };
    this.players.set(this.id, this.local);

    const endpoint = process.env.NEXT_PUBLIC_EMBERWILD_WS_URL?.trim();
    if (endpoint) this.connectWebSocket(endpoint);
    else this.connectPublicRelay();

    this.heartbeat = setInterval(() => this.local && this.publish(this.local), 1500);
    this.cleanupTimer = setInterval(() => this.cleanupStale(), 4000);
    this.emitPlayers();
  }

  private connectWebSocket(endpoint: string) {
    if (!this.options) return;
    const url = new URL(endpoint, window.location.href);
    url.searchParams.set('room', this.options.room);
    url.searchParams.set('player', this.id);
    url.searchParams.set('name', this.options.name);
    this.openSocket(url.toString(), 'websocket');
  }

  private connectPublicRelay() {
    if (!this.options) return;
    const channelName = `emberwild-v3-${this.options.room}`;
    this.openSocket(`${PUBLIC_RELAY}/${encodeURIComponent(channelName)}`, 'relay');
  }

  private openSocket(url: string, mode: 'websocket'|'relay') {
    if (!this.options || this.manualDisconnect) return;
    this.socket?.close();
    const socket = new WebSocket(url);
    this.socket = socket;
    this.mode = mode;
    this.options.onStatus(mode === 'relay' ? `Connecting internet room ${this.options.room}…` : 'Connecting to multiplayer room…');

    socket.onopen = () => {
      if (socket !== this.socket) return;
      this.options?.onStatus(mode === 'relay' ? `Internet room ${this.options.room} · online` : `Online room ${this.options?.room}`);
      if (this.local) this.send({ type: 'hello', player: this.local });
    };

    socket.onmessage = event => {
      try { this.receive(JSON.parse(String(event.data)) as MultiplayerMessage); } catch { /* ignore malformed network data */ }
    };

    socket.onerror = () => {
      if (socket !== this.socket) return;
      this.options?.onStatus(mode === 'relay' ? 'Internet relay connection problem…' : 'Multiplayer server error.');
    };

    socket.onclose = () => {
      if (socket !== this.socket || this.manualDisconnect) return;
      this.socket = null;
      this.options?.onStatus(mode === 'relay' ? 'Reconnecting internet room…' : 'Reconnecting multiplayer server…');
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => {
        if (this.manualDisconnect || !this.options) return;
        if (mode === 'relay') this.connectPublicRelay();
        else this.connectWebSocket(url.split('?')[0]);
      }, 1500);
    };
  }

  private connectLocalFallback() {
    if (!this.options || typeof BroadcastChannel === 'undefined') {
      this.options?.onStatus('Multiplayer connection is unavailable in this browser.');
      return;
    }
    this.mode = 'local';
    const channel = new BroadcastChannel(`emberwild-v3:${this.options.room}`);
    this.channel = channel;
    channel.onmessage = event => this.receive(event.data as MultiplayerMessage);
    this.options.onStatus(`Local test room ${this.options.room} · open another tab to join`);
    if (this.local) this.send({ type: 'hello', player: this.local });
  }

  publishPlayer(state: Omit<MultiplayerPlayer, 'id'|'name'|'updatedAt'>) {
    if (!this.local) return;
    this.local = { ...this.local, ...state, updatedAt: Date.now() };
    this.players.set(this.id, this.local);
    this.send({ type: 'state', player: this.local });
    this.emitPlayers();
  }

  sendChat(text: string) {
    if (!this.options) return;
    const clean = text.trim().slice(0, 240);
    if (!clean) return;
    const chat: MultiplayerChat = { id: randomId(), playerId: this.id, playerName: this.options.name, text: clean, at: Date.now() };
    this.options.onChat(chat);
    this.send({ type: 'chat', chat });
  }

  private publish(player: MultiplayerPlayer) {
    this.send({ type: 'state', player: { ...player, updatedAt: Date.now() } });
  }

  private send(message: MultiplayerMessage) {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message));
    if (this.channel) this.channel.postMessage(message);
  }

  private receive(message: MultiplayerMessage) {
    if (!message || typeof message !== 'object') return;
    if (message.type === 'snapshot') {
      for (const player of message.players) if (player?.id) this.players.set(player.id, player);
    } else if (message.type === 'hello' || message.type === 'state') {
      if (!message.player?.id || message.player.id === this.id) return;
      this.players.set(message.player.id, { ...message.player, updatedAt: Date.now() });
      if (message.type === 'hello' && this.local) this.send({ type: 'state', player: this.local });
    } else if (message.type === 'leave') {
      this.players.delete(message.playerId);
    } else if (message.type === 'chat') {
      if (message.chat?.playerId !== this.id) this.options?.onChat(message.chat);
    }
    this.emitPlayers();
  }

  private cleanupStale() {
    const cutoff = Date.now() - 9000;
    for (const [id, player] of this.players) if (id !== this.id && player.updatedAt < cutoff) this.players.delete(id);
    this.emitPlayers();
  }

  private emitPlayers() {
    this.options?.onPlayers([...this.players.values()].sort((a,b)=>a.name.localeCompare(b.name)));
  }

  get transport() { return this.mode; }

  disconnect() {
    this.manualDisconnect = true;
    if (this.local) this.send({ type: 'leave', playerId: this.id });
    this.socket?.close();
    this.channel?.close();
    if (this.heartbeat) clearInterval(this.heartbeat);
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.socket = null;
    this.channel = null;
    this.heartbeat = null;
    this.cleanupTimer = null;
    this.reconnectTimer = null;
    this.mode = null;
    this.players.clear();
    this.local = null;
  }
}
