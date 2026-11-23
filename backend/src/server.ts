import { createServer, type Server as HttpServer } from "http";
import { Server } from "socket.io";
import { createApp } from "./app";
import { env } from "./config/env";
import { attachDuels, type DuelServer } from "./realtime/duels";

/** HTTP API + Socket.io (duels) on one port. */
export function createPassEscortServer(): { http: HttpServer; io: Server; duels: DuelServer } {
  const http = createServer(createApp());
  const origins = env().CORS_ORIGINS;
  const io = new Server(http, { cors: { origin: origins === "*" ? true : origins.split(",").map((o) => o.trim()) } });
  const duels = attachDuels(io);
  return { http, io, duels };
}
