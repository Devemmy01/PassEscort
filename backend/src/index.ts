import "dotenv/config";
import { env } from "./config/env";
import { connectDB } from "./config/db";
import { createPassEscortServer } from "./server";

async function main() {
  const { PORT, NODE_ENV, AUTH_MODE, PAYMENTS_MODE, AI_PROVIDER } = env();
  await connectDB();
  const { http } = createPassEscortServer();
  http.listen(PORT, () => {
    console.log(`PassEscort API on :${PORT} (${NODE_ENV}; auth=${AUTH_MODE}, payments=${PAYMENTS_MODE}, ai=${AI_PROVIDER})`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err instanceof Error ? err.message : err);
  process.exit(1);
});
