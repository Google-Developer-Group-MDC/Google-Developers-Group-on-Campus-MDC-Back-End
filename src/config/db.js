import mongoose from "mongoose";
import { env } from "./env.js";

let memoryServer;

export async function connectDB(uri = env.MONGODB_URI) {
  let connectionUri = uri;

  if (!connectionUri) {
    // Zero-config local development: spin up a throwaway in-memory MongoDB.
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    memoryServer = await MongoMemoryServer.create();
    connectionUri = memoryServer.getUri("gdg-mdc");
    console.warn("⚠️  MONGODB_URI not set — using an in-memory MongoDB. Data will be lost on restart.");
  }

  await mongoose.connect(connectionUri);
  console.log(`✅ MongoDB connected (${mongoose.connection.name})`);
  return mongoose.connection;
}

export const isInMemoryDB = () => Boolean(memoryServer);

export async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = undefined;
  }
}
