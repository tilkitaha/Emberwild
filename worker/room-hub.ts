type Connection = { socket: WebSocket; playerId: string; playerName: string };

export class RoomHub {
  private connections = new Map<WebSocket, Connection>();

  constructor(private state: any, private env: any) {}

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    const url = new URL(request.url);
    const playerId = (url.searchParams.get('player') || crypto.randomUUID()).slice(0, 64);
    const playerName = (url.searchParams.get('name') || 'Traveler').slice(0, 40);
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.accept();

    const connection: Connection = { socket: server, playerId, playerName };
    this.connections.set(server, connection);

    server.addEventListener('message', event => {
      const text = typeof event.data === 'string' ? event.data : '';
      if (!text || text.length > 4000) return;
      this.broadcast(text, server);
    });
    const cleanup = () => {
      this.connections.delete(server);
      this.broadcast(JSON.stringify({ type: 'leave', playerId }), server);
    };
    server.addEventListener('close', cleanup);
    server.addEventListener('error', cleanup);

    return new Response(null, { status: 101, webSocket: client } as ResponseInit & { webSocket: WebSocket });
  }

  private broadcast(message: string, except?: WebSocket) {
    for (const connection of this.connections.values()) {
      if (connection.socket === except) continue;
      try { connection.socket.send(message); } catch { this.connections.delete(connection.socket); }
    }
  }
}
