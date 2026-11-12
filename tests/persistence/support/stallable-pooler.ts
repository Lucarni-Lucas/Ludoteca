// Un pooler en modo transacción, como Supavisor, delante de la única conexión que admite pglite-socket.
// Atiende varias conexiones de la app y les presta la de PGlite de a una consulta, o de a una transacción
// entera. Se puede trabar a pedido. Lo usan los tests de persistencia y db-server.mts, así que solo depende de Node.
import { createConnection, createServer, type Socket } from "node:net";

const SSL_REQUEST_CODE = 80_877_103;
const GSS_REQUEST_CODE = 80_877_104;
const PROTOCOL_VERSION = 196_608;
const HEADER_LENGTH = 5;
const LENGTH_SIZE = 4;
const IDLE_STATUS = "I";

export type StallablePooler = Readonly<{
  port: number;
  stall: () => void;
  resume: () => void;
  /** Cuántas conexiones quedaron trabadas: un pedido manda sus datos un instante después de hacerse. */
  frozenConnections: () => number;
  close: () => Promise<void>;
}>;

type Client = {
  socket: Socket;
  buffer: Buffer;
  started: boolean;
  unit: Buffer[];
  // Trabada, nunca más recibe respuesta: es lo que ve la app con un socket muerto.
  // Se traba la conexión que manda algo mientras dura el corte; las que estaban quietas siguen sanas.
  frozen: boolean;
  closed: boolean;
};

function frame(type: string, body: Buffer): Buffer {
  const header = Buffer.alloc(HEADER_LENGTH);
  header.write(type, 0, "ascii");
  header.writeInt32BE(body.length + LENGTH_SIZE, 1);
  return Buffer.concat([header, body]);
}

function cString(text: string): Buffer {
  return Buffer.from(`${text}\0`, "utf8");
}

function parameter(name: string, value: string): Buffer {
  return frame("S", Buffer.concat([cString(name), cString(value)]));
}

function int32(value: number): Buffer {
  const buffer = Buffer.alloc(LENGTH_SIZE);
  buffer.writeInt32BE(value);
  return buffer;
}

const HANDSHAKE = Buffer.concat([
  frame("R", int32(0)),
  parameter("server_version", "16.0"),
  parameter("client_encoding", "UTF8"),
  parameter("standard_conforming_strings", "on"),
  parameter("integer_datetimes", "on"),
  parameter("DateStyle", "ISO, MDY"),
  frame("K", Buffer.concat([int32(1), int32(1)])),
  frame("Z", Buffer.from(IDLE_STATUS)),
]);

const ROLLBACK = frame("Q", cString("rollback"));

function startupMessage(): Buffer {
  const body = Buffer.concat([int32(PROTOCOL_VERSION), cString("user"), cString("postgres"), cString("database"), cString("postgres"), Buffer.from([0])]);
  return Buffer.concat([int32(body.length + LENGTH_SIZE), body]);
}

/** Saca del buffer los mensajes completos: `[tipo, mensaje entero]`. */
function takeFrames(holder: { buffer: Buffer }): Array<readonly [string, Buffer]> {
  const frames: Array<readonly [string, Buffer]> = [];

  while (holder.buffer.length >= HEADER_LENGTH) {
    const length = holder.buffer.readInt32BE(1) + 1;

    if (holder.buffer.length < length) {
      break;
    }

    frames.push([String.fromCodePoint(holder.buffer[0]), holder.buffer.subarray(0, length)]);
    holder.buffer = holder.buffer.subarray(length);
  }

  return frames;
}

/** El saludo no lleva tipo: largo y código. Devuelve el código, o null si todavía no llegó entero. */
function takeStartup(client: Client): number | null {
  if (client.buffer.length < LENGTH_SIZE * 2) {
    return null;
  }

  const length = client.buffer.readInt32BE(0);

  if (client.buffer.length < length) {
    return null;
  }

  const code = client.buffer.readInt32BE(LENGTH_SIZE);
  client.buffer = client.buffer.subarray(length);
  return code;
}

export async function startStallablePooler(targetPort: number, port = 0, host = "127.0.0.1"): Promise<StallablePooler> {
  const clients = new Set<Client>();
  const waiting: Array<{ client: Client | null; unit: Buffer }> = [];
  let owner: Client | null = null;
  let busy = false;
  let stalled = false;

  const upstream = createConnection({ port: targetPort, host });
  const upstreamState = { buffer: Buffer.alloc(0), ready: false };

  function pump(): void {
    if (busy || !upstreamState.ready) {
      return;
    }

    // Mientras una transacción está abierta, la conexión es solo de quien la abrió.
    const index = owner ? waiting.findIndex((item) => item.client === owner) : 0;

    if (index < 0 || waiting.length === 0) {
      return;
    }

    const [item] = waiting.splice(index, 1);
    owner = item.client;
    busy = true;
    upstream.write(item.unit);
  }

  function rollbackFor(client: Client | null): void {
    waiting.unshift({ client, unit: ROLLBACK });
  }

  function onReadyForQuery(status: string): void {
    busy = false;
    const current = owner;

    if (status === IDLE_STATUS) {
      owner = null;
    } else if (!current || current.frozen || current.closed) {
      // Quien abrió la transacción ya no está: se deshace para liberar la conexión.
      rollbackFor(current);
    }

    pump();
  }

  upstream.on("data", (data) => {
    upstreamState.buffer = Buffer.concat([upstreamState.buffer, data]);

    for (const [type, message] of takeFrames(upstreamState)) {
      if (!upstreamState.ready) {
        upstreamState.ready = type === "Z";
        continue;
      }

      if (owner && !owner.frozen && !owner.closed) {
        owner.socket.write(message);
      }

      if (type === "Z") {
        onReadyForQuery(String.fromCodePoint(message[HEADER_LENGTH]));
      }
    }

    pump();
  });
  upstream.write(startupMessage());

  function freeze(client: Client): void {
    client.frozen = true;

    for (let index = waiting.length - 1; index >= 0; index -= 1) {
      if (waiting[index].client === client) {
        waiting.splice(index, 1);
      }
    }

    if (owner === client && !busy) {
      rollbackFor(client);
      pump();
    }
  }

  function handleStartup(client: Client): void {
    const code = takeStartup(client);

    if (code === SSL_REQUEST_CODE || code === GSS_REQUEST_CODE) {
      client.socket.write("N");
      handleStartup(client);
    } else if (code !== null) {
      client.started = true;
      client.socket.write(HANDSHAKE);
    }
  }

  function handleMessages(client: Client): void {
    for (const [type, message] of takeFrames(client)) {
      if (type === "X") {
        client.socket.end();
        return;
      }

      client.unit.push(message);

      // Una consulta simple o un Sync cierran la unidad que se manda de una sola vez.
      if (type === "Q" || type === "S") {
        waiting.push({ client, unit: Buffer.concat(client.unit) });
        client.unit = [];
      }
    }

    pump();
  }

  const server = createServer((socket) => {
    const client: Client = { socket, buffer: Buffer.alloc(0), started: false, unit: [], frozen: false, closed: false };
    clients.add(client);

    socket.on("data", (data) => {
      if (stalled && !client.frozen) {
        freeze(client);
      }

      if (client.frozen) {
        return;
      }

      client.buffer = Buffer.concat([client.buffer, data]);

      if (client.started) {
        handleMessages(client);
      } else {
        handleStartup(client);
      }
    });

    socket.on("close", () => {
      client.closed = true;
      clients.delete(client);
      // Lo que no se mandó todavía se descarta; una transacción abierta se deshace al terminar su consulta.
      for (let index = waiting.length - 1; index >= 0; index -= 1) {
        if (waiting[index].client === client) {
          waiting.splice(index, 1);
        }
      }

      if (owner === client && !busy) {
        rollbackFor(client);
        pump();
      }
    });
    socket.on("error", () => socket.destroy());
  });

  await new Promise<void>((resolve) => server.listen(port, host, resolve));
  const address = server.address();

  return {
    port: typeof address === "object" && address ? address.port : port,
    stall() {
      stalled = true;
    },
    resume() {
      // Las conexiones que quedaron trabadas siguen trabadas: solo las nuevas vuelven a la base.
      stalled = false;
    },
    frozenConnections: () => [...clients].filter((client) => client.frozen).length,
    close: () =>
      new Promise<void>((resolve) => {
        for (const client of clients) {
          client.socket.destroy();
        }

        upstream.destroy();
        server.close(() => resolve());
      }),
  };
}
