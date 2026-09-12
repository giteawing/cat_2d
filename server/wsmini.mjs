// Minimal RFC 6455 WebSocket server (text frames, ping/pong, close) — enough for the game protocol, no dependencies.
import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

export class WebSocketServer extends EventEmitter {
  /** Attach to an http.Server; `path` filters the upgrade URL. */
  constructor(httpServer, path = '/ws') {
    super();
    this.clients = new Set();
    httpServer.on('upgrade', (req, socket, head) => {
      const url = req.url.split('?')[0];
      if (url !== path || (req.headers.upgrade || '').toLowerCase() !== 'websocket' || !req.headers['sec-websocket-key']) { socket.destroy(); return; }
      const accept = crypto.createHash('sha1').update(req.headers['sec-websocket-key'] + GUID).digest('base64');
      socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n' + `Sec-WebSocket-Accept: ${accept}\r\n\r\n`);
      const ws = new WebSocketConn(socket, head);
      this.clients.add(ws);
      ws.on('close', () => this.clients.delete(ws));
      this.emit('connection', ws, req);
    });
  }
}

export class WebSocketConn extends EventEmitter {
  constructor(socket, head) {
    super();
    this.socket = socket; this.buf = Buffer.alloc(0); this.open = true; this.frag = null;
    socket.setNoDelay(true);
    socket.on('data', (d) => this.onData(d));
    socket.on('close', () => this.finish());
    socket.on('error', () => this.finish());
    socket.on('end', () => this.finish());
    if (head && head.length) this.onData(head);
  }
  get readyState() { return this.open ? 1 : 3; }
  finish() { if (!this.open) return; this.open = false; try { this.socket.destroy(); } catch (_) { /* ignore */ } this.emit('close'); }
  onData(d) {
    this.buf = Buffer.concat([this.buf, d]);
    for (;;) {
      const b = this.buf;
      if (b.length < 2) return;
      const fin = (b[0] & 0x80) !== 0, op = b[0] & 0x0f, masked = (b[1] & 0x80) !== 0;
      let len = b[1] & 0x7f, off = 2;
      if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (b.length < 10) return; len = Number(b.readBigUInt64BE(2)); off = 10; }
      const total = off + (masked ? 4 : 0) + len;
      if (b.length < total) return;
      let payload = b.subarray(off + (masked ? 4 : 0), total);
      if (masked) { const m = b.subarray(off, off + 4); const out = Buffer.allocUnsafe(len); for (let i = 0; i < len; i++) out[i] = payload[i] ^ m[i & 3]; payload = out; }
      this.buf = b.subarray(total);
      if (op === 0x8) { this.sendFrame(0x8, Buffer.alloc(0)); this.finish(); return; }
      if (op === 0x9) { this.sendFrame(0xA, payload); continue; }
      if (op === 0xA) continue;
      if (op === 0x1 || op === 0x2 || op === 0x0) {
        if (op !== 0x0) this.frag = { op, parts: [payload] }; else if (this.frag) this.frag.parts.push(payload); else continue;
        if (fin) { const f = this.frag; this.frag = null; if (f.op === 0x1) this.emit('message', Buffer.concat(f.parts).toString('utf8')); }
      }
    }
  }
  sendFrame(op, payload) {
    if (!this.open) return;
    const len = payload.length;
    let hdr;
    if (len < 126) { hdr = Buffer.from([0x80 | op, len]); }
    else if (len < 65536) { hdr = Buffer.alloc(4); hdr[0] = 0x80 | op; hdr[1] = 126; hdr.writeUInt16BE(len, 2); }
    else { hdr = Buffer.alloc(10); hdr[0] = 0x80 | op; hdr[1] = 127; hdr.writeBigUInt64BE(BigInt(len), 2); }
    try { this.socket.write(Buffer.concat([hdr, payload])); } catch (_) { this.finish(); }
  }
  send(text) { this.sendFrame(0x1, Buffer.from(String(text), 'utf8')); }
  close() { this.sendFrame(0x8, Buffer.alloc(0)); this.finish(); }
}
