import { createServer, type Server, type Socket } from "node:net";

const AUTHENTICATION_OK = Buffer.from([0x52, 0, 0, 0, 8, 0, 0, 0, 0]);
const BACKEND_KEY_DATA = Buffer.from([0x4b, 0, 0, 0, 12, 0, 0, 0, 1, 0, 0, 0, 1]);
const READY_FOR_QUERY = Buffer.from([0x5a, 0, 0, 0, 5, 0x49]);

export type StalledServerMode = "after-handshake" | "before-handshake";

export type StalledPostgres = Readonly<{
  url: string;
  close: () => Promise<void>;
}>;

/**
 * Un Postgres que se traba: «after-handshake» completa el saludo y nunca responde una consulta,
 * como un socket que murió mientras la instancia de Vercel estaba suspendida; «before-handshake»
 * acepta la conexión y ni siquiera saluda.
 */
export async function startStalledPostgres(mode: StalledServerMode = "after-handshake"): Promise<StalledPostgres> {
  const sockets = new Set<Socket>();

  const server: Server = createServer((socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.on("error", () => sockets.delete(socket));

    let greeted = false;
    socket.on("data", () => {
      if (mode === "after-handshake" && !greeted) {
        greeted = true;
        socket.write(Buffer.concat([AUTHENTICATION_OK, BACKEND_KEY_DATA, READY_FOR_QUERY]));
      }
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;

  return {
    url: `postgresql://usuario:clave@127.0.0.1:${port}/postgres`,
    close: () =>
      new Promise<void>((resolve) => {
        sockets.forEach((socket) => socket.destroy());
        server.close(() => resolve());
      }),
  };
}
