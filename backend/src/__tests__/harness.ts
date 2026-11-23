import { existsSync } from "fs";
import path from "path";
import type { AddressInfo } from "net";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { parseEnv, setEnv } from "../config/env";
import { connectDB } from "../config/db";
import { seed } from "../scripts/seedQuestions";
import { createPassEscortServer } from "../server";

export const DATA_DIR = path.resolve(__dirname, "../../../frontend/src/data");

/** Real mongod (local binary if installed, else mongodb-memory-server downloads one) + the full server in dev modes. */
export async function startStack(extraEnv: Record<string, string> = {}) {
  const systemBinary = existsSync("/usr/bin/mongod") ? "/usr/bin/mongod" : undefined;
  const mongo = await MongoMemoryServer.create(systemBinary ? { binary: { systemBinary } } : {});
  setEnv(
    parseEnv({
      NODE_ENV: "test",
      MONGODB_URI: mongo.getUri("passescort-test"),
      AUTH_MODE: "dev",
      PAYMENTS_MODE: "mock",
      AI_PROVIDER: "mock",
      PAYSTACK_SECRET_KEY: "sk_test_webhook_secret",
      DUEL_BOT_AFTER_MS: "0",
      PUSH_MODE: "log",
      ...extraEnv,
    }),
  );
  await connectDB();
  await seed(DATA_DIR);
  const server = createPassEscortServer();
  await new Promise<void>((r) => server.http.listen(0, "127.0.0.1", r));
  const port = (server.http.address() as AddressInfo).port;
  const api = request(server.http);
  return {
    api,
    port,
    server,
    auth: (uid: string) => ({ Authorization: `Bearer dev:${uid}` }),
    async stop() {
      server.duels.close();
      server.io.close();
      await new Promise((r) => server.http.close(r));
      await mongoose.disconnect();
      await mongo.stop();
    },
  };
}

export type Stack = Awaited<ReturnType<typeof startStack>>;

let n = 0;
export const uid = (prefix = "u") => `${prefix}${Date.now().toString(36)}${n++}`;
