import mongoose from "mongoose";
import { env } from "./env";

export async function connectDB(uri = env().MONGODB_URI): Promise<void> {
  await mongoose.connect(uri);
  // Build indexes (unique keys guard idempotency) before serving traffic.
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
  console.log("Connected to MongoDB");
}
